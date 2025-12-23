"use client";

import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type Props = {
  invoiceId: string;
  onPaid?: () => void;
};

export default function StripeElementsForm({ invoiceId, onPaid }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?invoiceId=${encodeURIComponent(
            invoiceId
          )}`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setMessage(result.error.message ?? "Payment failed");
      } else {
        const status = result.paymentIntent?.status;
        if (status === "succeeded") {
          setMessage("Payment succeeded 🎉");
          onPaid?.();
        } else {
          setMessage(`Payment status: ${status ?? "unknown"}`);
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setMessage(e.message);
      } else {
        setMessage("Payment error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          Payment details
        </label>
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60 active:translate-y-px"
      >
        {submitting ? "Processing…" : "Pay $5.00"}
      </button>

      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Invoice: <span className="font-mono">{invoiceId}</span>
      </p>
    </form>
  );
}
