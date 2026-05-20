<!doctype html>
<html>

<head>
    <meta charset="utf-8">
    <style>
        body {
            color: #172033;
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            margin: 36px;
        }

        .masthead {
            border-bottom: 2px solid #172033;
            margin-bottom: 28px;
            padding-bottom: 18px;
        }

        .brand {
            font-size: 22px;
            font-weight: 700;
            margin: 0;
        }

        .muted {
            color: #667085;
        }

        .grid {
            display: table;
            margin-bottom: 24px;
            width: 100%;
        }

        .cell {
            display: table-cell;
            vertical-align: top;
            width: 50%;
        }

        .right {
            text-align: right;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        th {
            background: #f2f4f7;
            color: #344054;
            font-size: 11px;
            letter-spacing: .04em;
            text-align: left;
            text-transform: uppercase;
        }

        th,
        td {
            border-bottom: 1px solid #e4e7ec;
            padding: 10px 8px;
        }

        .total-row td {
            border-bottom: 0;
            font-size: 15px;
            font-weight: 700;
            padding-top: 16px;
        }

        .badge {
            background: #ecfdf3;
            border: 1px solid #abefc6;
            border-radius: 4px;
            color: #067647;
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            text-transform: uppercase;
        }
    </style>
</head>

<body>
    <div class="masthead">
        <p class="brand">Laravel Next Stripe PDF Demo</p>
        <p class="muted">Webhook-verified invoice</p>
    </div>

    <div class="grid">
        <div class="cell">
            <strong>Bill to</strong><br>
            {{ $invoice->customer_name }}<br>
            @if ($invoice->customer_email)
                <span class="muted">{{ $invoice->customer_email }}</span>
            @endif
        </div>
        <div class="cell right">
            <strong>Invoice #{{ $invoice->invoice_number }}</strong><br>
            <span class="muted">Status:</span> <span class="badge">{{ $invoice->status }}</span><br>
            @if ($invoice->paid_at)
                <span class="muted">Paid:</span> {{ $invoice->paid_at->format('M j, Y g:i A') }}
            @endif
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="right">Qty</th>
                <th class="right">Unit</th>
                <th class="right">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="right">{{ $item->quantity }}</td>
                    <td class="right">${{ number_format($item->unit_amount / 100, 2) }}</td>
                    <td class="right">${{ number_format($item->subtotal_amount / 100, 2) }}</td>
                </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="3" class="right">Total</td>
                <td class="right">${{ number_format($total / 100, 2) }}</td>
            </tr>
        </tbody>
    </table>
</body>

</html>
