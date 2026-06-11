"use client";

import { FormEvent, useMemo, useState } from "react";

type LineItem = {
  description: string;
  quantity: number;
  unit_amount_cents: number;
};

type InvoiceResult = {
  id?: string;
  stripe_customer_id?: string;
  stripe_invoice_id?: string;
  stripe_subscription_schedule_id?: string;
  stripe_subscription_id?: string | null;
  hosted_invoice_url?: string | null;
  status?: string | null;
  invoice_status?: string | null;
  subscription_status?: string | null;
  one_time_total_cents?: number;
  months?: number;
  monthly_total_cents?: number;
};

const defaultOneTimeItems: LineItem[] = [
  { description: "Website, automation, or dashboard implementation", quantity: 1, unit_amount_cents: 750000 },
];

const defaultRecurringItems: LineItem[] = [
  { description: "Monthly AI automation support", quantity: 1, unit_amount_cents: 150000 },
];

function dollarsToCents(value: FormDataEntryValue | null) {
  const number = Number(String(value ?? "0").replace(/[$,]/g, ""));
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function InvoiceWorkbench() {
  const [oneTimeItems, setOneTimeItems] = useState(defaultOneTimeItems);
  const [recurringItems, setRecurringItems] = useState(defaultRecurringItems);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState(
    "Create upfront invoice charges and recurring subscription charges in one billing package.",
  );

  const oneTimeSubtotal = useMemo(
    () => oneTimeItems.reduce((sum, item) => sum + item.quantity * item.unit_amount_cents, 0),
    [oneTimeItems],
  );

  const recurringSubtotal = useMemo(
    () => recurringItems.reduce((sum, item) => sum + item.quantity * item.unit_amount_cents, 0),
    [recurringItems],
  );

  function updateOneTimeItem(index: number, patch: Partial<LineItem>) {
    setOneTimeItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function updateRecurringItem(index: number, patch: Partial<LineItem>) {
    setRecurringItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("working");
    setMessage("Creating combined billing package in Stripe...");

    const formData = new FormData(event.currentTarget);
    const payload = {
      customer_name: String(formData.get("customer_name") ?? ""),
      customer_email: String(formData.get("customer_email") ?? ""),
      stripe_customer_id: String(formData.get("stripe_customer_id") ?? "") || undefined,
      memo: String(formData.get("memo") ?? "") || undefined,
      due_date: String(formData.get("due_date") ?? "") || undefined,
      months: Number(formData.get("months") ?? 6),
      days_until_due: Number(formData.get("days_until_due") ?? 14),
      discount_cents: dollarsToCents(formData.get("discount")),
      deposit_cents: dollarsToCents(formData.get("deposit")),
      retainer_cents: dollarsToCents(formData.get("retainer")),
      one_time_items: oneTimeItems,
      recurring_items: recurringItems,
    };

    const response = await fetch("/api/stripe/billing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? "Billing creation failed.");
      return;
    }

    setResult(body);
    setStatus("idle");
    setMessage("Billing package created. Review the invoice, then finalize and send when ready.");
  }

  async function runAction(action: "finalize" | "send" | "void") {
    if (!result?.stripe_invoice_id) {
      setStatus("error");
      setMessage("Create an invoice before running an action.");
      return;
    }

    setStatus("working");
    setMessage(`${action[0].toUpperCase()}${action.slice(1)} invoice...`);

    const response = await fetch(`/api/stripe/invoices/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stripe_invoice_id: result.stripe_invoice_id }),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? `Could not ${action} invoice.`);
      return;
    }

    setResult((current) => ({ ...current, ...body, invoice_status: body?.status ?? current?.invoice_status }));
    setStatus("idle");
    setMessage(`Invoice ${action} complete.`);
  }

  return (
    <div className="invoice-workbench">
      <form onSubmit={submit} className="invoice-form">
        <div className="invoice-panel">
          <h2>Customer</h2>
          <div className="form-grid">
            <label className="field">
              Customer name
              <input name="customer_name" defaultValue="Rivera Bakery" required />
            </label>
            <label className="field">
              Customer email
              <input name="customer_email" type="email" defaultValue="billing@example.com" required />
            </label>
            <label className="field">
              Existing Stripe customer ID
              <input name="stripe_customer_id" placeholder="cus_..." />
            </label>
            <label className="field">
              One-time invoice due date
              <input name="due_date" type="date" />
            </label>
            <label className="field">
              Subscription invoice due in days
              <input name="days_until_due" type="number" min="1" max="90" defaultValue="14" required />
            </label>
          </div>
        </div>

        <div className="invoice-panel">
          <div className="invoice-head">
            <h2>One-time charges</h2>
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                setOneTimeItems((current) => [
                  ...current,
                  { description: "Additional one-time service", quantity: 1, unit_amount_cents: 100000 },
                ])
              }
            >
              Add item
            </button>
          </div>
          {oneTimeItems.map((item, index) => (
            <div className="line-editor" key={`one-time-${item.description}-${index}`}>
              <label className="field">
                Description
                <input
                  value={item.description}
                  onChange={(event) => updateOneTimeItem(index, { description: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                Qty
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(event) => updateOneTimeItem(index, { quantity: Number(event.target.value) })}
                  required
                />
              </label>
              <label className="field">
                Unit price
                <input
                  value={(item.unit_amount_cents / 100).toString()}
                  onChange={(event) =>
                    updateOneTimeItem(index, { unit_amount_cents: dollarsToCents(event.target.value) })
                  }
                  required
                />
              </label>
              <button
                type="button"
                className="remove-line"
                onClick={() => setOneTimeItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                aria-label="Remove line item"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="invoice-panel">
          <div className="invoice-head">
            <h2>Monthly subscription charges</h2>
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                setRecurringItems((current) => [
                  ...current,
                  { description: "Additional monthly service", quantity: 1, unit_amount_cents: 50000 },
                ])
              }
            >
              Add item
            </button>
          </div>
          {recurringItems.map((item, index) => (
            <div className="line-editor" key={`recurring-${item.description}-${index}`}>
              <label className="field">
                Description
                <input
                  value={item.description}
                  onChange={(event) => updateRecurringItem(index, { description: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                Qty
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) => updateRecurringItem(index, { quantity: Number(event.target.value) })}
                  required
                />
              </label>
              <label className="field">
                Unit price
                <input
                  value={(item.unit_amount_cents / 100).toString()}
                  onChange={(event) =>
                    updateRecurringItem(index, { unit_amount_cents: dollarsToCents(event.target.value) })
                  }
                  required
                />
              </label>
              <button
                type="button"
                className="remove-line"
                onClick={() => setRecurringItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                aria-label="Remove recurring line item"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="invoice-panel">
          <h2>Terms and adjustments</h2>
          <div className="form-grid">
            <label className="field">
              Discount
              <input name="discount" placeholder="0" />
            </label>
            <label className="field">
              Deposit credit
              <input name="deposit" placeholder="0" />
            </label>
            <label className="field">
              Retainer
              <input name="retainer" placeholder="0" />
            </label>
            <label className="field">
              Subscription months
              <input name="months" type="number" min="1" max="36" defaultValue="6" required />
            </label>
            <label className="field full">
              Memo
              <textarea name="memo" placeholder="Scope, payment terms, and context for the client." />
            </label>
          </div>
        </div>

        <div className="invoice-summary">
          <div>
            <span>One-time subtotal</span>
            <strong>{formatCurrency(oneTimeSubtotal)}</strong>
          </div>
          <div>
            <span>Monthly subtotal</span>
            <strong>{formatCurrency(recurringSubtotal)}</strong>
          </div>
          <button className="btn" type="submit" disabled={status === "working"}>
            {status === "working" ? "Working..." : "Create billing package"}
          </button>
        </div>
      </form>

      <aside className="invoice-result">
        <span className={`status-dot ${status}`}>{status}</span>
        <p>{message}</p>
        <dl>
          <div>
            <dt>Stripe customer</dt>
            <dd>{result?.stripe_customer_id ?? "Not created"}</dd>
          </div>
          <div>
            <dt>Stripe invoice</dt>
            <dd>{result?.stripe_invoice_id ?? "Not created"}</dd>
          </div>
          <div>
            <dt>Subscription schedule</dt>
            <dd>{result?.stripe_subscription_schedule_id ?? "Not created"}</dd>
          </div>
          <div>
            <dt>Subscription</dt>
            <dd>{result?.stripe_subscription_id ?? "Not started"}</dd>
          </div>
          <div>
            <dt>Billing total</dt>
            <dd>
              {result
                ? `${formatCurrency(result.one_time_total_cents ?? 0)} upfront / ${formatCurrency(
                    result.monthly_total_cents ?? 0,
                  )} monthly${result.months ? ` for ${result.months} months` : ""}`
                : "No billing package"}
            </dd>
          </div>
          <div>
            <dt>Invoice status</dt>
            <dd>{result?.invoice_status ?? "No invoice"}</dd>
          </div>
          <div>
            <dt>Subscription status</dt>
            <dd>{result?.subscription_status ?? "No subscription"}</dd>
          </div>
        </dl>
        {result?.stripe_invoice_id ? (
          <div className="invoice-actions">
            <button type="button" className="btn ghost" onClick={() => runAction("finalize")}>
              Finalize
            </button>
            <button type="button" className="btn" onClick={() => runAction("send")}>
              Send
            </button>
            <button type="button" className="btn ghost danger" onClick={() => runAction("void")}>
              Void
            </button>
          </div>
        ) : null}
        {result?.stripe_subscription_schedule_id ? (
          <p className="result-note">This schedule invoices monthly and automatically cancels at the end of term.</p>
        ) : null}
        {result?.hosted_invoice_url && (
          <a className="hosted-link" href={result.hosted_invoice_url} target="_blank" rel="noreferrer">
            Open hosted invoice
          </a>
        )}
      </aside>
    </div>
  );
}
