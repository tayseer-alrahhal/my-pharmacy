import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const adjustments = db.prepare(`
      SELECT sa.*, p.name_ar as product_name, b.batch_number, b.expiry_date
      FROM stock_adjustments sa
      JOIN products p ON sa.product_id = p.id
      JOIN batches b ON sa.batch_id = b.id
      ORDER BY sa.created_at DESC
    `).all();
    return NextResponse.json(adjustments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();

    const processAdj = db.transaction(() => {
      db.prepare(`
        INSERT INTO stock_adjustments (id, batch_id, product_id, quantity_change, reason, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, body.batch_id, body.product_id, body.quantity_change, body.reason, body.notes || null);

      const batch = db.prepare('SELECT quantity FROM batches WHERE id = ?').get(body.batch_id) as { quantity: number };
      const newQty = Math.max(0, batch.quantity + body.quantity_change);
      let newStatus = 'active';
      if (newQty === 0) newStatus = 'depleted';
      if (body.reason === 'expired') newStatus = 'expired';

      db.prepare('UPDATE batches SET quantity = ?, status = ? WHERE id = ?').run(newQty, newStatus, body.batch_id);
    });

    processAdj();
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
