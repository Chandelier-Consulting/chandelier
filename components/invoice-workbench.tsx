"use client";

import { FormEvent, useMemo, useState } from "react";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_amount_cents: number;
};

type InvoiceMode = "one-time" | "combined";

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

function createLineItem(description: string, unitAmountCents = 750000): LineItem {
  return {
    id: crypto.randomUUID(),
    description,
    quantity: 1,
    unit_amount_cents: unitAmountCents,
  };
}

const defaultOneTimeItems: LineItem[] = [
  createLineItem("Website, automation, or dashboard implementation"),
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
  const [recurringItems, setRecurringItems] = useState<LineItem[]>([]);
  const [customerName, setCustomerName] = useState("Rivera Bakery");
  const [customerEmail, setCustomerEmail] = useState("billing@example.com");
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [mode, setMode] = useState<InvoiceMode>("one-time");
  const [message, setMessage] = useState(
    "Create a one-time invoice and send it when you're ready.",
  );

  const oneTimeSubtotal = useMemo(
    () => oneTimeItems.reduce((sum, item) => sum + item.quantity * item.unit_amount_cents, 0),
    [oneTimeItems],
  );

  const recurringSubtotal = useMemo(
    () => recurringItems.reduce((sum, item) => sum + item.quantity * item.unit_amount_cents, 0),
    [recurringItems],
  );

  function clearResult(nextMode: InvoiceMode = mode) {
    setResult(null);
    setMessage(
      nextMode === "one-time"
        ? "Create a one-time invoice and send it when you're ready."
        : "Create a one-time invoice and optional subscription together.",
    );
    setStatus("idle");
  }

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

    if (mode === "combined" && recurringItems.length === 0) {
      setStatus("error");
      setMessage("Add at least one monthly subscription item.");
      return;
    }

    setStatus("working");
    setMessage(
      mode === "one-time"
        ? "Creating one-time invoice in Stripe..."
        : "Creating billing package in Stripe...",
    );

    const formData = new FormData(event.currentTarget);
    const commonPayload = {
      customer_name: String(formData.get("customer_name") ?? ""),
      customer_email: String(formData.get("customer_email") ?? ""),
      stripe_customer_id: String(formData.get("stripe_customer_id") ?? "") || undefined,
      memo: String(formData.get("memo") ?? "") || undefined,
      due_date: String(formData.get("due_date") ?? "") || undefined,
      discount_cents: dollarsToCents(formData.get("discount")),
      deposit_cents: dollarsToCents(formData.get("deposit")),
      retainer_cents: dollarsToCents(formData.get("retainer")),
    };

    const isCombined = mode === "combined" && recurringItems.length > 0;
    const endpoint = "/api/stripe/billing";

    const payload = isCombined
      ? {
          ...commonPayload,
          one_time_items: oneTimeItems,
          recurring_items: recurringItems,
          months: Number(formData.get("months") ?? 6),
          days_until_due: Number(formData.get("days_until_due") ?? 14),
        }
      : {
          ...commonPayload,
          one_time_items: oneTimeItems,
          recurring_items: [],
        };

    const response = await fetch(endpoint, {
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

    setResult({
      ...body,
      invoice_status: isCombined ? body?.invoice_status : body?.status,
    });
    setStatus("idle");
    setMessage(
      mode === "one-time"
        ? "Invoice created. You can open the invoice and send it after review."
        : "Billing package created. Review the invoice, then finalize and send when ready.",
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
              <input name="customer_name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
            </label>
            <label className="field">
              Customer email
              <input name="customer_email" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required />
            </label>
            <label className="field">
              Existing Stripe customer ID
              <input name="stripe_customer_id" value={stripeCustomerId} onChange={(event) => setStripeCustomerId(event.target.value)} placeholder="cus_..." />
            </label>
            <label className="field">
              One-time invoice due date
              <input name="due_date" type="date" />
            </label>
            <label className="field">
              {mode === "combined" ? "Subscription invoice due in days" : "Subscription invoice due in days (optional)"}
              <input
                name="days_until_due"
                type="number"
                min="1"
                max="90"
                defaultValue="14"
                required={mode === "combined"}
                disabled={mode !== "combined"}
              />
            </label>
            <label className="field">
              <input
                type="checkbox"
                checked={mode === "combined"}
                onChange={(event) => {
                  const nextMode: InvoiceMode = event.target.checked ? "combined" : "one-time";
                  setMode(nextMode);
                  clearResult(nextMode);
                  setRecurringItems((current) =>
                    nextMode === "one-time"
                      ? []
                      : current.length > 0
                        ? current
                        : [createLineItem("Monthly AI automation support", 150000)],
                  );
                }}
              />
              This includes a recurring subscription
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
                setOneTimeItems((current) => [...current, createLineItem("Additional one-time service", 100000)])
              }
            >
              Add item
            </button>
          </div>
          {oneTimeItems.map((item, index) => (
            <div className="line-editor" key={item.id}>
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

        {mode === "combined" ? (
          <div className="invoice-panel">
            <div className="invoice-head">
              <h2>Monthly subscription charges</h2>
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  setRecurringItems((current) => [
                    ...current,
                    createLineItem("Additional monthly service", 50000),
                  ])
                }
              >
                Add item
              </button>
            </div>
            {recurringItems.map((item, index) => (
              <div className="line-editor" key={item.id}>
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
        ) : null}

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
              <input
                name="months"
                type="number"
                min="1"
                max="36"
                defaultValue="6"
                required={mode === "combined"}
                disabled={mode !== "combined"}
              />
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
            <strong>
              {mode === "combined" ? formatCurrency(recurringSubtotal) : "N/A"}
            </strong>
          </div>
          <button className="btn" type="submit" disabled={status === "working"}>
            {status === "working" ? "Working..." : mode === "combined" ? "Create invoice package" : "Create invoice"}
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
