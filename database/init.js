const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const resourcesDir = path.join(__dirname, '..', 'resources');
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

const DB_PATH = path.join(resourcesDir, 'pharmacy.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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

const settingsRows = db.prepare('SELECT key FROM settings').all();
const settingsKeys = settingsRows.map(r => r.key);

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
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of defaultSettings) {
  insertSetting.run(key, value);
}

const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get();
if (catCount.c === 0) {
  const cats = [
    [uuidv4(), 'مضادات حيوية', 'Antibiotics'],
    [uuidv4(), 'مسكنات', 'Analgesics'],
    [uuidv4(), 'أدوية القلب والضغط', 'Cardiovascular'],
    [uuidv4(), 'فيتامينات ومكملات', 'Vitamins & Supplements'],
    [uuidv4(), 'أدوية السكري', 'Diabetes'],
    [uuidv4(), 'أدوية الجهاز التنفسي', 'Respiratory'],
    [uuidv4(), 'مستحضرات جلدية', 'Dermatology'],
    [uuidv4(), 'أدوية الجهاز الهضمي', 'Gastrointestinal'],
    [uuidv4(), 'أدوية العيون والأذن', 'Ophthalmology & ENT'],
    [uuidv4(), 'مستلزمات طبية', 'Medical Supplies'],
  ];
  const insertCat = db.prepare('INSERT INTO categories (id, name_ar, name_en) VALUES (?, ?, ?)');
  for (const c of cats) insertCat.run(...c);
}

const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (prodCount.c === 0) {
  const cats = db.prepare('SELECT id, name_ar FROM categories').all();
  const getCat = (name) => cats.find(c => c.name_ar === name)?.id || cats[0].id;

  const products = [
    [uuidv4(), 'بانادول إكسترا', 'Panadol Extra', '6281234567890', getCat('مسكنات'), 'علبة', 20],
    [uuidv4(), 'أوجمنتين 1 غرام', 'Augmentin 1g', '6289876543210', getCat('مضادات حيوية'), 'علبة', 10],
    [uuidv4(), 'فولتارين جل', 'Voltaren Gel', '6285554443332', getCat('مسكنات'), 'أنبوب', 15],
    [uuidv4(), 'كونجستال شراب', 'Congestal Syrup', '6281111222333', getCat('أدوية الجهاز التنفسي'), 'زجاجة', 10],
    [uuidv4(), 'فيتامين سي 1000', 'Vitamin C 1000', '6284444555666', getCat('فيتامينات ومكملات'), 'علبة', 20],
    [uuidv4(), 'أدويل 400 ملغ', 'Advil 400mg', '6287777888999', getCat('مسكنات'), 'علبة', 15],
    [uuidv4(), 'أموكسيسيلين 500', 'Amoxicillin 500', '6283333444555', getCat('مضادات حيوية'), 'علبة', 10],
    [uuidv4(), 'أومبيرازول 20', 'Omeprazole 20', '6286666777888', getCat('أدوية الجهاز الهضمي'), 'علبة', 10],
  ];

  const insertProd = db.prepare(
    'INSERT INTO products (id, name_ar, name_en, barcode, category_id, unit, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const insertBatch = db.prepare(
    'INSERT INTO batches (id, product_id, batch_number, expiry_date, purchase_price, selling_price, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  for (const p of products) {
    insertProd.run(...p);
    const qty = Math.floor(Math.random() * 100) + 10;
    const prices = { 
      'بانادول إكسترا': [30, 50],
      'أوجمنتين 1 غرام': [200, 300],
      'فولتارين جل': [80, 120],
      'كونجستال شراب': [60, 90],
      'فيتامين سي 1000': [70, 110],
      'أدويل 400 ملغ': [50, 80],
      'أموكسيسيلين 500': [150, 220],
      'أومبيرازول 20': [100, 150],
    };
    const [pp, sp] = prices[p[1]] || [50, 80];
    insertBatch.run(uuidv4(), p[0], 'BATCH-001', '2026-12-31', pp, sp, qty, 'active');
  }
}

const suppCount = db.prepare('SELECT COUNT(*) as c FROM suppliers').get();
if (suppCount.c === 0) {
  const suppliers = [
    [uuidv4(), 'شركة الدواء العربية', '0912345678', '', 'دمشق'],
    [uuidv4(), 'مستودعات الشفاء', '0923456789', '', 'حلب'],
    [uuidv4(), 'شركة الأمل للأدوية', '0934567890', '', 'اللاذقية'],
  ];
  const insertSupp = db.prepare('INSERT INTO suppliers (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)');
  for (const s of suppliers) insertSupp.run(...s);
}

console.log('✅ Database initialized successfully at:', DB_PATH);
db.close();
