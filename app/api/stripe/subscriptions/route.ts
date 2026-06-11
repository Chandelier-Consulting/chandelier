import { NextResponse } from "next/server";
import { requireAdminAccessForRequest } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/supabase";
import { findOrCreateCustomer, getStripe } from "@/lib/stripe";
import { createSubscriptionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const access = await requireAdminAccessForRequest(request);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, missing: "missing" in access ? access.missing : undefined },
      { status: access.status },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid subscription payload", issues: parsed.error.flatten().fieldErrors },
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

  const products = await Promise.all(
    input.line_items.map((item) =>
      stripe.products.create({
        name: item.description,
        metadata: {
          chandelier_billing_mode: "fixed_month_subscription",
        },
      }),
    ),
  );

  const schedule = await stripe.subscriptionSchedules.create({
    customer: customer.id,
    start_date: "now",
    end_behavior: "cancel",
    default_settings: {
      collection_method: "send_invoice",
      invoice_settings: {
        days_until_due: input.days_until_due,
      },
      description: input.memo,
    },
    metadata: {
      customer_email: input.customer_email,
      customer_name: input.customer_name,
      chandelier_billing_mode: "fixed_month_subscription",
      months: String(input.months),
    },
    phases: [
      {
        duration: {
          interval: "month",
          interval_count: input.months,
        },
        collection_method: "send_invoice",
        invoice_settings: {
          days_until_due: input.days_until_due,
        },
        metadata: {
          memo: input.memo ?? "",
        },
        items: input.line_items.map((item, index) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            product: products[index].id,
            recurring: {
              interval: "month",
              interval_count: 1,
            },
            unit_amount: item.unit_amount_cents,
          },
        })),
      },
    ],
    expand: ["subscription"],
  });

  const monthlyTotal = input.line_items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unit_amount_cents),
    0,
  );

  const subscriptionId =
    typeof schedule.subscription === "string"
      ? schedule.subscription
      : schedule.subscription?.id ?? null;

  const { data, error } = await client
    .from("subscription_schedules")
    .insert({
      client_id: input.client_id ?? null,
      stripe_customer_id: customer.id,
      stripe_subscription_schedule_id: schedule.id,
      stripe_subscription_id: subscriptionId,
      status: schedule.status,
      months: input.months,
      monthly_total_cents: monthlyTotal,
      memo: input.memo ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    stripe_subscription_schedule_id: schedule.id,
    stripe_subscription_id: subscriptionId,
    status: schedule.status,
    months: input.months,
    monthly_total_cents: monthlyTotal,
  });
}
