<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Payment;
use App\Services\StripePaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PaymentIntentTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_persists_an_invoice_and_payment_intent(): void
    {
        $this->mock(StripePaymentService::class, function ($mock) {
            $mock->shouldReceive('createPaymentIntent')
                ->once()
                ->with(
                    Mockery::on(fn (array $params) => $params['amount'] === 500
                        && $params['currency'] === 'usd'
                        && $params['metadata']['invoice_id'] === 'INV-TEST-1'),
                    'idem-1'
                )
                ->andReturn([
                    'id' => 'pi_test_123',
                    'client_secret' => 'pi_test_123_secret_abc',
                    'status' => 'requires_payment_method',
                ]);
        });

        $response = $this->postJson('/api/payments/create-intent', [
            'amount' => 500,
            'currency' => 'usd',
            'invoiceId' => 'INV-TEST-1',
            'userId' => 123,
            'idempotencyKey' => 'idem-1',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('clientSecret', 'pi_test_123_secret_abc')
            ->assertJsonPath('paymentIntentId', 'pi_test_123')
            ->assertJsonPath('invoice.id', 'INV-TEST-1')
            ->assertJsonPath('invoice.status', Invoice::STATUS_REQUIRES_PAYMENT)
            ->assertJsonPath('invoice.totalAmount', 500);

        $this->assertDatabaseHas(Invoice::class, [
            'invoice_number' => 'INV-TEST-1',
            'total_amount' => 500,
            'status' => Invoice::STATUS_REQUIRES_PAYMENT,
        ]);

        $this->assertDatabaseHas(Payment::class, [
            'stripe_payment_intent_id' => 'pi_test_123',
            'idempotency_key' => 'idem-1',
            'amount' => 500,
        ]);
    }

    public function test_it_rejects_client_side_amount_tampering(): void
    {
        $this->mock(StripePaymentService::class, function ($mock) {
            $mock->shouldNotReceive('createPaymentIntent');
        });

        $this->postJson('/api/payments/create-intent', [
            'amount' => 1,
            'currency' => 'usd',
            'invoiceId' => 'INV-TAMPERED',
            'userId' => 123,
            'idempotencyKey' => 'idem-tampered',
        ])->assertStatus(422);
    }
}
