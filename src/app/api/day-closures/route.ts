import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
      const closures = db.prepare('SELECT * FROM day_closures ORDER BY closure_date DESC LIMIT 60').all();
      return NextResponse.json(closures);
    }

    const summary = db.prepare(`
      SELECT
        COUNT(*) as invoices_count,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN paid_amount ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total ELSE 0 END), 0) as total_credit,
        COALESCE(SUM(CASE WHEN payment_method = 'mixed' THEN (total - paid_amount) ELSE 0 END), 0) as mixed_credit
      FROM sales
      WHERE DATE(sale_date) = ? AND status != 'returned'
    `).get(date);

    const returnsRow = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total_returns
      FROM returns WHERE DATE(return_date) = ?
    `).get(date);

    const existing = db.prepare('SELECT * FROM day_closures WHERE closure_date = ?').get(date);

    return NextResponse.json({ summary, returns: returnsRow, existing, date });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const date = body.date || new Date().toISOString().split('T')[0];

    const existing = db.prepare('SELECT id FROM day_closures WHERE closure_date = ?').get(date);
    if (existing) {
      return NextResponse.json({ error: 'اليوم مُغلق بالفعل' }, { status: 400 });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO day_closures (id, closure_date, total_sales, total_cash, total_credit, total_returns, actual_cash, cash_difference, invoices_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, date, body.total_sales, body.total_cash, body.total_credit,
      body.total_returns, body.actual_cash,
      body.actual_cash - body.total_cash,
      body.invoices_count, body.notes || null
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
