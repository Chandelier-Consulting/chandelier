import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildBillingStepRows,
  defaultBillingPatterns,
  isProjectPhase,
  nextProjectPhase,
  normalizeClientInput,
  normalizeProjectInput,
  projectPhaseOrder,
  projectPhaseLabel,
  type BillingPattern,
  type BillingPatternStep,
  type BillingStepStatus,
  type DocumentType,
  type DocumentStatus,
  type ProjectPhase,
} from "@/lib/admin-pipeline";

type DbPayload = Record<string, unknown>;

export type ClientInput = {
  restaurantName?: string;
  legalName?: string;
  displayName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  billingEmail?: string;
  companyWebsite?: string;
  address?: string;
};

export type BillingPatternStepInput = {
  label: string;
  triggerPhase: string;
  percentage?: number | null;
  amountCents?: number | null;
};

export type AdminClient = {
  id: string;
  name: string | null;
  legal_name: string | null;
  display_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  billing_email: string | null;
  company_website: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProject = {
  id: string;
  client_id: string | null;
  name: string;
  status: string;
  phase: ProjectPhase;
  total_amount_cents: number;
  currency: string;
  billing_pattern_id: string | null;
  scope_summary: string | null;
  deliverables: unknown;
  start_date: string | null;
  target_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = {
  clientId: string;
  name: string;
  status: string;
  phase: string;
  totalAmountCents: number;
  currency: string;
  billingPatternId: string;
  scopeSummary: string;
  deliverables: string[];
  startDate: string;
  targetEndDate: string;
  customSteps?: BillingPatternStepInput[];
};

export type BillingPatternRow = {
  id: string;
  name: string;
  description: string | null;
  steps: Array<DbPayload> | null;
  is_default: boolean | null;
  created_at: string | null;
};

export type BillingStepRow = {
  id: string;
  project_id: string;
  label: string;
  trigger_phase: string;
  amount_cents: number;
  percentage: number | null;
  status: BillingStepStatus;
  due_date: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SigningSessionStatus = "active" | "viewed" | "signed" | "expired" | "revoked";

export type PhaseEventRow = {
  id: string;
  project_id: string;
  phase: string;
  action: string;
  actor_uid: string | null;
  actor_email: string | null;
  note: string | null;
  created_at: string;
};

export type DocumentRow = {
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

export type SigningSessionRow = {
  id: string;
  project_id: string;
  document_id: string;
  client_id: string | null;
  signer_email: string | null;
  signer_name: string | null;
  token_hash: string;
  expires_at: string;
  status: SigningSessionStatus;
  viewed_at: string | null;
  signed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  consent_text: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectWorkspace = {
  project: AdminProject;
  client: AdminClient;
  billingPattern: BillingPattern | null;
  billingSteps: BillingStepRow[];
  phaseEvents: PhaseEventRow[];
  documents: DocumentRow[];
  signingSessions: SigningSessionRow[];
};

function safeQueryError(message: string): never {
  throw new Error(message);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asProjectPhase(value: unknown): ProjectPhase {
  const raw = textValue(value);
  return isProjectPhase(raw) ? raw : "lead_qualified";
}

function safeSelect<T>(result: { data: T[] | null; error: { message: string } | null }) {
  if (result.error) {
    safeQueryError(result.error.message);
  }
  return result.data ?? [];
}

function safeSelectOne<T>(result: { data: T | null; error: { message: string } | null }) {
  if (result.error) {
    safeQueryError(result.error.message);
  }
  return result.data ?? null;
}

function toClientPayload(input: ClientInput): Record<string, unknown> {
  const normalized = normalizeClientInput(input);
  return {
    legal_name: normalized.legalName,
    display_name: normalized.displayName,
    name: normalized.name,
    contact_name: normalized.contactName || null,
    email: normalized.email || null,
    phone: normalized.phone || null,
    billing_email: normalized.billingEmail || null,
    company_website: normalized.companyWebsite || null,
    address: normalized.address || null,
  };
}

function toProjectPayload(input: ProjectInput) {
  const normalized = normalizeProjectInput(input);

  return {
    client_id: normalized.clientId || null,
    name: normalized.name,
    status: normalized.status,
    phase: normalized.phase,
    total_amount_cents: normalized.totalAmountCents,
    currency: normalized.currency,
    billing_pattern_id: normalized.billingPatternId || null,
    scope_summary: normalized.scopeSummary || null,
    deliverables: normalized.deliverables,
    start_date: normalized.startDate || null,
    target_end_date: normalized.targetEndDate || null,
  };
}

function mapPatternStep(raw: unknown): BillingPatternStep {
  const value = (raw ?? {}) as DbPayload;
  const triggerPhase = textValue(value.trigger_phase || value.triggerPhase);
  const label = textValue(value.label) || "Custom billing step";

  return {
    label,
    triggerPhase: asProjectPhase(triggerPhase),
    percentage:
      typeof value.percentage === "number"
        ? Math.max(0, value.percentage)
        : typeof value.percentage === "string"
          ? Number(value.percentage) || null
          : typeof value.amount_cents === "number"
            ? null
            : null,
    amountCents: typeof value.amountCents === "number"
      ? Math.max(0, value.amountCents)
      : typeof value.amountCents === "string"
        ? Number(value.amountCents) || null
        : typeof value.amount_cents === "number"
          ? Math.max(0, value.amount_cents)
          : typeof value.amount_cents === "string"
            ? Number(value.amount_cents) || null
            : null,
  };
}

function mapBillingPattern(row: BillingPatternRow): BillingPattern {
  const steps = Array.isArray(row.steps) ? row.steps : [];
  return {
    id: row.id,
    name: textValue(row.name) || "Billing pattern",
    description: typeof row.description === "string" ? row.description : null,
    isDefault: Boolean((row as DbPayload).is_default ?? false),
    steps: steps.map(mapPatternStep).filter((step) => step.label.length > 0),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapClient(row: DbPayload): AdminClient {
  return {
    id: textValue(row.id),
    name: textValue(row.name) || textValue(row.display_name) || textValue(row.legal_name) || "Client",
    legal_name: textValue(row.legal_name) || null,
    display_name: textValue(row.display_name) || null,
    contact_name: textValue(row.contact_name) || null,
    email: textValue(row.email) || null,
    phone: textValue(row.phone) || null,
    billing_email: textValue(row.billing_email) || null,
    company_website: textValue(row.company_website) || null,
    address: textValue(row.address) || null,
    created_at: textValue(row.created_at),
    updated_at: textValue(row.updated_at),
  };
}

function mapProject(row: DbPayload): AdminProject {
  return {
    id: textValue(row.id),
    client_id: textValue(row.client_id) || null,
    name: textValue(row.name) || "Project",
    status: textValue(row.status) || "active",
    phase: asProjectPhase(row.phase),
    total_amount_cents: Math.max(0, numberValue(row.total_amount_cents)),
    currency: textValue(row.currency) || "USD",
    billing_pattern_id: textValue(row.billing_pattern_id) || null,
    scope_summary: typeof row.scope_summary === "string" ? row.scope_summary : null,
    deliverables: row.deliverables,
    start_date: textValue(row.start_date) || null,
    target_end_date: textValue(row.target_end_date) || null,
    created_at: textValue(row.created_at),
    updated_at: textValue(row.updated_at),
  };
}

function mapBillingStep(row: DbPayload): BillingStepRow {
  return {
    id: textValue(row.id),
    project_id: textValue(row.project_id),
    label: textValue(row.label),
    trigger_phase: textValue(row.trigger_phase) || "lead_qualified",
    amount_cents: Math.max(0, numberValue(row.amount_cents)),
    percentage: typeof row.percentage === "number" ? row.percentage : null,
    status: (textValue(row.status) as BillingStepStatus) || "planned",
    due_date: textValue(row.due_date) || null,
    stripe_invoice_id: textValue(row.stripe_invoice_id) || null,
    created_at: textValue(row.created_at),
    updated_at: textValue(row.updated_at),
  };
}

function mapPhaseEvent(row: DbPayload): PhaseEventRow {
  return {
    id: textValue(row.id),
    project_id: textValue(row.project_id),
    phase: textValue(row.phase) || "lead_qualified",
    action: textValue(row.action) || "event",
    actor_uid: textValue(row.actor_uid) || null,
    actor_email: textValue(row.actor_email) || null,
    note: textValue(row.note) || null,
    created_at: textValue(row.created_at),
  };
}

function mapDocument(row: DbPayload): DocumentRow {
  return {
    id: textValue(row.id),
    project_id: textValue(row.project_id),
    type: (textValue(row.type) as DocumentType) || "msa",
    title: textValue(row.title) || "Project document",
    status: (textValue(row.status) as DocumentStatus) || "draft",
    template_path: textValue(row.template_path) || null,
    generated_docx_path: textValue(row.generated_docx_path) || null,
    generated_pdf_path: textValue(row.generated_pdf_path) || null,
    signed_pdf_path: textValue(row.signed_pdf_path) || null,
    issued_at: textValue(row.issued_at) || null,
    viewed_at: textValue(row.viewed_at) || null,
    signed_at: textValue(row.signed_at) || null,
    signer_name: textValue(row.signer_name) || null,
    signer_email: textValue(row.signer_email) || null,
    signing_token_hash: textValue(row.signing_token_hash) || null,
    audit_hash: textValue(row.audit_hash) || null,
    created_at: textValue(row.created_at),
    updated_at: textValue(row.updated_at),
  };
}

function mapSigningSession(row: DbPayload): SigningSessionRow {
  return {
    id: textValue(row.id),
    project_id: textValue(row.project_id),
    document_id: textValue(row.document_id),
    client_id: textValue(row.client_id) || null,
    signer_email: textValue(row.signer_email) || null,
    signer_name: textValue(row.signer_name) || null,
    token_hash: textValue(row.token_hash),
    expires_at: textValue(row.expires_at),
    status: (textValue(row.status) as SigningSessionRow["status"]) || "active",
    viewed_at: textValue(row.viewed_at) || null,
    signed_at: textValue(row.signed_at) || null,
    ip_address: textValue(row.ip_address) || null,
    user_agent: textValue(row.user_agent) || null,
    consent_text: textValue(row.consent_text) || null,
    created_at: textValue(row.created_at),
    updated_at: textValue(row.updated_at),
  };
}

export async function loadClients(client: SupabaseClient): Promise<AdminClient[]> {
  const selected = [
    "id",
    "name",
    "legal_name",
    "display_name",
    "contact_name",
    "email",
    "phone",
    "billing_email",
    "company_website",
    "address",
    "created_at",
    "updated_at",
  ];
  const rows = await client.from("clients").select(selected.join(", ")).order("created_at", { ascending: false });
  return safeSelect(rows as { data: DbPayload[] | null; error: { message: string } | null }).map((row) => mapClient(row));
}

export async function getClient(client: SupabaseClient, clientId: string): Promise<AdminClient> {
  const row = await client.from("clients").select("id,name,legal_name,display_name,contact_name,email,phone,billing_email,company_website,address,created_at,updated_at").eq("id", clientId).limit(1).single();
  const mapped = safeSelectOne(row as { data: DbPayload | null; error: { message: string } | null });
  if (!mapped) safeQueryError("Client not found.");
  return mapClient(mapped as DbPayload);
}

export async function createClient(client: SupabaseClient, input: ClientInput) {
  const payload = toClientPayload(input);
  const inserted = await client.from("clients").insert(payload).select("id").single();
  if (inserted.error || !inserted.data?.id) {
    safeQueryError(inserted.error?.message ?? "Failed to create client.");
  }
  return String(inserted.data.id);
}

export async function updateClient(
  client: SupabaseClient,
  clientId: string,
  input: Partial<ClientInput>,
) {
  const payload = toClientPayload(input);

  const updated = await client.from("clients").update(payload).eq("id", clientId);
  if (updated.error) safeQueryError(updated.error.message);
  return updated;
}

export async function deleteClient(client: SupabaseClient, clientId: string) {
  const removed = await client.from("clients").delete().eq("id", clientId);
  if (removed.error) safeQueryError(removed.error.message);
}

export async function loadBillingPatterns(client: SupabaseClient): Promise<BillingPattern[]> {
  const result = await client
    .from("billing_patterns")
    .select("id,name,description,steps,is_default,created_at")
    .order("created_at", { ascending: true });

  if (result.error) {
    return [...defaultBillingPatterns];
  }

  const rows = (result.data as BillingPatternRow[]) ?? [];
  const mapped = rows.map(mapBillingPattern).filter((pattern) => pattern.steps.length > 0);

  if (mapped.length === 0) {
    return [...defaultBillingPatterns];
  }

  if (!mapped.some((pattern) => pattern.isDefault)) {
    return [
      {
        ...mapped[0],
        isDefault: true,
      },
      ...mapped.slice(1),
    ];
  }

  return mapped;
}

export async function loadBillingPatternById(
  client: SupabaseClient,
  patternId: string,
): Promise<BillingPattern | null> {
  if (!patternId || patternId === "custom") return null;

  const result = await client
    .from("billing_patterns")
    .select("id,name,description,steps,is_default,created_at")
    .eq("id", patternId)
    .limit(1)
    .single();

  if (!result.error && result.data) {
    return mapBillingPattern(result.data as BillingPatternRow);
  }

  return defaultBillingPatterns.find((pattern) => pattern.id === patternId) ?? null;
}

function normalizeCustomSteps(raw: BillingPatternStepInput[] | null | undefined) {
  if (!raw || raw.length === 0) return [];

  return raw
    .map((step) => {
      const label = textValue(step.label) || "Custom Step";
      return {
        label,
        triggerPhase: asProjectPhase(step.triggerPhase),
        percentage:
          typeof step.percentage === "number" ? Math.max(0, step.percentage) : step.percentage == null ? null : Number(step.percentage),
        amountCents:
          typeof step.amountCents === "number" ? Math.max(0, Math.round(step.amountCents)) : step.amountCents == null ? null : Number(step.amountCents),
      };
    })
    .filter((step) => Number.isFinite(step.amountCents ?? 0) || Number.isFinite(step.percentage ?? 0));
}

export async function loadProjects(
  client: SupabaseClient,
): Promise<Array<AdminProject & { client: AdminClient | null }>> {
  const projectRows = await client
    .from("projects")
    .select("id, client_id, name, status, phase, total_amount_cents, currency, billing_pattern_id, scope_summary, deliverables, start_date, target_end_date, created_at, updated_at")
    .order("updated_at", { ascending: false });
  const mappedProjects = safeSelect(projectRows).map((row) => mapProject(row as DbPayload));
  const clientRows = await client.from("clients").select("id,name,legal_name,display_name,contact_name,email,phone,billing_email,company_website,address,created_at,updated_at");
  const clientMap = new Map<string, AdminClient>();
  for (const record of safeSelect(clientRows)) {
    const mapped = mapClient(record as DbPayload);
    clientMap.set(mapped.id, mapped);
  }

  return mappedProjects.map((project) => ({
    ...project,
    client: project.client_id ? clientMap.get(project.client_id) ?? null : null,
  }));
}

export async function getProjectWorkspace(client: SupabaseClient, projectId: string): Promise<ProjectWorkspace> {
  const projectResult = await client
    .from("projects")
    .select("id,client_id,name,status,phase,total_amount_cents,currency,billing_pattern_id,scope_summary,deliverables,start_date,target_end_date,created_at,updated_at")
    .eq("id", projectId)
    .limit(1)
    .single();
  const project = safeSelectOne(projectResult as { data: DbPayload | null; error: { message: string } | null });
  if (!project) {
    safeQueryError("Project not found.");
  }

  const mappedProject = mapProject(project as DbPayload);
  const [clientRow, patternRow, steps, events, documents, sessions] = await Promise.all([
    mappedProject.client_id ? client.from("clients").select("id,name,legal_name,display_name,contact_name,email,phone,billing_email,company_website,address,created_at,updated_at").eq("id", mappedProject.client_id).limit(1).single() : Promise.resolve({ data: null, error: null } as const),
    loadBillingPatternById(client, mappedProject.billing_pattern_id || ""),
    client
      .from("billing_steps")
      .select("id,project_id,label,trigger_phase,amount_cents,percentage,status,due_date,stripe_invoice_id,created_at,updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    client
      .from("phase_events")
      .select("id,project_id,phase,action,actor_uid,actor_email,note,created_at")
      .eq("project_id", mappedProject.id)
      .order("created_at", { ascending: false }),
    client
      .from("documents")
      .select("id,project_id,type,title,status,template_path,generated_docx_path,generated_pdf_path,signed_pdf_path,issued_at,viewed_at,signed_at,signer_name,signer_email,signing_token_hash,audit_hash,created_at,updated_at")
      .eq("project_id", mappedProject.id)
      .order("created_at", { ascending: false }),
    client
      .from("signing_sessions")
      .select("id,project_id,document_id,client_id,signer_email,signer_name,token_hash,expires_at,status,viewed_at,signed_at,ip_address,user_agent,consent_text,created_at,updated_at")
      .eq("project_id", mappedProject.id)
      .order("created_at", { ascending: false }),
  ]);

  const fallbackClient = {
    id: mappedProject.client_id || "",
    name: "Unknown Client",
    legal_name: null,
    display_name: null,
    contact_name: null,
    email: null,
    phone: null,
    billing_email: null,
    company_website: null,
    address: null,
    created_at: mappedProject.created_at,
    updated_at: mappedProject.updated_at,
  };

  const mappedPattern = patternRow;
  const mappedClient = safeSelectOne(clientRow as { data: DbPayload | null; error: { message: string } | null }) as DbPayload | null;

  return {
    project: mappedProject,
    client: mappedClient ? mapClient(mappedClient) : fallbackClient,
    billingPattern: mappedPattern,
    billingSteps: safeSelect(steps as { data: DbPayload[] | null; error: { message: string } | null }).map(mapBillingStep),
    phaseEvents: safeSelect(events as { data: DbPayload[] | null; error: { message: string } | null }).map(mapPhaseEvent),
    documents: safeSelect(documents as { data: DbPayload[] | null; error: { message: string } | null }).map(mapDocument),
    signingSessions: safeSelect(sessions as { data: DbPayload[] | null; error: { message: string } | null }).map(mapSigningSession),
  };
}

export function computeDefaultBillingSteps(totalAmountCents: number, pattern: BillingPattern) {
  return buildBillingStepRows(totalAmountCents, pattern).map((step) => ({
    label: step.label,
    triggerPhase: step.triggerPhase,
    percentage: step.percentage ?? null,
    amountCents: step.amountCents ?? 0,
  }));
}

export async function createProjectWithBillingSteps(client: SupabaseClient, input: ProjectInput) {
  const pattern =
    input.billingPatternId === "custom"
      ? null
      : ((await loadBillingPatternById(client, input.billingPatternId)) ?? defaultBillingPatterns[0]);
  if (!pattern) {
    safeQueryError("Please select a billing pattern.");
  }

  const customSteps = normalizeCustomSteps(input.customSteps);
  const payload = toProjectPayload(input);
  const rows = await client
    .from("projects")
    .insert({
      ...payload,
      billing_pattern_id: pattern?.id ?? null,
      status: payload.status,
      phase: payload.phase,
    })
    .select("id,client_id,name,status,phase,total_amount_cents,currency,billing_pattern_id,scope_summary,deliverables,start_date,target_end_date,created_at,updated_at")
    .single();

  if (rows.error || !rows.data) {
    safeQueryError(rows.error?.message ?? "Could not create project.");
  }

  const project = mapProject(rows.data as DbPayload);
  const basePlan =
    customSteps.length > 0 ? customSteps : computeDefaultBillingSteps(project.total_amount_cents, pattern ?? defaultBillingPatterns[0]);

  if (basePlan.length > 0) {
    const stepRows = basePlan.map((step) => ({
      project_id: project.id,
      label: step.label,
      trigger_phase: step.triggerPhase,
      amount_cents: Math.max(0, Math.round(step.amountCents ?? 0)),
      percentage:
        step.percentage == null ? null : Math.max(0, Number(step.percentage)),
      status: "planned",
    }));
    const inserted = await client.from("billing_steps").insert(stepRows);
    if (inserted.error) {
      safeQueryError(inserted.error.message);
    }
  }

  await appendPhaseEvent(client, {
    projectId: project.id,
    phase: project.phase,
    action: "create",
    actorUid: null,
    actorEmail: null,
    note: "Project created.",
  });

  return project;
}

export async function appendPhaseEvent(
  client: SupabaseClient,
  params: {
    projectId: string;
    phase: string;
    action: string;
    actorUid: string | null;
    actorEmail: string | null;
    note: string | null;
  },
) {
  const inserted = await client.from("phase_events").insert({
    project_id: params.projectId,
    phase: params.phase,
    action: params.action,
    actor_uid: params.actorUid,
    actor_email: params.actorEmail,
    note: params.note,
  });

  if (inserted.error) {
    safeQueryError(inserted.error.message);
  }
}

export async function setProjectPhase(
  client: SupabaseClient,
  projectId: string,
  phase: string,
  actorUid: string | null,
  actorEmail: string | null,
  note: string,
) {
  if (!isProjectPhase(phase)) safeQueryError("Invalid phase.");
  const updated = await client.from("projects").update({ phase }).eq("id", projectId);
  if (updated.error) safeQueryError(updated.error.message);

  await appendPhaseEvent(client, {
    projectId,
    phase,
    action: "phase_change",
    actorUid,
    actorEmail,
    note,
  });

  return phase;
}

export function phaseTimelineFromProject(project: AdminProject) {
  const currentIndex = projectPhaseOrder.indexOf(project.phase);
  return projectPhaseOrder.map((phase, index) => ({
    phase,
    label: projectPhaseLabel(phase),
    isReached: index <= currentIndex,
  }));
}

export function getNextPhase(current: string) {
  if (!isProjectPhase(current)) return "lead_qualified";
  return nextProjectPhase(current as ProjectPhase);
}
