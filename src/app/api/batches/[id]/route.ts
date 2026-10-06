import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    db.prepare(`
      UPDATE batches SET
        selling_price = COALESCE(?, selling_price),
        purchase_price = COALESCE(?, purchase_price),
        quantity = COALESCE(?, quantity),
        status = COALESCE(?, status),
        expiry_date = COALESCE(?, expiry_date),
        batch_number = COALESCE(?, batch_number)
      WHERE id = ?
    `).run(
      body.selling_price ?? null,
      body.purchase_price ?? null,
      body.quantity ?? null,
      body.status || null,
      body.expiry_date || null,
      body.batch_number || null,
      id
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
