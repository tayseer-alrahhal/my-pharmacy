export interface Category {
  id: string;
  name_ar: string;
  name_en?: string;
  parent_id?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name_ar: string;
  name_en?: string;
  barcode?: string;
  category_id?: string;
  category_name?: string;
  unit: string;
  min_stock: number;
  requires_prescription: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  total_quantity?: number;
  selling_price?: number;
  expiry_date?: string;
  batch_id?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms_days: number;
  balance: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface Batch {
  id: string;
  product_id: string;
  product_name?: string;
  unit?: string;
  grn_id?: string;
  batch_number?: string;
  manufacture_date?: string;
  expiry_date: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  status: 'active' | 'expired' | 'depleted';
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  credit_limit: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  batch_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total: number;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  payment_method: 'cash' | 'credit' | 'mixed';
  status: 'completed' | 'returned' | 'partial_return';
  notes?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface CartItem {
  product_id: string;
  batch_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  available_qty: number;
  expiry_date: string;
  discount_amount: number;
}

export interface GRN {
  id: string;
  grn_number: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_invoice_number?: string;
  received_date: string;
  total_amount: number;
  status: 'draft' | 'confirmed';
  notes?: string;
  created_at: string;
  items?: GRNItem[];
}

export interface GRNItem {
  id: string;
  grn_id: string;
  product_id: string;
  product_name?: string;
  batch_number?: string;
  manufacture_date?: string;
  expiry_date: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
}

export interface StockAdjustment {
  id: string;
  batch_id: string;
  product_id: string;
  product_name?: string;
  quantity_change: number;
  reason: string;
  notes?: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id?: string;
  supplier_name?: string;
  status: 'draft' | 'sent' | 'received' | 'cancelled';
  notes?: string;
  created_at: string;
  sent_at?: string;
  received_at?: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  product_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price?: number;
}

export interface Alert {
  type: 'expired' | 'expiring_soon' | 'low_stock' | 'out_of_stock';
  priority: 'urgent' | 'warning' | 'info';
  product_id: string;
  product_name: string;
  batch_id?: string;
  batch_number?: string;
  message: string;
  days_until_expiry?: number;
  current_quantity?: number;
  min_stock?: number;
  expiry_date?: string;
}

export interface Settings {
  pharmacy_name: string;
  pharmacy_phone: string;
  pharmacy_address: string;
  tax_rate: string;
  max_discount_percent: string;
  expiry_warning_days_1: string;
  expiry_warning_days_2: string;
  primary_currency: string;
  secondary_currency: string;
  exchange_rate: string;
  backup_path: string;
  receipt_footer: string;
  invoice_counter: string;
}

export interface DaySummary {
  total_sales: number;
  total_cash: number;
  total_credit: number;
  total_returns: number;
  invoices_count: number;
  date: string;
}

export interface Return {
  id: string;
  return_number: string;
  original_sale_id: string;
  invoice_number?: string;
  return_date: string;
  reason: string;
  refund_method: string;
  total_amount: number;
  notes?: string;
}
