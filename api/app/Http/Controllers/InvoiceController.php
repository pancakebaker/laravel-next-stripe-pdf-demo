<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeToken($request, $invoice);

        return response()->json($this->payload($invoice->load('items')));
    }

    public function pdf(Request $request, Invoice $invoice): Response
    {
        $this->authorizeToken($request, $invoice);

        abort_unless($invoice->isPaid(), 403, 'Invoice PDF is available only after the Stripe webhook marks the invoice paid.');

        $invoice->load('items');
        $html = view('pdf.invoice', [
            'invoice' => $invoice,
            'total' => $invoice->total_amount,
        ])->render();

        return Pdf::loadHTML($html)
            ->setPaper('A4')
            ->download("invoice-{$invoice->invoice_number}.pdf");
    }

    private function authorizeToken(Request $request, Invoice $invoice): void
    {
        abort_unless(hash_equals($invoice->access_token, (string) $request->query('token')), 403, 'Invalid invoice access token.');
    }

    private function payload(Invoice $invoice): array
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
