import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env, missingEnv } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase";

const handledEvents = new Set([
  "invoice.created",
  "invoice.finalized",
  "invoice.sent",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided",
  "charge.succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "subscription_schedule.created",
  "subscription_schedule.updated",
  "subscription_schedule.canceled",
  "subscription_schedule.completed",
]);

function stripeId(value: string | { id: string } | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function expandableId(object: unknown, key: string) {
  if (!object || typeof object !== "object" || !(key in object)) return null;
  const value = (object as Record<string, unknown>)[key];
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

function lineUnitAmount(line: Stripe.InvoiceLineItem) {
  const price = "price" in line ? line.price as { unit_amount?: number | null; nickname?: string | null } | null : null;
  return price?.unit_amount ?? null;
}

function lineName(line: Stripe.InvoiceLineItem) {
  const price = "price" in line ? line.price as { nickname?: string | null } | null : null;
  return line.description ?? price?.nickname ?? "Stripe invoice line";
}

function stripeDateToIsoDate(timestamp: number | null | undefined) {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

async function defaultBusinessUnitId(client: NonNullable<ReturnType<typeof getServiceSupabase>["client"]>) {
  const row = await client
    .from("business_units")
    .select("id")
    .eq("slug", "chandelier-consulting")
    .maybeSingle();
  return row.data?.id ?? null;
}

async function businessForStripeCustomer(
  client: NonNullable<ReturnType<typeof getServiceSupabase>["client"]>,
  customerId: string | null,
) {
  if (!customerId) return null;
  const row = await client
    .from("businesses")
    .select("id,business_unit_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return row.data ?? null;
}

async function syncInvoiceFromStripe(
  client: NonNullable<ReturnType<typeof getServiceSupabase>["client"]>,
  invoice: Stripe.Invoice,
) {
  const customerId = stripeId(invoice.customer);
  const businessRow = await businessForStripeCustomer(client, customerId);
  const metadataBusinessId = typeof invoice.metadata?.business_id === "string" && invoice.metadata.business_id
    ? invoice.metadata.business_id
    : null;
  const existingInvoice = await client
    .from("invoices")
    .select("business_id,business_unit_id")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle();
  const businessId = businessRow?.id ?? metadataBusinessId ?? existingInvoice.data?.business_id ?? null;
  const businessUnitId = businessRow?.business_unit_id ?? existingInvoice.data?.business_unit_id ?? await defaultBusinessUnitId(client);

  const synced = await client
    .from("invoices")
    .upsert({
      business_unit_id: businessUnitId,
      business_id: businessId,
      stripe_invoice_id: invoice.id,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      status: invoice.status ?? "unknown",
      subtotal_cents: invoice.subtotal ?? 0,
      discount_cents: Math.abs(invoice.total_discount_amounts?.reduce((sum, discount) => sum + discount.amount, 0) ?? 0),
      deposit_cents: Number(invoice.metadata?.deposit_cents ?? 0),
      retainer_cents: Number(invoice.metadata?.retainer_cents ?? 0),
      total_cents: invoice.total ?? invoice.amount_due ?? 0,
      due_date: stripeDateToIsoDate(invoice.due_date),
      memo: invoice.description ?? invoice.metadata?.memo ?? null,
    }, { onConflict: "stripe_invoice_id" })
    .select("id,business_unit_id,business_id,total_cents")
    .single();

  if (synced.error) {
    throw new Error(synced.error.message);
  }

  await client.from("invoice_line_items").delete().eq("invoice_id", synced.data.id);

  const lineRows = invoice.lines.data.map((line) => ({
    invoice_id: synced.data.id,
    description: lineName(line),
    quantity: typeof line.quantity === "number" ? line.quantity : 1,
    unit_amount_cents:
      lineUnitAmount(line) ??
      (typeof line.quantity === "number" && line.quantity > 0 ? Math.round(line.amount / line.quantity) : line.amount),
  }));

  if (lineRows.length > 0) {
    const inserted = await client.from("invoice_line_items").insert(lineRows);
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  }

  return synced.data;
}

async function recordInvoicePayment(
  client: NonNullable<ReturnType<typeof getServiceSupabase>["client"]>,
  invoice: Stripe.Invoice,
) {
  const invoiceRow = await syncInvoiceFromStripe(client, invoice);
  const paymentIntentId = expandableId(invoice, "payment_intent") ?? `invoice:${invoice.id}`;
  const amountPaid = invoice.amount_paid ?? invoiceRow.total_cents ?? 0;

  const payment = await client
    .from("payments")
    .upsert({
      invoice_id: invoiceRow.id,
      business_id: invoiceRow.business_id,
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: amountPaid,
      status: invoice.status === "paid" ? "paid" : invoice.status ?? "pending",
      paid_at: invoice.status === "paid" ? new Date().toISOString() : null,
    }, { onConflict: "stripe_payment_intent_id" })
    .select("id")
    .single();

  if (payment.error) {
    throw new Error(payment.error.message);
  }

  if (invoice.status === "paid" && amountPaid > 0) {
    await client.from("cash_ledger_entries").insert({
      business_unit_id: invoiceRow.business_unit_id,
      business_id: invoiceRow.business_id,
      entry_type: "invoice_payment",
      source_table: "invoices",
      source_id: invoiceRow.id,
      amount_cents: amountPaid,
      memo: `Stripe invoice paid: ${invoice.id}`,
    });
  }
}

async function recordChargeFee(
  stripe: Stripe,
  client: NonNullable<ReturnType<typeof getServiceSupabase>["client"]>,
  charge: Stripe.Charge,
) {
  const invoiceId = expandableId(charge, "invoice") ?? charge.metadata?.stripe_invoice_id;
  if (!invoiceId || !charge.balance_transaction) return;

  const balanceTransactionId =
    typeof charge.balance_transaction === "string"
      ? charge.balance_transaction
      : charge.balance_transaction.id;
  const balance = await stripe.balanceTransactions.retrieve(balanceTransactionId);
  const fee = balance.fee ?? 0;
  if (fee <= 0) return;

  const invoiceRow = await client
    .from("invoices")
    .select("id,business_unit_id,business_id")
    .eq("stripe_invoice_id", invoiceId)
    .maybeSingle();

  if (!invoiceRow.data) return;

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? `charge:${charge.id}`;

  const payment = await client
    .from("payments")
    .upsert({
      invoice_id: invoiceRow.data.id,
      business_id: invoiceRow.data.business_id,
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: charge.amount_captured,
      stripe_fee_cents: fee,
      status: "succeeded",
      paid_at: new Date((charge.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    }, { onConflict: "stripe_payment_intent_id" })
    .select("id")
    .single();

  if (payment.error) {
    throw new Error(payment.error.message);
  }

  await client.from("cash_ledger_entries").insert({
    business_unit_id: invoiceRow.data.business_unit_id,
    business_id: invoiceRow.data.business_id,
    entry_type: "stripe_fee",
    source_table: "payments",
    source_id: payment.data.id,
    amount_cents: -fee,
    memo: `Stripe fee for charge ${charge.id}`,
  });
}

export async function POST(request: Request) {
  const missing = missingEnv(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Stripe webhook is not configured", missing }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature" },
      { status: 400 },
    );
  }

  if (!handledEvents.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const { client, missing: missingSupabase } = getServiceSupabase();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase is not configured", missing: missingSupabase },
      { status: 503 },
    );
  }

  const existing = await client
    .from("stripe_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing.data) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const inserted = await client.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  if (event.type.startsWith("invoice.")) {
    const invoice = event.data.object as Stripe.Invoice;
    await syncInvoiceFromStripe(client, invoice);
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    await recordInvoicePayment(client, invoice);
  }

  if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;
    await recordChargeFee(stripe, client, charge);
  }

  if (event.type.startsWith("payment_intent.")) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = expandableId(paymentIntent, "invoice");

    if (invoiceId) {
      const invoiceRow = await client
        .from("invoices")
        .select("id,business_id")
        .eq("stripe_invoice_id", invoiceId)
        .maybeSingle();

      if (invoiceRow.data) {
        await client.from("payments").upsert({
          invoice_id: invoiceRow.data.id,
          business_id: invoiceRow.data.business_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount_cents: paymentIntent.amount_received || paymentIntent.amount,
          status: paymentIntent.status,
          paid_at: paymentIntent.status === "succeeded" ? new Date().toISOString() : null,
        }, { onConflict: "stripe_payment_intent_id" });
      }
    }
  }

  if (event.type.startsWith("subscription_schedule.")) {
    const schedule = event.data.object as Stripe.SubscriptionSchedule;
    const subscriptionId =
      typeof schedule.subscription === "string"
        ? schedule.subscription
        : schedule.subscription?.id ?? null;

    await client
      .from("subscription_schedules")
      .update({
        status: schedule.status,
        stripe_subscription_id: subscriptionId,
      })
      .eq("stripe_subscription_schedule_id", schedule.id);
  }

  await client
    .from("stripe_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("stripe_event_id", event.id);

  return NextResponse.json({ received: true });
}
