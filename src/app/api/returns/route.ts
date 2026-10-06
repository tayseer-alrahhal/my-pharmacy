import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const returns = db.prepare(`
      SELECT r.*, s.invoice_number
      FROM returns r
      JOIN sales s ON r.original_sale_id = s.id
      ORDER BY r.return_date DESC
    `).all();
    return NextResponse.json(returns);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const returnId = uuidv4();
    const year = new Date().getFullYear();
    const counterRow = db.prepare("SELECT value FROM settings WHERE key = 'return_counter'").get() as { value: string } | undefined;
    const counter = parseInt(counterRow?.value || '0') + 1;
    const return_number = `RET-${year}-${String(counter).padStart(4, '0')}`;

    const processReturn = db.transaction(() => {
      db.prepare(`
        INSERT INTO returns (id, return_number, original_sale_id, reason, refund_method, total_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(returnId, return_number, body.sale_id, body.reason, body.refund_method, body.total_amount, body.notes || null);

      for (const item of body.items) {
        db.prepare(`
          INSERT INTO return_items (id, return_id, sale_item_id, batch_id, quantity, unit_price, total, restock)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), returnId, item.sale_item_id, item.batch_id, item.quantity, item.unit_price, item.total, item.restock ? 1 : 0);

        if (item.restock) {
          db.prepare('UPDATE batches SET quantity = quantity + ?, status = ? WHERE id = ?').run(
            item.quantity, 'active', item.batch_id
          );
        }
      }

      const saleItemsQty = db.prepare(`
        SELECT si.id, si.quantity,
          COALESCE((
            SELECT SUM(ri.quantity) FROM return_items ri WHERE ri.sale_item_id = si.id
          ), 0) as returned_qty
        FROM sale_items si WHERE si.sale_id = ?
      `).all(body.sale_id) as Array<{ id: string; quantity: number; returned_qty: number }>;
      const allFullyReturned = saleItemsQty.length > 0 && saleItemsQty.every(si => si.returned_qty >= si.quantity);
      const newStatus = allFullyReturned ? 'returned' : 'partial_return';
      db.prepare('UPDATE sales SET status = ? WHERE id = ?').run(newStatus, body.sale_id);
      db.prepare("UPDATE settings SET value = ? WHERE key = 'return_counter'").run(String(counter));

      if (body.refund_method === 'credit_note' && body.customer_id) {
        db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(body.total_amount, body.customer_id);
      }
    });

    processReturn();
    return NextResponse.json({ success: true, return_number });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
