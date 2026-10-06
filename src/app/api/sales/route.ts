import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const invoice = searchParams.get('invoice');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = `
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    const dateFrom = searchParams.get('date_from');
    const dateTo   = searchParams.get('date_to');
    const customer = searchParams.get('customer');

    if (date) {
      query += ` AND DATE(s.sale_date) = ?`;
      params.push(date);
    }
    if (dateFrom) {
      query += ` AND DATE(s.sale_date) >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND DATE(s.sale_date) <= ?`;
      params.push(dateTo);
    }
    if (invoice) {
      query += ` AND (s.invoice_number LIKE ? OR c.name LIKE ?)`;
      params.push(`%${invoice}%`, `%${invoice}%`);
    }
    if (customer) {
      query += ` AND s.customer_id = ?`;
      params.push(customer);
    }

    query += ` ORDER BY s.sale_date DESC LIMIT ?`;
    params.push(limit);

    const sales = db.prepare(query).all(...params);
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const counterRow = db.prepare("SELECT value FROM settings WHERE key = 'invoice_counter'").get() as { value: string };
    const counter = parseInt(counterRow.value) + 1;
    const year = new Date().getFullYear();
    const invoice_number = `INV-${year}-${String(counter).padStart(4, '0')}`;

    const saleId = uuidv4();

    const insertSale = db.transaction(() => {
      if (body.customer_id && body.payment_method !== 'cash') {
        const customer = db.prepare(
          'SELECT current_balance, credit_limit FROM customers WHERE id = ?'
        ).get(body.customer_id) as { current_balance: number; credit_limit: number } | undefined;

        if (customer) {
          const creditAmount = body.payment_method === 'credit'
            ? body.total
            : body.total - (body.paid_amount || 0);

          if (customer.credit_limit > 0 &&
              customer.current_balance + creditAmount > customer.credit_limit) {
            throw new Error(
              `تجاوز حد الائتمان — المتاح: ${(customer.credit_limit - customer.current_balance).toLocaleString('ar-SY')} ${body.currency || 'ل.س.ج'}`
            );
          }
        }
      }

      db.prepare(`
        INSERT INTO sales (id, invoice_number, customer_id, subtotal, discount_amount, tax_amount, total, paid_amount, change_amount, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId,
        invoice_number,
        body.customer_id || null,
        body.subtotal,
        body.discount_amount || 0,
        body.tax_amount || 0,
        body.total,
        body.paid_amount,
        body.change_amount || 0,
        body.payment_method,
        body.notes || null
      );

      for (const item of body.items) {
        const batch = db.prepare('SELECT quantity, status, expiry_date FROM batches WHERE id = ?').get(item.batch_id) as {
          quantity: number;
          status: string;
          expiry_date: string;
        };

        if (!batch || batch.status !== 'active') {
          throw new Error(`الدفعة غير متاحة للمنتج`);
        }
        if (new Date(batch.expiry_date) <= new Date()) {
          throw new Error(`الدفعة منتهية الصلاحية`);
        }
        if (batch.quantity < item.quantity) {
          throw new Error(`الكمية المتاحة ${batch.quantity} فقط`);
        }

        db.prepare(`
          INSERT INTO sale_items (id, sale_id, batch_id, product_id, quantity, unit_price, discount_amount, total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          saleId,
          item.batch_id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.discount_amount || 0,
          item.total
        );

        const newQty = batch.quantity - item.quantity;
        db.prepare('UPDATE batches SET quantity = ?, status = ? WHERE id = ?').run(
          newQty,
          newQty === 0 ? 'depleted' : 'active',
          item.batch_id
        );
      }

      if (body.customer_id && body.payment_method !== 'cash') {
        const creditAmount = body.payment_method === 'credit' ? body.total : (body.total - body.paid_amount);
        db.prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?').run(
          creditAmount,
          body.customer_id
        );
      }

      db.prepare("UPDATE settings SET value = ? WHERE key = 'invoice_counter'").run(String(counter));
    });

    insertSale();

    return NextResponse.json({ success: true, sale_id: saleId, invoice_number });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
