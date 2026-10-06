const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const resourcesDir = path.join(__dirname, '..', 'resources');
const DB_PATH = path.join(resourcesDir, 'pharmacy.db');
const BACKUP_DIR = path.join(resourcesDir, 'backups');

// 1. Create backups directory if not exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 2. Backup the current database
const backupPath = path.join(BACKUP_DIR, `pharmacy_backup_before_reset_${Date.now()}.db`);
if (fs.existsSync(DB_PATH)) {
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✅ Database backup created successfully at:', backupPath);
} else {
  console.error('❌ Database file not found at:', DB_PATH);
  process.exit(1);
}

// 3. Connect to database and run reset transaction
const db = new Database(DB_PATH);

try {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF'); // Disable foreign keys to truncate tables cleanly

  db.transaction(() => {
    // Truncate transaction tables
    db.prepare('DELETE FROM sale_items').run();
    db.prepare('DELETE FROM sales').run();
    db.prepare('DELETE FROM return_items').run();
    db.prepare('DELETE FROM returns').run();
    db.prepare('DELETE FROM stock_adjustments').run();
    db.prepare('DELETE FROM purchase_order_items').run();
    db.prepare('DELETE FROM purchase_orders').run();
    db.prepare('DELETE FROM grn_items').run();
    db.prepare('DELETE FROM grn').run();
    db.prepare('DELETE FROM day_closures').run();

    // Reset customer and supplier balances
    db.prepare('UPDATE customers SET current_balance = 0').run();
    db.prepare('UPDATE suppliers SET balance = 0').run();

    // Reset settings counters
    db.prepare("UPDATE settings SET value = '0' WHERE key IN ('invoice_counter', 'return_counter', 'grn_counter')").run();

    // Reset batches: set quantities to 50 (or random between 30 and 80) and status to active
    const batches = db.prepare('SELECT id FROM batches').all();
    const updateBatch = db.prepare("UPDATE batches SET quantity = ?, status = 'active' WHERE id = ?");
    for (const batch of batches) {
      // Set to 50 for a consistent reset
      updateBatch.run(50, batch.id);
    }
  })();

  db.pragma('foreign_keys = ON');
  console.log('✅ Database reset successfully! All transactions cleared, stock quantities reset to 50, and counters reset to 0. Products, categories, and customers preserved.');
} catch (error) {
  console.error('❌ Failed to reset database:', error);
} finally {
  db.close();
}
