import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ? OR s.invoice_number = ?
    `).get(id, id) as Record<string, unknown> | undefined;

    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const items = db.prepare(`
      SELECT si.*, p.name_ar as product_name, p.unit, b.batch_number, b.expiry_date
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN batches b ON si.batch_id = b.id
      WHERE si.sale_id = ?
    `).all(sale.id as string);

    return NextResponse.json({ ...sale, items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
