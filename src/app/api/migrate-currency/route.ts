import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batchesBefore = db.prepare('SELECT id, selling_price, purchase_price FROM batches').all();

    db.transaction(() => {
      db.exec(`
        UPDATE batches SET purchase_price = ROUND(purchase_price / 100, 2), selling_price = ROUND(selling_price / 100, 2) WHERE selling_price >= 1000;
        UPDATE grn_items SET purchase_price = ROUND(purchase_price / 100, 2), selling_price = ROUND(selling_price / 100, 2) WHERE selling_price >= 1000;
        UPDATE grn SET total_amount = ROUND(total_amount / 100, 2) WHERE total_amount >= 1000;
        UPDATE sale_items SET unit_price = ROUND(unit_price / 100, 2), discount_amount = ROUND(discount_amount / 100, 2), total = ROUND(total / 100, 2) WHERE unit_price >= 1000;
        UPDATE sales SET subtotal = ROUND(subtotal / 100, 2), discount_amount = ROUND(discount_amount / 100, 2), tax_amount = ROUND(tax_amount / 100, 2), total = ROUND(total / 100, 2), paid_amount = ROUND(paid_amount / 100, 2), change_amount = ROUND(change_amount / 100, 2) WHERE subtotal >= 1000;
        UPDATE returns SET total_amount = ROUND(total_amount / 100, 2) WHERE total_amount >= 1000;
        UPDATE return_items SET unit_price = ROUND(unit_price / 100, 2), total = ROUND(total / 100, 2) WHERE unit_price >= 1000;
        UPDATE purchase_order_items SET unit_price = ROUND(unit_price / 100, 2) WHERE unit_price >= 1000;
        UPDATE day_closures SET total_sales = ROUND(total_sales / 100, 2), total_cash = ROUND(total_cash / 100, 2), total_credit = ROUND(total_credit / 100, 2), total_returns = ROUND(total_returns / 100, 2), actual_cash = ROUND(actual_cash / 100, 2), cash_difference = ROUND(cash_difference / 100, 2) WHERE total_sales >= 1000;
        UPDATE customers SET credit_limit = ROUND(credit_limit / 100, 2), current_balance = ROUND(current_balance / 100, 2) WHERE credit_limit >= 1000 OR current_balance >= 1000;
        UPDATE suppliers SET balance = ROUND(balance / 100, 2) WHERE balance >= 1000;
        INSERT OR REPLACE INTO settings (key, value) VALUES ('primary_currency', 'ل.س.ج');
      `);
    })();

    const batchesAfter = db.prepare('SELECT id, selling_price, purchase_price FROM batches').all();
    return NextResponse.json({ success: true, batchesBefore, batchesAfter });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message, stack: error?.stack }, { status: 500 });
  }
}
