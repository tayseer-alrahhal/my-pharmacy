import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const sales = db.prepare(`
      SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date DESC LIMIT 20
    `).all(id);

    return NextResponse.json({ ...customer as object, sales });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.settle_amount) {
      const customer = db.prepare('SELECT current_balance FROM customers WHERE id = ?').get(id) as { current_balance: number };
      const newBalance = Math.max(0, customer.current_balance - body.settle_amount);
      db.prepare('UPDATE customers SET current_balance = ? WHERE id = ?').run(newBalance, id);
      return NextResponse.json({ success: true, new_balance: newBalance });
    }

    db.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        credit_limit = COALESCE(?, credit_limit)
      WHERE id = ?
    `).run(body.name || null, body.phone || null, body.address || null, body.credit_limit ?? null, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
