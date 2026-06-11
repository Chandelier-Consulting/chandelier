import { ContactPanel, PublicPage } from "@/components/public-page";

const tiers = [
  ["Launch", "$8k-$15k", "Focused website or automation project with a clear launch target."],
  ["Growth", "$15k-$35k", "Website plus CRM, AI, ordering, dashboard, or operations integrations."],
  ["Operating System", "$35k+", "Multi-workflow build with internal dashboards, invoicing, storage, and reporting."],
];

export default function PricingPage() {
  return (
    <PublicPage eyebrow="Pricing" title="Clear project ranges before anyone wastes a call.">
      <section className="subsection pricing-grid">
        {tiers.map(([name, price, copy]) => (
          <article key={name}>
            <h2>{name}</h2>
            <strong>{price}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <ContactPanel />
    </PublicPage>
  );
}
