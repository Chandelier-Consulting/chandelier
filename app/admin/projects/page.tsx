import Link from "next/link";
import {
  createProject,
  setProjectPhaseAction,
} from "@/app/admin/pipeline-actions";
import { requireAdminActor } from "@/lib/admin-auth-server";
import {
  loadBillingPatterns,
  loadClients,
  loadProjects,
  type AdminProject,
} from "@/lib/admin-pipeline-data";
import { projectPhaseLabel, projectPhaseOrder } from "@/lib/admin-pipeline";
import { getServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function sortProjects(projects: AdminProject[]) {
  return [...projects].sort((a, b) => {
    return b.updated_at.localeCompare(a.updated_at);
  });
}

function nextPhase(phase: string) {
  const index = projectPhaseOrder.indexOf(phase as (typeof projectPhaseOrder)[number]);
  if (index < 0) return projectPhaseOrder[0];
  if (index + 1 >= projectPhaseOrder.length) return projectPhaseOrder[index];
  return projectPhaseOrder[index + 1];
}

function filterUrl(currentPhase: string, currentStatus: string, options: { phase?: string; status?: string }) {
  const params = new URLSearchParams();
  const nextPhase = options.phase;
  const nextStatus = options.status;

  if (nextPhase && nextPhase !== "all") params.set("phase", nextPhase);
  if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);

  const next = params.toString();
  return `/admin/projects${next ? `?${next}` : ""}`;
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; phase?: string; status?: string; client?: string }>;
}) {
  const { saved, error, phase, status, client: clientFilter } = await searchParams;

  const { client, missing } = getServiceSupabase();
  if (!client) {
    return (
      <section className="admin-page">
        <header className="admin-header">
          <div>
            <p>Project pipeline</p>
            <h1>Projects</h1>
          </div>
          <span>Build and manage projects through phases, documents, and billing milestones.</span>
        </header>
        <p className="admin-notice">Supabase is not configured: {missing.join(", ")}</p>
      </section>
    );
  }

  await requireAdminActor();

  const [projectsRaw, clients, patterns] = await Promise.all([
    loadProjects(client),
    loadClients(client),
    loadBillingPatterns(client),
  ]);

  const phaseFilter = phase && projectPhaseOrder.includes(phase as (typeof projectPhaseOrder)[number]) ? phase : "all";
  const statusFilter = status?.trim() ? status : "all";
  const requestedClientId = clientFilter?.trim() ?? "";

  const clientsById = new Map(clients.map((entry) => [entry.id, entry]));
  const filtered = sortProjects(
    projectsRaw.filter((project) => {
      const phaseMatch = phaseFilter === "all" || project.phase === phaseFilter;
      const statusMatch = statusFilter === "all" || project.status === statusFilter;
      const clientMatch = !requestedClientId || project.client_id === requestedClientId;
      return phaseMatch && statusMatch && clientMatch;
    }),
  );

  const statuses = Array.from(new Set(projectsRaw.map((entry) => entry.status))).filter(Boolean);

  return (
    <section className="admin-page">
      <header className="admin-header">
        <div>
          <p>Project pipeline</p>
          <h1>Projects</h1>
        </div>
        <span>Build and manage projects through phases, documents, and billing milestones.</span>
      </header>

      {error ? <p className="admin-notice">{error}</p> : null}
      {saved ? <p className="admin-notice">Saved.</p> : null}
      {!missing.length ? null : <p className="admin-notice">Missing Supabase config: {missing.join(", ")}</p>}

      <div className="admin-command-grid">
        <form action={createProject} className="admin-form-card">
          <h2 className="admin-section-title">Create project</h2>
          <div className="form-grid">
            <label className="field">
              Client
              <select name="client_id" required>
                <option value="">Select client</option>
                {clients.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.legal_name || entry.display_name || entry.name || "Unnamed client"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Project name
              <input name="name" required />
            </label>
            <label className="field">
              Total amount
              <input name="total_amount" type="number" step="0.01" min="0" required />
            </label>
            <label className="field">
              Currency
              <input name="currency" defaultValue="USD" />
            </label>
            <label className="field">
              Status
              <input name="status" defaultValue="active" />
            </label>
            <label className="field">
              Phase start
              <select name="phase">
                {projectPhaseOrder.map((phaseId) => (
                  <option key={phaseId} value={phaseId}>
                    {projectPhaseLabel(phaseId)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Billing pattern
              <select name="billing_pattern_id" required>
                {patterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="field full">
              Scope summary
              <textarea name="scope_summary" />
            </label>
            <label className="field full">
              Deliverables (one per line)
              <textarea name="deliverables" />
            </label>
            <label className="field">
              Start date
              <input name="start_date" type="date" />
            </label>
            <label className="field">
              Target end date
              <input name="target_end_date" type="date" />
            </label>
            <label className="field full">
              Custom billing steps (optional)
              <span style={{ color: "var(--muted)" }}>
                Label | phase_slug | percentage | amount_cents
              </span>
              <textarea name="custom_steps" />
            </label>
          </div>
          <button className="btn" type="submit">
            Create project
          </button>
        </form>

        <section className="admin-form-card">
          <h2 className="admin-section-title">Filters</h2>
          <div className="admin-details">
            <div>
              <dt>Phase</dt>
                  <dd>
                    {[
                      "all",
                      ...projectPhaseOrder,
                    ].map((value) => {
                      const active = phaseFilter === value;
                      const href = filterUrl(phaseFilter, statusFilter, {
                        phase: value,
                        status: statusFilter === "all" ? undefined : statusFilter,
                      });
                      return (
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={`btn ghost${active ? "" : ""}`}
                      href={href}
                      key={`phase-filter-${value}`}
                    >
                      {value === "all" ? "All phases" : projectPhaseLabel(value)}
                    </Link>
                  );
                })}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
                  <dd>
                    {[
                      "all",
                      ...statuses,
                    ].map((value) => {
                      const active = statusFilter === value;
                      const href = filterUrl(phaseFilter, statusFilter, {
                        phase: phaseFilter === "all" ? undefined : phaseFilter,
                        status: value,
                      });
                      return (
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={`btn ghost${active ? "" : ""}`}
                      href={href}
                      key={`status-filter-${value}`}
                    >
                      {value === "all" ? "All status" : value}
                    </Link>
                  );
                })}
              </dd>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-section">
        <h2 className="admin-section-title">Projects ({filtered.length})</h2>
        <div className="admin-data-table">
          <div className="admin-table-head" aria-hidden="true">
            <span>Project</span>
            <span>Client</span>
            <span>Value</span>
            <span>Phase</span>
            <span>Commands</span>
          </div>
          {filtered.length === 0 ? (
            <article className="admin-table-row">
              <div className="primary" data-label="Project">
                <strong>No projects match filters.</strong>
                <span>Adjust phase/status filters to show rows.</span>
              </div>
            </article>
          ) : null}
          {filtered.map((project) => {
            const clientName = clientsById.get(project.client_id || "")?.legal_name || "Unassigned";
            const projectNextPhase = nextPhase(project.phase);
            return (
              <article className="admin-table-row" key={project.id}>
                <div className="primary" data-label="Project">
                  <strong>{project.name}</strong>
                  <span>{project.scope_summary || "No scope summary"}</span>
                </div>
                <div data-label="Client">
                  <strong>{clientName}</strong>
                </div>
                <div data-label="Value">
                  <strong>{formatMoney(project.total_amount_cents)}</strong>
                </div>
                <div data-label="Phase">
                  <span className="admin-pill">{projectPhaseLabel(project.phase)}</span>
                </div>
                <div className="admin-table-actions" data-label="Commands">
                  <Link className="btn" href={`/admin/projects/${project.id}`}>
                    Open
                  </Link>
                  {projectNextPhase === project.phase ? null : (
                    <form action={setProjectPhaseAction}>
                      <input name="project_id" type="hidden" value={project.id} />
                      <input name="phase" type="hidden" value={projectNextPhase} />
                      <button className="btn ghost" type="submit">
                        Advance
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
