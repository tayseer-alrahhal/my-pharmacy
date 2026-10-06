'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Batch, Product } from '@/types';

export default function AdjustmentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [form, setForm] = useState({ batch_id: '', product_id: '', quantity_change: 0, reason: 'damage', notes: '' });
  const qc = useQueryClient();

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['adjustments'],
    queryFn: () => fetch('/api/stock-adjustments').then(r => r.json()),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-adj', productSearch],
    queryFn: () => fetch(`/api/products?q=${productSearch}`).then(r => r.json()),
    enabled: productSearch.length > 1,
  });

  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ['batches-adj', form.product_id],
    queryFn: () => fetch(`/api/batches?product_id=${form.product_id}&status=active`).then(r => r.json()),
    enabled: !!form.product_id,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => fetch('/api/stock-adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adjustments'] }); setShowModal(false); },
  });

  const reasonLabels: Record<string, string> = {
    damage: 'تلف', theft: 'سرقة', expired: 'انتهاء صلاحية', count_error: 'خطأ جرد', other: 'أخرى'
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleString('ar-SY') : '—';

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">تعديلات المخزون</h1>
          <p className="text-body-md text-on-surface-variant">سجل جميع تعديلات المخزون</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-container text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm hover:brightness-110 font-bold">
          <span className="material-symbols-outlined">add</span>
          تعديل جديد
        </button>
      </div>

      <div className="flex gap-md border-b border-outline-variant">
        <a href="/inventory/products" className="px-lg py-md text-on-surface-variant hover:text-on-surface text-title-sm">كتالوج الأدوية</a>
        <a href="/inventory/batches" className="px-lg py-md text-on-surface-variant hover:text-on-surface text-title-sm">تتبع الدفعات</a>
        <a href="/inventory/grn" className="px-lg py-md text-on-surface-variant hover:text-on-surface text-title-sm">استقبال بضاعة</a>
        <button className="px-lg py-md text-primary-container border-b-2 border-primary-container font-bold text-title-sm">تعديلات المخزون</button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead className="bg-surface-container-highest/50">
            <tr>
              {['الدواء', 'رقم الدفعة', 'التغيير', 'السبب', 'ملاحظات', 'التاريخ'].map(h => (
                <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : adjustments.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">لا توجد تعديلات</td></tr>
            ) : adjustments.map((a: { id: string; product_name: string; batch_number: string; quantity_change: number; reason: string; notes: string; created_at: string }) => (
              <tr key={a.id} className="hover:bg-surface-container-high transition-colors">
                <td className="px-lg py-md font-bold text-primary-container">{a.product_name}</td>
                <td className="px-lg py-md text-on-surface-variant font-mono text-sm">{a.batch_number || '—'}</td>
                <td className="px-lg py-md">
                  <span className={`font-bold text-title-sm ${a.quantity_change > 0 ? 'text-primary-container' : 'text-error'}`}>
                    {a.quantity_change > 0 ? '+' : ''}{a.quantity_change}
                  </span>
                </td>
                <td className="px-lg py-md">
                  <span className="bg-surface-container-highest text-on-surface-variant px-sm py-xs rounded text-xs">
                    {reasonLabels[a.reason] || a.reason}
                  </span>
                </td>
                <td className="px-lg py-md text-on-surface-variant text-sm">{a.notes || '—'}</td>
                <td className="px-lg py-md text-on-surface-variant text-sm">{formatDate(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-title-sm font-bold text-primary-container">تعديل مخزون جديد</h2>
              <button onClick={() => setShowModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">بحث عن دواء</label>
                <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  placeholder="اكتب اسم الدواء..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                {products.length > 0 && (
                  <div className="bg-surface-container-highest border border-outline-variant rounded-lg mt-xs max-h-40 overflow-y-auto">
                    {products.map((p: Product) => (
                      <button key={p.id} onClick={() => { setForm({ ...form, product_id: p.id, batch_id: '' }); setProductSearch(p.name_ar); }}
                        className="w-full text-right px-md py-sm hover:bg-surface-variant text-on-surface text-body-md">
                        {p.name_ar}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.product_id && batches.length > 0 && (
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">الدفعة</label>
                  <select className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                    value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })}>
                    <option value="">اختر الدفعة</option>
                    {batches.map((b: Batch) => (
                      <option key={b.id} value={b.id}>{b.batch_number || 'دفعة'} — الكمية: {b.quantity} — الانتهاء: {b.expiry_date}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">التغيير في الكمية</label>
                <input type="number" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  placeholder="موجب للإضافة، سالب للخصم" value={form.quantity_change || ''} onChange={e => setForm({ ...form, quantity_change: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">السبب</label>
                <select className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                  value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                  <option value="damage">تلف</option>
                  <option value="theft">سرقة</option>
                  <option value="expired">انتهاء صلاحية</option>
                  <option value="count_error">خطأ في الجرد</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">ملاحظات</label>
                <textarea className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none" rows={2}
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-md mt-lg">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">إلغاء</button>
              <button onClick={() => form.batch_id && form.product_id && mutation.mutate(form)} disabled={!form.batch_id}
                className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold disabled:opacity-50">
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
