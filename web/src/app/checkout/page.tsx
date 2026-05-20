import CheckoutClient from "../features/checkout/CheckoutClient";


function generateInvoiceIdServer(prefix = "INV") {
  const time = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `${prefix}-${time}-${rand}`;
}

export default function CheckoutPage() {
  const invoiceId = generateInvoiceIdServer();
  return (
    <main className="min-h-dvh bg-[#f6f7fb] px-4 py-6 text-slate-950 sm:py-10">
      <CheckoutClient invoiceId={invoiceId} />
    </main>
  );
}
