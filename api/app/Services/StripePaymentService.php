<?php

namespace App\Services;

use Stripe\StripeClient;

class StripePaymentService
{
    public function createPaymentIntent(array $params, string $idempotencyKey): array
    {
        $paymentIntent = (new StripeClient(config('services.stripe.secret')))
            ->paymentIntents
            ->create($params, [
                'idempotency_key' => $idempotencyKey,
            ]);

        return [
            'id' => $paymentIntent->id,
            'client_secret' => $paymentIntent->client_secret,
            'status' => $paymentIntent->status,
        ];
    }
}
