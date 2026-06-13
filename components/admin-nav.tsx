"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { adminSections } from "@/lib/admin-data";

export function AdminNav() {
  const selected = useSelectedLayoutSegment() ?? "dashboard";

  return (
    <nav className="admin-nav" aria-label="Admin sections">
      {adminSections.map((section) => {
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
