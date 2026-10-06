import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = db.prepare(`
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(id);

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const items = db.prepare(`
      SELECT poi.*, p.name_ar as product_name, p.unit
      FROM purchase_order_items poi
      JOIN products p ON poi.product_id = p.id
      WHERE poi.po_id = ?
    `).all(id);

    return NextResponse.json({ ...order as object, items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.status) {
      const sentAt = body.status === 'sent' ? 'CURRENT_TIMESTAMP' : null;
      const receivedAt = body.status === 'received' ? 'CURRENT_TIMESTAMP' : null;

      db.prepare(`
        UPDATE purchase_orders SET
          status = ?,
          sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
          received_at = CASE WHEN ? = 'received' THEN CURRENT_TIMESTAMP ELSE received_at END
        WHERE id = ?
      `).run(body.status, body.status, body.status, id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
