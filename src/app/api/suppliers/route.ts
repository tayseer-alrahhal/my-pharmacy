import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const suppliers = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) as orders_count
      FROM suppliers s
      WHERE s.is_active = 1
      ORDER BY s.name
    `).all();
    return NextResponse.json(suppliers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO suppliers (id, name, phone, email, address, payment_terms_days, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, body.name, body.phone || null, body.email || null, body.address || null, body.payment_terms_days || 30, body.notes || null);
    return NextResponse.json({ id, ...body });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
