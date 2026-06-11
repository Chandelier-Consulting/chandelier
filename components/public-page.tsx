import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export const publicServices = [
  "Website Development",
  "Custom Software",
  "AI Automations",
  "Internal Dashboards",
  "Business Systems",
  "SEO & Local Presence",
  "Maintenance Retainers",
];

export function PublicPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <main className="subpage">
      <nav className="subnav">
        <Link href="/">Chandelier</Link>
        <div>
          <Link href="/services">Services</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/admin/dashboard">Admin</Link>
        </div>
      </nav>
      <section className="subhero">
        <span className="kicker">{eyebrow}</span>
        <h1>{title}</h1>
      </section>
      {children}
    </main>
  );
}

export function ContactPanel() {
  return (
    <section className="subsection">
      <div className="contact-card">
        <span className="kicker">Start a project</span>
        <ContactForm />
      </div>
    </section>
  );
}
