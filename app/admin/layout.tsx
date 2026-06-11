import Link from "next/link";
import { adminSections } from "@/lib/admin-data";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside>
        <Link className="admin-brand" href="/admin/dashboard">
          Chandelier OS
          <span>Perceo Inc.</span>
        </Link>
        <nav>
          {adminSections.map((section) => (
            <Link key={section.slug} href={`/admin/${section.slug}`}>
              {section.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
