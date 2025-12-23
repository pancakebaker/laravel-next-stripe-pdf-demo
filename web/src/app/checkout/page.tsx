import CheckoutClient from "../features/checkout/CheckoutClient";


function generateInvoiceIdServer(prefix = "INV") {
  const time = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `${prefix}-${time}-${rand}`;
}

export default function CheckoutPage() {
  const invoiceId = generateInvoiceIdServer();
  return (
    <main className="min-h-dvh bg-linear-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <CheckoutClient invoiceId={invoiceId} />
      </div>
    </main>
  );
}
