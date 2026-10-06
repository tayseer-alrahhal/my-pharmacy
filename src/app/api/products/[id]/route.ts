import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = db.prepare(`
      SELECT p.*, c.name_ar as category_name,
        COALESCE((SELECT SUM(b.quantity) FROM batches b WHERE b.product_id = p.id AND b.status = 'active'), 0) as total_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    db.prepare(`
      UPDATE products SET
        name_ar = COALESCE(?, name_ar),
        name_en = COALESCE(?, name_en),
        barcode = COALESCE(?, barcode),
        category_id = COALESCE(?, category_id),
        unit = COALESCE(?, unit),
        min_stock = COALESCE(?, min_stock),
        requires_prescription = COALESCE(?, requires_prescription),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      body.name_ar || null,
      body.name_en || null,
      body.barcode || null,
      body.category_id || null,
      body.unit || null,
      body.min_stock || null,
      body.requires_prescription !== undefined ? (body.requires_prescription ? 1 : 0) : null,
      body.notes || null,
      id
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
