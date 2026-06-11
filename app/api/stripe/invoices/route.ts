import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { findOrCreateCustomer, getStripe } from "@/lib/stripe";
import { createInvoiceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid invoice payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { stripe, missing } = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured", missing }, { status: 503 });
  }

  const { client, missing: missingSupabase } = getServiceSupabase();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase is not configured", missing: missingSupabase },
      { status: 503 },
    );
  }

  const input = parsed.data;
  const customer = await findOrCreateCustomer(stripe, input);

  if (customer.deleted) {
    return NextResponse.json({ error: "Stripe customer has been deleted" }, { status: 400 });
  }

  for (const item of input.line_items) {
    await stripe.invoiceItems.create({
      customer: customer.id,
      description: item.description,
      amount: item.quantity * item.unit_amount_cents,
      currency: "usd",
    });
  }

  const adjustments = [
    { description: "Discount", amount: -input.discount_cents },
    { description: "Deposit credit", amount: -input.deposit_cents },
    { description: "Retainer", amount: input.retainer_cents },
  ].filter((item) => item.amount !== 0);

  for (const item of adjustments) {
    await stripe.invoiceItems.create({
      customer: customer.id,
      description: item.description,
      amount: item.amount,
      currency: "usd",
    });
  }

  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: "send_invoice",
    days_until_due: input.due_date ? undefined : 14,
    due_date: input.due_date ? Math.floor(new Date(input.due_date).getTime() / 1000) : undefined,
    description: input.memo,
    metadata: {
      discount_cents: String(input.discount_cents),
      deposit_cents: String(input.deposit_cents),
      retainer_cents: String(input.retainer_cents),
    },
  });

  const subtotal = input.line_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_amount_cents,
    0,
  );
  const total = Math.max(
    0,
    subtotal - input.discount_cents - input.deposit_cents + input.retainer_cents,
  );

  const { data, error } = await client
    .from("invoices")
    .upsert({
      client_id: input.client_id ?? null,
      stripe_invoice_id: invoice.id,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      status: invoice.status ?? "draft",
      subtotal_cents: subtotal,
      discount_cents: input.discount_cents,
      deposit_cents: input.deposit_cents,
      retainer_cents: input.retainer_cents,
      total_cents: total,
      due_date: input.due_date ?? null,
      memo: input.memo ?? null,
    }, { onConflict: "stripe_invoice_id" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lineRows = input.line_items.map((item) => ({
    invoice_id: data.id,
    description: item.description,
    quantity: item.quantity,
    unit_amount_cents: item.unit_amount_cents,
  }));

  await client.from("invoice_line_items").delete().eq("invoice_id", data.id);

  const lineInsert = await client.from("invoice_line_items").insert(lineRows);
  if (lineInsert.error) {
    return NextResponse.json({ error: lineInsert.error.message }, { status: 500 });
  }

  if (input.client_id) {
    await client
      .from("clients")
      .update({ stripe_customer_id: customer.id })
      .eq("id", input.client_id);
  }

  return NextResponse.json({
    id: data.id,
    stripe_customer_id: customer.id,
    stripe_invoice_id: invoice.id,
    hosted_invoice_url: invoice.hosted_invoice_url,
    status: invoice.status,
  });
}
