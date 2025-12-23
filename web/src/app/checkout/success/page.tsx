export default function SuccessPage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payment complete</h1>
        <p className="text-sm text-slate-600">
          If you were redirected here, Stripe finished the confirmation flow.
        </p>
        <a
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white active:translate-y-px"
          href="/checkout"
        >
          Back to checkout
        </a>
      </div>
    </main>
  );
}
