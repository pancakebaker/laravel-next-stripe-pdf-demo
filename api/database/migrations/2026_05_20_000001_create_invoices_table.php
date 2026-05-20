<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 64)->unique();
            $table->string('access_token', 80)->unique();
            $table->string('customer_name')->default('Demo Customer');
            $table->string('customer_email')->nullable();
            $table->string('currency', 3)->default('usd');
            $table->unsignedInteger('subtotal_amount');
            $table->unsignedInteger('tax_amount')->default(0);
            $table->unsignedInteger('total_amount');
            $table->string('status', 32)->default('requires_payment');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
