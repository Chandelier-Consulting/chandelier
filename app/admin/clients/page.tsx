import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, deleteClient, updateClient } from "@/app/admin/pipeline-actions";
import { loadClients } from "@/lib/admin-pipeline-data";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAdminActor } from "@/lib/admin-auth-server";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  await requireAdminActor();
  const { saved, deleted, error } = await searchParams;

  const { client, missing } = getServiceSupabase();
  if (!client) {
    notFound();
  }

  const clients = await loadClients(client);

  return (
    <section className="admin-page">
      <header className="admin-header">
        <div>
          <p>Admin clients</p>
          <h1>Clients</h1>
        </div>
        <span>Manage legal entities, contacts, and billing settings for project pipelines.</span>
      </header>

      {error ? <p className="admin-notice">{error}</p> : null}
      {saved || deleted ? <p className="admin-notice">Changes saved.</p> : null}

      {!missing.length ? null : <p className="admin-notice">Missing Supabase config: {missing.join(", ")}</p>}

      <div className="admin-workspace">
        <form action={createClient} className="admin-record-form">
          <h2 className="admin-section-title">Create client</h2>
          <div className="form-grid">
            <label className="field">
              Legal name
              <input name="legal_name" required />
            </label>
            <label className="field">
              Display name
              <input name="display_name" />
            </label>
            <label className="field">
              Contact name
              <input name="contact_name" />
            </label>
            <label className="field">
              Email
              <input name="email" type="email" />
            </label>
            <label className="field">
              Phone
              <input name="phone" />
            </label>
            <label className="field">
              Billing email
              <input name="billing_email" type="email" />
            </label>
            <label className="field">
              Website
              <input name="company_website" type="url" />
            </label>
            <label className="field full">
              Address
              <textarea name="address" />
            </label>
          </div>
          <button className="btn" type="submit">
            Create client
          </button>
        </form>

        <section className="admin-section">
          <h2 className="admin-section-title">Client records ({clients.length})</h2>
          <div className="admin-records">
            {clients.length === 0 ? (
              <article>
                <p>No clients yet. Create the first client to begin pipelines.</p>
              </article>
            ) : null}
            {clients.map((record) => (
              <article key={record.id}>
                <div className="admin-record-main">
                  <div>
                    <h2>{record.legal_name || record.display_name || "Unnamed client"}</h2>
                    <div className="admin-record-meta">
                      <span>{record.display_name ? `Display: ${record.display_name}` : "Display name missing"}</span>
                      <span>{record.contact_name || "Contact missing"}</span>
                      <span>{record.email || "Email missing"}</span>
                      <span>{record.phone || "Phone missing"}</span>
                    </div>
                  </div>
                <div className="admin-record-actions">
                  <a className="btn ghost" href={`/admin/projects?client=${record.id}`}>
                    Projects
                  </a>
                </div>
                </div>
                <dl className="admin-details">
                  <div>
                    <dt>Billing email</dt>
                    <dd>{record.billing_email || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Website</dt>
                    <dd>{record.company_website || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{new Date(record.updated_at).toLocaleString()}</dd>
                  </div>
                </dl>
                <details className="admin-edit">
                  <summary>Edit</summary>
                  <form action={updateClient} className="admin-record-form">
                    <input name="id" type="hidden" value={record.id} />
                    <div className="form-grid">
                      <label className="field">
                        Legal name
                        <input defaultValue={record.legal_name || ""} name="legal_name" required />
                      </label>
                      <label className="field">
                        Display name
                        <input defaultValue={record.display_name || ""} name="display_name" />
                      </label>
                      <label className="field">
                        Contact name
                        <input defaultValue={record.contact_name || ""} name="contact_name" />
                      </label>
                      <label className="field">
                        Email
                        <input defaultValue={record.email || ""} name="email" type="email" />
                      </label>
                      <label className="field">
                        Phone
                        <input defaultValue={record.phone || ""} name="phone" />
                      </label>
                      <label className="field">
                        Billing email
                        <input defaultValue={record.billing_email || ""} name="billing_email" type="email" />
                      </label>
                      <label className="field full">
                        Company website
                        <input defaultValue={record.company_website || ""} name="company_website" type="url" />
                      </label>
                      <label className="field full">
                        Address
                        <textarea defaultValue={record.address || ""} name="address" />
                      </label>
                    </div>
                    <button className="btn" type="submit">
                      Save client
                    </button>
                  </form>
                  <form action={deleteClient} className="admin-delete-form">
                    <input name="id" type="hidden" value={record.id} />
                    <button className="btn ghost" type="submit">
                      Delete client
                    </button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
