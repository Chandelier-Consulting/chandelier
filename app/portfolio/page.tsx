import { ContactPanel, PublicPage } from "@/components/public-page";

const examples = [
  ["Restaurant ordering", "Online ordering, kitchen tickets, inventory rhythm, and owner reporting."],
  ["Service booking", "AI-assisted intake, scheduling, reminders, and follow-up workflows."],
  ["Retail systems", "Premium storefront, inventory sync, loyalty capture, and campaign reporting."],
];

export default function PortfolioPage() {
  return (
    <PublicPage eyebrow="Portfolio" title="Representative systems for businesses that need practical technology.">
      <section className="subsection service-list">
        {examples.map(([name, copy]) => (
          <article key={name}>
            <span>{name}</span>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <ContactPanel />
    </PublicPage>
  );
}
