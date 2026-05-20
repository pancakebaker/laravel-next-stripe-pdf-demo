<?php

namespace Tests\Feature;

use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoicePdfProtectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_pdf_requires_a_valid_token_and_paid_status(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-PDF-1',
            'access_token' => 'test-token',
            'customer_name' => 'Demo Buyer',
            'currency' => 'usd',
            'subtotal_amount' => 500,
            'tax_amount' => 0,
            'total_amount' => 500,
            'status' => Invoice::STATUS_REQUIRES_PAYMENT,
        ]);

        $invoice->items()->create([
            'description' => 'Protected PDF demo',
            'quantity' => 1,
            'unit_amount' => 500,
        ]);

        $this->get('/api/invoices/INV-PDF-1/pdf')->assertForbidden();
        $this->get('/api/invoices/INV-PDF-1/pdf?token=test-token')->assertForbidden();

        $invoice->markPaid();

        $this->get('/api/invoices/INV-PDF-1/pdf?token=test-token')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
