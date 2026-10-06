import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const settingsRows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)').all('expiry_warning_days_1', 'expiry_warning_days_2', 'primary_currency') as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) settings[row.key] = row.value;
    const warn1 = parseInt(settings.expiry_warning_days_1 || '30');
    const warn2 = parseInt(settings.expiry_warning_days_2 || '60');

    const alerts: {
      type: string;
      priority: string;
      product_id: string;
      product_name: string;
      batch_id?: string;
      batch_number?: string;
      message: string;
      days_until_expiry?: number;
      current_quantity?: number;
      min_stock?: number;
      expiry_date?: string;
    }[] = [];

    const expiredBatches = db.prepare(`
      SELECT b.id, b.batch_number, b.expiry_date, b.quantity, p.id as product_id, p.name_ar as product_name
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.status = 'active' AND b.expiry_date <= date('now') AND b.quantity > 0
    `).all() as Array<{ id: string; batch_number: string; expiry_date: string; quantity: number; product_id: string; product_name: string }>;

    for (const b of expiredBatches) {
      alerts.push({
        type: 'expired',
        priority: 'urgent',
        product_id: b.product_id,
        product_name: b.product_name,
        batch_id: b.id,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date,
        current_quantity: b.quantity,
        message: `دفعة منتهية الصلاحية — ${b.product_name} (${b.expiry_date})`,
      });
    }

    const expiringSoon1 = db.prepare(`
      SELECT b.id, b.batch_number, b.expiry_date, b.quantity, p.id as product_id, p.name_ar as product_name,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) as days_left
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.status = 'active' AND b.expiry_date > date('now')
        AND b.expiry_date <= date('now', '+' || ? || ' days') AND b.quantity > 0
    `).all(warn1) as Array<{ id: string; batch_number: string; expiry_date: string; quantity: number; product_id: string; product_name: string; days_left: number }>;

    for (const b of expiringSoon1) {
      alerts.push({
        type: 'expiring_soon',
        priority: 'warning',
        product_id: b.product_id,
        product_name: b.product_name,
        batch_id: b.id,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date,
        days_until_expiry: b.days_left,
        current_quantity: b.quantity,
        message: `تنتهي خلال ${b.days_left} يوم — ${b.product_name}`,
      });
    }

    const expiringSoon2 = db.prepare(`
      SELECT b.id, b.batch_number, b.expiry_date, b.quantity,
        p.id as product_id, p.name_ar as product_name,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) as days_left
      FROM batches b JOIN products p ON b.product_id = p.id
      WHERE b.status = 'active'
        AND b.expiry_date > date('now', '+' || ? || ' days')
        AND b.expiry_date <= date('now', '+' || ? || ' days')
        AND b.quantity > 0
    `).all(warn1, warn2) as Array<{ id: string; batch_number: string; expiry_date: string; quantity: number; product_id: string; product_name: string; days_left: number }>;

    for (const b of expiringSoon2) {
      alerts.push({
        type: 'expiring_soon',
        priority: 'info',
        product_id: b.product_id,
        product_name: b.product_name,
        batch_id: b.id,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date,
        days_until_expiry: b.days_left,
        current_quantity: b.quantity,
        message: `تنتهي خلال ${b.days_left} يوم — ${b.product_name}`,
      });
    }

    const lowStock = db.prepare(`
      SELECT p.id, p.name_ar as product_name, p.min_stock,
        COALESCE(SUM(b.quantity), 0) as total_qty
      FROM products p
      LEFT JOIN batches b ON b.product_id = p.id AND b.status = 'active'
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING total_qty <= p.min_stock
    `).all() as Array<{ id: string; product_name: string; min_stock: number; total_qty: number }>;

    for (const p of lowStock) {
      alerts.push({
        type: p.total_qty === 0 ? 'out_of_stock' : 'low_stock',
        priority: p.total_qty === 0 ? 'urgent' : 'warning',
        product_id: p.id,
        product_name: p.product_name,
        current_quantity: p.total_qty,
        min_stock: p.min_stock,
        message: p.total_qty === 0
          ? `نفد المخزون — ${p.product_name}`
          : `تحت الحد الأدنى — ${p.product_name} (${p.total_qty}/${p.min_stock})`,
      });
    }

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ alerts: [] });
  }
}
