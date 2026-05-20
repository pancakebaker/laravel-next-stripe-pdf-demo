<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\StripeWebhookEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use Symfony\Component\HttpKernel\Exception\HttpException;
use UnexpectedValueException;

class StripeWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $event = $this->validatedEvent($request);

        $storedEvent = StripeWebhookEvent::firstOrCreate(
            ['stripe_event_id' => $event->id],
            [
                'type' => $event->type,
                'payload' => $event->toArray(),
            ]
        );

        if ($storedEvent->processed_at) {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        match ($event->type) {
            'payment_intent.succeeded' => $this->markPayment($event->data->object, Invoice::STATUS_PAID),
            'payment_intent.payment_failed' => $this->markPayment($event->data->object, Invoice::STATUS_PAYMENT_FAILED),
            'payment_intent.canceled' => $this->markPayment($event->data->object, 'canceled'),
            default => null,
        };

        $storedEvent->update(['processed_at' => now()]);

        return response()->json(['received' => true]);
    }

    private function validatedEvent(Request $request): object
    {
        $secret = config('services.stripe.webhook_secret');

        if (! $secret) {
            throw new HttpException(500, 'Stripe webhook secret is not configured.');
        }

        try {
            return Webhook::constructEvent(
                $request->getContent(),
                (string) $request->header('Stripe-Signature'),
                $secret
            );
        } catch (UnexpectedValueException|SignatureVerificationException) {
            throw new HttpException(400, 'Invalid Stripe webhook signature.');
        }
    }

    private function markPayment(object $paymentIntent, string $status): void
    {
        $invoiceNumber = $paymentIntent->metadata->invoice_id ?? null;

        $payment = Payment::where('stripe_payment_intent_id', $paymentIntent->id)->first();
        $invoice = $payment?->invoice
            ?? ($invoiceNumber ? Invoice::where('invoice_number', $invoiceNumber)->first() : null);

        if (! $invoice) {
            return;
        }

        $payment?->update([
            'status' => $status,
            'failure_message' => $paymentIntent->last_payment_error->message ?? null,
            'raw_response' => method_exists($paymentIntent, 'toArray') ? $paymentIntent->toArray() : null,
        ]);

        if ($status === Invoice::STATUS_PAID) {
            $invoice->markPaid();

            return;
        }

        $invoice->update(['status' => $status]);
    }
}
