import Link from "next/link";
import { notFound } from "next/navigation";
import {
  convertLeadToClient,
  createAdminRecord,
  deleteAdminRecord,
  updateAdminRecord,
  updateLeadStatus,
} from "@/app/admin/actions";
import { InvoiceWorkbench } from "@/components/invoice-workbench";
import {
  adminFormDefinitions,
  adminSections,
  loadAdminDashboard,
  loadAdminOptions,
  loadAdminRecords,
  loadAdminRows,
  buildSectionRows,
  reportDefinitions,
  type AdminRow,
  type AdminField,
  type AdminFormDefinition,
} from "@/lib/admin-data";
import { getServiceSupabase } from "@/lib/supabase";
import type { AdminSection } from "@/lib/types";

const sectionSlugs = adminSections.map((section) => section.slug);

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
    return (
      <section className="admin-page">
        <header>
          <p>Chandelier Consulting OS</p>
          <h1>{current.label}</h1>
          <span>Supabase is required for admin data.</span>
        </header>
        <EmptyState title="Supabase is not configured" detail={`Missing environment: ${missing.join(", ")}`} />
      </section>
    );
  }

  return (
    <section className="admin-page">
      <header>
        <p>Chandelier Consulting OS</p>
        <h1>{current.label}</h1>
        <span>{current.description}</span>
      </header>
      <AdminNotice notice={notice} />
      {section === "dashboard" ? (
        <Dashboard client={client} />
      ) : (
        <Module client={client} section={section as AdminSection} />
      )}
    </section>
  );
}

async function Dashboard({ client }: { client: NonNullable<ReturnType<typeof getServiceSupabase>["client"]> }) {
  const dashboard = await loadAdminDashboard(client);

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
              <strong>{item.count}</strong>
            </div>
          ))}
        </article>
        <article>
          <h2>Revenue by business unit</h2>
          {dashboard.businessUnits.map((unit) => (
            <div className="admin-row" key={unit.slug}>
              <span>{unit.name}</span>
              <strong>{formatCurrency(unit.revenueCents)}</strong>
            </div>
          ))}
        </article>
      </div>
    </>
  );
}

async function Module({
  client,
  section,
}: {
  client: NonNullable<ReturnType<typeof getServiceSupabase>["client"]>;
  section: AdminSection;
}) {
  if (section === "reports") {
    return (
      <div className="admin-grid">
        <article>
          <h2>CPA exports</h2>
          {reportDefinitions.map((report) => (
            <div className="admin-row" key={report.fileName}>
              <span>{report.fileName}</span>
              <Link href={`/api/reports/${report.fileName}`}>Download</Link>
            </div>
          ))}
        </article>
        <article>
          <h2>Disclaimer</h2>
          <p>This is bookkeeping support, not tax advice. Consult a CPA.</p>
        </article>
      </div>
    );
  }

  if (section === "invoices") {
    const rows = await loadAdminRows(client, section);
    return (
      <>
        <Rows title="Supabase invoices" rows={rows} />
        <InvoiceWorkbench />
      </>
    );
  }

  const definition = adminFormDefinitions[section];
  if (definition) {
    const [records, options] = await Promise.all([
      loadAdminRecords(client, section),
      loadAdminOptions(client),
    ]);
    const rows = buildDisplayRows(section, records);
    return (
      <AdminCrudModule
        definition={definition}
        options={options}
        records={records}
        rows={rows}
        section={section}
      />
    );
  }

  if (section === "settings") {
    return (
      <div className="admin-grid">
        <article>
          <h2>Supabase</h2>
          <p>Admin data is loaded from Supabase with server-only service access.</p>
        </article>
        <article>
          <h2>Security model</h2>
          <p>Admin routes require Supabase Auth plus the ADMIN_EMAILS allowlist when configured.</p>
        </article>
      </div>
    );
  }

  return <Rows title={adminSections.find((item) => item.slug === section)?.label ?? section} rows={await loadAdminRows(client, section)} />;
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

function AdminCrudModule({
  definition,
  options,
  records,
  rows,
  section,
}: {
  definition: AdminFormDefinition;
  options: Awaited<ReturnType<typeof loadAdminOptions>>;
  records: Record<string, unknown>[];
  rows: AdminRow[];
  section: AdminSection;
}) {
  return (
    <div className="admin-workspace">
      {section === "leads" ? <LeadKanban rows={rows} /> : null}
      <section className="admin-editor">
        <article className="admin-form-card">
          <h2>Add {definition.title.toLowerCase()}</h2>
          <AdminRecordForm
            action={createAdminRecord}
            definition={definition}
            options={options}
            section={section}
          />
        </article>
      </section>
      <div className="admin-grid admin-records">
        {rows.length === 0 ? (
          <article>
            <h2>No {definition.title.toLowerCase()} records</h2>
            <p>Add the first record with the form above.</p>
          </article>
        ) : rows.map((row, index) => (
          <article key={row.id ?? `${row.title}-${index}`}>
            <h2>{row.title}</h2>
            {row.meta.map((item) => (
              <p key={item}>{item}</p>
            ))}
            {row.amount ? <strong>{row.amount}</strong> : null}
            {row.fields ? (
              <dl className="admin-details">
                {row.fields.map((field) => (
                  <div key={`${row.id}-${field.label}`}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {section === "leads" && row.id ? <LeadActions id={row.id} /> : null}
            <details className="admin-edit">
              <summary>Edit</summary>
              <AdminRecordForm
                action={updateAdminRecord}
                definition={definition}
                id={row.id}
                options={options}
                record={records[index]}
                section={section}
              />
              {row.id ? (
                <form action={deleteAdminRecord}>
                  <input name="section" type="hidden" value={section} />
                  <input name="id" type="hidden" value={row.id} />
                  <button className="btn ghost danger" type="submit">
                    Delete
                  </button>
                </form>
              ) : null}
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}

function LeadKanban({ rows }: { rows: AdminRow[] }) {
  const statuses = ["new", "proposal", "won", "invoiced", "lost"];
  return (
    <div className="admin-kanban">
      {statuses.map((status) => (
        <article key={status}>
          <h2>{status}</h2>
          {rows
            .filter((row) => row.meta.some((item) => item.toLowerCase() === status))
            .map((row) => (
              <p key={`${status}-${row.id}`}>{row.title}</p>
            ))}
        </article>
      ))}
    </div>
  );
}

function LeadActions({ id }: { id: string }) {
  return (
    <div className="admin-inline-actions">
      <form action={updateLeadStatus}>
        <input name="id" type="hidden" value={id} />
        <select name="status" defaultValue="proposal">
          {["new", "proposal", "won", "invoiced", "lost"].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <button className="btn ghost" type="submit">Update status</button>
      </form>
      <form action={convertLeadToClient}>
        <input name="id" type="hidden" value={id} />
        <button className="btn" type="submit">Convert to client</button>
      </form>
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
    <form action={action} className="admin-record-form" encType="multipart/form-data">
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
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "title" in item) return String(item.title);
          return String(item);
        })
        .join("\n");
    }
    return String(value);
  }
  return String(value);
}

function buildDisplayRows(section: AdminSection, records: Record<string, unknown>[]) {
  return buildSectionRows(section, records);
}

function Rows({ title, rows }: { title: string; rows: AdminRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title={`No ${title.toLowerCase()} rows`} detail="Supabase returned zero records for this module." />;
  }

  return (
    <div className="admin-grid">
      {rows.map((row, index) => (
        <article key={`${row.title}-${index}`}>
          <h2>{row.title}</h2>
          {row.meta.map((item) => (
            <p key={item}>{item}</p>
          ))}
          {row.amount ? <strong>{row.amount}</strong> : null}
          {row.href ? <Link href={row.href}>Open in Stripe</Link> : null}
        </article>
      ))}
    </div>
  );
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

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
