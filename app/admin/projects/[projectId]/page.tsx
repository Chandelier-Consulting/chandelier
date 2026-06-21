import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAdminActor } from "@/lib/admin-auth-server";
import {
  createInvoiceForStepAction,
  generateDocumentAction,
  issueSigningSessionAction,
  markBillingStepPaidAction,
  markSignedManuallyAction,
  revokeSigningSessionAction,
  setProjectPhaseAction,
  advanceProjectPhaseAction,
} from "@/app/admin/pipeline-actions";
import {
  documentTypeLabel,
  lightweightAgreementDocumentTypes,
  projectPhaseLabel,
  phaseRows,
  projectPhaseOrder,
  type DocumentType,
} from "@/lib/admin-pipeline";
import {
  getProjectWorkspace,
  type BillingStepRow,
  type DocumentRow,
  type PhaseEventRow,
  type ProjectWorkspace,
  type SigningSessionRow,
  phaseTimelineFromProject,
} from "@/lib/admin-pipeline-data";
import { loadSignedUrlForDocument, signingLink } from "@/lib/admin-documents";

type AdminProjectTab = "overview" | "phase" | "documents" | "billing" | "signing";

type DocumentWorkspaceRow = {
  type: DocumentType;
  document: DocumentRow | null;
  docxUrl: string | null;
  pdfUrl: string | null;
  activeSession: SigningSessionRow | null;
};

export const dynamic = "force-dynamic";

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function parseTab(raw: string | undefined | null): AdminProjectTab {
  switch (raw) {
    case "phase":
    case "documents":
    case "billing":
    case "signing":
      return raw;
    default:
      return "overview";
  }
}

function statusTone(status: string) {
  if (status === "signed") return "status-ok";
  if (status === "issued" || status === "viewed") return "status-work";
  if (status === "void") return "status-bad";
  return "status-muted";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

function buildPhaseTabBase(projectId: string, tab: AdminProjectTab) {
  const base = new URLSearchParams();
  if (tab !== "overview") base.set("tab", tab);
  return `/admin/projects/${projectId}${base.toString() ? `?${base}` : ""}`;
}

function buildPhaseActionHref(projectId: string, tab: AdminProjectTab) {
  const base = new URLSearchParams();
  base.set("tab", tab);
  return `/admin/projects/${projectId}?${base.toString()}`;
}

function activeSessionForDoc(documentId: string, sessions: SigningSessionRow[]) {
  return sessions.find(
    (entry) =>
      entry.document_id === documentId &&
      (entry.status === "active" || entry.status === "viewed"),
  ) ?? null;
}

export default async function ProjectWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    tab?: string;
    saved?: string;
    error?: string;
    issued_session?: string;
    issued_doc?: string;
    issued_token?: string;
  }>;
}) {
  await requireAdminActor();
  const { projectId } = await params;
  const { tab: requestedTab, saved, error, issued_session, issued_doc, issued_token } = await searchParams;
  const tab = parseTab(requestedTab);

  const { client, missing } = getServiceSupabase();
  if (!client) {
    notFound();
  }

  let workspace: ProjectWorkspace;
  try {
    workspace = await getProjectWorkspace(client, projectId);
  } catch (loadError) {
    notFound();
  }

  const project = workspace.project;
  const documentsByType: DocumentWorkspaceRow[] = [];
  const allDocumentTypes: DocumentType[] = [...lightweightAgreementDocumentTypes];

  for (const type of allDocumentTypes) {
    const document = workspace.documents.find((entry) => entry.type === type) ?? null;
    const docSignedUrls =
      document ? await loadSignedUrlForDocument(client, document).catch(() => ({ docxUrl: null, pdfUrl: null })) : { docxUrl: null, pdfUrl: null };
    documentsByType.push({
      type,
      document,
      docxUrl: docSignedUrls.docxUrl,
      pdfUrl: docSignedUrls.pdfUrl,
      activeSession: document ? activeSessionForDoc(document.id, workspace.signingSessions) : null,
    });
  }

  const timeline = phaseTimelineFromProject(project);

  const billingSteps = [...workspace.billingSteps].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );

  const phaseActions = phaseRows();

  const hasNotice = Boolean(saved) || Boolean(error);

  return (
    <section className="admin-page">
      <header className="admin-header">
        <div>
          <p>Project workspace</p>
          <h1>{project.name}</h1>
        </div>
        <span>
          {workspace.client?.display_name || workspace.client?.name || "Unassigned client"} · {projectPhaseLabel(project.phase)}
        </span>
      </header>

      <div className="admin-inline-actions" style={{ marginBottom: 14 }}>
        <Link className="btn ghost" href="/admin/projects">
          Back to projects
        </Link>
        <Link className="btn ghost" href={buildPhaseActionHref(projectId, "overview")}>
          Reopen overview
        </Link>
      </div>

      {!missing.length ? null : (
        <p className="admin-notice">Missing Supabase config: {missing.join(", ")}</p>
      )}
      {hasNotice ? <p className="admin-notice">{error ?? "Saved."}</p> : null}

      <nav className="admin-tabs" aria-label="Project workspace tabs">
        <Link className={tab === "overview" ? "admin-tab active" : "admin-tab"} href={buildPhaseTabBase(projectId, "overview")}>
          Overview
        </Link>
        <Link className={tab === "phase" ? "admin-tab active" : "admin-tab"} href={buildPhaseTabBase(projectId, "phase")}>
          Phase Tracking
        </Link>
        <Link
          className={tab === "documents" ? "admin-tab active" : "admin-tab"}
          href={buildPhaseTabBase(projectId, "documents")}
        >
          Documents
        </Link>
        <Link className={tab === "billing" ? "admin-tab active" : "admin-tab"} href={buildPhaseTabBase(projectId, "billing")}>
          Billing
        </Link>
        <Link
          className={tab === "signing" ? "admin-tab active" : "admin-tab"}
          href={buildPhaseTabBase(projectId, "signing")}
        >
          Signing Audit
        </Link>
      </nav>

      {tab === "overview" ? (
        <div className="admin-command-grid">
          <article className="admin-form-card">
            <h2 className="admin-section-title">Project overview</h2>
            <div className="admin-details">
              <div>
                <dt>Client</dt>
                <dd>{workspace.client?.display_name || workspace.client?.legal_name || workspace.client?.name || "Unassigned"}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{formatMoney(project.total_amount_cents, project.currency)}</dd>
              </div>
              <div>
                <dt>Billing pattern</dt>
                <dd>{workspace.billingPattern?.name || "Custom / Manual"}</dd>
              </div>
              <div>
                <dt>Current phase</dt>
                <dd>{projectPhaseLabel(project.phase)}</dd>
              </div>
              <div>
                <dt>Start date</dt>
                <dd>{formatDate(project.start_date)}</dd>
              </div>
              <div>
                <dt>Target end</dt>
                <dd>{formatDate(project.target_end_date)}</dd>
              </div>
            </div>
            <p className="note" style={{ marginTop: 12 }}>
              {project.scope_summary || "No scope summary supplied."}
            </p>
          </article>

          <article className="admin-form-card">
            <h2 className="admin-section-title">Phase progress</h2>
            <div className="admin-phase-timeline" aria-label="Project phase timeline">
              {timeline.map((entry) => (
                <div className={`admin-phase-step ${entry.isReached ? "is-reached" : ""}`} key={`${project.id}-${entry.phase}`}>
                  <strong>{entry.label}</strong>
                  <span>{entry.isReached ? "Completed" : "Pending"}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      {tab === "phase" ? (
        <div className="admin-command-grid">
          <article className="admin-form-card">
            <h2 className="admin-section-title">Manual phase update</h2>
            <form action={setProjectPhaseAction} className="admin-record-form">
              <input name="project_id" type="hidden" value={project.id} />
              <div className="form-grid">
                <label className="field">
                  Set phase
                  <select name="phase" defaultValue={project.phase}>
                    {projectPhaseOrder.map((entry) => (
                      <option key={entry} value={entry}>
                        {projectPhaseLabel(entry)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field full">
                  Note
                  <textarea name="note" defaultValue="Manual phase update." />
                </label>
              </div>
              <button className="btn" type="submit">
                Update phase
              </button>
            </form>
          </article>

          <article className="admin-form-card">
            <h2 className="admin-section-title">Phase history</h2>
            <div className="admin-data-table">
              <div className="admin-table-head">
                <span>Phase</span>
                <span>Action</span>
                <span>Actor</span>
                <span>Time</span>
              </div>
              {workspace.phaseEvents.length === 0 ? (
                <article className="admin-table-row">
                  <div className="primary" data-label="Phase">
                    <strong>No phase events yet.</strong>
                    <span>Advance the phase to begin event logging.</span>
                  </div>
                </article>
              ) : null}
              {workspace.phaseEvents.map((event: PhaseEventRow) => (
                <article className="admin-table-row" key={event.id}>
                  <div data-label="Phase">
                    <strong>{projectPhaseLabel((event.phase as Parameters<typeof projectPhaseLabel>[0]) ?? "lead_qualified")}</strong>
                  </div>
                  <div data-label="Action">
                    <span>{event.action}</span>
                    {event.note ? <span>{event.note}</span> : null}
                  </div>
                  <div data-label="Actor">
                    <span>{event.actor_email || event.actor_uid || "System"}</span>
                  </div>
                  <div data-label="Time">
                    <span>{formatDate(event.created_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-form-card">
            <h2 className="admin-section-title">Quick phase progression</h2>
            <div className="admin-inline-actions">
              <form action={advanceProjectPhaseAction}>
                <input name="project_id" type="hidden" value={project.id} />
                <button className="btn" type="submit">
                  Advance to next phase
                </button>
              </form>
              {project.phase === "handoff_complete" ? <span className="admin-notice">Project already at final phase.</span> : null}
            </div>
          </article>
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="admin-workspace">
          <article className="admin-section">
            <h2 className="admin-section-title">Generated documents</h2>
            <div className="admin-command-grid">
              {documentsByType.map((entry) => {
                const issuedLink =
                  issued_session && issued_doc === entry.document?.id && issued_token
                    ? signingLink(issued_session, issued_token)
                    : null;

                const activeSession = entry.activeSession;

                return (
                  <article className="admin-form-card" key={entry.type}>
                    <h2>{documentTypeLabel(entry.type)}</h2>
                    <div className="admin-details" style={{ marginBottom: 12 }}>
                      <div>
                        <dt>Type</dt>
                        <dd>{entry.type}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>
                          <span className={`admin-pill ${statusTone(entry.document?.status ?? "draft")}`}>
                            {entry.document?.status ?? "No draft"}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatDate(entry.document?.updated_at)}</dd>
                      </div>
                      <div>
                        <dt>Signer</dt>
                        <dd>{entry.document?.signer_name || "Not signed"}</dd>
                      </div>
                    </div>

                    <div className="admin-inline-actions">
                      <form action={generateDocumentAction} className="admin-inline-actions">
                        <input name="project_id" type="hidden" value={project.id} />
                        <input name="type" type="hidden" value={entry.type} />
                        <button className="btn" type="submit">
                          Generate Draft
                        </button>
                      </form>

                      <div className="admin-inline-actions">
                        {entry.docxUrl ? (
                          <a className="btn ghost" href={entry.docxUrl} rel="noreferrer" target="_blank">
                            Preview
                          </a>
                        ) : null}
                        {entry.docxUrl ? (
                          <a className="btn ghost" href={entry.docxUrl} download>
                            Download DOCX
                          </a>
                        ) : null}
                        {entry.pdfUrl ? (
                          <a className="btn ghost" href={entry.pdfUrl} rel="noreferrer" target="_blank">
                            Download PDF
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {issuedLink ? (
                      <details className="admin-command-panel" style={{ marginTop: 10 }} open>
                        <summary>Signing link generated</summary>
                        <p className="field-help">Share this private link with the signer. It expires automatically.</p>
                        <input className="admin-record-form" defaultValue={issuedLink} readOnly style={{ width: "100%", borderRadius: 8 }} />
                        <a className="btn" href={issuedLink} rel="noreferrer" target="_blank">
                          Open link
                        </a>
                      </details>
                    ) : null}

                    {entry.document && entry.document.status !== "signed" ? (
                      <form action={markSignedManuallyAction} className="admin-inline-actions" style={{ marginTop: 10 }}>
                        <input name="project_id" type="hidden" value={project.id} />
                        <input name="document_id" type="hidden" value={entry.document.id} />
                        <input name="signer_name" placeholder="Signer name" type="text" />
                        <input
                          name="signer_email"
                          placeholder="Signer email"
                          type="email"
                          defaultValue={workspace.client?.email || ""}
                        />
                        <button className="btn ghost" type="submit">
                          Mark Signed Manually
                        </button>
                      </form>
                    ) : null}

                    {entry.document ? (
                      <div className="admin-inline-actions" style={{ marginTop: 10 }}>
                        <form action={issueSigningSessionAction}>
                          <input name="project_id" type="hidden" value={project.id} />
                          <input name="document_id" type="hidden" value={entry.document.id} />
                          <input
                            name="signer_name"
                            placeholder="Signer name"
                            defaultValue={workspace.client?.contact_name || workspace.client?.display_name || workspace.client?.name || ""}
                          />
                          <input
                            name="signer_email"
                            placeholder="Signer email"
                            type="email"
                            defaultValue={workspace.client?.billing_email || workspace.client?.email || ""}
                          />
                          <button className="btn ghost" type="submit">
                            Issue for Signature
                          </button>
                        </form>

                        {activeSession ? (
                          <form action={revokeSigningSessionAction}>
                            <input name="project_id" type="hidden" value={project.id} />
                            <input name="session_id" type="hidden" value={activeSession.id} />
                            <button className="btn ghost" type="submit">
                              Revoke Signing Link
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </article>
        </div>
      ) : null}

      {tab === "billing" ? (
        <div className="admin-command-grid">
          <article className="admin-form-card">
            <h2 className="admin-section-title">Billing steps</h2>
            <div className="admin-data-table">
              <div className="admin-table-head">
                <span>Label</span>
                <span>Trigger</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Commands</span>
              </div>

              {billingSteps.length === 0 ? (
                <article className="admin-table-row">
                  <div className="primary" data-label="Label">
                    <strong>No billing steps found.</strong>
                    <span>Generate a project with a billing pattern to create step rows.</span>
                  </div>
                </article>
              ) : null}

              {billingSteps.map((step: BillingStepRow) => {
                const label = step.percentage ? `${step.percentage}%` : "(manual)";
                return (
                  <article className="admin-table-row" key={step.id}>
                    <div data-label="Label">
                      <strong>{step.label}</strong>
                    </div>
                    <div data-label="Trigger">
                      <span>{projectPhaseLabel(step.trigger_phase as Parameters<typeof projectPhaseLabel>[0])}</span>
                    </div>
                    <div data-label="Amount">
                      <strong>{formatMoney(step.amount_cents, project.currency)}</strong>
                      <span>{label}</span>
                    </div>
                    <div data-label="Status">
                      <span className={`admin-pill ${statusTone(step.status)}`}>{step.status}</span>
                    </div>
                    <div className="admin-table-actions" data-label="Commands">
                      <form action={createInvoiceForStepAction}>
                        <input name="project_id" type="hidden" value={project.id} />
                        <input name="step_id" type="hidden" value={step.id} />
                        <input name="due_date" type="date" />
                        <button className="btn ghost" type="submit">
                          Create invoice
                        </button>
                      </form>

                      <form action={markBillingStepPaidAction}>
                        <input name="project_id" type="hidden" value={project.id} />
                        <input name="step_id" type="hidden" value={step.id} />
                        <button className="btn ghost" type="submit">
                          Mark Paid
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="admin-form-card">
            <h2 className="admin-section-title">Billing audit</h2>
            <p className="note">
              Each invoice step can be manually created when the corresponding trigger phase is reached. Manual placeholder mode
              is available when Stripe integration has not been configured.
            </p>
          </article>
        </div>
      ) : null}

      {tab === "signing" ? (
        <div className="admin-command-grid">
          <article className="admin-form-card">
            <h2 className="admin-section-title">Signing session audit</h2>
            <div className="admin-data-table">
              <div className="admin-table-head">
                <span>Signer</span>
                <span>Document</span>
                <span>Status</span>
                <span>Viewed</span>
                <span>Signed</span>
              </div>

              {workspace.signingSessions.length === 0 ? (
                <article className="admin-table-row">
                  <div className="primary" data-label="Signer">
                    <strong>No signing sessions yet.</strong>
                    <span>Create a signing session from Documents tab.</span>
                  </div>
                </article>
              ) : null}

              {workspace.signingSessions.map((session: SigningSessionRow) => {
                const doc = workspace.documents.find((entry) => entry.id === session.document_id);
                return (
                  <article className="admin-table-row" key={session.id}>
                    <div data-label="Signer">
                      <strong>{session.signer_name || "Unknown"}</strong>
                      <span>{session.signer_email || "No email"}</span>
                    </div>
                    <div data-label="Document">
                      <span>{doc ? doc.title : session.document_id}</span>
                    </div>
                    <div data-label="Status">
                      <span className={`admin-pill ${statusTone(session.status)}`}>{session.status}</span>
                    </div>
                    <div data-label="Viewed">
                      <span>{formatDate(session.viewed_at)}</span>
                    </div>
                    <div data-label="Signed">
                      <span>{formatDate(session.signed_at)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="admin-form-card">
            <h2 className="admin-section-title">Phase events</h2>
            <div className="admin-details" style={{ gridTemplateColumns: "1fr" }}>
              {phaseActions.map((record) => {
                const event = workspace.phaseEvents.find((item) => item.action === record.phase || item.phase === record.phase);
                return (
                  <div key={record.phase}>
                    <dt>{record.label}</dt>
                    <dd>{event ? event.created_at : "Not yet reached"}</dd>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
