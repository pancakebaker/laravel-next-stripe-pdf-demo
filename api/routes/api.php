<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Stripe\StripeClient;
use Barryvdh\DomPDF\Facade\Pdf;

Route::get('/health', fn() => response()->json(['ok' => true]));

/**
 * Create a Stripe PaymentIntent
 * Expected payload:
 * {
 *   "amount": 500,                 // integer cents
 *   "currency": "usd",             // lowercase ISO currency
 *   "invoiceId": "INV-1001",       // required
 *   "userId": 123,                 // optional (if you have auth, take from $request->user()->id)
 *   "idempotencyKey": "..."        // optional, client-generated UUID
 * }
 */
Route::post('/payments/create-intent', function (Request $r) {
    // ✅ Production-safe validation (tight bounds + whitelist)
    $validated = $r->validate([
        'amount' => ['required', 'integer', 'min:50', 'max:5000000'], // 50 cents to 50,000.00 in cents
        'currency' => ['required', 'string', 'lowercase', 'in:usd,eur,gbp,aud,cad,sgd,php,jpy'],
        'invoiceId' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9\-_]+$/'],
        'userId' => ['nullable', 'integer', 'min:1'],
        'idempotencyKey' => ['nullable', 'string', 'max:128'],
    ]);

    // Normalize / harden
    $amount = (int) $validated['amount'];
    $currency = strtolower($validated['currency']);
    $invoiceId = $validated['invoiceId'];
    $userId = $validated['userId'] ?? null;

    // If you use auth later, prefer server truth:
    // $userId = $r->user()?->id ?? $userId;

    $stripe = new StripeClient(config('services.stripe.secret'));

    // ✅ Idempotency: use provided key or generate stable-ish key per invoice+amount+currency+user
    $idempotencyKey = $validated['idempotencyKey']
        ?? hash('sha256', implode('|', [
            'pi',
            $invoiceId,
            $userId ?? 'guest',
            $amount,
            $currency,
        ]));

    $params = [
        'amount' => $amount,
        'currency' => $currency,
        'automatic_payment_methods' => ['enabled' => true],
        'metadata' => [
            'invoice_id' => $invoiceId,
            'user_id' => $userId ? (string) $userId : 'guest',
            'app' => 'laravel-next-stripe-pdf',
        ],
    ];

    $pi = $stripe->paymentIntents->create($params, [
        'idempotency_key' => $idempotencyKey,
    ]);

    return response()->json([
        'clientSecret' => $pi->client_secret,
        'paymentIntentId' => $pi->id,
    ]);
});

Route::get('/invoices/{id}/pdf', function (string $id) {
    // Optional: validate invoice id from route too
    abort_unless(preg_match('/^[A-Za-z0-9\-_]+$/', $id), 404);

    $invoice = [
        'id' => $id,
        'customer' => 'Pancake Baker',
        'lines' => [
            ['desc' => 'Widget A', 'qty' => 2, 'price' => 1999],
            ['desc' => 'Widget B', 'qty' => 1, 'price' => 2999],
        ],
    ];

    $total = array_reduce($invoice['lines'], fn($c, $l) => $c + $l['qty'] * $l['price'], 0);
    $html = view('pdf.invoice', compact('invoice', 'total'))->render();

    return Pdf::loadHTML($html)->setPaper('A4')->download("invoice-{$id}.pdf");
});
