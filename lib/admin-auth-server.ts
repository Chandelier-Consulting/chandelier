import { cookies } from "next/headers";
import { ADMIN_ACCESS_COOKIE } from "@/lib/admin-auth";
import { adminEmails } from "@/lib/env";
import {
  describeAdminAccess,
  getPublicSupabase,
} from "@/lib/admin-auth";
import { redirect } from "next/navigation";

type AdminActor = {
  uid: string | null;
  email: string | null;
};

export async function requireAdminActor() {
  const allowlist = adminEmails();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;

  if (allowlist.length > 0 && !accessToken) {
    redirect("/admin/login?error=Admin access requires an allowlisted session.");
  }

  const { client, missing } = getPublicSupabase();
  if (!client) {
    redirect(`/admin/login?error=Supabase auth is not configured: ${missing.join(", ")}`);
  }

  const access = await describeAdminAccess(client, accessToken, allowlist);
  if (!access.ok) {
    redirect("/admin/login?error=That Supabase account is not allowlisted for admin access.");
  }

  return {
    uid: access.user?.id ?? null,
    email: access.email,
  } satisfies AdminActor;
}

export async function maybeAdminActor() {
  const allowlist = adminEmails();
  if (allowlist.length === 0) {
    return null;
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const { client } = getPublicSupabase();
  if (!client || !accessToken) {
    return null;
  }

  const access = await describeAdminAccess(client, accessToken, allowlist);
  if (!access.ok) {
    return null;
  }

  return {
    uid: access.user?.id ?? null,
    email: access.email,
  } satisfies AdminActor;
}
