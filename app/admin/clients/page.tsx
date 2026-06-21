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
  const { saved, deleted, error } = await searchParams;

  const { client, missing } = getServiceSupabase();
  if (!client) {
    return (
      <section className="admin-page">
        <header className="admin-header">
          <div>
            <p>Admin clients</p>
            <h1>Clients</h1>
          </div>
          <span>Add restaurants fast, then fill in contact details only when they matter.</span>
        </header>
        <p className="admin-notice">Supabase is not configured: {missing.join(", ")}</p>
      </section>
    );
  }

  await requireAdminActor();

  const clients = await loadClients(client);

  return (
    <section className="admin-page">
      <header className="admin-header">
        <div>
          <p>Admin clients</p>
          <h1>Clients</h1>
        </div>
        <span>Add restaurants fast, then fill in contact details only when they matter.</span>
      </header>

      {error ? <p className="admin-notice">{error}</p> : null}
      {saved || deleted ? <p className="admin-notice">Changes saved.</p> : null}

      {!missing.length ? null : <p className="admin-notice">Missing Supabase config: {missing.join(", ")}</p>}

      <div className="admin-workspace">
        <form action={createClient} className="admin-record-form">
          <h2 className="admin-section-title">Create client</h2>
          <div className="form-grid">
            <label className="field full">
              Restaurant name
              <input name="restaurant_name" placeholder="Rivera Bakery" required />
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
                    <h2>{record.display_name || record.legal_name || record.name || "Unnamed client"}</h2>
                    <div className="admin-record-meta">
                      <span>{record.legal_name || record.display_name || record.name || "Name set"}</span>
                      <span>{record.contact_name || "Contact optional"}</span>
                      <span>{record.email || "Email missing"}</span>
                      <span>{record.phone || "Phone optional"}</span>
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
                        Restaurant name
                        <input defaultValue={record.display_name || record.name || record.legal_name || ""} name="restaurant_name" required />
                      </label>
                      <label className="field">
                        Legal name
                        <input defaultValue={record.legal_name || ""} name="legal_name" />
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
