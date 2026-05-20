"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getInvoice, InvoiceResource } from "../../features/checkout/api";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");
  const token = searchParams.get("token");
  const [invoice, setInvoice] = useState<InvoiceResource | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId || !token) {
      setError("Missing invoice reference.");
      return;
    }

    let active = true;

    async function refresh() {
      try {
        const fresh = await getInvoice(invoiceId!, token!);
        if (active) setInvoice(fresh);
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Unable to load invoice.");
      }
    }

    refresh();
    const interval = window.setInterval(refresh, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [invoiceId, token]);

  const paid = invoice?.status === "paid";

  return (
    <div className="mx-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Stripe confirmation received
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
        Payment processing
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Laravel is waiting for the signed Stripe webhook before unlocking the invoice PDF.
      </p>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {invoice && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Invoice
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {invoice.id}
                </div>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  paid
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {paid ? "Paid" : "Awaiting webhook"}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-600">Total</span>
              <span className="text-lg font-bold text-slate-950">
                {formatMoney(invoice.totalAmount, invoice.currency)}
              </span>
            </div>
          </div>

          {invoice.pdfUrl ? (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Download invoice
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400"
            >
              Waiting for webhook
            </button>
          )}
        </div>
      )}

      <a
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        href="/checkout"
      >
        New checkout
      </a>
    </div>
  );
}
