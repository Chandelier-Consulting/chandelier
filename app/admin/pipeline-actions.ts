"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { getStripe, findOrCreateCustomer } from "@/lib/stripe";
import { createOneTimeInvoice } from "@/lib/billing";
import {
  createClient as createClientRecord,
  createProjectWithBillingSteps,
  deleteClient as deleteClientRecord,
  getNextPhase,
  getProjectWorkspace,
  loadBillingPatterns,
  appendPhaseEvent,
  setProjectPhase,
  updateClient as updateClientRecord,
  type BillingPatternStepInput,
} from "@/lib/admin-pipeline-data";
import {
  generateProjectDocument,
  issueSigningSessionForDocument,
  markDocumentSignedManually,
  revokeSigningSession,
} from "@/lib/admin-documents";
import {
  isProjectPhase,
  projectPhaseLabel,
  type DocumentType,
  type ProjectPhase,
} from "@/lib/admin-pipeline";
import { requireAdminActor } from "@/lib/admin-auth-server";

const defaultNotice = "The action could not be completed. Please verify the form data and try again.";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(path: string, message: string) {
  redirect(`${path}?error=${encodeURIComponent(message || defaultNotice)}`);
}

function redirectWithNotice(path: string) {
  redirect(`${path}?saved=1`);
}

function requireAdminClient(): SupabaseClient {
  const { client, missing } = getServiceSupabase();
  if (!client) {
    redirectWithError("/admin", `Supabase is not configured: ${missing.join(", ")}`);
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  return client;
}

function toCents(value: string | null, fallback = 0) {
  const parsed = Number((value ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : fallback;
}

function parseDocumentType(raw: string): DocumentType | null {
  if (raw === "msa" || raw === "sow" || raw === "agency_procedures" || raw === "design_system") {
    return raw;
  }
  return null;
}

function parsePhase(raw: string): ProjectPhase | null {
  return isProjectPhase(raw) ? raw : null;
}

function parseCustomSteps(raw: string): BillingPatternStepInput[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, phaseInput, percentageInput, amountInput] = line
        .split("|")
        .map((entry) => entry.trim());

      const percentage = Number(percentageInput);
      return {
        label: label || "Custom billing step",
        triggerPhase: isProjectPhase(phaseInput) ? phaseInput : "lead_qualified",
        percentage: Number.isFinite(percentage) ? percentage : undefined,
        amountCents: Number(amountInput) ? Math.max(0, Math.round(Number(amountInput))) : undefined,
      };
    })
    .filter((step) => step.label.length > 0);
}

async function assertAdmin() {
  await requireAdminActor();
}

export async function createClient(formData: FormData) {
  await assertAdmin();
  const client = requireAdminClient();

  const legalName = value(formData, "legal_name");
  if (!legalName) {
    redirectWithError("/admin/clients", "Legal name is required.");
  }

  const payload = {
    legalName,
    displayName: value(formData, "display_name") || legalName,
    contactName: value(formData, "contact_name"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    billingEmail: value(formData, "billing_email") || value(formData, "email"),
    companyWebsite: value(formData, "company_website"),
    address: value(formData, "address"),
  };

  try {
    await createClientRecord(client, payload);
  } catch (error) {
    redirectWithError("/admin/clients", error instanceof Error ? error.message : "Could not create client.");
  }

  revalidatePath("/admin/clients");
  redirectWithNotice("/admin/clients");
}

export async function updateClient(formData: FormData) {
  await assertAdmin();
  const client = requireAdminClient();

  const id = value(formData, "id");
  if (!id) redirectWithError("/admin/clients", "Client id is missing.");

  const payload = {
    legalName: value(formData, "legal_name"),
    displayName: value(formData, "display_name"),
    contactName: value(formData, "contact_name"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    billingEmail: value(formData, "billing_email"),
    companyWebsite: value(formData, "company_website"),
    address: value(formData, "address"),
  };

  try {
    await updateClientRecord(client, id, payload);
  } catch (error) {
    redirectWithError("/admin/clients", error instanceof Error ? error.message : "Could not update client.");
  }

  revalidatePath("/admin/clients");
  redirectWithNotice("/admin/clients");
}

export async function deleteClient(formData: FormData) {
  await assertAdmin();
  const client = requireAdminClient();

  const id = value(formData, "id");
  if (!id) redirectWithError("/admin/clients", "Client id is missing.");

  try {
    await deleteClientRecord(client, id);
  } catch (error) {
    redirectWithError("/admin/clients", error instanceof Error ? error.message : "Could not delete client.");
  }

  revalidatePath("/admin/clients");
  redirectWithNotice("/admin/clients");
}

export async function createProject(formData: FormData) {
  await assertAdmin();
  const client = requireAdminClient();

  const clientId = value(formData, "client_id");
  if (!clientId) redirectWithError("/admin/projects", "Please choose a client.");

  const name = value(formData, "name");
  if (!name) redirectWithError("/admin/projects", "Project name is required.");

  const totalAmountCents = toCents(value(formData, "total_amount"), 0);
  if (totalAmountCents <= 0) redirectWithError("/admin/projects", "Total amount must be greater than zero.");

  const billingPatternId = value(formData, "billing_pattern_id") || "50-50";
  const patterns = await loadBillingPatterns(client);
  const selected = patterns.find((pattern) => pattern.id === billingPatternId);
  const isCustom = billingPatternId === "custom";
  if (!selected && !isCustom) {
    redirectWithError("/admin/projects", "Please select a billing pattern.");
  }

  const customSteps = parseCustomSteps(value(formData, "custom_steps"));
  const deliverables = value(formData, "deliverables")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  try {
    await createProjectWithBillingSteps(client, {
      clientId,
      name,
      status: value(formData, "status") || "active",
      phase: parsePhase(value(formData, "phase")) || "lead_qualified",
      totalAmountCents,
      currency: value(formData, "currency") || "USD",
      billingPatternId,
      scopeSummary: value(formData, "scope_summary"),
      deliverables,
      startDate: value(formData, "start_date"),
      targetEndDate: value(formData, "target_end_date"),
      customSteps: isCustom && customSteps.length > 0 ? customSteps : undefined,
    });
  } catch (error) {
    redirectWithError("/admin/projects", error instanceof Error ? error.message : "Could not create project.");
  }

  revalidatePath("/admin/projects");
  redirectWithNotice("/admin/projects");
}

export async function setProjectPhaseAction(formData: FormData) {
  await assertAdmin();
  const actor = await requireAdminActor();
  const client = requireAdminClient();

  const projectId = value(formData, "project_id");
  if (!projectId) {
    redirectWithError("/admin/projects", "Project id is missing.");
    return;
  }

  const phase = parsePhase(value(formData, "phase"));
  if (!phase) {
    redirectWithError(`/admin/projects/${projectId}?tab=phase`, "Invalid phase selected.");
    return;
  }

  const actorUid = actor.uid ?? "system-admin";
  const actorEmail = actor.email;

  const note = value(formData, "note") || "Manual phase update.";

  try {
    await setProjectPhase(client, projectId, phase, actorUid, actorEmail, note);
  } catch (error) {
    redirectWithError(
      `/admin/projects/${projectId}?tab=phase`,
      error instanceof Error ? error.message : "Could not set phase.",
    );
  }

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirectWithNotice(`/admin/projects/${projectId}?tab=phase`);
}

export async function advanceProjectPhaseAction(formData: FormData) {
  await assertAdmin();
  const actor = await requireAdminActor();
  const client = requireAdminClient();

  const projectId = value(formData, "project_id");
  if (!projectId) {
    redirectWithError("/admin/projects", "Project id is missing.");
    return;
  }

  const workspace = await getProjectWorkspace(client, projectId);
  const next = getNextPhase(workspace.project.phase);
  if (!next || next === workspace.project.phase) {
    redirectWithError(`/admin/projects/${projectId}?tab=phase`, "Project is already at final phase.");
    return;
  }

  const actorUid = actor.uid ?? "system-admin";
  const actorEmail = actor.email;

  try {
    await setProjectPhase(
      client,
      projectId,
      next,
      actorUid,
      actorEmail,
      `Advanced from ${projectPhaseLabel(workspace.project.phase)} to ${projectPhaseLabel(next)}.`,
    );
  } catch (error) {
    redirectWithError(
      `/admin/projects/${projectId}?tab=phase`,
      error instanceof Error ? error.message : "Could not advance phase.",
    );
  }

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}?tab=phase`);
}

export async function generateDocumentAction(formData: FormData) {
  await assertAdmin();
  const client = requireAdminClient();

  const projectId = value(formData, "project_id");
  const type = parseDocumentType(value(formData, "type"));

  if (!projectId || !type) {
    redirectWithError("/admin/projects", "Missing project or document type.");
    return;
  }

  const workspace = await getProjectWorkspace(client, projectId);
  if (workspace.project.client_id && workspace.client.id !== workspace.project.client_id) {
    revalidatePath("/admin/projects");
  }

  try {
    await generateProjectDocument({ client, projectId, type });
  } catch (error) {
    redirectWithError(
      `/admin/projects/${projectId}?tab=documents`,
      error instanceof Error ? error.message : "Could not generate document.",
    );
  }

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}?tab=documents`);
}

export async function issueSigningSessionAction(formData: FormData) {
  await assertAdmin();
  const client = requireAdminClient();

  const projectId = value(formData, "project_id");
  const documentId = value(formData, "document_id");
  const signerName = value(formData, "signer_name");
  const signerEmail = value(formData, "signer_email");

  if (!projectId || !documentId) {
    redirectWithError("/admin/projects", "Missing project or document.");
    return;
  }

  const workspace = await getProjectWorkspace(client, projectId);
  const clientId = workspace.project.client_id;

  try {
    const result = await issueSigningSessionForDocument({
      client,
      projectId,
      documentId,
      clientId,
      signerEmail,
      signerName,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    redirect(
      `/admin/projects/${projectId}?tab=documents&issued_session=${encodeURIComponent(
        result.sessionId,
      )}&issued_doc=${encodeURIComponent(documentId)}&issued_token=${encodeURIComponent(result.token)}`,
    );
  } catch (error) {
    redirectWithError(
      `/admin/projects/${projectId}?tab=documents`,
      error instanceof Error ? error.message : "Could not issue signing session.",
    );
  }
}

export async function revokeSigningSessionAction(formData: FormData) {
  await assertAdmin();
  const client = requireAdminClient();

  const projectId = value(formData, "project_id");
  const sessionId = value(formData, "session_id");
  if (!sessionId) {
    redirectWithError("/admin/projects", "Session id is missing.");
    return;
  }

  try {
    await revokeSigningSession({ client, sessionId });
  } catch (error) {
    redirectWithError(
      projectId ? `/admin/projects/${projectId}?tab=documents` : "/admin/projects",
      error instanceof Error ? error.message : "Could not revoke session.",
    );
  }

  revalidatePath(projectId ? `/admin/projects/${projectId}` : "/admin/projects");
  if (projectId) redirectWithNotice(`/admin/projects/${projectId}?tab=documents`);
  redirectWithNotice("/admin/projects");
}

export async function markSignedManuallyAction(formData: FormData) {
  await assertAdmin();
  const actor = await requireAdminActor();
  const client = requireAdminClient();

  const projectId = value(formData, "project_id");
  const documentId = value(formData, "document_id");
  const actorName = value(formData, "signer_name") || actor.email || "Admin";
  const actorEmail = value(formData, "signer_email") || actor.email || "admin@local";

  if (!projectId || !documentId) {
    redirectWithError("/admin/projects", "Missing project or document.");
    return;
  }

  try {
    await markDocumentSignedManually({
      client,
      documentId,
      actorName,
      actorEmail,
    });
  } catch (error) {
    redirectWithError(
      `/admin/projects/${projectId}?tab=documents`,
      error instanceof Error ? error.message : "Could not mark document as signed.",
    );
  }

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}?tab=documents`);
}

export async function createInvoiceForStepAction(formData: FormData) {
  await assertAdmin();
  const actor = await requireAdminActor();
  const client = requireAdminClient();

  const projectId = value(formData, "project_id");
  const stepId = value(formData, "step_id");
  const dueDate = value(formData, "due_date");

  if (!projectId || !stepId) {
    redirectWithError("/admin/projects", "Missing project or billing step.");
    return;
  }

  const workspace = await getProjectWorkspace(client, projectId);
  const matchingStep = workspace.billingSteps.find((step) => step.id === stepId);
  if (!matchingStep) {
    redirectWithError(`/admin/projects/${projectId}?tab=billing`, "Billing step not found.");
    return;
  }

  const customerEmail = workspace.client.billing_email || workspace.client.email;
  if (!customerEmail) {
    redirectWithError(
      `/admin/projects/${projectId}?tab=billing`,
      "Client billing email is required for invoice creation.",
    );
    return;
  }

  const { stripe, missing } = getStripe();
  if (!stripe) {
    const actorUid = actor.uid ?? "system-admin";
    const actorEmail = actor.email;

    const updated = await client
      .from("billing_steps")
      .update({
        status: "issued",
        stripe_invoice_id: `TODO:Stripe_not_configured_${new Date().toISOString()}`,
      })
      .eq("id", stepId);

    if (updated.error) {
      redirectWithError(
        `/admin/projects/${projectId}?tab=billing`,
        `Stripe not configured: ${missing.join(", ")}`,
      );
    }

      await appendPhaseEvent(client, {
        projectId,
        phase: workspace.project.phase,
        action: "billing_step_placeholder_invoice_created",
        actorUid,
        actorEmail,
        note: `Stripe is not configured. Billing step "${matchingStep.label}" marked issued as manual placeholder.`,
      });

    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${projectId}`);
    return redirectWithNotice(`/admin/projects/${projectId}?tab=billing`);
  }

  const customerName = workspace.client.display_name || workspace.client.legal_name || workspace.client.name || "Client";
  const actorEmail = actor.email || "admin@local";
  try {
    const customer = await findOrCreateCustomer(stripe, {
      customer_name: customerName,
      customer_email: customerEmail,
    });

    if (typeof (customer as { deleted?: boolean }).deleted === "boolean" && (customer as { deleted?: boolean }).deleted) {
      throw new Error("Resolved customer account is deleted.");
    }

    const stripeCustomer = customer as Stripe.Customer;

    const invoice = await createOneTimeInvoice(stripe, client, stripeCustomer, {
      business_id: undefined,
      memo: `${matchingStep.label} for ${workspace.project.name}`,
      due_date: dueDate || undefined,
      discount_cents: 0,
      deposit_cents: 0,
      retainer_cents: 0,
      line_items: [
        {
          description: matchingStep.label,
          quantity: 1,
          unit_amount_cents: Math.max(0, matchingStep.amount_cents),
        },
      ],
    });

    const updated = await client
      .from("billing_steps")
      .update({ status: "issued", stripe_invoice_id: invoice?.stripe_invoice_id ?? null })
      .eq("id", stepId);

    if (updated.error) {
      throw new Error(updated.error.message);
    }
  } catch (error) {
    redirectWithError(
      `/admin/projects/${projectId}?tab=billing`,
      error instanceof Error ? error.message : "Invoice creation failed.",
    );
  }

  if (actorEmail) {
    console.info(`Invoice created for project ${projectId} by ${actorEmail}`);
  }

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirectWithNotice(`/admin/projects/${projectId}?tab=billing`);
}

export async function markBillingStepPaidAction(formData: FormData) {
  await assertAdmin();
  const client = requireAdminClient();

  const projectId = value(formData, "project_id");
  const stepId = value(formData, "step_id");
  if (!projectId || !stepId) {
    redirectWithError("/admin/projects", "Missing project or billing step.");
    return;
  }

  const updated = await client.from("billing_steps").update({ status: "paid" }).eq("id", stepId);
  if (updated.error) {
    redirectWithError(
      `/admin/projects/${projectId}?tab=billing`,
      updated.error.message,
    );
  }

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirectWithNotice(`/admin/projects/${projectId}?tab=billing`);
}
