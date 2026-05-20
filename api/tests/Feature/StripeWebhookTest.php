<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\StripeWebhookEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StripeWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_signed_payment_succeeded_webhook_marks_invoice_paid(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test_secret']);

        $invoice = Invoice::create([
            'invoice_number' => 'INV-WEBHOOK-1',
            'access_token' => 'webhook-token',
            'customer_name' => 'Demo Buyer',
            'currency' => 'usd',
            'subtotal_amount' => 500,
            'tax_amount' => 0,
            'total_amount' => 500,
            'status' => Invoice::STATUS_REQUIRES_PAYMENT,
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'stripe_payment_intent_id' => 'pi_webhook_123',
            'idempotency_key' => 'idem-webhook',
            'amount' => 500,
            'currency' => 'usd',
            'status' => Invoice::STATUS_REQUIRES_PAYMENT,
        ]);

        $payload = json_encode([
            'id' => 'evt_test_123',
            'object' => 'event',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_webhook_123',
                    'object' => 'payment_intent',
                    'metadata' => [
                        'invoice_id' => 'INV-WEBHOOK-1',
                    ],
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => $this->stripeSignature($payload, 'whsec_test_secret'),
            ],
            $payload
        );

        $response->assertOk()->assertJsonPath('received', true);

        $this->assertDatabaseHas(Invoice::class, [
            'invoice_number' => 'INV-WEBHOOK-1',
            'status' => Invoice::STATUS_PAID,
        ]);

        $this->assertDatabaseHas(Payment::class, [
            'stripe_payment_intent_id' => 'pi_webhook_123',
            'status' => Invoice::STATUS_PAID,
        ]);

        $this->assertDatabaseHas(StripeWebhookEvent::class, [
            'stripe_event_id' => 'evt_test_123',
            'type' => 'payment_intent.succeeded',
        ]);
    }

    public function test_webhook_rejects_invalid_signatures(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test_secret']);

        $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => 't=1,v1=invalid',
            ],
            '{"id":"evt_bad"}'
        )->assertBadRequest();
    }

    private function stripeSignature(string $payload, string $secret): string
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

        return "t={$timestamp},v1={$signature}";
    }
}
