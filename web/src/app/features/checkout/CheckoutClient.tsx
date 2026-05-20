"use client";

import { useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { createPaymentIntent, getInvoice, InvoiceResource } from "./api";
import StripeElementsForm from "./StripeElementsForm";

const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
const stripePromise: Promise<Stripe | null> = isE2E
  ? Promise.resolve(null)
  : loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    requires_payment: "Awaiting payment",
    paid: "Paid",
    payment_failed: "Payment failed",
    canceled: "Canceled",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

export default function CheckoutClient({ invoiceId }: { invoiceId: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceResource | null>(null);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setError(null);
      try {
        const res = await createPaymentIntent({
          amount: 500,
          currency: "usd",
          invoiceId,
          userId: 123,
          idempotencyKey: crypto.randomUUID(),
        });

        if (!active) return;
        setClientSecret(res.clientSecret);
        setPaymentIntentId(res.paymentIntentId);
        setInvoice(res.invoice);
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to initialize payment");
      }
    })();

    return () => {
      active = false;
    };
  }, [invoiceId]);

  useEffect(() => {
    if (!invoice?.accessToken || invoice.status === "paid") return;

    let active = true;
    const invoiceId = invoice.id;
    const accessToken = invoice.accessToken;

    async function refreshInvoice() {
      try {
        const fresh = await getInvoice(invoiceId, accessToken);
        if (!active) return;
        setInvoice(fresh);
      } catch {
        // Keep the current invoice state visible while the next poll retries.
      }
    }

    refreshInvoice();
    const interval = window.setInterval(refreshInvoice, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [invoice?.accessToken, invoice?.id, invoice?.status]);

  const options = useMemo(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
      appearance: {
        theme: "stripe" as const,
        variables: {
          borderRadius: "8px",
          colorPrimary: "#0f172a",
        },
      },
    };
  }, [clientSecret]);

  const amountLabel = invoice
    ? formatMoney(invoice.totalAmount, invoice.currency)
    : "$5.00";
  const paid = invoice?.status === "paid";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
      <section
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        data-testid="checkout-panel"
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Webhook verified checkout
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Secure invoice payment
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Pay a server-priced invoice with Stripe Elements. The invoice PDF unlocks only after Laravel receives a signed Stripe webhook.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Invoice
            </div>
            <div className="font-mono text-sm font-semibold text-slate-900">
              {invoiceId}
            </div>
          </div>
        </div>

        {!clientSecret && !error && (
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-28 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {clientSecret && options && invoice && (
          isE2E ? (
            <div
              data-testid="payment-form-ready"
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700"
            >
              Payment form ready
            </div>
          ) : (
            <Elements stripe={stripePromise} options={options}>
              <StripeElementsForm
                invoiceId={invoice.id}
                accessToken={invoice.accessToken}
                amountLabel={amountLabel}
                onPaymentResult={(id, status) => {
                  setPaymentIntentId(id);
                  setStripeStatus(status);
                }}
              />
            </Elements>
          )
        )}
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Order summary
              </h2>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {amountLabel}
              </p>
            </div>
            <div
              data-testid="invoice-status"
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                paid
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {statusLabel(invoice?.status ?? "requires_payment")}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(invoice?.items ?? []).map((item) => (
              <div
                key={item.description}
                className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {item.description}
                  </div>
                  <div className="text-slate-500">Qty {item.quantity}</div>
                </div>
                <div className="font-semibold text-slate-900">
                  {formatMoney(item.subtotalAmount, invoice?.currency ?? "usd")}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{amountLabel}</span>
            </div>
            <div className="mt-2 flex justify-between text-base font-bold text-slate-950">
              <span>Total</span>
              <span>{amountLabel}</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Invoice PDF
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {paid
              ? "Webhook received. Your protected PDF is ready."
              : "Locked until the signed Stripe webhook marks this invoice paid."}
          </p>
          {invoice?.pdfUrl ? (
            <a
              data-testid="download-invoice"
              href={invoice.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-950 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
            >
              Download invoice
            </a>
          ) : (
            <button
              data-testid="locked-invoice"
              type="button"
              disabled
              className="mt-4 inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400"
            >
              Waiting for webhook
            </button>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
          <div className="font-semibold text-slate-900">Payment trace</div>
          <dl className="mt-3 space-y-2 text-slate-600">
            <div className="flex justify-between gap-3">
              <dt>Stripe status</dt>
              <dd className="font-medium text-slate-900">{stripeStatus ?? "Not submitted"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>PaymentIntent</dt>
              <dd className="max-w-[180px] truncate font-mono text-xs text-slate-900">
                {paymentIntentId ?? "Pending"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Laravel invoice</dt>
              <dd className="font-medium text-slate-900">
                {statusLabel(invoice?.status ?? "requires_payment")}
              </dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
