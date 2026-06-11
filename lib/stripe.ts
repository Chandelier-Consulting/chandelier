import Stripe from "stripe";
import { env, missingEnv } from "@/lib/env";

export function getStripe() {
  const missing = missingEnv(["STRIPE_SECRET_KEY"]);
  if (missing.length > 0) {
    return { stripe: null, missing };
  }

  return { stripe: new Stripe(env.STRIPE_SECRET_KEY!), missing: [] };
}

export async function findOrCreateCustomer(
  stripe: Stripe,
  input: { customer_email: string; customer_name: string; stripe_customer_id?: string },
) {
  if (input.stripe_customer_id) {
    return stripe.customers.retrieve(input.stripe_customer_id);
  }

  const existing = await stripe.customers.list({
    email: input.customer_email,
    limit: 1,
  });

  if (existing.data[0]) {
    return existing.data[0];
  }

  return stripe.customers.create({
    email: input.customer_email,
    name: input.customer_name,
  });
}
