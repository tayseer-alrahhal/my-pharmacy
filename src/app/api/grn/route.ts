import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const grns = db.prepare(`
      SELECT g.*, s.name as supplier_name,
        (SELECT COUNT(*) FROM grn_items gi WHERE gi.grn_id = g.id) as items_count
      FROM grn g
      LEFT JOIN suppliers s ON g.supplier_id = s.id
      ORDER BY g.created_at DESC
    `).all();
    return NextResponse.json(grns);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const year = new Date().getFullYear();
    const counterRow = db.prepare("SELECT value FROM settings WHERE key = 'grn_counter'").get() as { value: string } | undefined;
    const counter = parseInt(counterRow?.value || '0') + 1;
    const grn_number = `GRN-${year}-${String(counter).padStart(4, '0')}`;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'grn_counter'").run(String(counter));

    db.prepare(`
      INSERT INTO grn (id, grn_number, supplier_id, supplier_invoice_number, received_date, total_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, grn_number, body.supplier_id || null, body.supplier_invoice_number || null, body.received_date || new Date().toISOString().split('T')[0], 0, body.notes || null);

    return NextResponse.json({ id, grn_number });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
