import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    db.prepare('UPDATE categories SET name_ar = ?, name_en = ? WHERE id = ?')
      .run(body.name_ar, body.name_en || null, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const linked = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(id) as { c: number };
    if (linked.c > 0) {
      return NextResponse.json({ error: `لا يمكن حذف هذا التصنيف — مرتبط بـ ${linked.c} دواء` }, { status: 400 });
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
