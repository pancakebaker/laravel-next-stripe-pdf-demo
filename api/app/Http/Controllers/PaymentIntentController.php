<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use App\Services\StripePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentIntentController extends Controller
{
    public function store(Request $request, StripePaymentService $stripe): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:50', 'max:5000000'],
            'currency' => ['required', 'string', 'lowercase', 'in:usd,eur,gbp,aud,cad,sgd,php,jpy'],
            'invoiceId' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'userId' => ['nullable', 'integer', 'min:1'],
            'idempotencyKey' => ['nullable', 'string', 'max:128'],
        ]);

        $amount = 500;
        $currency = 'usd';

        abort_if((int) $validated['amount'] !== $amount || $validated['currency'] !== $currency, 422, 'Checkout amount does not match the server price book.');

        $invoice = DB::transaction(function () use ($validated, $amount, $currency) {
            $invoice = Invoice::firstOrCreate(
                ['invoice_number' => $validated['invoiceId']],
                [
                    'access_token' => Invoice::newAccessToken(),
                    'customer_name' => 'Demo Buyer',
                    'customer_email' => 'buyer@example.test',
                    'currency' => $currency,
                    'subtotal_amount' => $amount,
                    'tax_amount' => 0,
                    'total_amount' => $amount,
                    'status' => Invoice::STATUS_REQUIRES_PAYMENT,
                ]
            );

            if ($invoice->items()->doesntExist()) {
                $invoice->items()->create([
                    'description' => 'Stripe checkout and protected PDF demo',
                    'quantity' => 1,
                    'unit_amount' => $amount,
                ]);
            }

            return $invoice->load('items');
        });

        abort_if($invoice->isPaid(), 409, 'This invoice has already been paid.');

        $idempotencyKey = $validated['idempotencyKey']
            ?? hash('sha256', implode('|', [
                'pi',
                $invoice->invoice_number,
                $validated['userId'] ?? 'guest',
                $invoice->total_amount,
                $invoice->currency,
            ]));

        $payment = Payment::firstOrCreate(
            ['idempotency_key' => $idempotencyKey],
            [
                'invoice_id' => $invoice->id,
                'amount' => $invoice->total_amount,
                'currency' => $invoice->currency,
                'status' => Invoice::STATUS_REQUIRES_PAYMENT,
            ]
        );

        $paymentIntent = $stripe->createPaymentIntent([
            'amount' => $invoice->total_amount,
            'currency' => $invoice->currency,
            'automatic_payment_methods' => ['enabled' => true],
            'metadata' => [
                'invoice_id' => $invoice->invoice_number,
                'invoice_db_id' => (string) $invoice->id,
                'user_id' => isset($validated['userId']) ? (string) $validated['userId'] : 'guest',
                'app' => 'laravel-next-stripe-pdf',
            ],
        ], $idempotencyKey);

        $payment->update([
            'stripe_payment_intent_id' => $paymentIntent['id'],
            'status' => $paymentIntent['status'] ?? Invoice::STATUS_REQUIRES_PAYMENT,
            'raw_response' => $paymentIntent,
        ]);

        return response()->json([
            'clientSecret' => $paymentIntent['client_secret'],
            'paymentIntentId' => $paymentIntent['id'],
            'invoice' => $this->invoicePayload($invoice->fresh('items')),
        ]);
    }

    private function invoicePayload(Invoice $invoice): array
    {
        return [
            'id' => $invoice->invoice_number,
            'status' => $invoice->status,
            'customerName' => $invoice->customer_name,
            'currency' => $invoice->currency,
            'totalAmount' => $invoice->total_amount,
            'paidAt' => $invoice->paid_at?->toIso8601String(),
            'accessToken' => $invoice->access_token,
            'pdfUrl' => $invoice->isPaid()
                ? url("/api/invoices/{$invoice->invoice_number}/pdf?token={$invoice->access_token}")
                : null,
            'items' => $invoice->items->map(fn ($item) => [
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unitAmount' => $item->unit_amount,
                'subtotalAmount' => $item->subtotal_amount,
            ])->values(),
        ];
    }
}
