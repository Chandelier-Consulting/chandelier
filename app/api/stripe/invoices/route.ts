import { NextResponse } from "next/server";
import { requireAdminAccessForRequest } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/supabase";
import { findOrCreateCustomer, getStripe } from "@/lib/stripe";
import { createOneTimeInvoice, syncCustomerToBusiness } from "@/lib/billing";
import { createInvoiceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const access = await requireAdminAccessForRequest(request);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, missing: "missing" in access ? access.missing : undefined },
      { status: access.status },
    );
  }

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

  const invoice = await createOneTimeInvoice(stripe, client, customer, {
    business_id: input.business_id,
    memo: input.memo,
    due_date: input.due_date,
    discount_cents: input.discount_cents,
    deposit_cents: input.deposit_cents,
    retainer_cents: input.retainer_cents,
    line_items: input.line_items,
  });
  await syncCustomerToBusiness(client, input, customer.id);

  return NextResponse.json({
    id: invoice.id,
    stripe_customer_id: customer.id,
    stripe_invoice_id: invoice.stripe_invoice_id,
    hosted_invoice_url: invoice.hosted_invoice_url,
    status: invoice.status,
    invoice_status: invoice.status,
    one_time_total_cents: invoice.total_cents,
  });
}
