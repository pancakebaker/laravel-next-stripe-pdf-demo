import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function createPaymentIntent(input: {
  amount: number; // cents
  currency: string;
  invoiceId: string;
  userId: string | number;
  idempotencyKey: string;
}) {
  const { data } = await axios.post(`${API_BASE}/api/payments/create-intent`, input, {
    headers: { "Content-Type": "application/json" },
  });

  // expected: { clientSecret: "pi_..._secret_..." }
  if (!data?.clientSecret) throw new Error("Missing clientSecret from API");
  return data as { clientSecret: string };
}
