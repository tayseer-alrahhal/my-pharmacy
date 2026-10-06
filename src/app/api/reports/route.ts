import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'daily';
    const date_from = searchParams.get('date_from') || new Date().toISOString().split('T')[0];
    const date_to = searchParams.get('date_to') || new Date().toISOString().split('T')[0];

    if (type === 'daily') {
      const summary = db.prepare(`
        SELECT
          COUNT(*) as invoices_count,
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as total_cash,
          COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total ELSE 0 END), 0) as total_credit,
          COALESCE(SUM(CASE WHEN payment_method = 'mixed' THEN (total - paid_amount) ELSE 0 END), 0) as total_mixed_credit
        FROM sales
        WHERE DATE(sale_date) BETWEEN ? AND ? AND status != 'returned'
      `).get(date_from, date_to);

      const returns = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total_returns
        FROM returns
        WHERE DATE(return_date) BETWEEN ? AND ?
      `).get(date_from, date_to);

      const topProducts = db.prepare(`
        SELECT p.name_ar as product_name, SUM(si.quantity) as qty, SUM(si.total) as revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE DATE(s.sale_date) BETWEEN ? AND ? AND s.status != 'returned'
        GROUP BY si.product_id
        ORDER BY qty DESC
        LIMIT 10
      `).all(date_from, date_to);

      const salesByDay = db.prepare(`
        SELECT DATE(sale_date) as date, COUNT(*) as count, SUM(total) as total
        FROM sales
        WHERE DATE(sale_date) BETWEEN ? AND ? AND status != 'returned'
        GROUP BY DATE(sale_date)
        ORDER BY date
      `).all(date_from, date_to);

      return NextResponse.json({ summary, returns, topProducts, salesByDay });
    }

    if (type === 'inventory') {
      const inventory = db.prepare(`
        SELECT p.id, p.name_ar as product_name, p.unit, p.min_stock, c.name_ar as category_name,
          COALESCE(SUM(b.quantity), 0) as total_qty,
          COALESCE(SUM(b.quantity * b.purchase_price), 0) as total_value,
          MIN(CASE WHEN b.quantity > 0 THEN b.expiry_date END) as nearest_expiry
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN batches b ON b.product_id = p.id AND b.status = 'active'
        WHERE p.is_active = 1
        GROUP BY p.id
        ORDER BY p.name_ar
      `).all();
      return NextResponse.json({ inventory });
    }

    if (type === 'profit') {
      const profit = db.prepare(`
        SELECT
          SUM(si.quantity * si.unit_price) as revenue,
          SUM(si.quantity * b.purchase_price) as cost,
          SUM(si.quantity * (si.unit_price - b.purchase_price)) as profit,
          SUM(si.discount_amount) as discounts
        FROM sale_items si
        JOIN batches b ON si.batch_id = b.id
        JOIN sales s ON si.sale_id = s.id
        WHERE DATE(s.sale_date) BETWEEN ? AND ? AND s.status != 'returned'
      `).get(date_from, date_to);
      return NextResponse.json({ profit });
    }

    if (type === 'receivables') {
      const receivables = db.prepare(`
        SELECT c.id, c.name, c.phone, c.current_balance, c.credit_limit,
          (SELECT MAX(s.sale_date) FROM sales s WHERE s.customer_id = c.id AND s.payment_method IN ('credit', 'mixed')) as last_purchase
        FROM customers c
        WHERE c.current_balance > 0 AND c.is_active = 1
        ORDER BY c.current_balance DESC
      `).all();
      return NextResponse.json({ receivables });
    }

    if (type === 'top-products') {
      const topProducts = db.prepare(`
        SELECT p.name_ar as product_name, SUM(si.quantity) as qty, SUM(si.total) as revenue,
          SUM(si.quantity * b.purchase_price) as cost,
          SUM(si.quantity * (si.unit_price - b.purchase_price)) as profit
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN batches b ON si.batch_id = b.id
        JOIN sales s ON si.sale_id = s.id
        WHERE DATE(s.sale_date) BETWEEN ? AND ? AND s.status != 'returned'
        GROUP BY si.product_id
        ORDER BY qty DESC
        LIMIT 20
      `).all(date_from, date_to);
      return NextResponse.json({ topProducts });
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
