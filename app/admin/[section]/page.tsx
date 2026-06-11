import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceWorkbench } from "@/components/invoice-workbench";
import {
  adminSections,
  loadAdminDashboard,
  loadAdminRows,
  reportDefinitions,
  type AdminRow,
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
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

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
