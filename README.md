# Laravel Next Stripe PDF

[![CI](https://github.com/pancakebaker/laravel-next-stripe-pdf-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/pancakebaker/laravel-next-stripe-pdf-demo/actions/workflows/ci.yml)

A full‑stack demo project combining **Laravel 12 (API)** and **Next.js (App Router + TypeScript)** to implement a **Stripe Payment Element checkout** with **PDF invoice generation**.

This repository is intentionally structured to demonstrate modern, production‑ready patterns while remaining simple enough to understand end‑to‑end.

---

## ✨ Features

### Backend (Laravel 12)
- Stripe **PaymentIntent** creation
- Server‑side **amount & currency validation**
- Server-owned invoice/payment persistence
- Stripe webhook signature verification
- Idempotent webhook event processing
- Stripe metadata (`invoice_id`, `user_id`)
- **Idempotent** payment intent creation
- Protected PDF invoice generation using **DOMPDF**
- Clean, stateless API design

### Frontend (Next.js + TypeScript)
- App Router with **server / client component separation**
- Stripe **Payment Element** (PCI‑safe)
- **Hydration‑safe** invoice ID generation
- Mobile‑first UI using **Tailwind CSS v4**
- Clean separation of logic, UI, and API helpers

### Invoices
- Timestamp‑based unique invoice IDs
- PDF invoice download endpoint
- Invoice ID reused across Stripe + PDF

---

## 🗂 Project Structure

```
laravel-next-stripe-pdf/
├── api/                  # Laravel 12 backend
│   ├── routes/api.php
│   ├── resources/views/pdf
│   └── ...
└── web/                  # Next.js frontend
    ├── src/app/checkout
    ├── src/features/checkout
    └── ...
```

---

## 🚀 Getting Started

## Local HTTPS domain

This repo is configured so Apache owns the HTTPS domain:

```text
https://laravel-next-stripe-pdf-demo.local
```

Apache proxies `/` to the Next.js dev server and `/api/*` to Laravel, so the browser stays on one HTTPS origin and avoids mixed-content/CORS issues. The default local ports used by this repo are:

```text
Next.js: http://127.0.0.1:3000
Laravel: http://127.0.0.1:8000
```

On Windows, you can create local env files and add the hosts entry with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1 -Install
```

On macOS/Linux, create `api/.env` from `api/.env.example`, create `web/.env.local` from `web/.env.example`, and add this hosts entry with your preferred system method:

```text
127.0.0.1 laravel-next-stripe-pdf-demo.local
```

Then add your Stripe test keys:

```text
api\.env       STRIPE_SECRET=sk_test_...
web\.env.local NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Start Laravel in one terminal:

```powershell
cd api
php artisan serve --host=127.0.0.1 --port=8000
```

Start Next in another terminal:

```powershell
cd web
npm.cmd run dev
```

Open:

```text
https://laravel-next-stripe-pdf-demo.local/checkout
```

If port 443 is already used by another local web server, run `npm.cmd run dev:local` and open `https://laravel-next-stripe-pdf-demo.local:3000/checkout` instead.

The Apache vhost template lives at `infra/apache-vhost.conf`. Copy or include that template in your local Apache vhost configuration, update the placeholder paths to match your project directory and TLS certificate files, and ensure these Apache modules are enabled:

```apache
mod_ssl
mod_headers
mod_proxy
mod_proxy_http
mod_proxy_wstunnel
```

Restart Apache after changing vhost or module configuration. The exact command depends on your installation, for example `apachectl restart`, `httpd -k restart`, restarting the Apache service from your OS service manager, or restarting your local development stack.

### 1️⃣ Backend Setup (Laravel)

```bat
cd api
composer install
copy .env.example .env
php artisan key:generate
```

#### Environment variables (`api/.env`)
```env
APP_URL=https://laravel-next-stripe-pdf-demo.local
STRIPE_SECRET=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### Run the API server
```bat
php artisan serve --host=127.0.0.1 --port=8000
```

Health check:
```
http://127.0.0.1:8000/api/health
```

Run database migrations:

```bat
php artisan migrate
```

---

### 2️⃣ Frontend Setup (Next.js)

```bat
cd web
npm install
```

#### Environment variables (`web/.env.local`)
```env
NEXT_PUBLIC_API_BASE=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

#### Run the frontend
```bat
npm.cmd run dev
```

Open in browser:
```
https://laravel-next-stripe-pdf-demo.local/checkout
```

---

## 💳 Stripe Test Card

Use Stripe’s official test card:

```
4242 4242 4242 4242
```

- Any future expiration date
- Any CVC

---

## 🧾 Invoice PDF

Each checkout generates a unique invoice ID that is:
- Sent to Stripe as metadata
- Persisted in Laravel with invoice items and payment status
- Used to generate the protected PDF invoice

### PDF endpoint
```
GET /api/invoices/{invoiceId}/pdf?token={accessToken}
```

Example:
```
https://laravel-next-stripe-pdf-demo.local/api/invoices/INV-MJHQUAWW-52FFC9FF/pdf?token=...
```

The PDF endpoint returns `403` until a signed Stripe webhook marks the invoice `paid`.

---

## Stripe Webhooks

Install the Stripe CLI, then forward webhook events to the local HTTPS domain:

```bat
stripe listen --forward-to https://laravel-next-stripe-pdf-demo.local/api/stripe/webhook
```

Copy the `whsec_...` value printed by Stripe CLI into:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Webhook behavior:

- `payment_intent.succeeded` marks the payment and invoice as `paid`
- `payment_intent.payment_failed` marks the invoice as `payment_failed`
- duplicate Stripe event IDs are stored once and skipped on replay

---

## Tests and CI

Run Laravel feature/unit tests:

```bat
cd api
php artisan test
```

Run the Next.js production build:

```bat
cd web
npm.cmd run build
```

Run Playwright end-to-end tests:

```bat
cd web
npx playwright install chromium
npm.cmd run test:e2e
```

The E2E suite mocks the checkout API so it can verify the protected-invoice flow without real Stripe credentials. It checks that the PDF is locked before webhook-confirmed payment status and unlocks after the invoice becomes `paid`.

GitHub Actions runs on pushes to `main` and on pull requests:

- Laravel: Composer install plus `php artisan test`
- Next.js: `npm ci`, `npm run build`, and Playwright Chromium E2E tests

Workflow file:

```text
.github/workflows/ci.yml
```

---

## 🔐 Security & Best Practices

- Stripe **Payment Elements** (PCI compliant)
- No raw card data handled by the app
- Amount validated against a server-side price book
- Currency restricted via whitelist
- Idempotency keys prevent duplicate PaymentIntents
- Signed Stripe webhooks are required to mark invoices paid
- Invoice PDFs require both a valid access token and `paid` status
- Hydration‑safe client rendering (no SSR mismatch)
- See `docs/SECURITY.md` for the demo threat model

---

## 🧠 Architecture Overview

### Next.js
- `CheckoutPage` – server component (composition)
- `CheckoutClient` – client component (state + orchestration)
- `StripeElementsForm` – isolated Stripe UI
- API helpers colocated under `features/`

### Laravel
- Controllers for payments, invoices, and webhooks
- Eloquent models for invoices, invoice items, payments, and webhook events
- Strong validation layer
- Signed webhook verification and idempotent event storage

---

## 🔧 Possible Extensions

- Authentication (Laravel Sanctum / NextAuth)
- Email invoice delivery
- Multi‑currency pricing
- Admin dashboard for invoice/payment review
- CI workflow for Laravel tests and Next builds

---

## 📄 License

MIT License — free to use for demos, learning, or as a production starter.

---

## 👨‍💻 Notes

This project is intentionally built as a **clean reference implementation** for:
- Laravel + Next.js integration
- Stripe checkout flows
- Server‑generated PDFs
- Modern React App Router patterns

Feel free to adapt or extend it for real‑world applications.

