"use client";

import { FormEvent, useState } from "react";

const serviceOptions = [
  "Website Development",
  "Custom Software",
  "AI Automations",
  "Internal Dashboards",
  "Business Systems",
  "SEO & Local Presence",
  "Maintenance Retainers",
];

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const requestedServices = formData.getAll("requested_services").map(String);

    const payload = {
      business_name: String(formData.get("business_name") ?? ""),
      contact_name: String(formData.get("contact_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      website: String(formData.get("website") ?? ""),
      budget: String(formData.get("budget") ?? ""),
      requested_services: requestedServices,
      project_description: String(formData.get("project_description") ?? ""),
    };

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      form.reset();
      setStatus("sent");
      setMessage("Received. We'll reply within one business day with a clear next step.");
      return;
    }

    const result = await response.json().catch(() => null);
    setStatus("error");
    setMessage(result?.error ?? "Something went wrong. Email hello@chandelierconsulting.dev.");
  }

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          Business name
          <input name="business_name" type="text" placeholder="Rivera's Bakery" required />
        </label>
        <label className="field">
          Contact name
          <input name="contact_name" type="text" placeholder="Jordan Rivera" required />
        </label>
        <label className="field">
          Email
          <input name="email" type="email" placeholder="you@business.com" required />
        </label>
        <label className="field">
          Phone
          <input name="phone" type="tel" placeholder="(555) 123-4567" />
        </label>
        <label className="field">
          Website
          <input name="website" type="url" placeholder="https://yourbusiness.com" />
        </label>
        <label className="field">
          Budget
          <select name="budget" defaultValue="$10k-$25k">
            <option>Under $10k</option>
            <option>$10k-$25k</option>
            <option>$25k-$50k</option>
            <option>$50k+</option>
            <option>Not sure yet</option>
          </select>
        </label>
        <fieldset className="field full service-checks">
          <legend>Requested services</legend>
          <div>
            {serviceOptions.map((service) => (
              <label key={service}>
                <input name="requested_services" type="checkbox" value={service} />
                <span>{service}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field full">
          Project description
          <textarea
            name="project_description"
            placeholder="Tell us what you want to modernize, what is painful today, and what a good outcome looks like."
            required
          />
        </label>
      </div>
      <div className="form-foot">
        <p className="note">{message || "No obligation. We use this to qualify the project and reply with a useful plan."}</p>
        <button type="submit" className="btn full-sub" disabled={status === "sending"}>
          {status === "sending" ? "Sending..." : "Create lead"}
        </button>
      </div>
    </form>
  );
}
