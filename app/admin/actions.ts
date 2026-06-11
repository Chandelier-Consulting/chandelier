"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_ACCESS_COOKIE,
  describeAdminAccess,
  getPublicSupabase,
} from "@/lib/admin-auth";
import { adminEmails } from "@/lib/env";
import {
  adminFormDefinitions,
  buildMutationPayload,
  type AdminFormDefinition,
} from "@/lib/admin-data";
import { getServiceSupabase } from "@/lib/supabase";
import type { AdminSection } from "@/lib/types";

async function requireAdminActionAccess() {
  const allowlist = adminEmails();
  if (allowlist.length === 0) return;

  const { client } = getPublicSupabase();
  const accessToken = (await cookies()).get(ADMIN_ACCESS_COOKIE)?.value;
  if (!client || !accessToken) {
    redirect("/admin/login?error=Admin access requires an allowlisted Supabase session.");
  }

  const access = await describeAdminAccess(client, accessToken, allowlist);
  if (!access.ok) {
    redirect("/admin/login?error=Admin access requires an allowlisted Supabase session.");
  }
}

function sectionFromForm(formData: FormData) {
  return String(formData.get("section") ?? "") as AdminSection;
}

function valuesFromForm(formData: FormData) {
  const values = new Map<string, FormDataEntryValue | FormDataEntryValue[]>();
  for (const [key, value] of formData.entries()) {
    if (key === "section" || key === "id") continue;
    values.set(key, value);
  }
  return values;
}

async function applyFileUploads(
  definition: AdminFormDefinition,
  formData: FormData,
  payload: Record<string, unknown>,
) {
  const { client, missing } = getServiceSupabase();
  if (!client) {
    throw new Error(`Supabase is not configured: ${missing.join(", ")}`);
  }

  for (const field of definition.fields) {
    if (field.type !== "file" || !field.bucket) continue;

    const entry = formData.get(field.name);
    if (!(entry instanceof File) || entry.size === 0) continue;

    const safeName = entry.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const path = `${definition.table}/${Date.now()}-${safeName}`;
    const upload = await client.storage
      .from(field.bucket)
      .upload(path, entry, {
        contentType: entry.type || "application/octet-stream",
        upsert: false,
      });

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    payload[field.name] = upload.data.path;
  }
}

function adminError(section: AdminSection, message: string) {
  redirect(`/admin/${section}?error=${encodeURIComponent(message)}`);
}

export async function createAdminRecord(formData: FormData) {
  const section = sectionFromForm(formData);
  await requireAdminActionAccess();

  const definition = adminFormDefinitions[section];
  if (!definition) adminError(section, "This section does not support create actions.");

  const { client, missing } = getServiceSupabase();
  if (!client) adminError(section, `Supabase is not configured: ${missing.join(", ")}`);

  const payload = buildMutationPayload(section, valuesFromForm(formData));
  try {
    await applyFileUploads(definition!, formData, payload);
  } catch (error) {
    adminError(section, error instanceof Error ? error.message : "File upload failed.");
  }
  const { error } = await client!.from(definition!.table).insert(payload);
  if (error) adminError(section, error.message);

  revalidatePath(`/admin/${section}`);
  redirect(`/admin/${section}?saved=1`);
}

export async function updateAdminRecord(formData: FormData) {
  const section = sectionFromForm(formData);
  const id = String(formData.get("id") ?? "");
  await requireAdminActionAccess();

  const definition = adminFormDefinitions[section];
  if (!definition) adminError(section, "This section does not support update actions.");
  if (!id) adminError(section, "Missing record id.");

  const { client, missing } = getServiceSupabase();
  if (!client) adminError(section, `Supabase is not configured: ${missing.join(", ")}`);

  const payload = buildMutationPayload(section, valuesFromForm(formData));
  try {
    await applyFileUploads(definition!, formData, payload);
  } catch (error) {
    adminError(section, error instanceof Error ? error.message : "File upload failed.");
  }
  const { error } = await client!.from(definition!.table).update(payload).eq("id", id);
  if (error) adminError(section, error.message);

  revalidatePath(`/admin/${section}`);
  redirect(`/admin/${section}?saved=1`);
}

export async function deleteAdminRecord(formData: FormData) {
  const section = sectionFromForm(formData);
  const id = String(formData.get("id") ?? "");
  await requireAdminActionAccess();

  const definition = adminFormDefinitions[section];
  if (!definition) adminError(section, "This section does not support delete actions.");
  if (!id) adminError(section, "Missing record id.");

  const { client, missing } = getServiceSupabase();
  if (!client) adminError(section, `Supabase is not configured: ${missing.join(", ")}`);

  const { error } = await client!.from(definition!.table).delete().eq("id", id);
  if (error) adminError(section, error.message);

  revalidatePath(`/admin/${section}`);
  redirect(`/admin/${section}?deleted=1`);
}

export async function updateLeadStatus(formData: FormData) {
  await requireAdminActionAccess();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new");
  if (!id) adminError("leads", "Missing lead id.");

  const { client, missing } = getServiceSupabase();
  if (!client) adminError("leads", `Supabase is not configured: ${missing.join(", ")}`);

  const { error } = await client!.from("leads").update({ status }).eq("id", id);
  if (error) adminError("leads", error.message);

  revalidatePath("/admin/leads");
  redirect("/admin/leads?saved=1");
}

export async function convertLeadToClient(formData: FormData) {
  await requireAdminActionAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) adminError("leads", "Missing lead id.");

  const { client, missing } = getServiceSupabase();
  if (!client) adminError("leads", `Supabase is not configured: ${missing.join(", ")}`);

  const lead = await client!
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  if (lead.error) adminError("leads", lead.error.message);

  const inserted = await client!
    .from("clients")
    .insert({
      business_unit_id: lead.data.business_unit_id,
      name: lead.data.business_name,
      contact_name: lead.data.contact_name,
      email: lead.data.email,
      phone: lead.data.phone,
      notes: lead.data.project_description,
    })
    .select("id")
    .single();
  if (inserted.error) adminError("leads", inserted.error.message);

  const update = await client!
    .from("leads")
    .update({ status: "won" })
    .eq("id", id);
  if (update.error) adminError("leads", update.error.message);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=1");
}
