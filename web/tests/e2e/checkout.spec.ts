import { expect, test } from "@playwright/test";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

test("checkout locks and unlocks the protected invoice PDF by invoice status", async ({ page }) => {
  const invoiceRefresh = deferred<void>();
  let invoiceRefreshRequested = false;

  await page.route("**/api/payments/create-intent", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as { invoiceId: string };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({
        clientSecret: "pi_ci_123_secret_ci",
        paymentIntentId: "pi_ci_123",
        invoice: {
          id: body.invoiceId,
          status: "requires_payment",
          customerName: "Demo Buyer",
          currency: "usd",
          totalAmount: 500,
          paidAt: null,
          accessToken: "ci-access-token",
          pdfUrl: null,
          items: [
            {
              description: "Stripe checkout and protected PDF demo",
              quantity: 1,
              unitAmount: 500,
              subtotalAmount: 500,
            },
          ],
        },
      }),
    });
  });

  await page.route("**/api/invoices/*", async (route) => {
    invoiceRefreshRequested = true;
    await invoiceRefresh.promise;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({
        id: "INV-CI",
        status: "paid",
        customerName: "Demo Buyer",
        currency: "usd",
        totalAmount: 500,
        paidAt: "2026-05-20T00:00:00Z",
        accessToken: "ci-access-token",
        pdfUrl: "http://127.0.0.1:3100/api/invoices/INV-CI/pdf?token=ci-access-token",
        items: [
          {
            description: "Stripe checkout and protected PDF demo",
            quantity: 1,
            unitAmount: 500,
            subtotalAmount: 500,
          },
        ],
      }),
    });
  });

  await page.goto("/checkout");

  await expect(page.getByRole("heading", { name: "Secure invoice payment" })).toBeVisible();
  await expect(page.getByText("Webhook verified checkout")).toBeVisible();
  await expect(page.getByText("$5.00").first()).toBeVisible();
  await expect(page.getByText("Stripe checkout and protected PDF demo")).toBeVisible();
  await expect(page.getByTestId("invoice-status")).toHaveText("Awaiting payment");
  await expect(page.getByTestId("locked-invoice")).toBeVisible();

  await expect.poll(() => invoiceRefreshRequested, { timeout: 12_000 }).toBe(true);
  invoiceRefresh.resolve();

  await expect(page.getByTestId("invoice-status")).toHaveText("Paid", { timeout: 12_000 });
  await expect(page.getByTestId("download-invoice")).toBeVisible();
  await expect(page.getByTestId("download-invoice")).toHaveAttribute("href", /token=ci-access-token/);
});
