<?php

use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentIntentController;
use App\Http\Controllers\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['ok' => true]));

Route::post('/payments/create-intent', [PaymentIntentController::class, 'store'])
    ->middleware('throttle:20,1');

Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])
    ->middleware('throttle:60,1');

Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])
    ->middleware('throttle:30,1');

Route::post('/stripe/webhook', StripeWebhookController::class);
