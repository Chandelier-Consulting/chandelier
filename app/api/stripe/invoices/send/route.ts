import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdminAccessForRequest } from "@/lib/admin-auth";
import { env, missingEnv } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase";
import { invoiceActionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const access = await requireAdminAccessForRequest(request);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, missing: "missing" in access ? access.missing : undefined },
      { status: access.status },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = invoiceActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invoice action payload" }, { status: 400 });
  }

  const missing = missingEnv(["STRIPE_SECRET_KEY"]);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Stripe is not configured", missing }, { status: 503 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
  const invoice = await stripe.invoices.sendInvoice(parsed.data.stripe_invoice_id);

  const { client } = getServiceSupabase();
  if (client) {
    await client
      .from("invoices")
      .update({
        status: invoice.status ?? "sent",
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      })
      .eq("stripe_invoice_id", invoice.id);
  }

  return NextResponse.json({
    stripe_invoice_id: invoice.id,
    hosted_invoice_url: invoice.hosted_invoice_url,
    status: invoice.status,
  });
}
