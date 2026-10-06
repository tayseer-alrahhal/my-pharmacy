import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const category_id = searchParams.get('category_id');

    let query = `
      SELECT p.*, c.name_ar as category_name,
        COALESCE((SELECT SUM(b.quantity) FROM batches b WHERE b.product_id = p.id AND b.status = 'active'), 0) as total_quantity,
        (SELECT b.selling_price FROM batches b WHERE b.product_id = p.id AND b.status = 'active' AND b.quantity > 0 ORDER BY b.expiry_date ASC LIMIT 1) as selling_price,
        (SELECT b.expiry_date FROM batches b WHERE b.product_id = p.id AND b.status = 'active' AND b.quantity > 0 ORDER BY b.expiry_date ASC LIMIT 1) as expiry_date,
        (SELECT b.id FROM batches b WHERE b.product_id = p.id AND b.status = 'active' AND b.quantity > 0 ORDER BY b.expiry_date ASC LIMIT 1) as batch_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params: string[] = [];

    if (q) {
      query += ` AND (p.name_ar LIKE ? OR p.name_en LIKE ? OR p.barcode = ?)`;
      params.push(`%${q}%`, `%${q}%`, q);
    }
    if (category_id) {
      query += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    query += ` ORDER BY p.name_ar`;

    const products = db.prepare(query).all(...params);
    return NextResponse.json(products);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO products (id, name_ar, name_en, barcode, category_id, unit, min_stock, requires_prescription, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.name_ar,
      body.name_en || null,
      body.barcode || null,
      body.category_id || null,
      body.unit || 'حبة',
      body.min_stock || 10,
      body.requires_prescription ? 1 : 0,
      body.notes || null
    );
    return NextResponse.json({ id, ...body });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
