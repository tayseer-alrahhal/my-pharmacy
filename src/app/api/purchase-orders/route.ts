import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const orders = db.prepare(`
      SELECT po.*, s.name as supplier_name,
        (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.po_id = po.id) as items_count,
        COALESCE((SELECT SUM(poi.quantity_ordered * poi.unit_price) FROM purchase_order_items poi WHERE poi.po_id = po.id), 0) as total_amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
    `).all();
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const year = new Date().getFullYear();
    const counter = (db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get() as { c: number }).c + 1;
    const po_number = `PO-${year}-${String(counter).padStart(4, '0')}`;

    db.prepare(`
      INSERT INTO purchase_orders (id, po_number, supplier_id, notes)
      VALUES (?, ?, ?, ?)
    `).run(id, po_number, body.supplier_id || null, body.notes || null);

    if (body.items && body.items.length > 0) {
      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (id, po_id, product_id, quantity_ordered, unit_price)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const item of body.items) {
        insertItem.run(uuidv4(), id, item.product_id, item.quantity_ordered, item.unit_price || null);
      }
    }

    return NextResponse.json({ id, po_number });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
