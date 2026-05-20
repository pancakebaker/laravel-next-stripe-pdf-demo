<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('stripe_payment_intent_id')->nullable()->unique();
            $table->string('idempotency_key', 128)->unique();
            $table->unsignedInteger('amount');
            $table->string('currency', 3);
            $table->string('status', 32)->default('requires_payment');
            $table->text('failure_message')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
