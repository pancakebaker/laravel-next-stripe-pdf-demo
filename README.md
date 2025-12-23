# Laravel Next Stripe PDF

A full‑stack demo project combining **Laravel 12 (API)** and **Next.js (App Router + TypeScript)** to implement a **Stripe Payment Element checkout** with **PDF invoice generation**.

This repository is intentionally structured to demonstrate modern, production‑ready patterns while remaining simple enough to understand end‑to‑end.

---

## ✨ Features

### Backend (Laravel 12)
- Stripe **PaymentIntent** creation
- Server‑side **amount & currency validation**
- Stripe metadata (`invoice_id`, `user_id`)
- **Idempotent** payment intent creation
- PDF invoice generation using **DOMPDF**
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

### 1️⃣ Backend Setup (Laravel)

```bat
cd api
composer install
copy .env.example .env
php artisan key:generate
```

#### Environment variables (`api/.env`)
```env
APP_URL=http://127.0.0.1:8000
STRIPE_SECRET=sk_test_xxxxxxxxxxxxx
```

#### Run the API server
```bat
php artisan serve --host=127.0.0.1 --port=8000
```

Health check:
```
http://127.0.0.1:8000/api/health
```

---

### 2️⃣ Frontend Setup (Next.js)

```bat
cd web
npm install
```

#### Environment variables (`web/.env.local`)
```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

#### Run the frontend
```bat
npm run dev
```

Open in browser:
```
http://localhost:3000/checkout
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
- Used to generate the PDF invoice

### PDF endpoint
```
GET /api/invoices/{invoiceId}/pdf
```

Example:
```
http://127.0.0.1:8000/api/invoices/INV-MJHQUAWW-52FFC9FF/pdf
```

---

## 🔐 Security & Best Practices

- Stripe **Payment Elements** (PCI compliant)
- No raw card data handled by the app
- Amount validated as **integer cents** server‑side
- Currency restricted via whitelist
- Idempotency keys prevent duplicate PaymentIntents
- Hydration‑safe client rendering (no SSR mismatch)

---

## 🧠 Architecture Overview

### Next.js
- `CheckoutPage` – server component (composition)
- `CheckoutClient` – client component (state + orchestration)
- `StripeElementsForm` – isolated Stripe UI
- API helpers colocated under `features/`

### Laravel
- Stateless API routes
- Strong validation layer
- Ready for Stripe webhook integration

---

## 🔧 Possible Extensions

- Stripe webhooks (payment confirmation)
- Persist invoices & payments to database
- Restrict PDF download to paid invoices only
- Authentication (Laravel Sanctum / NextAuth)
- Email invoice delivery
- Multi‑currency pricing

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

