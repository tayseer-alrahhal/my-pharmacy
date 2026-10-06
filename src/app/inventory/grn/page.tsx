'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GRN, Supplier, Product } from '@/types';

export default function GRNPage() {
  const [showNewGRN, setShowNewGRN] = useState(false);
  const [activeGRN, setActiveGRN] = useState<GRN | null>(null);
  const [grnForm, setGrnForm] = useState({ supplier_id: '', supplier_invoice_number: '', received_date: new Date().toISOString().split('T')[0], notes: '' });
  const [itemForm, setItemForm] = useState({ product_id: '', batch_number: '', expiry_date: '', purchase_price: '', selling_price: '', quantity: '' });
  const [productSearch, setProductSearch] = useState('');
  const qc = useQueryClient();

  const { data: grns = [], isLoading } = useQuery<GRN[]>({ queryKey: ['grns'], queryFn: () => fetch('/api/grn').then(r => r.json()) });
  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ['suppliers'], queryFn: () => fetch('/api/suppliers').then(r => r.json()) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products-search', productSearch], queryFn: () => fetch(`/api/products?q=${productSearch}`).then(r => r.json()), enabled: productSearch.length > 1 });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';

  const createGRN = useMutation({
    mutationFn: (data: object) => fetch('/api/grn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: async (data) => {
      const detail = await fetch(`/api/grn/${data.id}`).then(r => r.json());
      setActiveGRN(detail);
      setShowNewGRN(false);
      qc.invalidateQueries({ queryKey: ['grns'] });
    },
  });

  const addItem = useMutation({
    mutationFn: ({ grnId, data }: { grnId: string; data: object }) =>
      fetch(`/api/grn/${grnId}?action=add-item`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: async () => {
      if (activeGRN) {
        const updated = await fetch(`/api/grn/${activeGRN.id}`).then(r => r.json());
        setActiveGRN(updated);
        setItemForm({ product_id: '', batch_number: '', expiry_date: '', purchase_price: '', selling_price: '', quantity: '' });
        setProductSearch('');
      }
    },
  });

  const confirmGRN = useMutation({
    mutationFn: (id: string) => fetch(`/api/grn/${id}?action=confirm`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grns'] }); setActiveGRN(null); },
  });

  const formatNum = (n: number) => n?.toLocaleString('ar-SY') || '0';
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ar-SY') : '—';

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">استقبال البضاعة</h1>
          <p className="text-body-md text-on-surface-variant">إنشاء وإدارة سندات استلام البضاعة</p>
        </div>
        <button onClick={() => setShowNewGRN(true)} className="bg-primary-container text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm hover:brightness-110 font-bold">
          <span className="material-symbols-outlined">add</span>
          سند استلام جديد
        </button>
      </div>

      <div className="flex gap-md border-b border-outline-variant">
        <a href="/inventory/products" className="px-lg py-md text-on-surface-variant hover:text-on-surface text-title-sm">كتالوج الأدوية</a>
        <a href="/inventory/batches" className="px-lg py-md text-on-surface-variant hover:text-on-surface text-title-sm">تتبع الدفعات</a>
        <button className="px-lg py-md text-primary-container border-b-2 border-primary-container font-bold text-title-sm">استقبال بضاعة</button>
        <a href="/inventory/adjustments" className="px-lg py-md text-on-surface-variant hover:text-on-surface text-title-sm">تعديلات المخزون</a>
      </div>

      {/* GRN List */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead className="bg-surface-container-highest/50">
            <tr>
              {['رقم السند', 'المورد', 'التاريخ', 'عدد الأصناف', 'الإجمالي', 'الحالة', 'إجراءات'].map(h => (
                <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : grns.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant">لا توجد سندات استلام</td></tr>
            ) : grns.map((g: GRN) => (
              <tr key={g.id} className="hover:bg-surface-container-high transition-colors">
                <td className="px-lg py-md font-bold text-primary-container">{g.grn_number}</td>
                <td className="px-lg py-md text-on-surface">{g.supplier_name || '—'}</td>
                <td className="px-lg py-md text-on-surface-variant">{formatDate(g.received_date)}</td>
                <td className="px-lg py-md text-on-surface">{(g as GRN & { items_count?: number }).items_count || 0} صنف</td>
                <td className="px-lg py-md font-bold text-primary-fixed-dim">{formatNum(g.total_amount)} {currency}</td>
                <td className="px-lg py-md">
                  <span className={`px-sm py-xs rounded text-label-caps border ${
                    g.status === 'confirmed' ? 'border-primary-container text-primary-container bg-primary-container/10' : 'border-outline-variant text-on-surface-variant'
                  }`}>
                    {g.status === 'confirmed' ? 'مؤكد' : 'مسودة'}
                  </span>
                </td>
                <td className="px-lg py-md">
                  {g.status === 'draft' && (
                    <button
                      onClick={async () => {
                        const detail = await fetch(`/api/grn/${g.id}`).then(r => r.json());
                        setActiveGRN(detail);
                      }}
                      className="px-sm py-xs text-xs border border-outline-variant rounded hover:border-primary-container text-on-surface-variant hover:text-primary-container"
                    >
                      تعديل
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New GRN Modal */}
      {showNewGRN && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-title-sm font-bold text-primary-container">سند استلام جديد</h2>
              <button onClick={() => setShowNewGRN(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">المورد</label>
                <select className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  value={grnForm.supplier_id} onChange={e => setGrnForm({ ...grnForm, supplier_id: e.target.value })}>
                  <option value="">اختر المورد</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">رقم فاتورة المورد</label>
                <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  value={grnForm.supplier_invoice_number} onChange={e => setGrnForm({ ...grnForm, supplier_invoice_number: e.target.value })} />
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">تاريخ الاستلام</label>
                <input type="date" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  value={grnForm.received_date} onChange={e => setGrnForm({ ...grnForm, received_date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-md mt-lg">
              <button onClick={() => setShowNewGRN(false)} className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">إلغاء</button>
              <button onClick={() => createGRN.mutate(grnForm)} className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold">إنشاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Active GRN Editor */}
      {activeGRN && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-lg">
              <div>
                <h2 className="text-title-sm font-bold text-primary-container">{activeGRN.grn_number}</h2>
                <p className="text-body-md text-on-surface-variant">{activeGRN.supplier_name} — {formatDate(activeGRN.received_date)}</p>
              </div>
              <button onClick={() => setActiveGRN(null)}><span className="material-symbols-outlined">close</span></button>
            </div>

            {/* Add Item Form */}
            {activeGRN.status === 'draft' && (
              <div className="bg-surface-container-high border border-outline-variant rounded-lg p-md mb-lg">
                <h3 className="text-label-caps text-on-surface-variant mb-md">إضافة صنف</h3>
                <div className="grid grid-cols-3 gap-md mb-md">
                  <div className="col-span-3">
                    <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                      placeholder="ابحث عن دواء..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    {products.length > 0 && productSearch && (
                      <div className="bg-surface-container-highest border border-outline-variant rounded-lg mt-xs max-h-40 overflow-y-auto">
                        {products.map((p: Product) => (
                          <button key={p.id} onClick={() => { setItemForm({ ...itemForm, product_id: p.id }); setProductSearch(p.name_ar); }}
                            className="w-full text-right px-md py-sm hover:bg-surface-variant text-on-surface text-body-md">
                            {p.name_ar}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-label-caps text-on-surface-variant mb-xs block">رقم الدفعة</label>
                    <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                      value={itemForm.batch_number} onChange={e => setItemForm({ ...itemForm, batch_number: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-label-caps text-on-surface-variant mb-xs block">تاريخ الانتهاء *</label>
                    <input type="date" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                      value={itemForm.expiry_date} onChange={e => setItemForm({ ...itemForm, expiry_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-label-caps text-on-surface-variant mb-xs block">الكمية *</label>
                    <input type="number" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                      value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-label-caps text-on-surface-variant mb-xs block">سعر الشراء *</label>
                    <input type="number" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                      value={itemForm.purchase_price} onChange={e => setItemForm({ ...itemForm, purchase_price: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-label-caps text-on-surface-variant mb-xs block">سعر البيع *</label>
                    <input type="number" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                      value={itemForm.selling_price} onChange={e => setItemForm({ ...itemForm, selling_price: e.target.value })} />
                  </div>
                </div>
                <button
                  onClick={() => itemForm.product_id && itemForm.expiry_date && addItem.mutate({ grnId: activeGRN.id, data: { ...itemForm, quantity: parseInt(itemForm.quantity), purchase_price: parseFloat(itemForm.purchase_price), selling_price: parseFloat(itemForm.selling_price) } })}
                  className="bg-primary-container text-on-primary px-lg py-sm rounded-lg font-bold hover:brightness-110"
                >
                  + إضافة
                </button>
              </div>
            )}

            {/* Items Table */}
            <table className="w-full text-right border-collapse mb-lg">
              <thead>
                <tr className="border-b border-outline-variant">
                  {['الدواء', 'رقم الدفعة', 'الانتهاء', 'الكمية', 'الشراء', 'البيع'].map(h => (
                    <th key={h} className="px-md py-sm text-label-caps text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activeGRN.items || []).map((item, idx) => (
                  <tr key={idx} className="border-b border-outline-variant hover:bg-surface-container-high">
                    <td className="px-md py-sm font-bold text-on-surface">{item.product_name}</td>
                    <td className="px-md py-sm text-on-surface-variant">{item.batch_number || '—'}</td>
                    <td className="px-md py-sm text-on-surface-variant">{formatDate(item.expiry_date)}</td>
                    <td className="px-md py-sm text-on-surface">{item.quantity}</td>
                    <td className="px-md py-sm text-on-surface-variant">{formatNum(item.purchase_price)}</td>
                    <td className="px-md py-sm text-primary-fixed-dim font-bold">{formatNum(item.selling_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center border-t border-outline-variant pt-md">
              <span className="text-title-sm font-bold">الإجمالي: <span className="text-primary-container">{formatNum(activeGRN.total_amount)} {currency}</span></span>
              {activeGRN.status === 'draft' && (activeGRN.items || []).length > 0 && (
                <button
                  onClick={() => confirm('تأكيد استلام البضاعة وتحديث المخزون؟') && confirmGRN.mutate(activeGRN.id)}
                  className="bg-primary-container text-on-primary px-xl py-md rounded-lg font-bold hover:brightness-110"
                >
                  ✓ اعتماد واستلام البضاعة
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
