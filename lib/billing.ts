import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateCombinedBillingInput,
  CreateInvoiceInput,
  CreateSubscriptionInput,
} from "@/lib/validation";

type LineItem = {
  description: string;
  quantity: number;
  unit_amount_cents: number;
};

type Customer = Stripe.Customer;

function lineTotal(item: LineItem) {
  return Math.round(item.quantity * item.unit_amount_cents);
}

export async function createOneTimeInvoice(
  stripe: Stripe,
  client: SupabaseClient,
  customer: Customer,
  input: Pick<
    CreateInvoiceInput,
    | "client_id"
    | "memo"
    | "due_date"
    | "discount_cents"
    | "deposit_cents"
    | "retainer_cents"
  > & {
    line_items: LineItem[];
  },
) {
  for (const item of input.line_items) {
    await stripe.invoiceItems.create({
      customer: customer.id,
      description: item.description,
      amount: lineTotal(item),
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
    pending_invoice_items_behavior: "include",
    days_until_due: input.due_date ? undefined : 14,
    due_date: input.due_date ? Math.floor(new Date(input.due_date).getTime() / 1000) : undefined,
    description: input.memo,
    metadata: {
      discount_cents: String(input.discount_cents),
      deposit_cents: String(input.deposit_cents),
      retainer_cents: String(input.retainer_cents),
    },
  });

  const subtotal = input.line_items.reduce((sum, item) => sum + lineTotal(item), 0);
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
    throw new Error(error.message);
  }

  const lineRows = input.line_items.map((item) => ({
    invoice_id: data.id,
    description: item.description,
    quantity: item.quantity,
    unit_amount_cents: item.unit_amount_cents,
  }));

  await client.from("invoice_line_items").delete().eq("invoice_id", data.id);

  if (lineRows.length > 0) {
    const lineInsert = await client.from("invoice_line_items").insert(lineRows);
    if (lineInsert.error) {
      throw new Error(lineInsert.error.message);
    }
  }

  return {
    id: data.id,
    stripe_invoice_id: invoice.id,
    hosted_invoice_url: invoice.hosted_invoice_url,
    status: invoice.status,
    subtotal_cents: subtotal,
    total_cents: total,
  };
}

export async function createFixedSubscriptionSchedule(
  stripe: Stripe,
  client: SupabaseClient,
  customer: Customer,
  input: Pick<
    CreateSubscriptionInput,
    "client_id" | "customer_email" | "customer_name" | "memo" | "months" | "days_until_due"
  > & {
    line_items: Array<LineItem & { quantity: number }>;
  },
) {
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

  const monthlyTotal = input.line_items.reduce((sum, item) => sum + lineTotal(item), 0);
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
    throw new Error(error.message);
  }

  return {
    id: data.id,
    stripe_subscription_schedule_id: schedule.id,
    stripe_subscription_id: subscriptionId,
    status: schedule.status,
    months: input.months,
    monthly_total_cents: monthlyTotal,
  };
}

export async function syncCustomerToClient(
  client: SupabaseClient,
  input: Pick<CreateCombinedBillingInput, "client_id">,
  stripeCustomerId: string,
) {
  if (!input.client_id) return;

  await client
    .from("clients")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", input.client_id);
}
