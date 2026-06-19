import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createAdminRecord,
  deleteAdminRecord,
  updateAdminRecord,
} from "@/app/admin/actions";
import { InvoiceWorkbench } from "@/components/invoice-workbench";
import {
  adminFormDefinitions,
  adminSections,
  buildSectionRows,
  crmStatuses,
  formatAdminCurrency,
  loadAdminDashboard,
  loadDemoAdminDashboard,
  loadDemoAdminOptions,
  loadDemoAdminRecords,
  loadDemoFinanceData,
  loadAdminOptions,
  loadAdminRecords,
  loadFinanceData,
  reportDefinitions,
  shouldUseLocalAdminDemo,
  type AdminField,
  type AdminFormDefinition,
  type AdminRow,
} from "@/lib/admin-data";
import { getServiceSupabase } from "@/lib/supabase";
import type { AdminSection } from "@/lib/types";

const sectionSlugs = adminSections.map((section) => section.slug);
type AdminClient = NonNullable<ReturnType<typeof getServiceSupabase>["client"]>;

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return sectionSlugs.map((section) => ({ section }));
}

export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const { section } = await params;
  const notice = await searchParams;

  if (!sectionSlugs.includes(section as AdminSection)) {
    notFound();
  }

  const current = adminSections.find((item) => item.slug === section)!;
  const { client, missing } = getServiceSupabase();

  if (!client) {
    if (shouldUseLocalAdminDemo(missing)) {
      return (
        <section className="admin-page">
          <AdminHeader current={current} />
          <LocalDemoNotice missing={missing} />
          {section === "dashboard" ? <Dashboard demo /> : null}
          {section === "crm" ? <Crm demo /> : null}
          {section === "finances" ? <Finances demo /> : null}
          {section === "settings" ? <Settings /> : null}
        </section>
      );
    }

    return (
      <section className="admin-page">
        <AdminHeader current={current} />
        <EmptyState title="Supabase is not configured" detail={`Missing environment: ${missing.join(", ")}`} />
      </section>
    );
  }

  return (
    <section className="admin-page">
      <AdminHeader current={current} />
      <AdminNotice notice={notice} />
      {section === "dashboard" ? <Dashboard client={client} /> : null}
      {section === "crm" ? <Crm client={client} /> : null}
      {section === "finances" ? <Finances client={client} /> : null}
      {section === "settings" ? <Settings /> : null}
    </section>
  );
}

function AdminHeader({ current }: { current: { label: string; description: string } }) {
  return (
    <header className="admin-header">
      <div>
        <p>Chandelier Consulting OS</p>
        <h1>{current.label}</h1>
      </div>
      <span>{current.description}</span>
    </header>
  );
}

async function Dashboard({ client, demo }: { client?: AdminClient; demo?: boolean }) {
  const dashboard = demo ? loadDemoAdminDashboard() : await loadAdminDashboard(client!);

  return (
    <>
      <div className="admin-metrics">
        {dashboard.metrics.map(({ label, value }) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <article>
          <h2>CRM pipeline</h2>
          {dashboard.pipeline.map((item) => (
            <div className="admin-row" key={item.stage}>
              <span>{item.stage}</span>
              <strong>{item.count} / {formatAdminCurrency(item.valueCents)}</strong>
            </div>
          ))}
        </article>
        <article>
          <h2>Revenue by business unit</h2>
          {dashboard.businessUnits.map((unit) => (
            <div className="admin-row" key={unit.slug}>
              <span>{unit.name}</span>
              <strong>{formatAdminCurrency(unit.revenueCents)}</strong>
            </div>
          ))}
        </article>
      </div>
    </>
  );
}

async function Crm({ client, demo }: { client?: AdminClient; demo?: boolean }) {
  const [records, options] = demo
    ? [loadDemoAdminRecords("crm"), loadDemoAdminOptions()]
    : await Promise.all([
        loadAdminRecords(client!, "crm"),
        loadAdminOptions(client!),
      ]);
  const rows = buildSectionRows("crm", records);
  const definition = adminFormDefinitions.crm!;

  return (
    <div className="admin-workspace">
      <CrmPipeline rows={rows} />
      <details className="admin-command-panel">
        <summary>Add lead or business</summary>
        <article className="admin-form-card">
          <h2>Add business</h2>
          <AdminRecordForm action={createAdminRecord} definition={definition} options={options} section="crm" />
        </article>
      </details>
      <CrmRecordTable
        definition={definition}
        emptyDetail="Add the first company or lead with the form above."
        emptyTitle="No businesses yet"
        options={options}
        records={records}
        rows={rows}
      />
    </div>
  );
}

function CrmPipeline({ rows }: { rows: AdminRow[] }) {
  return (
    <div className="admin-kanban compact" aria-label="CRM pipeline by status">
      {crmStatuses.map((status) => {
        const statusRows = rows.filter((row) => row.meta[0]?.toLowerCase() === status);
        return (
          <article key={status}>
            <div>
              <h2>{status}</h2>
              <strong>{statusRows.length}</strong>
            </div>
            {statusRows.slice(0, 4).map((row) => (
              <p key={`${status}-${row.id}`}>{row.title}</p>
            ))}
          </article>
        );
      })}
    </div>
  );
}

 async function Finances({
  client,
  demo,
}: {
  client?: AdminClient;
  demo?: boolean;
}) {
  const [finance, options, expenseRecords, contractorRecords, payoutRecords] = demo
    ? [
        loadDemoFinanceData(),
        loadDemoAdminOptions(),
        loadDemoAdminRecords("expenses"),
        loadDemoAdminRecords("contractors"),
        loadDemoAdminRecords("payouts"),
      ]
    : await Promise.all([
        loadFinanceData(client!),
        loadAdminOptions(client!),
        loadAdminRecords(client!, "expenses"),
        loadAdminRecords(client!, "contractors"),
        loadAdminRecords(client!, "payouts"),
      ]);
  return (
    <div className="admin-workspace">
      <div className="admin-metrics finance-metrics">
        <article>
          <span>Open invoices</span>
          <strong>{formatAdminCurrency(finance.summary.openInvoiceCents)}</strong>
        </article>
        <article>
          <span>Contractors owed</span>
          <strong>{formatAdminCurrency(finance.summary.contractorOwedCents)}</strong>
        </article>
        <article>
          <span>Reimburse me</span>
          <strong>{formatAdminCurrency(finance.summary.reimbursableCents)}</strong>
        </article>
        <article>
          <span>Payments recorded</span>
          <strong>{formatAdminCurrency(finance.summary.paidCents)}</strong>
        </article>
      </div>

      <details className="admin-command-panel" open>
        <summary>Create invoice package</summary>
        <InvoiceWorkbench />
      </details>

      <section className="admin-command-grid" aria-label="Finance commands">
        <details className="admin-command-panel">
          <summary>Add expense</summary>
          <article className="admin-form-card">
          <h2>Add expense</h2>
          <AdminRecordForm action={createAdminRecord} definition={adminFormDefinitions.expenses!} options={options} section="expenses" />
          </article>
        </details>
        <details className="admin-command-panel">
          <summary>Add contractor</summary>
          <article className="admin-form-card">
          <h2>Add contractor</h2>
          <AdminRecordForm action={createAdminRecord} definition={adminFormDefinitions.contractors!} options={options} section="contractors" />
          </article>
        </details>
        <details className="admin-command-panel">
          <summary>Add payout owed</summary>
          <article className="admin-form-card">
          <h2>Add payout owed</h2>
          <AdminRecordForm action={createAdminRecord} definition={adminFormDefinitions.payouts!} options={options} section="payouts" />
          </article>
        </details>
        <details className="admin-command-panel">
          <summary>Exports</summary>
          <article className="admin-form-card">
          <h2>Exports</h2>
          {reportDefinitions.map((report) => (
            <div className="admin-row" key={report.fileName}>
              <span>{report.fileName}</span>
              <Link href={`/api/reports/${report.fileName}`}>Download</Link>
            </div>
          ))}
          </article>
        </details>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Open invoices</h2>
        <MoneyRows rows={finance.invoices.filter((invoice) => !["paid", "void", "voided", "uncollectible"].includes(String(invoice.status ?? "")))} />
      </section>

      <FinanceRecordTable
        actionSection="payouts"
        definition={adminFormDefinitions.payouts!}
        emptyDetail="No contractor payouts are currently tracked."
        emptyTitle="No payouts"
        label="Contractor payouts"
        options={options}
        records={payoutRecords}
        rows={buildSectionRows("payouts", payoutRecords)}
      />

      <FinanceRecordTable
        actionSection="expenses"
        definition={adminFormDefinitions.expenses!}
        emptyDetail="No expenses are currently tracked."
        emptyTitle="No expenses"
        label="Expenses"
        options={options}
        records={expenseRecords}
        rows={buildSectionRows("expenses", expenseRecords)}
      />

      <FinanceRecordTable
        actionSection="contractors"
        definition={adminFormDefinitions.contractors!}
        emptyDetail="No contractors are currently tracked."
        emptyTitle="No contractors"
        label="Contractors"
        options={options}
        records={contractorRecords}
        rows={buildSectionRows("contractors", contractorRecords)}
      />
    </div>
  );
}

function Settings() {
  return (
    <div className="admin-grid">
      <article>
        <h2>Supabase</h2>
        <p>Admin data is loaded from Supabase with server-only service access.</p>
      </article>
      <article>
        <h2>Stripe</h2>
        <p>Admin invoice actions run through internal API routes. Webhooks validate invoice and payment status back into Supabase.</p>
      </article>
      <article>
        <h2>Security model</h2>
        <p>Admin routes require Supabase Auth plus the ADMIN_EMAILS allowlist when configured.</p>
      </article>
    </div>
  );
}

function AdminNotice({
  notice,
}: {
  notice: { saved?: string; deleted?: string; error?: string };
}) {
  if (notice.error) {
    return <p className="admin-notice error-note">{notice.error}</p>;
  }
  if (notice.saved) {
    return <p className="admin-notice">Saved.</p>;
  }
  if (notice.deleted) {
    return <p className="admin-notice">Deleted.</p>;
  }
  return null;
}

function LocalDemoNotice({ missing }: { missing: string[] }) {
  return (
    <p className="admin-notice">
      Local demo data active. Missing Supabase environment: {missing.join(", ")}.
    </p>
  );
}

function CrmRecordTable({
  definition,
  emptyDetail,
  emptyTitle,
  options,
  records,
  rows,
}: {
  definition: AdminFormDefinition;
  emptyDetail: string;
  emptyTitle: string;
  options: Awaited<ReturnType<typeof loadAdminOptions>>;
  records: Record<string, unknown>[];
  rows: AdminRow[];
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  }

  return (
    <section className="admin-data-table crm-table" aria-label="CRM businesses and leads">
      <div className="admin-table-head" aria-hidden="true">
        <span>Business</span>
        <span>Status</span>
        <span>Contact</span>
        <span>Next action</span>
        <span>Value</span>
        <span>Commands</span>
      </div>
      {rows.map((row, index) => (
        <article className="admin-table-row" key={row.id ?? `${row.title}-${index}`}>
          <div className="primary" data-label="Business">
            <strong>{row.title}</strong>
            <span>{fieldText(records[index], "category", "Uncategorized")}</span>
          </div>
          <div data-label="Status">
            <span className="admin-pill">{row.meta[0] ?? "lead"}</span>
          </div>
          <div data-label="Contact">
            <strong>{fieldText(records[index], "contact_name", "No contact")}</strong>
            <span>{fieldText(records[index], "email", fieldText(records[index], "phone", "No email"))}</span>
          </div>
          <div data-label="Next action">
            <strong>{fieldText(records[index], "next_action", "No next action")}</strong>
            <span>{fieldText(records[index], "next_follow_up_at", "No follow-up")}</span>
          </div>
          <div data-label="Value">
            <strong>{row.amount ?? "Not set"}</strong>
          </div>
	          <div className="admin-table-actions" data-label="Commands">
	            {row.id ? (
	              <Link className="btn ghost" href={`/admin/finances`}>
	                Invoice
	              </Link>
	            ) : null}
	          </div>
          <RecordEditControls
            actionSection="crm"
            definition={definition}
            id={row.id}
            options={options}
            record={records[index]}
          />
        </article>
      ))}
    </section>
  );
}

function FinanceRecordTable({
  actionSection,
  definition,
  emptyDetail,
  emptyTitle,
  label,
  options,
  records,
  rows,
}: {
  actionSection: AdminSection;
  definition: AdminFormDefinition;
  emptyDetail: string;
  emptyTitle: string;
  label: string;
  options: Awaited<ReturnType<typeof loadAdminOptions>>;
  records: Record<string, unknown>[];
  rows: AdminRow[];
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  }

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">{label}</h2>
      <div className="admin-data-table finance-table" aria-label={label}>
        <div className="admin-table-head" aria-hidden="true">
          <span>Name</span>
          <span>Status</span>
          <span>Context</span>
          <span>Amount</span>
          <span>Commands</span>
        </div>
        {rows.map((row, index) => (
          <article className="admin-table-row" key={row.id ?? `${row.title}-${index}`}>
            <div className="primary" data-label="Name">
              <strong>{row.title}</strong>
              <span>{row.meta[1] ?? row.meta[0] ?? "Tracked"}</span>
            </div>
            <div data-label="Status">
              <span className="admin-pill">{row.meta[0] ?? "tracked"}</span>
            </div>
            <div data-label="Context">
              <strong>{row.fields?.[0]?.value ?? "No context"}</strong>
              <span>{row.fields?.[1]?.value ?? row.meta.slice(1).join(" / ")}</span>
            </div>
            <div data-label="Amount">
              <strong>{row.amount ?? "Not set"}</strong>
            </div>
            <div className="admin-table-actions" data-label="Commands" />
            <RecordEditControls
              actionSection={actionSection}
              definition={definition}
              id={row.id}
              options={options}
              record={records[index]}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function RecordEditControls({
  actionSection,
  definition,
  id,
  options,
  record,
}: {
  actionSection: AdminSection;
  definition: AdminFormDefinition;
  id?: string;
  options: Awaited<ReturnType<typeof loadAdminOptions>>;
  record: Record<string, unknown>;
}) {
  return (
    <details className="admin-edit admin-table-edit">
      <summary>Edit</summary>
      <AdminRecordForm
        action={updateAdminRecord}
        definition={definition}
        id={id}
        options={options}
        record={record}
        section={actionSection}
      />
      {id ? (
        <form action={deleteAdminRecord} className="admin-delete-form">
          <input name="section" type="hidden" value={actionSection} />
          <input name="id" type="hidden" value={id} />
          <button className="btn ghost danger" type="submit">
            Delete
          </button>
        </form>
      ) : null}
    </details>
  );
}

function MoneyRows({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No open invoices" detail="Supabase has no unpaid invoices right now." />;
  }

  return (
    <div className="admin-data-table invoice-table">
      <div className="admin-table-head" aria-hidden="true">
        <span>Invoice</span>
        <span>Status</span>
        <span>Due</span>
        <span>Total</span>
        <span>Commands</span>
      </div>
      {rows.map((row, index) => (
        <article className="admin-table-row" key={String(row.id ?? index)}>
          <div className="primary" data-label="Invoice">
            <strong>{String(row.stripe_invoice_id ?? "Local invoice")}</strong>
            <span>{String(row.memo ?? "No memo")}</span>
          </div>
          <div data-label="Status">
            <span className="admin-pill">{String(row.status ?? "unknown")}</span>
          </div>
          <div data-label="Due">
            <strong>{String(row.due_date ?? "No due date")}</strong>
          </div>
          <div data-label="Total">
            <strong>{formatAdminCurrency(typeof row.total_cents === "number" ? row.total_cents : 0)}</strong>
          </div>
          <div className="admin-table-actions" data-label="Commands">
            {typeof row.hosted_invoice_url === "string" && row.hosted_invoice_url ? (
              <Link className="btn ghost" href={row.hosted_invoice_url}>
                Open
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function AdminRecordForm({
  action,
  definition,
  id,
  options,
  record,
  section,
}: {
  action: (formData: FormData) => Promise<void>;
  definition: AdminFormDefinition;
  id?: string;
  options: Awaited<ReturnType<typeof loadAdminOptions>>;
  record?: Record<string, unknown>;
  section: AdminSection;
}) {
  return (
    <form action={action} className="admin-record-form">
      <input name="section" type="hidden" value={section} />
      {id ? <input name="id" type="hidden" value={id} /> : null}
      <div className="form-grid">
        {definition.fields.map((field) => (
          <AdminFieldInput
            field={field}
            key={field.name}
            options={options}
            value={record?.[field.name]}
          />
        ))}
      </div>
      <button className="btn" type="submit">
        {definition.submitLabel}
      </button>
    </form>
  );
}

function AdminFieldInput({
  field,
  options,
  value,
}: {
  field: AdminField;
  options: Awaited<ReturnType<typeof loadAdminOptions>>;
  value: unknown;
}) {
  const common = {
    name: field.name,
    required: field.required,
  };
  const defaultValue = inputValue(field, value);

  if (field.type === "textarea" || field.type === "multitext") {
    return (
      <label className="field full">
        {field.label}
        <textarea {...common} defaultValue={defaultValue} placeholder={field.placeholder} />
      </label>
    );
  }

  if (field.type === "select") {
    const selectOptions = field.relation ? options[field.relation] : field.options?.map((option) => ({ value: option, label: option })) ?? [];
    return (
      <label className="field">
        {field.label}
        <select {...common} defaultValue={defaultValue}>
          <option value="">Not set</option>
          {selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="field checkbox-field">
        <input name={field.name} type="checkbox" defaultChecked={Boolean(value)} />
        {field.label}
      </label>
    );
  }

  if (field.type === "file") {
    return (
      <label className="field">
        {field.label}
        <input name={field.name} type="file" />
        {typeof value === "string" && value ? <span className="field-help">{value}</span> : null}
      </label>
    );
  }

  return (
    <label className="field">
      {field.label}
      <input
        {...common}
        defaultValue={defaultValue}
        placeholder={field.placeholder}
        step={field.type === "number" ? "0.01" : undefined}
        type={field.type}
      />
    </label>
  );
}

function inputValue(field: AdminField, value: unknown) {
  if (value === null || value === undefined) return "";
  if (field.type === "number" || field.name.endsWith("_cents")) {
    return typeof value === "number" ? String(value / 100) : String(value);
  }
  if (field.type === "multitext") {
    return Array.isArray(value) ? value.map(String).join("\n") : String(value);
  }
  return String(value);
}

function fieldText(row: Record<string, unknown>, key: string, fallback: string) {
  const value = row[key];
  if (Array.isArray(value)) return value.map(String).join(", ") || fallback;
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="admin-grid">
      <article>
        <h2>{title}</h2>
        <p>{detail}</p>
      </article>
    </div>
  );
}
