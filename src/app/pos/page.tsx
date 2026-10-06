'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/store/cart';
import { CartItem, Product, Customer } from '@/types';
import ReceiptModal from '@/components/pos/ReceiptModal';

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [cashInput, setCashInput] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [editingPrice, setEditingPrice] = useState<{ product_id: string; batch_id: string } | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [receiptData, setReceiptData] = useState<null | {
    invoice_number: string; customer_name: string | null; subtotal: number;
    discount_amount: number; tax_amount: number; total: number;
    paid_amount: number; change_amount: number; payment_method: string;
    items: { product_name: string; quantity: number; unit_price: number; total: number; unit: string }[];
  }>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef('');
  const lastKeyTime   = useRef(Date.now());
  const qc = useQueryClient();

  const {
    carts, activeCartId,
    createCart, switchCart, removeCart,
    addItem, updateQuantity, removeItem, updatePrice,
    setCustomer, setPaymentMethod, setGlobalDiscount,
    clearCart, getSubtotal, getDiscount, getTotal, getActiveCart
  } = useCartStore();

  const activeCart = getActiveCart();
  const { items, customer_id, customer_name, payment_method, global_discount, global_discount_type } = activeCart;

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/settings').then(r => r.json()),
  });

  const currency = settings?.primary_currency || 'ل.س.ج';
  const exchangeRateNew = parseFloat(settings?.syp_new_to_usd || settings?.exchange_rate || '150') || 150;

  // get the effective rate depending on currency
  const effectiveRate = currency === 'USD' ? 1 : exchangeRateNew;

  // Syrian pound denominations
  const SYP_DENOMS = [500, 200, 100, 50, 25, 10];

  // Convert amount to USD for display
  const toUSD = (amount: number) => {
    if (currency === 'USD') return null; // already USD
    return (amount / effectiveRate).toFixed(2);
  };

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products-search', searchQuery],
    queryFn: () => searchQuery.length > 0
      ? fetch(`/api/products?q=${encodeURIComponent(searchQuery)}`).then(r => r.json())
      : fetch('/api/products').then(r => r.json()),
    enabled: true,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers').then(r => r.json()),
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const saleMutation = useMutation({
    mutationFn: (data: object) =>
      fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data, variables) => {
      if (data.error) { showToast(data.error, 'error'); return; }
      const saleReq = variables as { items: { product_id: string; quantity: number; unit_price: number; total: number }[]; subtotal: number; discount_amount: number; tax_amount: number; total: number; paid_amount: number; change_amount: number; payment_method: string };
      setReceiptData({
        invoice_number: data.invoice_number,
        customer_name: customer_name,
        subtotal: saleReq.subtotal,
        discount_amount: saleReq.discount_amount,
        tax_amount: saleReq.tax_amount,
        total: saleReq.total,
        paid_amount: saleReq.paid_amount,
        change_amount: saleReq.change_amount,
        payment_method: saleReq.payment_method,
        items: items.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price, total: i.unit_price * i.quantity - i.discount_amount, unit: i.unit || '' })),
      });
      setLastInvoice(data.invoice_number);
      clearCart();
      setShowPayment(false);
      setCashInput('');
      qc.invalidateQueries({ queryKey: ['products-search'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: () => showToast('حدث خطأ أثناء تسجيل الفاتورة', 'error'),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); if (items.length > 0) setShowPayment(true); }
      if (e.key === 'Escape') { e.preventDefault(); setShowPayment(false); setShowCustomerSearch(false); setEditingPrice(null); setReceiptData(null); }
      if (e.key === 'F3') { e.preventDefault(); createCart(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, createCart]);

  const handleAddToCart = (product: Product) => {
    if (!product.batch_id || !product.selling_price) {
      showToast('لا يوجد مخزون متاح لهذا الدواء', 'error');
      return;
    }
    const item: CartItem = {
      product_id: product.id,
      batch_id: product.batch_id as string,
      product_name: product.name_ar,
      unit: product.unit,
      quantity: 1,
      unit_price: product.selling_price,
      available_qty: product.total_quantity || 0,
      expiry_date: product.expiry_date || '',
      discount_amount: 0,
    };
    addItem(item);
    showToast(`تمت إضافة ${product.name_ar}`, 'success');
  };

  const taxRate = parseFloat(settings?.tax_rate || '0') / 100;
  const taxAmount = Math.round((getSubtotal() - getDiscount()) * taxRate);
  const totalWithTax = getTotal() + taxAmount;

  const handleCompleteSale = () => {
    if (items.length === 0) return;
    const total = totalWithTax;
    const paidAmt = payment_method === 'credit' ? 0 : parseFloat(cashInput) || total;

    if (payment_method === 'cash' && paidAmt < total) {
      showToast('المبلغ المستلم أقل من الإجمالي', 'error');
      return;
    }
    if ((payment_method === 'credit' || payment_method === 'mixed') && !customer_id) {
      showToast('يجب اختيار عميل للدفع الآجل', 'error');
      return;
    }

    const saleData = {
      customer_id: customer_id || null,
      subtotal: getSubtotal(),
      discount_amount: getDiscount(),
      tax_amount: taxAmount,
      total,
      paid_amount: payment_method === 'credit' ? 0 : paidAmt,
      change_amount: payment_method === 'cash' ? Math.max(0, paidAmt - total) : 0,
      payment_method,
      items: items.map(i => ({
        product_id: i.product_id,
        batch_id: i.batch_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_amount: i.discount_amount,
        total: i.unit_price * i.quantity - i.discount_amount,
      })),
    };
    saleMutation.mutate(saleData);
  };

  const startEditPrice = (item: CartItem) => {
    setEditingPrice({ product_id: item.product_id, batch_id: item.batch_id });
    setPriceInput(String(item.unit_price));
  };

  const confirmEditPrice = (product_id: string, batch_id: string) => {
    const newPrice = parseFloat(priceInput);
    if (!isNaN(newPrice) && newPrice >= 0) {
      updatePrice(product_id, batch_id, newPrice);
    }
    setEditingPrice(null);
    setPriceInput('');
  };

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = totalWithTax;
  const change = payment_method === 'cash' ? Math.max(0, (parseFloat(cashInput) || 0) - total) : 0;
  const maxDiscount = parseFloat(settings?.max_discount_percent || '100');
  const formatNum = (n: number) => n.toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const cartLabel = (cartId: string) => {
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return '';
    return cart.customer_name || (carts.indexOf(cart) + 1 > 1 ? `سلة ${carts.indexOf(cart) + 1}` : 'سلة 1');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-lg py-sm rounded-lg border text-body-md font-bold shadow-lg ${
          toast.type === 'success' ? 'bg-surface-container border-primary-container text-primary-container' : 'bg-error-container border-error text-on-error-container'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-12 gap-0 flex-1 overflow-hidden">
        {/* Search + Products */}
        <section className="col-span-8 bg-background p-gutter flex flex-col h-full border-l border-outline-variant overflow-hidden">
          <div className="mb-gutter relative">
            <div className="absolute inset-y-0 right-0 pr-md flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
            </div>
            <input
              ref={searchRef}
              className="w-full bg-surface-container border border-outline-variant text-on-surface text-body-lg rounded-lg p-md pr-xl focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
              placeholder="بحث بالاسم أو الباركود... [F2]"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                barcodeBuffer.current = e.target.value;
                lastKeyTime.current = Date.now();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const timeDiff = Date.now() - lastKeyTime.current;
                  if (timeDiff < 150 && barcodeBuffer.current.length > 3) {
                    const match = (products as Product[]).find(p => p.barcode === barcodeBuffer.current);
                    if (match) { handleAddToCart(match); setSearchQuery(''); e.preventDefault(); }
                  }
                  barcodeBuffer.current = '';
                } else {
                  lastKeyTime.current = Date.now();
                }
              }}
              autoFocus
            />
            <div className="absolute inset-y-0 left-0 pl-md flex items-center">
              <span className="material-symbols-outlined text-primary-container">barcode_scanner</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {productsLoading ? (
              <div className="text-center py-xl text-on-surface-variant">جاري البحث...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-xl text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] block mb-sm">search_off</span>
                لا توجد نتائج
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-md">
                {products.map((product: Product) => {
                  const isOutOfStock = (product.total_quantity || 0) === 0;
                  const isLowStock = (product.total_quantity || 0) <= 5 && !isOutOfStock;
                  const isExpired = product.expiry_date && new Date(product.expiry_date) <= new Date();
                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && !isExpired && handleAddToCart(product)}
                      className={`bg-surface-container border p-md rounded-lg flex flex-col gap-sm transition-all cursor-pointer
                        ${isOutOfStock || isExpired ? 'opacity-50 cursor-not-allowed border-outline-variant' :
                          'border-outline-variant hover:border-primary-container'}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="text-title-sm font-bold text-on-surface leading-tight">{product.name_ar}</h3>
                        <div className="flex flex-col items-end mr-xs gap-[2px]">
                          <span className="bg-primary-container text-on-primary-fixed px-xs py-[2px] rounded text-[12px] font-bold whitespace-nowrap">
                            {formatNum(product.selling_price || 0)} {currency}
                          </span>
                          {currency !== 'USD' && (
                            <span className="text-[10px] text-on-surface-variant whitespace-nowrap">
                              $ {((product.selling_price || 0) / effectiveRate).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      {product.name_en && <p className="text-xs text-on-surface-variant">{product.name_en}</p>}
                      <div className="flex flex-col gap-xs text-on-surface-variant text-body-md mt-xs">
                        <div className="flex justify-between">
                          <span>المتاح:</span>
                          <span className={isOutOfStock ? 'text-error font-bold' : isLowStock ? 'text-[#F59E0B] font-bold' : 'text-on-surface'}>
                            {product.total_quantity || 0} {product.unit}
                          </span>
                        </div>
                        {product.expiry_date && (
                          <div className="flex justify-between">
                            <span>الانتهاء:</span>
                            <span className={isExpired ? 'text-error' : 'text-on-surface'}>
                              {new Date(product.expiry_date).toLocaleDateString('ar-SY', { year: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                      {isExpired && <div className="text-error text-label-caps text-center border border-error rounded py-xs">منتهي الصلاحية</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Cart */}
        <section className="col-span-4 bg-surface-container-low flex flex-col h-full overflow-hidden">
          {/* Cart Tabs */}
          <div className="bg-surface-container border-b border-outline-variant">
            <div className="flex items-center overflow-x-auto">
              {carts.map((cart, idx) => (
                <button
                  key={cart.id}
                  onClick={() => switchCart(cart.id)}
                  className={`flex items-center gap-xs px-md py-sm text-body-md font-bold border-b-2 whitespace-nowrap transition-all flex-shrink-0 group ${
                    activeCartId === cart.id
                      ? 'border-primary-container text-primary-container bg-surface-container-high'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    {cart.customer_name ? 'person' : 'shopping_cart'}
                  </span>
                  <span>{cart.customer_name || `سلة ${idx + 1}`}</span>
                  {cart.items.length > 0 && (
                    <span className="bg-primary-container text-on-primary text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {cart.items.length}
                    </span>
                  )}
                  {carts.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); removeCart(cart.id); }}
                      className="material-symbols-outlined opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all"
                      style={{ fontSize: '14px' }}
                    >
                      close
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={createCart}
                title="سلة جديدة [F3]"
                className="flex-shrink-0 px-md py-sm text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              </button>
            </div>
          </div>

          {/* Cart Header */}
          <div className="p-md bg-surface-container border-b border-outline-variant flex justify-between items-center">
            <h2 className="text-title-sm font-bold text-on-surface">
              {customer_name ? customer_name : 'سلة المشتريات'}
            </h2>
            <div className="flex items-center gap-sm">
              {customer_name ? (
                <button onClick={() => setCustomer(null, null)} className="text-xs bg-primary-container text-on-primary px-sm py-xs rounded flex items-center gap-xs">
                  {customer_name}
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                </button>
              ) : (
                <button onClick={() => setShowCustomerSearch(true)} className="text-xs bg-surface-variant px-sm py-xs rounded text-on-surface-variant hover:bg-surface-container-highest">
                  + عميل
                </button>
              )}
              {items.length > 0 && (
                <button onClick={clearCart} className="text-xs text-error hover:bg-error-container/20 px-sm py-xs rounded">
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-sm">
            {items.length === 0 ? (
              <div className="text-center py-xl text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] block mb-sm">shopping_cart</span>
                السلة فارغة
                <p className="text-xs mt-sm">انقر على دواء لإضافته أو اضغط F3 لسلة جديدة</p>
              </div>
            ) : (
              <div className="space-y-sm">
                {items.map(item => {
                  const isEditingThisPrice =
                    editingPrice?.product_id === item.product_id &&
                    editingPrice?.batch_id === item.batch_id;
                  return (
                    <div key={`${item.product_id}-${item.batch_id}`} className="bg-surface p-md border border-outline-variant rounded-lg flex flex-col gap-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface font-bold text-body-lg leading-tight">{item.product_name}</span>
                        <button onClick={() => removeItem(item.product_id, item.batch_id)} className="text-error hover:bg-error-container/20 p-xs rounded transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-sm bg-surface-container border border-outline-variant rounded">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.batch_id, item.quantity + 1)}
                            className="px-sm py-xs hover:bg-surface-variant text-primary-container"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                          </button>
                          <span className="px-md font-bold text-on-surface">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.batch_id, item.quantity - 1)}
                            className="px-sm py-xs hover:bg-surface-variant text-error"
                            disabled={item.quantity <= 1}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
                          </button>
                        </div>

                        {/* Price — editable */}
                        <div className="text-left flex items-center gap-xs">
                          {isEditingThisPrice ? (
                            <input
                              autoFocus
                              type="number"
                              min="0"
                              className="w-24 bg-surface border border-primary-container rounded px-sm py-xs text-on-surface text-sm font-bold outline-none text-left"
                              value={priceInput}
                              onChange={e => setPriceInput(e.target.value)}
                              onBlur={() => confirmEditPrice(item.product_id, item.batch_id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmEditPrice(item.product_id, item.batch_id);
                                if (e.key === 'Escape') { setEditingPrice(null); setPriceInput(''); }
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-xs">
                                <button
                                  onClick={() => startEditPrice(item)}
                                  title="تغيير السعر"
                                  className="text-on-surface-variant hover:text-primary-container transition-colors p-xs rounded hover:bg-surface-container"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                                </button>
                                <p className="text-on-surface font-bold">{formatNum(item.unit_price * item.quantity)} {currency}</p>
                              </div>
                              {currency !== 'USD' && (
                                <p className="text-[10px] text-on-surface-variant">$ {((item.unit_price * item.quantity) / effectiveRate).toFixed(2)}</p>
                              )}
                              <p className="text-xs text-on-surface-variant">{formatNum(item.unit_price)} × {item.quantity}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="p-gutter bg-surface-container border-t border-outline-variant space-y-md">
            <div className="space-y-sm">
              <div className="flex justify-between text-on-surface-variant text-body-md">
                <span>المجموع الفرعي</span>
                <div className="text-left">
                  <span>{formatNum(subtotal)} {currency}</span>
                  {currency !== 'USD' && <p className="text-[10px] text-on-surface-variant text-left">$ {(subtotal / effectiveRate).toFixed(2)}</p>}
                </div>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant text-body-md">
                <span>الخصم</span>
                <div className="flex items-center gap-xs">
                  <input
                    className="w-20 bg-surface border border-outline-variant text-left px-sm py-xs rounded text-on-surface text-sm outline-none focus:border-primary-container"
                    type="number"
                    min="0"
                    value={global_discount || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (global_discount_type === 'percent' && val > maxDiscount) {
                        showToast(`الحد الأقصى للخصم ${maxDiscount}%`, 'error');
                        return;
                      }
                      setGlobalDiscount(val, global_discount_type);
                    }}
                  />
                  <select
                    className="bg-surface border border-outline-variant text-on-surface-variant rounded px-xs py-xs text-xs outline-none"
                    value={global_discount_type}
                    onChange={e => setGlobalDiscount(global_discount, e.target.value as 'percent' | 'amount')}
                  >
                    <option value="percent">%</option>
                    <option value="amount">{currency}</option>
                  </select>
                </div>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-error text-body-md">
                  <span>قيمة الخصم</span>
                  <div className="text-left">
                    <span>- {formatNum(discount)} {currency}</span>
                    {currency !== 'USD' && <p className="text-[10px] text-error/70 text-left">$ {(discount / effectiveRate).toFixed(2)}</p>}
                  </div>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-on-surface-variant text-body-md">
                  <span>ضريبة ({(taxRate * 100).toFixed(0)}%)</span>
                  <span>+ {formatNum(taxAmount)} {currency}</span>
                </div>
              )}
              <div className="pt-sm border-t border-outline-variant flex justify-between items-end">
                <span className="text-on-surface font-bold text-title-sm">الإجمالي</span>
                <div className="text-left">
                  <span className="text-display font-display text-primary-container">{formatNum(total)}</span>
                  <p className="text-xs text-on-surface-variant font-normal text-left">{currency}</p>
                  {currency !== 'USD' && (
                    <p className="text-sm font-bold text-on-surface-variant text-left">$ {(total / effectiveRate).toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-sm">
              {(['cash', 'credit', 'mixed'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex flex-col items-center justify-center gap-xs py-md rounded transition-all active:scale-95 border ${
                    payment_method === method
                      ? 'bg-primary-container text-on-primary border-primary-container'
                      : 'bg-surface-variant hover:bg-surface-container-highest border-outline-variant text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {method === 'cash' ? 'payments' : method === 'credit' ? 'credit_card' : 'account_balance_wallet'}
                  </span>
                  <span className="text-[12px] font-bold">
                    {method === 'cash' ? 'نقداً' : method === 'credit' ? 'دين' : 'مختلط'}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => items.length > 0 && setShowPayment(true)}
              disabled={items.length === 0 || saleMutation.isPending}
              className="w-full bg-primary-container hover:brightness-110 active:scale-[0.98] transition-all text-on-primary-fixed py-lg rounded-lg flex items-center justify-center gap-md font-bold text-title-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>إتمام البيع</span>
              <span className="bg-on-primary-fixed/10 px-sm py-xs rounded text-[11px]">F4</span>
            </button>
          </div>
        </section>
      </div>

      {/* Keyboard shortcuts bar */}
      <div className="bg-surface-container-lowest border-t border-outline-variant px-margin py-xs flex justify-between items-center text-on-surface-variant text-shortcut-hint z-10">
        <div className="flex gap-lg">
          <span>[F2] بحث</span>
          <span>[F3] سلة جديدة</span>
          <span>[F4] إتمام البيع</span>
          <span>[F8] إعادة طباعة</span>
          <span>[Esc] إلغاء</span>
        </div>
        {lastInvoice && <span className="text-primary-container">آخر فاتورة: {lastInvoice}</span>}
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-headline-md font-bold text-primary-container">تأكيد الدفع</h2>
              <button onClick={() => setShowPayment(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-md mb-lg">
              {/* Total display with dual currency */}
              <div className="bg-primary-container/10 border border-primary-container rounded-xl p-md">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant text-body-md">الإجمالي النهائي</span>
                  <div className="text-left">
                    <p className="font-bold text-primary-container text-title-md">{formatNum(total)} {currency}</p>
                    {currency !== 'USD' && toUSD(total) && (
                      <p className="text-xs text-on-surface-variant text-left">≈ {toUSD(total)} $</p>
                    )}
                  </div>
                </div>
              </div>

              {payment_method !== 'credit' && (
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-sm block">المبلغ المستلم</label>
                  <input
                    className="w-full bg-surface border border-outline-variant rounded-lg p-md text-on-surface text-title-sm font-bold text-left outline-none focus:border-primary-container"
                    type="number"
                    min={total}
                    placeholder={String(total)}
                    value={cashInput}
                    onChange={e => setCashInput(e.target.value)}
                    autoFocus
                  />

                  {/* Syrian Pound Denomination Buttons - show only for ل.س.ج */}
                  {currency === 'ل.س.ج' && (
                    <div className="mt-sm">
                      <p className="text-[10px] text-on-surface-variant mb-xs">فئات الليرة السورية — اضغط للإضافة:</p>
                      <div className="grid grid-cols-6 gap-xs">
                        {SYP_DENOMS.map(denom => (
                          <button
                            key={denom}
                            type="button"
                            onClick={() => setCashInput(prev => {
                              const current = parseFloat(prev) || 0;
                              return String(current + denom);
                            })}
                            className="bg-surface-container-high border border-outline-variant hover:border-primary-container hover:bg-primary-container/10 text-on-surface font-bold py-sm px-xs rounded-lg text-xs transition-all active:scale-95"
                          >
                            {denom}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-xs mt-xs">
                        <button
                          type="button"
                          onClick={() => setCashInput(String(total))}
                          className="bg-primary-container/20 border border-primary-container/40 hover:bg-primary-container/30 text-primary-container font-bold py-xs px-sm rounded text-xs transition-all col-span-2"
                        >
                          المبلغ بالضبط ({formatNum(total)} {currency})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashInput('')}
                          className="bg-error/10 border border-error/30 hover:bg-error/20 text-error font-bold py-xs px-sm rounded text-xs transition-all"
                        >
                          مسح
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {payment_method === 'cash' && cashInput && parseFloat(cashInput) >= total && (
                <div className="bg-primary-container/10 border border-primary-container rounded-lg p-md">
                  <div className="flex justify-between text-title-sm">
                    <span>الباقي:</span>
                    <div className="text-left">
                      <span className="font-bold text-primary-container">{formatNum(change)} {currency}</span>
                      {currency !== 'USD' && change > 0 && (
                        <p className="text-xs text-on-surface-variant">≈ {toUSD(change)} $</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {payment_method === 'credit' && (
                <div className="bg-error-container/20 border border-error rounded-lg p-md">
                  <p className="text-body-md text-on-error-container">سيُضاف للعميل: <strong>{customer_name || 'غير محدد'}</strong></p>
                </div>
              )}

              {payment_method === 'mixed' && cashInput && (
                <div className="bg-surface-container-high p-md rounded-lg">
                  <div className="flex justify-between text-body-md">
                    <span className="text-on-surface-variant">نقد:</span>
                    <span>{formatNum(parseFloat(cashInput) || 0)} {currency}</span>
                  </div>
                  <div className="flex justify-between text-body-md">
                    <span className="text-on-surface-variant">دين:</span>
                    <span className="text-error">{formatNum(Math.max(0, total - (parseFloat(cashInput) || 0)))} {currency}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-md">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold hover:bg-surface-variant"
              >
                إلغاء
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={saleMutation.isPending}
                className="flex-2 bg-primary-container text-on-primary py-md px-xl rounded-lg font-bold hover:brightness-110 disabled:opacity-50"
              >
                {saleMutation.isPending ? 'جاري الحفظ...' : 'تأكيد البيع ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          data={receiptData}
          pharmacyName={settings?.pharmacy_name || 'الصيدلية'}
          pharmacyPhone={settings?.pharmacy_phone}
          pharmacyAddress={settings?.pharmacy_address}
          currency={currency}
          footer={settings?.receipt_footer}
          onClose={() => setReceiptData(null)}
          onNewSale={() => { setReceiptData(null); searchRef.current?.focus(); }}
        />
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-md">
              <h2 className="text-title-sm font-bold">اختيار عميل</h2>
              <button onClick={() => setShowCustomerSearch(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <input
              autoFocus
              className="w-full bg-surface border border-outline-variant rounded-lg p-md mb-md text-on-surface outline-none focus:border-primary-container"
              placeholder="ابحث بالاسم أو الهاتف..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-sm">
              {filteredCustomers.map((c: Customer) => (
                <button
                  key={c.id}
                  onClick={() => { setCustomer(c.id, c.name); setShowCustomerSearch(false); setCustomerSearch(''); }}
                  className="w-full text-right p-md bg-surface-container-high border border-outline-variant rounded-lg hover:border-primary-container transition-all"
                >
                  <p className="font-bold text-on-surface">{c.name}</p>
                  {c.phone && <p className="text-xs text-on-surface-variant">{c.phone}</p>}
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <p className="text-center text-on-surface-variant py-lg">لا توجد نتائج</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
