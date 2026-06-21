import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Document, HeadingLevel, Paragraph, Packer, TextRun } from "docx";
import { env } from "@/lib/env";
import {
  autoIssuingActionByPhase,
  buildBillingStepRows,
  documentTypeLabel,
  documentSignablePhases,
  isProjectPhase,
  type ProjectPhase,
  documentStorageBucket,
  documentStoragePath,
  formatCents,
  shouldAutoAdvanceOnSign,
  signingSessionExpiryDate,
  templatePathByType,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/admin-pipeline";
import {
  appendPhaseEvent,
  type AdminClient,
  type AdminProject,
  getProjectWorkspace,
  setProjectPhase,
  type ProjectWorkspace,
} from "@/lib/admin-pipeline-data";

type PlaceholderValues = Record<string, string>;

type GenerateDocumentResult = {
  id: string;
  projectId: string;
  type: DocumentType;
  templatePath: string;
  generatedDocxPath: string;
  generatedPdfPath: string | null;
  signedPdfPath: string | null;
  status: DocumentStatus;
  warnings: string[];
  docxSignedUrl: string | null;
  pdfSignedUrl: string | null;
};

export type SigningSessionRecord = {
  id: string;
  project_id: string;
  document_id: string;
  client_id: string | null;
  signer_email: string | null;
  signer_name: string | null;
  token_hash: string;
  expires_at: string;
  status: "active" | "viewed" | "signed" | "expired" | "revoked";
  viewed_at: string | null;
  signed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  consent_text: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminDocumentRow = {
  id: string;
  project_id: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  template_path: string | null;
  generated_docx_path: string | null;
  generated_pdf_path: string | null;
  signed_pdf_path: string | null;
  issued_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signing_token_hash: string | null;
  audit_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type SigningContext = {
  session: SigningSessionRecord;
  document: AdminDocumentRow;
  project: AdminProject;
  client: AdminClient | null;
};

export const signingConsentText = "I agree to use electronic records and signatures for this agreement.";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyTokenHash(token: string, tokenHash: string) {
  return hashToken(token) === tokenHash;
}

function safeToCurrency(value: unknown, currency = "USD") {
  const cents = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return formatCents(cents, currency);
}

function toStringOrDefault(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  return String(value);
}

export function buildTemplateValues(
  project: AdminProject,
  client: AdminClient,
  billingSteps: { amountCents: number; label: string; triggerPhase?: string }[],
  templateCurrency = "USD",
) {
  const depositStep = billingSteps.find((step) => /deposit/i.test(step.label)) ??
    billingSteps.find((step) => /retainer/i.test(step.label));
  const finalStep = billingSteps.find((step) => /final/i.test(step.label)) ??
    billingSteps[billingSteps.length - 1];

  const deliverables = Array.isArray(project.deliverables)
    ? project.deliverables
        .map((entry) => String(entry).trim())
        .filter(Boolean)
    : [];

  return {
    CLIENT_LEGAL_NAME: toStringOrDefault(client.legal_name, client.name || "Client"),
    CLIENT_DISPLAY_NAME: toStringOrDefault(client.display_name, client.legal_name || client.name || "Client"),
    CLIENT_EMAIL: toStringOrDefault(client.email, ""),
    PROJECT_NAME: toStringOrDefault(project.name),
    SCOPE_SUMMARY: toStringOrDefault(project.scope_summary, ""),
    TOTAL_AMOUNT: safeToCurrency(project.total_amount_cents, templateCurrency),
    DEPOSIT_AMOUNT: safeToCurrency(depositStep?.amountCents ?? 0, templateCurrency),
    FINAL_AMOUNT: safeToCurrency(finalStep?.amountCents ?? project.total_amount_cents, templateCurrency),
    START_DATE: toStringOrDefault(project.start_date, ""),
    TARGET_END_DATE: toStringOrDefault(project.target_end_date, ""),
    DELIVERABLES: deliverables.length > 0 ? deliverables.join("\n") : "(No deliverables listed)",
  } as PlaceholderValues;
}

function toSafePath(relativeTemplatePath: string) {
  return path.join(process.cwd(), "public", relativeTemplatePath);
}

async function readTemplate(relativeTemplatePath: string) {
  try {
    const absolutePath = toSafePath(relativeTemplatePath);
    return await fs.readFile(absolutePath, "utf8");
  } catch (error) {
    return null;
  }
}

function applyPlaceholders(templateText: string, values: PlaceholderValues) {
  return Object.entries(values).reduce((next, [key, value]) => next.replaceAll(`{{${key}}}`, value), templateText);
}

async function buildDocumentBuffer(projectName: string, titleTemplate: string, content: string) {
  const paragraphs = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => new Paragraph({ children: [new TextRun({ text: line })] }));

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: projectName, bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: titleTemplate })],
          }),
          ...paragraphs,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function fallbackTemplate() {
  return [
    `{{PROJECT_NAME}}`,
    "",
    `Client: {{CLIENT_LEGAL_NAME}}`,
    `Email: {{CLIENT_EMAIL}}`,
    "",
    "Scope Summary:",
    "{{SCOPE_SUMMARY}}",
    "",
    `Total Amount: {{TOTAL_AMOUNT}}`,
    `Deposit Amount: {{DEPOSIT_AMOUNT}}`,
    `Final Amount: {{FINAL_AMOUNT}}`,
    "",
    `Start Date: {{START_DATE}}`,
    `Target End Date: {{TARGET_END_DATE}}`,
    "",
    "Deliverables:",
    "{{DELIVERABLES}}",
    "",
  ].join("\n");
}

async function buildTemplateFromValues(type: DocumentType, replacements: PlaceholderValues) {
  const templatePath = templatePathByType[type];
  const rawTemplate = await readTemplate(templatePath);
  const templateSource = rawTemplate ?? fallbackTemplate();
  const warnings =
    rawTemplate === null
      ? [`Template file is not currently available at ${templatePath}; using fallback text template.`]
      : [];
  const resolved = applyPlaceholders(templateSource, replacements);
  const buffer = await buildDocumentBuffer(type.toUpperCase(), "Template document", resolved);
  return { templatePath, warnings, buffer };
}

export async function createSignedUrl(client: SupabaseClient, storagePath: string) {
  const signed = await client.storage
    .from(documentStorageBucket)
    .createSignedUrl(storagePath, 3600);
  if (signed.error) {
    throw new Error(signed.error.message);
  }
  return signed.data.signedUrl;
}

async function buildPdfPathFromDocx(_client: SupabaseClient, _projectId: string, _type: DocumentType) {
  // PDF rendering is intentionally deferred to a dedicated server-only adapter.
  // Existing runtime setup does not yet guarantee a stable DOCX->PDF renderer.
  // TODO: add a server-only PDF renderer (Playwright or docx4js based converter) and return a storage path here.
  return null;
}

function mapBillingSteps(workspace: ProjectWorkspace) {
  if (workspace.billingPattern?.steps?.length) {
    return buildBillingStepRows(workspace.project.total_amount_cents, workspace.billingPattern, workspace.project.currency).map((step) => ({
      label: step.label,
      amountCents: step.amountCents,
      triggerPhase: step.triggerPhase,
    }));
  }

  return [
    {
      label: "Deposit",
      amountCents: Math.round(workspace.project.total_amount_cents * 0.5),
      triggerPhase: "deposit_invoice_ready",
    },
    {
      label: "Final",
      amountCents: Math.round(workspace.project.total_amount_cents * 0.5),
      triggerPhase: "final_invoice_ready",
    },
  ];
}

export async function generateProjectDocument(params: {
  client: SupabaseClient;
  projectId: string;
  type: DocumentType;
}): Promise<GenerateDocumentResult> {
  const workspace = await getProjectWorkspace(params.client, params.projectId);
  if (!workspace.project.id || !workspace.client.id) {
    throw new Error("Could not locate project workspace.");
  }

  const placeholderValues = buildTemplateValues(
    workspace.project,
    workspace.client,
    mapBillingSteps(workspace),
    workspace.project.currency,
  );
  const { templatePath, warnings, buffer } = await buildTemplateFromValues(params.type, placeholderValues);

  const docxPath = documentStoragePath({ projectId: params.projectId, type: params.type, extension: "docx" });
  const uploadDocx = await params.client.storage
    .from(documentStorageBucket)
    .upload(docxPath, buffer, {
      upsert: true,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  if (uploadDocx.error) {
    throw new Error(uploadDocx.error.message);
  }

  const generatedPdfPath = await buildPdfPathFromDocx(params.client, params.projectId, params.type);

  const upserted = await params.client
    .from("documents")
    .upsert({
      project_id: params.projectId,
      type: params.type,
      title: `${documentTypeLabel(params.type)} for ${workspace.project.name}`,
      status: "generated",
      template_path: templatePath,
      generated_docx_path: docxPath,
      generated_pdf_path: generatedPdfPath,
      signed_pdf_path: null,
      issued_at: null,
      viewed_at: null,
      signed_at: null,
      signer_name: null,
      signer_email: null,
      signing_token_hash: null,
      audit_hash: null,
    }, { onConflict: "project_id,type" })
    .select("id")
    .single();

  if (upserted.error || !upserted.data) {
    throw new Error(upserted.error?.message ?? "Unable to save generated document.");
  }

  const result: GenerateDocumentResult = {
    id: String(upserted.data.id),
    projectId: params.projectId,
    type: params.type,
    templatePath,
    generatedDocxPath: docxPath,
    generatedPdfPath,
    signedPdfPath: generatedPdfPath,
    status: "generated",
    warnings,
    docxSignedUrl: await createSignedUrl(params.client, docxPath),
    pdfSignedUrl: generatedPdfPath ? await createSignedUrl(params.client, generatedPdfPath) : null,
  };

  return result;
}

export function signingLink(sessionId: string, token: string) {
  const base = new URL(env.NEXT_PUBLIC_APP_URL);
  base.pathname = `/sign/${sessionId}`;
  base.searchParams.set("token", token);
  return base.toString();
}

export async function issueSigningSessionForDocument(params: {
  client: SupabaseClient;
  projectId: string;
  documentId: string;
  clientId: string | null;
  signerEmail: string;
  signerName: string;
}) {
  const sessionToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashToken(sessionToken);
  const expiresAt = signingSessionExpiryDate(72);

  const doc = await loadDocumentById({ client: params.client, documentId: params.documentId });
  if (!doc) {
    throw new Error("Could not find the selected document.");
  }

  const revoked = await params.client
    .from("signing_sessions")
    .update({ status: "revoked" })
    .eq("document_id", params.documentId)
    .in("status", ["active", "viewed"]);
  if (revoked.error) {
    throw new Error(revoked.error.message);
  }

  const session = await params.client
    .from("signing_sessions")
    .insert({
      project_id: params.projectId,
      document_id: params.documentId,
      client_id: params.clientId,
      signer_name: params.signerName || null,
      signer_email: params.signerEmail || null,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      status: "active",
    })
    .select("id")
    .single();

  if (session.error || !session.data?.id) {
    throw new Error(session.error?.message ?? "Could not create signing session.");
  }

  const updatedDocument = await params.client
    .from("documents")
    .update({
      status: "issued",
      issued_at: new Date().toISOString(),
      signer_name: null,
      signer_email: null,
      signed_at: null,
      audit_hash: null,
      signing_token_hash: tokenHash,
    })
    .eq("id", params.documentId);
  if (updatedDocument.error) {
    throw new Error(updatedDocument.error.message);
  }

  return {
    sessionId: String(session.data.id),
    token: sessionToken,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    signingUrl: signingLink(String(session.data.id), sessionToken),
  };
}

export async function revokeSigningSession(params: { client: SupabaseClient; sessionId: string }) {
  const revoked = await params.client
    .from("signing_sessions")
    .update({ status: "revoked" })
    .eq("id", params.sessionId);
  if (revoked.error) {
    throw new Error(revoked.error.message);
  }
}

export async function markSigningSessionViewed(params: {
  client: SupabaseClient;
  sessionId: string;
  documentId: string;
}) {
  const now = new Date().toISOString();
  const session = await params.client
    .from("signing_sessions")
    .select("id,status")
    .eq("id", params.sessionId)
    .single();
  if (session.error || !session.data) return;

  const status = String(session.data.status);
  const nextStatus = status === "signed" || status === "revoked" ? status : "viewed";

  await params.client.from("signing_sessions").update({
    viewed_at: now,
    status: nextStatus,
  }).eq("id", params.sessionId);

  await params.client
    .from("documents")
    .update({ status: "viewed", viewed_at: now })
    .eq("id", params.documentId);
}

export async function loadDocumentById(params: { client: SupabaseClient; documentId: string }) {
  const row = await params.client
    .from("documents")
    .select(
      "id, project_id, type, title, status, template_path, generated_docx_path, generated_pdf_path, signed_pdf_path, issued_at, viewed_at, signed_at, signer_name, signer_email, signing_token_hash, audit_hash, created_at, updated_at",
    )
    .eq("id", params.documentId)
    .single();
  if (row.error || !row.data) {
    return null;
  }

  return row.data as AdminDocumentRow;
}

export async function loadSigningSessionByToken(params: {
  client: SupabaseClient;
  sessionId: string;
  token: string;
}) {
  const row = await params.client
    .from("signing_sessions")
    .select(
      "id,project_id,document_id,client_id,signer_email,signer_name,token_hash,expires_at,status,viewed_at,signed_at,ip_address,user_agent,consent_text,created_at,updated_at",
    )
    .eq("id", params.sessionId)
    .limit(1)
    .single();
  if (row.error || !row.data) return null;
  if (!verifyTokenHash(params.token, String(row.data.token_hash ?? ""))) return null;

  const status = String(row.data.status);
  if (status === "revoked" || status === "signed") return null;

  const expiryTime = new Date(String(row.data.expires_at ?? "")).getTime();
  if (Number.isFinite(expiryTime) && expiryTime < Date.now()) {
    await params.client.from("signing_sessions").update({ status: "expired" }).eq("id", params.sessionId);
    return null;
  }

  return {
    id: String(row.data.id),
    project_id: String(row.data.project_id),
    document_id: String(row.data.document_id),
    client_id: row.data.client_id ? String(row.data.client_id) : null,
    signer_email: row.data.signer_email ? String(row.data.signer_email) : null,
    signer_name: row.data.signer_name ? String(row.data.signer_name) : null,
    token_hash: String(row.data.token_hash),
    expires_at: String(row.data.expires_at),
    status: (String(row.data.status) as SigningSessionRecord["status"]) || "active",
    viewed_at: row.data.viewed_at ? String(row.data.viewed_at) : null,
    signed_at: row.data.signed_at ? String(row.data.signed_at) : null,
    ip_address: row.data.ip_address ? String(row.data.ip_address) : null,
    user_agent: row.data.user_agent ? String(row.data.user_agent) : null,
    consent_text: row.data.consent_text ? String(row.data.consent_text) : null,
    created_at: String(row.data.created_at),
    updated_at: String(row.data.updated_at),
  };
}

export async function loadSigningContext(params: {
  client: SupabaseClient;
  sessionId: string;
  token: string;
}): Promise<SigningContext | null> {
  const session = await loadSigningSessionByToken(params);
  if (!session) return null;

  const document = await loadDocumentById({ client: params.client, documentId: session.document_id });
  if (!document) return null;

  const projectRow = await params.client
    .from("projects")
    .select(
      "id,client_id,name,status,phase,total_amount_cents,currency,billing_pattern_id,scope_summary,deliverables,start_date,target_end_date,created_at,updated_at",
    )
    .eq("id", session.project_id)
    .single();
  if (projectRow.error || !projectRow.data) return null;

  const client =
    projectRow.data.client_id
      ? await params.client
          .from("clients")
          .select("id,name,legal_name,display_name,contact_name,email,phone,billing_email,company_website,address,created_at,updated_at")
          .eq("id", projectRow.data.client_id)
          .single()
      : null;

  const phase: ProjectPhase = isProjectPhase(String(projectRow.data.phase))
    ? (String(projectRow.data.phase) as ProjectPhase)
    : "lead_qualified";

  return {
    session,
    document,
    project: {
      id: String(projectRow.data.id),
      client_id: projectRow.data.client_id ? String(projectRow.data.client_id) : null,
      name: String(projectRow.data.name),
      status: String(projectRow.data.status),
      phase,
      total_amount_cents: Number(projectRow.data.total_amount_cents) || 0,
      currency: String(projectRow.data.currency || "USD"),
      billing_pattern_id: projectRow.data.billing_pattern_id ? String(projectRow.data.billing_pattern_id) : null,
      scope_summary: projectRow.data.scope_summary ? String(projectRow.data.scope_summary) : null,
      deliverables: projectRow.data.deliverables ?? [],
      start_date: projectRow.data.start_date ? String(projectRow.data.start_date) : null,
      target_end_date: projectRow.data.target_end_date ? String(projectRow.data.target_end_date) : null,
      created_at: String(projectRow.data.created_at),
      updated_at: String(projectRow.data.updated_at),
    },
    client: client?.error || !client?.data
      ? null
      : {
          id: String(client.data.id),
          name: toStringOrDefault(client.data.name, ""),
          legal_name: client.data.legal_name ? String(client.data.legal_name) : null,
          display_name: client.data.display_name ? String(client.data.display_name) : null,
          contact_name: client.data.contact_name ? String(client.data.contact_name) : null,
          email: client.data.email ? String(client.data.email) : null,
          phone: client.data.phone ? String(client.data.phone) : null,
          billing_email: client.data.billing_email ? String(client.data.billing_email) : null,
          company_website: client.data.company_website ? String(client.data.company_website) : null,
          address: client.data.address ? String(client.data.address) : null,
          created_at: String(client.data.created_at),
          updated_at: String(client.data.updated_at),
        },
  };
}

export async function markDocumentAsSigned(params: {
  client: SupabaseClient;
  sessionId: string;
  token: string;
  actorName: string;
  actorEmail: string;
  consentText: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const session = await loadSigningSessionByToken({
    client: params.client,
    sessionId: params.sessionId,
    token: params.token,
  });
  if (!session) throw new Error("Invalid signing session.");

  const doc = await loadDocumentById({ client: params.client, documentId: session.document_id });
  if (!doc) throw new Error("The requested document no longer exists.");

  const expiryTime = new Date(session.expires_at).getTime();
  if (Number.isFinite(expiryTime) && expiryTime < Date.now()) {
    await params.client.from("signing_sessions").update({ status: "expired" }).eq("id", session.id);
    throw new Error("This signing link has expired.");
  }

  const pathForAudit = doc.generated_pdf_path || doc.generated_docx_path || "";
  const now = new Date().toISOString();
  const auditHash = hashToken(`${doc.id}|${session.project_id}|${params.actorName}|${params.actorEmail}|${now}|${pathForAudit}`);

  const documentUpdate = await params.client
    .from("documents")
    .update({
      status: "signed",
      signed_at: now,
      signer_name: params.actorName,
      signer_email: params.actorEmail,
      signing_token_hash: session.token_hash,
      audit_hash: auditHash,
    })
    .eq("id", doc.id);
  if (documentUpdate.error) throw new Error(documentUpdate.error.message);

  const sessionUpdate = await params.client
    .from("signing_sessions")
    .update({
      status: "signed",
      signed_at: now,
      signer_name: params.actorName,
      signer_email: params.actorEmail,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      consent_text: params.consentText,
    })
    .eq("id", session.id);
  if (sessionUpdate.error) throw new Error(sessionUpdate.error.message);

  await appendPhaseEvent(params.client, {
    projectId: session.project_id,
    phase: doc.type ? documentSignablePhases[doc.type] ?? "lead_qualified" : "lead_qualified",
    action: "document_signed",
    actorUid: null,
    actorEmail: params.actorEmail,
    note: `Signed ${documentTypeLabel(doc.type as DocumentType)} in signing session`,
  });

  if (shouldAutoAdvanceOnSign()) {
    const nextPhase = autoIssuingActionByPhase[doc.type as DocumentType] ??
      documentSignablePhases[doc.type as DocumentType] ??
      null;
    if (nextPhase) {
      await setProjectPhase(
        params.client,
        session.project_id,
        nextPhase,
        null,
        params.actorEmail,
        `Signed ${documentTypeLabel(doc.type as DocumentType)} via native signing link`,
      );
    }
  }

  return { documentId: doc.id, projectId: session.project_id, auditHash };
}

export async function markDocumentSignedManually(params: {
  client: SupabaseClient;
  documentId: string;
  actorName: string;
  actorEmail: string;
}) {
  const doc = await loadDocumentById({ client: params.client, documentId: params.documentId });
  if (!doc) {
    throw new Error("Document not found.");
  }

  const now = new Date().toISOString();
  const auditHash = hashToken(`${doc.id}|${doc.project_id}|${params.actorName}|${params.actorEmail}|${now}|${doc.generated_docx_path || ""}`);

  const updated = await params.client
    .from("documents")
    .update({
      status: "signed",
      signed_at: now,
      signer_name: params.actorName,
      signer_email: params.actorEmail,
      audit_hash: auditHash,
    })
    .eq("id", params.documentId);

  if (updated.error) {
    throw new Error(updated.error.message);
  }

  await appendPhaseEvent(params.client, {
    projectId: doc.project_id,
    phase: doc.type ? documentSignablePhases[doc.type] || "lead_qualified" : "lead_qualified",
    action: "document_signed_manually",
    actorUid: null,
    actorEmail: params.actorEmail,
    note: `Signed ${documentTypeLabel(doc.type as DocumentType)} manually in admin workspace`,
  });

  if (shouldAutoAdvanceOnSign()) {
    const nextPhase = autoIssuingActionByPhase[doc.type as DocumentType] ??
      documentSignablePhases[doc.type as DocumentType] ??
      null;
    if (nextPhase) {
      await setProjectPhase(
        params.client,
        doc.project_id,
        nextPhase,
        null,
        params.actorEmail,
        `Manually marked ${documentTypeLabel(doc.type as DocumentType)} signed`,
      );
    }
  }

  return { documentId: params.documentId, auditHash, signedAt: now };
}

export async function createSigningSignedPdfPlaceholder(
  client: SupabaseClient,
  documentId: string,
  signedPdfPath: string,
) {
  const updated = await client
    .from("documents")
    .update({ signed_pdf_path: signedPdfPath, generated_pdf_path: signedPdfPath || null })
    .eq("id", documentId);
  if (updated.error) {
    throw new Error(updated.error.message);
  }
}

export async function loadSignedUrlForDocument(client: SupabaseClient, document: AdminDocumentRow) {
  const docxUrl = document.generated_docx_path
    ? await createSignedUrl(client, document.generated_docx_path)
    : null;
  const pdfUrl = document.generated_pdf_path
    ? await createSignedUrl(client, document.generated_pdf_path)
    : null;
  return { docxUrl, pdfUrl };
}

export function stepSummary(step: { percentage: number | null; amountCents: number; currency?: string }) {
  if (step.percentage !== null && step.percentage !== 0) return `${step.percentage}%`;
  return safeToCurrency(step.amountCents, step.currency ?? "USD");
}
