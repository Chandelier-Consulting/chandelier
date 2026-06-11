import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { leadSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lead payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { client, missing } = getServiceSupabase();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase is not configured", missing },
      { status: 503 },
    );
  }

  const lead = parsed.data;
  const { data, error } = await client
    .from("leads")
    .insert({
      business_name: lead.business_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone || null,
      website: lead.website || null,
      budget: lead.budget || null,
      requested_services: lead.requested_services,
      project_description: lead.project_description,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, status: "created" }, { status: 201 });
}
