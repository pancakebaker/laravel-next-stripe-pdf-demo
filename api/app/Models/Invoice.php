<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Invoice extends Model
{
    use HasFactory;

    public const STATUS_REQUIRES_PAYMENT = 'requires_payment';
    public const STATUS_PAID = 'paid';
    public const STATUS_PAYMENT_FAILED = 'payment_failed';

    protected $fillable = [
        'invoice_number',
        'access_token',
        'customer_name',
        'customer_email',
        'currency',
        'subtotal_amount',
        'tax_amount',
        'total_amount',
        'status',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'paid_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'invoice_number';
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function markPaid(): void
    {
        $this->forceFill([
            'status' => self::STATUS_PAID,
            'paid_at' => $this->paid_at ?? now(),
        ])->save();
    }

    public static function newAccessToken(): string
    {
        return Str::random(48);
    }
}
