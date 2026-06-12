import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buildAdminSessionCookies, describeAdminAccess, getPublicSupabase } from "@/lib/admin-auth";
import { adminEmails } from "@/lib/env";

async function signInWithPassword(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    redirect("/admin/login?error=Email is required.");
  }

  if (!password) {
    redirect("/admin/login?error=Password is required.");
  }

  const { client, missing } = getPublicSupabase();
  if (!client) {
    redirect(`/admin/login?error=Supabase auth is not configured: ${missing.join(", ")}`);
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    redirect(`/admin/login?error=${encodeURIComponent(error?.message ?? "Supabase did not return a session.")}`);
  }

  const access = await describeAdminAccess(client, data.session.access_token, adminEmails());
  if (!access.ok) {
    redirect("/admin/login?error=That Supabase account is not allowlisted for admin access.");
  }

  const cookieStore = await cookies();
  for (const cookie of buildAdminSessionCookies(data.session)) {
    cookieStore.set(cookie.name, cookie.value, {
      ...cookie.options,
      maxAge: cookie.maxAge,
    });
  }

  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section className="admin-page admin-login">
      <header>
        <p>Chandelier Consulting OS</p>
        <h1>Admin access</h1>
        <span>Sign in with your Supabase admin account.</span>
      </header>
      <form action={signInWithPassword} className="invoice-panel admin-login-form">
        <label className="field">
          Admin email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn" type="submit">
          Sign in
        </button>
        {error ? <p className="note error-note">{error}</p> : null}
      </form>
    </section>
  );
}
