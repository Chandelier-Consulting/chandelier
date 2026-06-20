import { env } from "@/lib/env";

export type ProjectPhase =
  | "lead_qualified"
  | "discovery_complete"
  | "proposal_draft"
  | "msa_issued"
  | "msa_signed"
  | "sow_issued"
  | "sow_signed"
  | "deposit_invoice_ready"
  | "deposit_paid"
  | "build_active"
  | "revision"
  | "final_invoice_ready"
  | "final_paid"
  | "handoff_complete";

export const projectPhaseOrder: ProjectPhase[] = [
  "lead_qualified",
  "discovery_complete",
  "proposal_draft",
  "msa_issued",
  "msa_signed",
  "sow_issued",
  "sow_signed",
  "deposit_invoice_ready",
  "deposit_paid",
  "build_active",
  "revision",
  "final_invoice_ready",
  "final_paid",
  "handoff_complete",
];

export const projectPhaseLabels: Record<ProjectPhase, string> = {
  lead_qualified: "Lead Qualified",
  discovery_complete: "Discovery Complete",
  proposal_draft: "Proposal Draft",
  msa_issued: "MSA Issued",
  msa_signed: "MSA Signed",
  sow_issued: "SOW Issued",
  sow_signed: "SOW Signed",
  deposit_invoice_ready: "Deposit Invoice Ready",
  deposit_paid: "Deposit Paid",
  build_active: "Build Active",
  revision: "Revision",
  final_invoice_ready: "Final Invoice Ready",
  final_paid: "Final Paid",
  handoff_complete: "Handoff Complete",
};

export function projectPhaseLabel(phase: string) {
  return projectPhaseLabels[phase as ProjectPhase] ?? phase.replace(/_/g, " ");
}

export function isProjectPhase(phase: string): phase is ProjectPhase {
  return projectPhaseOrder.includes(phase as ProjectPhase);
}

export function nextProjectPhase(phase: ProjectPhase) {
  const index = projectPhaseOrder.indexOf(phase);
  if (index < 0) return "lead_qualified";
  return projectPhaseOrder[index + 1] ?? "handoff_complete";
}

export type DocumentType = "msa" | "sow" | "agency_procedures" | "design_system";

export const documentTypeLabels: Record<DocumentType, string> = {
  msa: "MSA",
  sow: "SOW",
  agency_procedures: "Agency Procedures",
  design_system: "Design System",
};

export function documentTypeLabel(type: DocumentType) {
  return documentTypeLabels[type] ?? type.toString().replace(/_/g, " ");
}

export const templatePathByType: Record<DocumentType, string> = {
  msa: "templates/chandelier-msa-clean.docx",
  sow: "templates/chandelier-sow-template-clean.docx",
  agency_procedures: "templates/chandelier-agency-procedures-clean.docx",
  design_system: "templates/chandelier-design-system-clean.docx",
};

export type DocumentStatus = "draft" | "generated" | "issued" | "viewed" | "signed" | "void";

export type BillingStepStatus = "planned" | "ready_to_issue" | "issued" | "paid" | "void";

export type BillingPatternStep = {
  label: string;
  triggerPhase: ProjectPhase;
  percentage?: number | null;
  amountCents?: number | null;
};

export type BillingPattern = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  steps: BillingPatternStep[];
  createdAt: string;
};

export const defaultBillingPatterns: BillingPattern[] = [
  {
    id: "50-50",
    name: "50% Deposit / 50% Final",
    description: "Deposit milestone then final invoice.",
    isDefault: true,
    steps: [
      { label: "Deposit (50%)", triggerPhase: "deposit_invoice_ready", percentage: 50 },
      { label: "Final (50%)", triggerPhase: "final_invoice_ready", percentage: 50 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "40-30-30",
    name: "40% Deposit / 30% Midway / 30% Final",
    description: "Three milestone split for medium-sized build work.",
    isDefault: false,
    steps: [
      { label: "Deposit (40%)", triggerPhase: "deposit_invoice_ready", percentage: 40 },
      { label: "Midpoint (30%)", triggerPhase: "revision", percentage: 30 },
      { label: "Final (30%)", triggerPhase: "final_invoice_ready", percentage: 30 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "monthly-retainer",
    name: "Monthly Retainer",
    description: "Retainer invoice at build-active kickoff.",
    isDefault: false,
    steps: [{ label: "Monthly Retainer", triggerPhase: "build_active", percentage: 100 }],
    createdAt: new Date().toISOString(),
  },
];

export function formatCents(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function phaseRows() {
  return projectPhaseOrder.map((phase) => ({
    phase,
    label: projectPhaseLabel(phase),
  }));
}

export function normalizeDeliverables(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw
      .flatMap((entry) =>
        typeof entry === "string"
          ? entry
              .toString()
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
          : String(entry),
      )
      .filter(Boolean);
  }

  if (typeof raw === "string") {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

export function buildBillingStepRows(totalAmountCents: number, pattern: BillingPattern, _currency = "USD") {
  if (!pattern.steps.length) return [];

  const percentSteps = pattern.steps
    .filter((step) => Number.isFinite(step.percentage ?? NaN))
    .map((step) => ({
      ...step,
      percentage: Number(step.percentage ?? 0),
    }));

  if (percentSteps.length > 0) {
    const percentTotal = percentSteps.reduce((sum, step) => sum + (step.percentage ?? 0), 0);
    const normalized = percentSteps.map((step) => {
      const amountCents = Math.max(0, totalAmountCents * ((step.percentage ?? 0) / 100));
      return {
        label: step.label,
        triggerPhase: step.triggerPhase,
        percentage: step.percentage,
        amountCents: Math.round(amountCents),
      };
    });

    const fixed = Math.round(normalized.reduce((sum, step) => sum + step.amountCents, 0));
    const residual = Math.max(0, totalAmountCents - fixed);
    if (percentTotal < 100 && normalized.length > 0 && residual > 0) {
      const handoff = normalized[normalized.length - 1];
      return [
        ...normalized.slice(0, -1),
        {
          ...handoff,
          amountCents: handoff.amountCents + residual,
          percentage: (handoff.percentage ?? 0) + (totalAmountCents === 0 ? 0 : (residual / totalAmountCents) * 100),
        },
      ];
    }

    return normalized.map((step) => ({
      ...step,
      percentage: Number(step.percentage?.toFixed(2) ?? 0),
      amountCents: Math.max(0, step.amountCents),
    }));
  }

  return pattern.steps
    .map((step) => ({
      label: step.label,
      triggerPhase: step.triggerPhase,
      amountCents: Math.max(0, Math.round(Number(step.amountCents ?? 0))),
      percentage: null,
    }))
    .filter((step) => step.amountCents > 0);
}

export const documentStorageBucket = "project-documents";

export function documentStoragePath(args: { projectId: string; type: DocumentType; extension: "docx" | "pdf" }) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `projects/${args.projectId}/${args.type}-${stamp}.${args.extension}`;
}

export function signingSessionExpiryDate(hours = 14) {
  const date = new Date();
  date.setHours(date.getHours() + Math.max(1, hours));
  return date;
}

export function shouldAutoAdvanceOnSign() {
  return env.AUTO_ADVANCE_PHASE_ON_SIGN;
}

export const documentSignablePhases: Record<DocumentType, ProjectPhase> = {
  msa: "msa_signed",
  sow: "sow_signed",
  agency_procedures: "build_active",
  design_system: "build_active",
};

export const autoIssuingActionByPhase: Partial<Record<DocumentType, ProjectPhase>> = {
  msa: "deposit_invoice_ready",
  sow: "final_invoice_ready",
};
