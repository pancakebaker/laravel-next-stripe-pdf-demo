# Security Notes

This demo is intentionally small, but the payment flow uses the same trust boundaries a production Stripe integration should use.

## Payment Trust Boundary

- The browser sends an invoice reference, but Laravel owns the final price.
- Laravel rejects amount or currency tampering before creating a PaymentIntent.
- Stripe card data is handled only by Stripe Elements.
- PaymentIntent metadata stores the invoice reference so webhook events can be reconciled server-side.

## Webhook Verification

- `/api/stripe/webhook` requires a valid `Stripe-Signature` header.
- Events are stored in `stripe_webhook_events` by Stripe event ID.
- Duplicate deliveries return success without processing the event twice.
- Only the signed webhook marks an invoice as paid.

## Protected PDFs

- Invoice PDFs require a high-entropy access token.
- A valid token is not enough by itself.
- The invoice must also be marked `paid` by the webhook before Laravel returns the PDF.

## Local Secret Handling

- `api/.env` and `web/.env.local` are ignored by Git.
- Use Stripe test keys only for local demos.
- Rotate any key that is accidentally pasted into logs, screenshots, tickets, or chat.
