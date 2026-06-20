import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import { submitSigningAction } from "./actions";
import {
  loadSignedUrlForDocument,
  loadSigningContext,
  markSigningSessionViewed,
} from "@/lib/admin-documents";
import { getProjectWorkspace } from "@/lib/admin-pipeline-data";

function safeDate(value: string | null | undefined) {
  if (!value) return "Not provided";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

function field(value: string | null | undefined, fallback = "Not provided") {
  return value?.trim() || fallback;
}

export default async function SigningPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ token?: string; signed?: string; error?: string }>;
}) {
  const { sessionId } = await params;
  const { token, signed, error } = await searchParams;

  if (!sessionId || !token) {
    notFound();
  }

  const { client, missing } = getServiceSupabase();
  if (!client) {
    return <p className="admin-notice">Missing Supabase config: {missing.join(", ")}</p>;
  }

  const context = await loadSigningContext({
    client,
    sessionId,
    token,
  });

  if (!context) {
    return (
      <section className="admin-page">
        <header className="admin-header">
          <div>
            <p>Signing page</p>
            <h1>Unable to open signing request</h1>
          </div>
        </header>
        <p className="admin-notice">This signing link is invalid, expired, revoked, or already used.</p>
        <p>
          <Link className="btn ghost" href="/">
            Return to site
          </Link>
        </p>
      </section>
    );
  }

  const { session, document, project, client: projectClient } = context;

  if (!document.generated_docx_path && !document.generated_pdf_path) {
    redirect(`/sign/${sessionId}?token=${encodeURIComponent(token)}&error=${encodeURIComponent("No document is ready for signing yet.")}`);
  }

  const urls = await loadSignedUrlForDocument(client, {
    id: document.id,
    project_id: document.project_id,
    type: document.type,
    title: document.title,
    status: document.status,
    template_path: document.template_path,
    generated_docx_path: document.generated_docx_path,
    generated_pdf_path: document.generated_pdf_path,
    signed_pdf_path: document.signed_pdf_path,
    issued_at: document.issued_at,
    viewed_at: document.viewed_at,
    signed_at: document.signed_at,
    signer_name: document.signer_name,
    signer_email: document.signer_email,
    signing_token_hash: document.signing_token_hash,
    audit_hash: document.audit_hash,
    created_at: document.created_at,
    updated_at: document.updated_at,
  });

  await markSigningSessionViewed({ client, sessionId, documentId: document.id });

  const signingLinkText = session.token_hash
    ? "Secure signing link (server-issued)"
    : "Signing link";

  if (signed) {
    return (
      <section className="admin-page">
        <header className="admin-header">
          <div>
            <p>Signing page</p>
            <h1>Document signed</h1>
          </div>
        </header>
        <p className="admin-notice">
          This agreement has been marked signed on {safeDate(context.document.signed_at)}.
        </p>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          If you need a copy, you can download it from your email or the admin workspace.
        </p>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <header className="admin-header">
        <div>
          <p>Document signing</p>
          <h1>{field(project.name, "Project signing")}</h1>
        </div>
        <span>{field(context.document.title, "Agreement")}</span>
      </header>

      {error ? <p className="admin-notice">{error}</p> : null}

      <div className="admin-command-grid">
        <article className="admin-form-card">
          <h2>Document details</h2>
          <div className="admin-details" style={{ marginBottom: 8 }}>
            <div>
              <dt>Project</dt>
              <dd>{field(project.name, "Untitled project")}</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{field(projectClient?.legal_name || projectClient?.display_name || projectClient?.name, "Unknown client")}</dd>
            </div>
            <div>
              <dt>Document</dt>
              <dd>{field(context.document.title, "Agreement")}</dd>
            </div>
            <div>
              <dt>Prepared for</dt>
              <dd>{field(context.document.signer_email || projectClient?.email, "No email" )}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{safeDate(project.created_at)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{field(context.document.status)}</dd>
            </div>
          </div>

          <div className="admin-inline-actions" style={{ marginBottom: 12 }}>
            {urls.pdfUrl ? (
              <a className="btn ghost" href={urls.pdfUrl} rel="noreferrer" target="_blank">
                Open PDF
              </a>
            ) : null}
            {urls.docxUrl ? (
              <a className="btn ghost" href={urls.docxUrl} rel="noreferrer" target="_blank">
                Open DOCX
              </a>
            ) : null}
          </div>

          <p className="field-help">{signingLinkText}</p>
        </article>

        <article className="admin-form-card">
          <h2>Sign agreement</h2>
          <p style={{ color: "var(--muted)" }}>By typing your full legal name and checking the consent box, you consent to electronic records and signatures.</p>
          <form action={submitSigningAction} className="admin-record-form">
            <input type="hidden" name="session_id" value={sessionId} />
            <input type="hidden" name="token" value={token} />

            <div className="admin-details" style={{ marginBottom: 12, gridTemplateColumns: "1fr" }}>
              <label className="field">
                Full legal name
                <input
                  name="signer_name"
                  required
                  autoComplete="name"
                  placeholder="Type your full legal name"
                  defaultValue={session.signer_name || ""}
                />
              </label>
              <label className="field">
                Email
                <input
                  name="signer_email"
                  required
                  autoComplete="email"
                  type="email"
                  placeholder="you@company.com"
                  defaultValue={session.signer_email || projectClient?.email || ""}
                />
              </label>
              <label className="checkbox-field">
                <input name="consent" type="checkbox" required />
                <span>I agree to use electronic records and signatures for this agreement.</span>
              </label>
            </div>

            <button className="btn" type="submit">
              Sign Agreement
            </button>
          </form>
          <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 13 }}>
            This action is logged with timestamp, signer email, IP address, and browser metadata.
          </p>
        </article>
      </div>
    </section>
  );
}
