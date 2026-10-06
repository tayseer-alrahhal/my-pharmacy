import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id');
    const status = searchParams.get('status') || 'active';
    const expiring_soon = searchParams.get('expiring_soon');

    let query = `
      SELECT b.*, p.name_ar as product_name, p.unit
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (product_id) {
      query += ` AND b.product_id = ?`;
      params.push(product_id);
    }
    if (status !== 'all') {
      query += ` AND b.status = ?`;
      params.push(status);
    }
    if (expiring_soon) {
      query += ` AND b.expiry_date <= date('now', '+' || ? || ' days') AND b.status = 'active'`;
      params.push(expiring_soon);
    }

    query += ` ORDER BY b.expiry_date ASC`;

    const batches = db.prepare(query).all(...params);
    return NextResponse.json(batches);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO batches (id, product_id, grn_id, batch_number, manufacture_date, expiry_date, purchase_price, selling_price, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.product_id,
      body.grn_id || null,
      body.batch_number || null,
      body.manufacture_date || null,
      body.expiry_date,
      body.purchase_price,
      body.selling_price,
      body.quantity
    );
    return NextResponse.json({ id, ...body });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
