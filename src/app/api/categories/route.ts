import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name_ar').all();
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    db.prepare(
      'INSERT INTO categories (id, name_ar, name_en, parent_id) VALUES (?, ?, ?, ?)'
    ).run(id, body.name_ar, body.name_en || null, body.parent_id || null);
    return NextResponse.json({ id, ...body });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
