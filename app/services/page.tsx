import { ContactPanel, PublicPage, publicServices } from "@/components/public-page";

export default function ServicesPage() {
  return (
    <PublicPage eyebrow="Services" title="Websites, automations, and digital systems for growing businesses.">
      <section className="subsection service-list">
        {publicServices.map((service) => (
          <article key={service}>
            <span>{service}</span>
            <p>
              Strategy, buildout, deployment, and maintenance shaped around a real operating workflow,
              not a generic software package.
            </p>
          </article>
        ))}
      </section>
      <ContactPanel />
    </PublicPage>
  );
}
