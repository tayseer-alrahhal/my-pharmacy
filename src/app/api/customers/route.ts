import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const customers = db.prepare(`
      SELECT * FROM customers WHERE is_active = 1 ORDER BY name
    `).all();
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO customers (id, name, phone, address, credit_limit)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, body.name, body.phone || null, body.address || null, body.credit_limit || 0);
    return NextResponse.json({ id, ...body });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
