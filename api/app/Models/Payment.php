<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'stripe_payment_intent_id',
        'idempotency_key',
        'amount',
        'currency',
        'status',
        'failure_message',
        'raw_response',
    ];

    protected function casts(): array
    {
        return [
            'raw_response' => 'array',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
