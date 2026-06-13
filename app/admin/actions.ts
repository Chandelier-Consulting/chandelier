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
  const redirectSection = adminFormDefinitions[section]?.redirectSection ?? section;
  redirect(`/admin/${redirectSection}?error=${encodeURIComponent(message)}`);
}

function adminSaved(section: AdminSection) {
  const redirectSection = adminFormDefinitions[section]?.redirectSection ?? section;
  redirect(`/admin/${redirectSection}?saved=1`);
}

function adminDeleted(section: AdminSection) {
  const redirectSection = adminFormDefinitions[section]?.redirectSection ?? section;
  redirect(`/admin/${redirectSection}?deleted=1`);
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

  revalidatePath(`/admin/${definition!.redirectSection}`);
  adminSaved(section);
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

  revalidatePath(`/admin/${definition!.redirectSection}`);
  adminSaved(section);
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

  revalidatePath(`/admin/${definition!.redirectSection}`);
  adminDeleted(section);
}
