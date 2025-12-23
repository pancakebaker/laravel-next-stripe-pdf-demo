<!doctype html>
<html>

<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: DejaVu Sans, Arial, sans-serif
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 8px
        }

        th {
            text-align: left
        }

        .right {
            text-align: right
        }
    </style>
</head>

<body>
    <h1>Invoice #{{ $invoice['id'] }}</h1>
    <p>Customer: {{ $invoice['customer'] }}</p>
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="right">Qty</th>
                <th class="right">Price</th>
                <th class="right">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice['lines'] as $line)
                <tr>
                    <td>{{ $line['desc'] }}</td>
                    <td class="right">{{ $line['qty'] }}</td>
                    <td class="right">${{ number_format($line['price'] / 100, 2) }}</td>
                    <td class="right">${{ number_format(($line['qty'] * $line['price']) / 100, 2) }}</td>
                </tr>
            @endforeach
            <tr>
                <td colspan="3" class="right"><strong>Total</strong></td>
                <td class="right"><strong>${{ number_format($total / 100, 2) }}</strong></td>
            </tr>
        </tbody>
    </table>
</body>

</html>
