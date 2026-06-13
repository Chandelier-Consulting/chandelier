import { z } from "zod";

export const leadSchema = z.object({
  business_name: z.string().min(2).max(160),
  contact_name: z.string().min(2).max(160),
  email: z.string().email().max(240),
  phone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  budget: z.string().max(80).optional().or(z.literal("")),
  requested_services: z.array(z.string().min(1)).min(1),
  project_description: z.string().min(20).max(5000),
});

export const invoiceLineItemSchema = z.object({
  description: z.string().min(2).max(500),
  quantity: z.number().positive().default(1),
  unit_amount_cents: z.number().int().positive(),
});

export const recurringLineItemSchema = invoiceLineItemSchema.extend({
  quantity: z.number().int().positive().default(1),
});

export const createInvoiceSchema = z.object({
  business_id: z.string().uuid().optional(),
  customer_email: z.string().email(),
  customer_name: z.string().min(2).max(160),
  stripe_customer_id: z.string().min(1).optional(),
  memo: z.string().max(1000).optional(),
  due_date: z.string().date().optional(),
  discount_cents: z.number().int().min(0).default(0),
  deposit_cents: z.number().int().min(0).default(0),
  retainer_cents: z.number().int().min(0).default(0),
  line_items: z.array(invoiceLineItemSchema).min(1),
});

export const createCombinedBillingSchema = z.object({
  business_id: z.string().uuid().optional(),
  customer_email: z.string().email(),
  customer_name: z.string().min(2).max(160),
  stripe_customer_id: z.string().min(1).optional(),
  memo: z.string().max(1000).optional(),
  due_date: z.string().date().optional(),
  months: z.number().int().min(1).max(36).default(6),
  days_until_due: z.number().int().min(1).max(90).default(14),
  discount_cents: z.number().int().min(0).default(0),
  deposit_cents: z.number().int().min(0).default(0),
  retainer_cents: z.number().int().min(0).default(0),
  one_time_items: z.array(invoiceLineItemSchema).default([]),
  recurring_items: z.array(recurringLineItemSchema).default([]),
}).refine(
  (input) => input.one_time_items.length > 0 || input.recurring_items.length > 0,
  {
    message: "Add at least one one-time or recurring line item.",
    path: ["one_time_items"],
  },
);

export const createSubscriptionSchema = z.object({
  business_id: z.string().uuid().optional(),
  customer_email: z.string().email(),
  customer_name: z.string().min(2).max(160),
  stripe_customer_id: z.string().min(1).optional(),
  memo: z.string().max(1000).optional(),
  months: z.number().int().min(1).max(36),
  days_until_due: z.number().int().min(1).max(90).default(14),
  line_items: z.array(recurringLineItemSchema).min(1),
});

export const invoiceActionSchema = z.object({
  stripe_invoice_id: z.string().min(1),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreateCombinedBillingInput = z.infer<typeof createCombinedBillingSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type InvoiceActionInput = z.infer<typeof invoiceActionSchema>;
