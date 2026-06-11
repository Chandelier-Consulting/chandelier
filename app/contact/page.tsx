import { ContactPanel, PublicPage } from "@/components/public-page";

export default function ContactPage() {
  return (
    <PublicPage eyebrow="Contact" title="Tell us what needs to work better.">
      <ContactPanel />
    </PublicPage>
  );
}
