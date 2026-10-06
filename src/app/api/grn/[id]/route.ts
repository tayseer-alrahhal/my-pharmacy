import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const grn = db.prepare(`
      SELECT g.*, s.name as supplier_name
      FROM grn g
      LEFT JOIN suppliers s ON g.supplier_id = s.id
      WHERE g.id = ?
    `).get(id);

    if (!grn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const items = db.prepare(`
      SELECT gi.*, p.name_ar as product_name
      FROM grn_items gi
      JOIN products p ON gi.product_id = p.id
      WHERE gi.grn_id = ?
    `).all(id);

    return NextResponse.json({ ...grn as object, items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'add-item') {
      const body = await req.json();
      const itemId = uuidv4();
      db.prepare(`
        INSERT INTO grn_items (id, grn_id, product_id, batch_number, manufacture_date, expiry_date, purchase_price, selling_price, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, id, body.product_id, body.batch_number || null, body.manufacture_date || null, body.expiry_date, body.purchase_price, body.selling_price, body.quantity);

      const total = db.prepare('SELECT SUM(purchase_price * quantity) as t FROM grn_items WHERE grn_id = ?').get(id) as { t: number };
      db.prepare('UPDATE grn SET total_amount = ? WHERE id = ?').run(total.t || 0, id);

      return NextResponse.json({ id: itemId });
    }

    if (action === 'confirm') {
      const grn = db.prepare('SELECT status FROM grn WHERE id = ?').get(id) as { status: string };
      if (grn.status === 'confirmed') {
        return NextResponse.json({ error: 'Already confirmed' }, { status: 400 });
      }

      const confirmGrn = db.transaction(() => {
        const items = db.prepare('SELECT * FROM grn_items WHERE grn_id = ?').all(id) as Array<{
          id: string;
          product_id: string;
          batch_number: string | null;
          manufacture_date: string | null;
          expiry_date: string;
          purchase_price: number;
          selling_price: number;
          quantity: number;
        }>;

        for (const item of items) {
          db.prepare(`
            INSERT INTO batches (id, product_id, grn_id, batch_number, manufacture_date, expiry_date, purchase_price, selling_price, quantity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), item.product_id, id, item.batch_number, item.manufacture_date, item.expiry_date, item.purchase_price, item.selling_price, item.quantity);
        }

        db.prepare("UPDATE grn SET status = 'confirmed' WHERE id = ?").run(id);
      });

      confirmGrn();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('item_id');

    if (itemId) {
      db.prepare('DELETE FROM grn_items WHERE id = ? AND grn_id = ?').run(itemId, id);
      const total = db.prepare('SELECT SUM(purchase_price * quantity) as t FROM grn_items WHERE grn_id = ?').get(id) as { t: number };
      db.prepare('UPDATE grn SET total_amount = ? WHERE id = ?').run(total.t || 0, id);
    } else {
      const grn = db.prepare('SELECT status FROM grn WHERE id = ?').get(id) as { status: string } | undefined;
      if (grn?.status === 'confirmed') {
        return NextResponse.json({ error: 'لا يمكن حذف سند استلام مؤكد' }, { status: 400 });
      }
      db.prepare('DELETE FROM grn_items WHERE grn_id = ?').run(id);
      db.prepare('DELETE FROM grn WHERE id = ?').run(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
