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

function stripeDateToIsoDate(timestamp: number | null | undefined) {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString().slice(0, 10);
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
    processed_at: new Date().toISOString(),
  });

  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  if (event.type.startsWith("invoice.")) {
    const invoice = event.data.object as Stripe.Invoice;
    const syncedInvoice = await client
      .from("invoices")
      .update({
        status: invoice.status ?? event.type.replace("invoice.", ""),
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      })
      .eq("stripe_invoice_id", invoice.id)
      .select("id")
      .maybeSingle();

    if (!syncedInvoice.data) {
      const customerId = stripeId(invoice.customer);
      const clientRow = customerId
        ? await client
            .from("clients")
            .select("id,business_unit_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle()
        : { data: null };
      const defaultBusinessUnit = !clientRow.data?.business_unit_id
        ? await client
            .from("business_units")
            .select("id")
            .eq("slug", "chandelier-consulting")
            .maybeSingle()
        : { data: null };

      await client.from("invoices").insert({
        business_unit_id: clientRow.data?.business_unit_id ?? defaultBusinessUnit.data?.id ?? null,
        client_id: clientRow.data?.id ?? null,
        stripe_invoice_id: invoice.id,
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        status: invoice.status ?? event.type.replace("invoice.", ""),
        subtotal_cents: invoice.subtotal ?? 0,
        total_cents: invoice.total ?? invoice.amount_due ?? 0,
        due_date: stripeDateToIsoDate(invoice.due_date),
        memo: invoice.description ?? invoice.metadata?.memo ?? null,
      });
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const invoiceRow = await client
      .from("invoices")
      .select("id,business_unit_id,total_cents")
      .eq("stripe_invoice_id", invoice.id)
      .maybeSingle();

    if (invoiceRow.data) {
      const amountPaid = invoice.amount_paid ?? invoiceRow.data.total_cents ?? 0;
      await client.from("payments").insert({
        invoice_id: invoiceRow.data.id,
        amount_cents: amountPaid,
        status: "paid",
        paid_at: new Date().toISOString(),
      });
      await client.from("cash_ledger_entries").insert({
        business_unit_id: invoiceRow.data.business_unit_id,
        entry_type: "invoice_payment",
        source_table: "invoices",
        source_id: invoiceRow.data.id,
        amount_cents: amountPaid,
        memo: `Stripe invoice paid: ${invoice.id}`,
      });
    }
  }

  if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;
    const invoiceId = charge.metadata?.stripe_invoice_id;

    if (invoiceId && charge.balance_transaction) {
      const balanceTransactionId =
        typeof charge.balance_transaction === "string"
          ? charge.balance_transaction
          : charge.balance_transaction.id;
      const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
      const balance = await stripe.balanceTransactions.retrieve(balanceTransactionId);
      const fee = balance.fee ?? 0;
      const invoiceRow = await client
        .from("invoices")
        .select("id,business_unit_id")
        .eq("stripe_invoice_id", invoiceId)
        .maybeSingle();

      if (invoiceRow.data && fee > 0) {
        await client.from("payments").insert({
          invoice_id: invoiceRow.data.id,
          stripe_payment_intent_id:
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.payment_intent?.id ?? null,
          amount_cents: charge.amount_captured,
          stripe_fee_cents: fee,
          status: "succeeded",
          paid_at: new Date((charge.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        });
        await client.from("cash_ledger_entries").insert({
          business_unit_id: invoiceRow.data.business_unit_id,
          entry_type: "stripe_fee",
          source_table: "payments",
          source_id: invoiceRow.data.id,
          amount_cents: -fee,
          memo: `Stripe fee for charge ${charge.id}`,
        });
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

  return NextResponse.json({ received: true });
}
