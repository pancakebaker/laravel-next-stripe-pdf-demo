"use client";

import { useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { createPaymentIntent } from "./api";
import StripeElementsForm from "./StripeElementsForm";

const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export default function CheckoutClient({ invoiceId }: { invoiceId: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // OPTIONAL: if you want to only show PDF link after paid
  const [paid, setPaid] = useState(false);

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
        if (active) setClientSecret(res.clientSecret);
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to initialize payment");
      }
    })();

    return () => {
      active = false;
    };
  }, [invoiceId]);

  const options = useMemo(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
      appearance: { theme: "stripe" as const },
    };
  }, [clientSecret]);

  const pdfUrl = `${API_BASE}/api/invoices/${invoiceId}/pdf`;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          Demo Checkout
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Checkout
        </h1>
        <p className="text-sm text-slate-600">
          Pay <span className="font-semibold">$5.00</span> using Stripe Payment Element.
        </p>
        <p className="text-xs text-slate-500">
          Invoice ID: <span className="font-mono">{invoiceId}</span>
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {!clientSecret && !error && (
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-11 w-full animate-pulse rounded bg-slate-200" />
            <p className="text-xs text-slate-500">Preparing secure payment…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {clientSecret && options && (
          <Elements stripe={stripePromise} options={options}>
            <StripeElementsForm
              invoiceId={invoiceId}
              onPaid={() => setPaid(true)}
            />
          </Elements>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Invoice PDF</div>
        <p className="mt-1 text-sm text-slate-600">
          {paid
            ? "Payment confirmed — download your invoice."
            : "You can preview the invoice. In production, you'd usually allow download only after payment."}
        </p>

        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 active:translate-y-px"
        >
          {paid ? "Download invoice PDF" : "Preview invoice PDF"}
        </a>
      </section>

      <p className="text-center text-xs text-slate-500">
        Mobile-first layout • Thumb-friendly controls • Stripe Elements (PCI-safe)
      </p>
    </div>
  );
}
