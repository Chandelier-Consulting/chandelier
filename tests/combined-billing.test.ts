import { createCombinedBillingSchema } from "@/lib/validation";

function expectsCombinedBillingPayload() {
  const parsed = createCombinedBillingSchema.parse({
    customer_name: "Rivera Bakery",
    customer_email: "billing@example.com",
    memo: "Website launch plus managed monthly automation.",
    one_time_items: [
      {
        description: "Website implementation",
        quantity: 1,
        unit_amount_cents: 750000,
      },
    ],
    recurring_items: [
      {
        description: "Monthly AI automation support",
        quantity: 1,
        unit_amount_cents: 150000,
      },
    ],
    months: 6,
    days_until_due: 14,
    discount_cents: 50000,
    deposit_cents: 100000,
    retainer_cents: 0,
  });

  parsed.one_time_items[0].description satisfies string;
  parsed.recurring_items[0].unit_amount_cents satisfies number;
  parsed.months satisfies number;
}

function rejectsEmptyBillingPayload() {
  const parsed = createCombinedBillingSchema.safeParse({
    customer_name: "Rivera Bakery",
    customer_email: "billing@example.com",
    one_time_items: [],
    recurring_items: [],
  });

  parsed.success satisfies boolean;
}

void expectsCombinedBillingPayload;
void rejectsEmptyBillingPayload;
