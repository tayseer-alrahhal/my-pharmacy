import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const resourcesDir = path.join(process.cwd(), 'resources');
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

const DB_PATH = path.join(resourcesDir, 'pharmacy.db');

function initSchema(database: ReturnType<typeof Database>) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      parent_id TEXT REFERENCES categories(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      barcode TEXT UNIQUE,
      category_id TEXT REFERENCES categories(id),
      unit TEXT NOT NULL DEFAULT 'حبة',
      min_stock INTEGER NOT NULL DEFAULT 10,
      requires_prescription INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      payment_terms_days INTEGER DEFAULT 30,
      balance REAL DEFAULT 0,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grn (
      id TEXT PRIMARY KEY,
      grn_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT REFERENCES suppliers(id),
      supplier_invoice_number TEXT,
      received_date TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grn_items (
      id TEXT PRIMARY KEY,
      grn_id TEXT NOT NULL REFERENCES grn(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      batch_number TEXT,
      manufacture_date TEXT,
      expiry_date TEXT NOT NULL,
      purchase_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      grn_id TEXT REFERENCES grn(id),
      batch_number TEXT,
      manufacture_date TEXT,
      expiry_date TEXT NOT NULL,
      purchase_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES customers(id),
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      paid_amount REAL NOT NULL,
      change_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id),
      batch_id TEXT NOT NULL REFERENCES batches(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      return_number TEXT UNIQUE NOT NULL,
      original_sale_id TEXT NOT NULL REFERENCES sales(id),
      return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT NOT NULL,
      refund_method TEXT NOT NULL,
      total_amount REAL NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL REFERENCES returns(id),
      sale_item_id TEXT NOT NULL REFERENCES sale_items(id),
      batch_id TEXT NOT NULL REFERENCES batches(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      restock INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES batches(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity_change INTEGER NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT REFERENCES suppliers(id),
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME,
      received_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL REFERENCES purchase_orders(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity_ordered INTEGER NOT NULL,
      quantity_received INTEGER DEFAULT 0,
      unit_price REAL
    );

    CREATE TABLE IF NOT EXISTS day_closures (
      id TEXT PRIMARY KEY,
      closure_date TEXT UNIQUE NOT NULL,
      total_sales REAL NOT NULL,
      total_cash REAL NOT NULL,
      total_credit REAL NOT NULL,
      total_returns REAL NOT NULL,
      actual_cash REAL NOT NULL,
      cash_difference REAL NOT NULL,
      invoices_count INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const defaultSettings = [
    ['pharmacy_name', 'صيدلية الرحال'],
    ['pharmacy_phone', ''],
    ['pharmacy_address', ''],
    ['tax_rate', '0'],
    ['max_discount_percent', '20'],
    ['expiry_warning_days_1', '30'],
    ['expiry_warning_days_2', '60'],
    ['primary_currency', 'ل.س.ج'],
    ['secondary_currency', 'USD'],
    ['exchange_rate', '150'],
    ['backup_path', ''],
    ['receipt_footer', 'شكراً لزيارتكم'],
    ['invoice_counter', '0'],
    ['return_counter', '0'],
    ['grn_counter', '0'],
  ];

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_batches_product_id  ON batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_batches_status       ON batches(status);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id   ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product   ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date           ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_sales_customer       ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_returns_sale_id      ON returns(original_sale_id);
  `);

  const insertSetting = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }
}

function migrateToNewSyp(database: ReturnType<typeof Database>) {
  try {
    const row = database.prepare("SELECT MAX(selling_price) as max_sp FROM batches").get() as { max_sp: number } | undefined;
    if (row && row.max_sp && row.max_sp >= 1000) {
      console.log('🔄 Migrating database prices from old SYP to new SYP (dividing by 100)...');
      database.transaction(() => {
        database.exec(`
          UPDATE batches SET purchase_price = ROUND(purchase_price / 100, 2), selling_price = ROUND(selling_price / 100, 2);
          UPDATE grn_items SET purchase_price = ROUND(purchase_price / 100, 2), selling_price = ROUND(selling_price / 100, 2);
          UPDATE grn SET total_amount = ROUND(total_amount / 100, 2);
          UPDATE sale_items SET unit_price = ROUND(unit_price / 100, 2), discount_amount = ROUND(discount_amount / 100, 2), total = ROUND(total / 100, 2);
          UPDATE sales SET subtotal = ROUND(subtotal / 100, 2), discount_amount = ROUND(discount_amount / 100, 2), tax_amount = ROUND(tax_amount / 100, 2), total = ROUND(total / 100, 2), paid_amount = ROUND(paid_amount / 100, 2), change_amount = ROUND(change_amount / 100, 2);
          UPDATE returns SET total_amount = ROUND(total_amount / 100, 2);
          UPDATE return_items SET unit_price = ROUND(unit_price / 100, 2), total = ROUND(total / 100, 2);
          UPDATE purchase_order_items SET unit_price = ROUND(unit_price / 100, 2);
          UPDATE day_closures SET total_sales = ROUND(total_sales / 100, 2), total_cash = ROUND(total_cash / 100, 2), total_credit = ROUND(total_credit / 100, 2), total_returns = ROUND(total_returns / 100, 2), actual_cash = ROUND(actual_cash / 100, 2), cash_difference = ROUND(cash_difference / 100, 2);
          UPDATE customers SET credit_limit = ROUND(credit_limit / 100, 2), current_balance = ROUND(current_balance / 100, 2);
          UPDATE suppliers SET balance = ROUND(balance / 100, 2);
          INSERT OR REPLACE INTO settings (key, value) VALUES ('primary_currency', 'ل.س.ج');
        `);
      })();
      console.log('✅ Successfully migrated database prices to new Syrian pound!');
    }

    const curr = database.prepare("SELECT value FROM settings WHERE key = 'primary_currency'").get() as { value: string } | undefined;
    if (curr && curr.value === 'ل.س') {
      database.prepare("UPDATE settings SET value = 'ل.س.ج' WHERE key = 'primary_currency'").run();
    }
  } catch (err) {
    console.error('Error migrating to new SYP:', err);
  }
}

function createDb() {
  const database = new Database(DB_PATH);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  initSchema(database);
  migrateToNewSyp(database);
  return database;
}

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof Database> | undefined;
}

export const db = globalThis.__db ?? (globalThis.__db = createDb());
migrateToNewSyp(db);
