// Node's built-in TypeScript runner requires the source extension here.
// @ts-expect-error TS5097
import { createOneTimeInvoice } from "../lib/billing.ts";

type InsertedInvoice = {
  id: string;
};

function createSupabaseStub() {
  const insertedInvoice: InsertedInvoice = { id: "local-invoice-id" };
  const calls: Array<{ table: string; action: string; payload?: unknown }> = [];

  return {
    calls,
    client: {
      from(table: string) {
        if (table === "invoices") {
          return {
            upsert(payload: unknown) {
              calls.push({ table, action: "upsert", payload });
              return {
                select() {
                  return {
                    single: async () => ({ data: insertedInvoice, error: null }),
                  };
                },
              };
            },
          };
        }

        if (table === "invoice_line_items") {
          return {
            delete() {
              calls.push({ table, action: "delete" });
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
            insert(payload: unknown) {
              calls.push({ table, action: "insert", payload });
              return Promise.resolve({ data: null, error: null });
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

async function includesPendingInvoiceItemsWhenCreatingStripeInvoice() {
  const invoiceItemCreates: unknown[] = [];
  let invoiceCreateParams: Record<string, unknown> | undefined;

  const stripe = {
    invoiceItems: {
      create: async (params: unknown) => {
        invoiceItemCreates.push(params);
        return { id: `ii_${invoiceItemCreates.length}` };
      },
    },
    invoices: {
      create: async (params: Record<string, unknown>) => {
        invoiceCreateParams = params;
        return {
          id: "in_test",
          hosted_invoice_url: "https://invoice.stripe.test/in_test",
          status: "draft",
        };
      },
    },
  };

  const supabase = createSupabaseStub();

  await createOneTimeInvoice(
    stripe as never,
    supabase.client as never,
    { id: "cus_test", deleted: false } as never,
    {
      memo: "Launch invoice",
      discount_cents: 0,
      deposit_cents: 0,
      retainer_cents: 0,
      line_items: [
        {
          description: "Website implementation",
          quantity: 2,
          unit_amount_cents: 12500,
        },
      ],
    },
  );

  if (invoiceCreateParams?.pending_invoice_items_behavior !== "include") {
    throw new Error("Stripe invoice creation must include pending invoice items");
  }

  if (invoiceItemCreates.length !== 1) {
    throw new Error("Expected one Stripe invoice item to be created");
  }
}

await includesPendingInvoiceItemsWhenCreatingStripeInvoice();
