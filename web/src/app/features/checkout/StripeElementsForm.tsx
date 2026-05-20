"use client";

import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type Props = {
  invoiceId: string;
  accessToken: string;
  amountLabel: string;
  onPaymentResult?: (paymentIntentId: string | null, status: string | null) => void;
};

export default function StripeElementsForm({
  invoiceId,
  accessToken,
  amountLabel,
  onPaymentResult,
}: Props) {
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
          )}&token=${encodeURIComponent(accessToken)}`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setMessage(result.error.message ?? "Payment failed");
        onPaymentResult?.(null, "payment_failed");
      } else {
        const status = result.paymentIntent?.status ?? "processing";
        setMessage(
          status === "succeeded"
            ? "Payment confirmed by Stripe. Waiting for the signed webhook..."
            : `Payment status: ${status}`
        );
        onPaymentResult?.(result.paymentIntent?.id ?? null, status);
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Payment error");
      onPaymentResult?.(null, "payment_failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
          Payment details
        </label>
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Processing..." : `Pay ${amountLabel}`}
      </button>

      {message && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {message}
        </div>
      )}
    </form>
  );
}
