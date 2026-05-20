import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitAmount: number;
  subtotalAmount: number;
};

export type InvoiceResource = {
  id: string;
  status: "requires_payment" | "paid" | "payment_failed" | "canceled" | string;
  customerName: string;
  currency: string;
  totalAmount: number;
  paidAt: string | null;
  accessToken: string;
  pdfUrl: string | null;
  items: InvoiceItem[];
};

export async function createPaymentIntent(input: {
  amount: number;
  currency: string;
  invoiceId: string;
  userId: string | number;
  idempotencyKey: string;
}) {
  const { data } = await axios.post(`${API_BASE}/api/payments/create-intent`, input, {
    headers: { "Content-Type": "application/json" },
  });

  if (!data?.clientSecret) throw new Error("Missing clientSecret from API");

  return data as {
    clientSecret: string;
    paymentIntentId: string;
    invoice: InvoiceResource;
  };
}

export async function getInvoice(invoiceId: string, accessToken: string) {
  const { data } = await axios.get(`${API_BASE}/api/invoices/${invoiceId}`, {
    headers: { "Cache-Control": "no-cache" },
    params: { token: accessToken, t: Date.now() },
  });

  return data as InvoiceResource;
}
