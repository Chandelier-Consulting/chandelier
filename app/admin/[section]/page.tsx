import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceWorkbench } from "@/components/invoice-workbench";
import { adminSections, businessUnits, dashboardMetrics, pipeline, reports } from "@/lib/demo-data";
import type { AdminSection } from "@/lib/types";

const sectionSlugs = adminSections.map((section) => section.slug);

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

  return (
    <section className="admin-page">
      <header>
        <p>Chandelier Consulting OS</p>
        <h1>{current.label}</h1>
        <span>{current.description}</span>
      </header>
      {section === "dashboard" ? <Dashboard /> : <Module section={section as AdminSection} />}
    </section>
  );
}

function Dashboard() {
  return (
    <>
      <div className="admin-metrics">
        {dashboardMetrics.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <article>
          <h2>CRM pipeline</h2>
          {pipeline.map((item) => (
            <div className="admin-row" key={item.stage}>
              <span>{item.stage}</span>
              <strong>{item.count} / ${item.value.toLocaleString()}</strong>
            </div>
          ))}
        </article>
        <article>
          <h2>Revenue by business unit</h2>
          {businessUnits.map((unit) => (
            <div className="admin-row" key={unit.slug}>
              <span>{unit.name}</span>
              <strong>${unit.revenue.toLocaleString()}</strong>
            </div>
          ))}
        </article>
      </div>
    </>
  );
}

function Module({ section }: { section: AdminSection }) {
  if (section === "reports") {
    return (
      <div className="admin-grid">
        <article>
          <h2>CPA exports</h2>
          {reports.map((report) => (
            <div className="admin-row" key={report}>
              <span>{report}</span>
              <Link href={`/api/reports/${report}`}>Download</Link>
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

  if (section === "business-units") {
    return (
      <div className="admin-grid">
        {businessUnits.map((unit) => (
          <article key={unit.slug}>
            <h2>{unit.name}</h2>
            <p>Seeded business unit. Major records can optionally belong to this unit.</p>
            <strong>${unit.revenue.toLocaleString()} tracked revenue</strong>
          </article>
        ))}
      </div>
    );
  }

  if (section === "invoices") {
    return <InvoiceWorkbench />;
  }

  return (
    <div className="admin-grid">
      <article>
        <h2>Workflow</h2>
        <p>
          This module is wired into the OS navigation and database schema. Connect it to Supabase rows
          for production data entry, search, status tracking, and CSV export.
        </p>
      </article>
      <article>
        <h2>Security model</h2>
        <p>
          Admin routes are intended to sit behind Supabase Auth, RLS, and the ADMIN_EMAILS allowlist.
          Server endpoints validate inputs with Zod and use service-role access only on the server.
        </p>
      </article>
    </div>
  );
}
