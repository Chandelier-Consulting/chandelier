"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { adminSections } from "@/lib/admin-data";

export function AdminNav() {
  const selected = useSelectedLayoutSegment() ?? "dashboard";
  const routeItems = [
    ...adminSections,
    { slug: "clients", label: "Clients" as const, description: "Client records and contact details." },
    { slug: "projects", label: "Projects" as const, description: "Project pipeline, docs, and billing." },
  ];
  const seen: Record<string, true> = {};
  const navItems = routeItems.filter((item) => {
    if (seen[item.slug]) return false;
    seen[item.slug] = true;
    return true;
  });

  return (
    <nav className="admin-nav" aria-label="Admin sections">
      {navItems.map((section) => {
        const isActive = selected === section.slug;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "active" : undefined}
            href={`/admin/${section.slug}`}
            key={section.slug}
          >
            <span className="admin-nav-mark" aria-hidden="true" />
            <span>{section.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
