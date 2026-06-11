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
  months?: number;
  monthly_total_cents?: number;
};

type BillingMode = "invoice" | "subscription";

const defaultItems: LineItem[] = [
  { description: "Discovery, architecture, and project planning", quantity: 1, unit_amount_cents: 250000 },
  { description: "Website, automation, or dashboard implementation", quantity: 1, unit_amount_cents: 750000 },
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
  const [items, setItems] = useState(defaultItems);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [billingMode, setBillingMode] = useState<BillingMode>("invoice");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("Create a custom Stripe invoice, then finalize, send, or void it from this screen.");

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unit_amount_cents, 0),
    [items],
  );

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function selectBillingMode(mode: BillingMode) {
    setBillingMode(mode);
    setResult(null);
    setStatus("idle");
    setMessage(
      mode === "invoice"
        ? "Create a custom Stripe invoice, then finalize, send, or void it from this screen."
        : "Create a fixed monthly Stripe subscription that cancels after the selected number of months.",
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("working");
    setMessage(
      billingMode === "invoice"
        ? "Creating draft invoice in Stripe..."
        : "Creating fixed-month subscription schedule in Stripe...",
    );

    const formData = new FormData(event.currentTarget);
    const basePayload = {
      customer_name: String(formData.get("customer_name") ?? ""),
      customer_email: String(formData.get("customer_email") ?? ""),
      stripe_customer_id: String(formData.get("stripe_customer_id") ?? "") || undefined,
      memo: String(formData.get("memo") ?? "") || undefined,
      line_items: items,
    };
    const payload =
      billingMode === "invoice"
        ? {
            ...basePayload,
            due_date: String(formData.get("due_date") ?? "") || undefined,
            discount_cents: dollarsToCents(formData.get("discount")),
            deposit_cents: dollarsToCents(formData.get("deposit")),
            retainer_cents: dollarsToCents(formData.get("retainer")),
          }
        : {
            ...basePayload,
            months: Number(formData.get("months") ?? 6),
            days_until_due: Number(formData.get("days_until_due") ?? 14),
          };

    const response = await fetch(
      billingMode === "invoice" ? "/api/stripe/invoices" : "/api/stripe/subscriptions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? `${billingMode === "invoice" ? "Invoice" : "Subscription"} creation failed.`);
      return;
    }

    setResult(body);
    setStatus("idle");
    setMessage(
      billingMode === "invoice"
        ? "Draft invoice created. Review it, then finalize and send when ready."
        : `Fixed-month subscription schedule created. Stripe will invoice monthly and cancel after ${body.months} months.`,
    );
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

    setResult((current) => ({ ...current, ...body }));
    setStatus("idle");
    setMessage(`Invoice ${action} complete.`);
  }

  return (
    <div className="invoice-workbench">
      <form onSubmit={submit} className="invoice-form">
        <div className="invoice-panel">
          <h2>Billing type</h2>
          <div className="billing-toggle" role="radiogroup" aria-label="Billing type">
            <label className={billingMode === "invoice" ? "active" : ""}>
              <input
                type="radio"
                name="billing_mode"
                value="invoice"
                checked={billingMode === "invoice"}
                onChange={() => selectBillingMode("invoice")}
              />
              <span>One-time invoice</span>
            </label>
            <label className={billingMode === "subscription" ? "active" : ""}>
              <input
                type="radio"
                name="billing_mode"
                value="subscription"
                checked={billingMode === "subscription"}
                onChange={() => selectBillingMode("subscription")}
              />
              <span>Fixed monthly subscription</span>
            </label>
          </div>
        </div>

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
            {billingMode === "invoice" ? (
              <label className="field">
                Due date
                <input name="due_date" type="date" />
              </label>
            ) : (
              <label className="field">
                Invoice due in days
                <input name="days_until_due" type="number" min="1" max="90" defaultValue="14" required />
              </label>
            )}
          </div>
        </div>

        <div className="invoice-panel">
          <div className="invoice-head">
            <h2>Custom line items</h2>
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                setItems((current) => [
                  ...current,
                  { description: "Additional service", quantity: 1, unit_amount_cents: 100000 },
                ])
              }
            >
              Add item
            </button>
          </div>
          {items.map((item, index) => (
            <div className="line-editor" key={`${item.description}-${index}`}>
              <label className="field">
                Description
                <input
                  value={item.description}
                  onChange={(event) => updateItem(index, { description: event.target.value })}
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
                  onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                  required
                />
              </label>
              <label className="field">
                Unit price
                <input
                  value={(item.unit_amount_cents / 100).toString()}
                  onChange={(event) =>
                    updateItem(index, { unit_amount_cents: dollarsToCents(event.target.value) })
                  }
                  required
                />
              </label>
              <button
                type="button"
                className="remove-line"
                onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                aria-label="Remove line item"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="invoice-panel">
          <h2>{billingMode === "invoice" ? "Adjustments" : "Subscription terms"}</h2>
          <div className="form-grid">
            {billingMode === "invoice" ? (
              <>
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
              </>
            ) : (
              <label className="field">
                Months
                <input name="months" type="number" min="1" max="36" defaultValue="6" required />
              </label>
            )}
            <label className="field full">
              Memo
              <textarea name="memo" placeholder="Scope, payment terms, and context for the client." />
            </label>
          </div>
        </div>

        <div className="invoice-summary">
          <div>
            <span>{billingMode === "invoice" ? "Subtotal" : "Monthly subtotal"}</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <button className="btn" type="submit" disabled={status === "working"}>
            {status === "working"
              ? "Working..."
              : billingMode === "invoice"
                ? "Create draft invoice"
                : "Create subscription schedule"}
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
              {result?.monthly_total_cents
                ? `${formatCurrency(result.monthly_total_cents)} monthly for ${result.months} months`
                : "No subscription"}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{result?.status ?? "No billing record"}</dd>
          </div>
        </dl>
        {result?.stripe_subscription_schedule_id ? (
          <p className="result-note">This schedule invoices monthly and automatically cancels at the end of term.</p>
        ) : (
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
        )}
        {result?.hosted_invoice_url && (
          <a className="hosted-link" href={result.hosted_invoice_url} target="_blank" rel="noreferrer">
            Open hosted invoice
          </a>
        )}
      </aside>
    </div>
  );
}
