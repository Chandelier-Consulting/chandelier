import { NextResponse } from "next/server";
import {
  createFixedSubscriptionSchedule,
  createOneTimeInvoice,
  syncCustomerToClient,
} from "@/lib/billing";
import { getServiceSupabase } from "@/lib/supabase";
import { findOrCreateCustomer, getStripe } from "@/lib/stripe";
import { createCombinedBillingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createCombinedBillingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid billing payload", issues: parsed.error.flatten().fieldErrors },
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

  try {
    const invoice =
      input.one_time_items.length > 0
        ? await createOneTimeInvoice(stripe, client, customer, {
            client_id: input.client_id,
            memo: input.memo,
            due_date: input.due_date,
            discount_cents: input.discount_cents,
            deposit_cents: input.deposit_cents,
            retainer_cents: input.retainer_cents,
            line_items: input.one_time_items,
          })
        : null;

    const subscription =
      input.recurring_items.length > 0
        ? await createFixedSubscriptionSchedule(stripe, client, customer, {
            client_id: input.client_id,
            customer_email: input.customer_email,
            customer_name: input.customer_name,
            memo: input.memo,
            months: input.months,
            days_until_due: input.days_until_due,
            line_items: input.recurring_items,
          })
        : null;

    await syncCustomerToClient(client, input, customer.id);

    return NextResponse.json({
      id: invoice?.id ?? subscription?.id,
      stripe_customer_id: customer.id,
      stripe_invoice_id: invoice?.stripe_invoice_id,
      hosted_invoice_url: invoice?.hosted_invoice_url,
      invoice_status: invoice?.status,
      one_time_total_cents: invoice?.total_cents ?? 0,
      stripe_subscription_schedule_id: subscription?.stripe_subscription_schedule_id,
      stripe_subscription_id: subscription?.stripe_subscription_id,
      subscription_status: subscription?.status,
      months: subscription?.months,
      monthly_total_cents: subscription?.monthly_total_cents ?? 0,
      status: [invoice?.status, subscription?.status].filter(Boolean).join(" + ") || "created",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Billing creation failed" },
      { status: 500 },
    );
  }
}
