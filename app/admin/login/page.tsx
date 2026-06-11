import { redirect } from "next/navigation";
import { getPublicSupabase } from "@/lib/admin-auth";
import { adminEmails, env } from "@/lib/env";

async function sendLoginLink(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const allowlist = adminEmails();

  if (!email) {
    redirect("/admin/login?error=Email is required.");
  }

  if (allowlist.length > 0 && !allowlist.includes(email)) {
    redirect("/admin/login?error=That email is not allowlisted for admin access.");
  }

  const { client, missing } = getPublicSupabase();
  if (!client) {
    redirect(`/admin/login?error=Supabase auth is not configured: ${missing.join(", ")}`);
  }

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/admin`,
    },
  });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/login?sent=1");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <section className="admin-page admin-login">
      <header>
        <p>Chandelier Consulting OS</p>
        <h1>Admin access</h1>
        <span>Use an allowlisted Supabase Auth email to enter the admin portal.</span>
      </header>
      <form action={sendLoginLink} className="invoice-panel admin-login-form">
        <label className="field">
          Admin email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <button className="btn" type="submit">
          Send sign-in link
        </button>
        {sent ? <p className="note">Check your email for the Supabase sign-in link.</p> : null}
        {error ? <p className="note error-note">{error}</p> : null}
      </form>
    </section>
  );
}
