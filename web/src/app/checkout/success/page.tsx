import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export default function SuccessPage() {
  return (
    <main className="min-h-dvh bg-[#f6f7fb] px-4 py-10 text-slate-950">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            Loading invoice...
          </div>
        }
      >
        <SuccessClient />
      </Suspense>
    </main>
  );
}
