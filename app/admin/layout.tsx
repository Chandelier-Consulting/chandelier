import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside>
        <Link className="admin-brand" href="/admin/dashboard">
          Chandelier OS
          <span>Chandelier Consulting</span>
        </Link>
        <AdminNav />
      </aside>
      <main>{children}</main>
    </div>
  );
}
