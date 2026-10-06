'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Batch } from '@/types';

export default function BatchesPage() {
  const [filter, setFilter] = useState('active');
  const [expiring, setExpiring] = useState('');
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [adjForm, setAdjForm] = useState({ quantity_change: 0, reason: 'damage', notes: '' });
  const qc = useQueryClient();

  const { data: batches = [], isLoading } = useQuery<Batch[]>({
    queryKey: ['batches', filter, expiring],
    queryFn: () => {
      let url = `/api/batches?status=${filter}`;
      if (expiring) url += `&expiring_soon=${expiring}`;
      return fetch(url).then(r => r.json());
    },
  });

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';

  const adjMutation = useMutation({
    mutationFn: (data: object) => fetch('/api/stock-adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setShowAdjModal(false); },
  });

  const formatNum = (n: number) => n?.toLocaleString('ar-SY') || '0';
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ar-SY') : '—';

  const getDaysUntilExpiry = (expiry: string) => {
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">تتبع الدفعات</h1>
          <p className="text-body-md text-on-surface-variant">إدارة دفعات الأدوية وتواريخ الانتهاء</p>
        </div>
      </div>

      <div className="flex gap-md border-b border-outline-variant">
        <a href="/inventory/products" className="px-lg py-md text-on-surface-variant hover:text-on-surface transition-colors text-title-sm">كتالوج الأدوية</a>
        <button className="px-lg py-md text-primary-container border-b-2 border-primary-container font-bold text-title-sm">تتبع الدفعات</button>
        <a href="/inventory/grn" className="px-lg py-md text-on-surface-variant hover:text-on-surface transition-colors text-title-sm">استقبال بضاعة</a>
        <a href="/inventory/adjustments" className="px-lg py-md text-on-surface-variant hover:text-on-surface transition-colors text-title-sm">تعديلات المخزون</a>
      </div>

      <div className="flex gap-md items-center">
        {[
          { val: 'active', label: 'نشطة' },
          { val: 'expired', label: 'منتهية' },
          { val: 'depleted', label: 'مستنفذة' },
          { val: 'all', label: 'الكل' },
        ].map(f => (
          <button
            key={f.val}
            onClick={() => setFilter(f.val)}
            className={`px-md py-sm rounded-lg text-label-caps font-bold border transition-all ${
              filter === f.val ? 'bg-primary-container text-on-primary border-primary-container' : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="mr-auto flex items-center gap-sm">
          <span className="text-on-surface-variant text-body-md">تنتهي خلال:</span>
          <select
            className="bg-surface border border-outline-variant rounded-lg py-xs px-md text-on-surface outline-none"
            value={expiring}
            onChange={e => setExpiring(e.target.value)}
          >
            <option value="">كل الفترات</option>
            <option value="7">7 أيام</option>
            <option value="30">30 يوم</option>
            <option value="60">60 يوم</option>
            <option value="90">90 يوم</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead className="bg-surface-container-highest/50">
            <tr>
              {['الدواء', 'رقم الدفعة', 'تاريخ الانتهاء', 'الكمية', 'سعر الشراء', 'سعر البيع', 'الحالة', 'إجراءات'].map(h => (
                <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant">لا توجد دفعات</td></tr>
            ) : batches.map((b: Batch) => {
              const daysLeft = getDaysUntilExpiry(b.expiry_date);
              const isExpired = daysLeft <= 0;
              const isWarn = daysLeft > 0 && daysLeft <= 30;
              return (
                <tr key={b.id} className="hover:bg-surface-container-high transition-colors group">
                  <td className="px-lg py-md">
                    <p className="font-bold text-primary-container">{b.product_name}</p>
                  </td>
                  <td className="px-lg py-md text-on-surface-variant font-mono text-sm">{b.batch_number || '—'}</td>
                  <td className="px-lg py-md">
                    <span className={`font-bold ${isExpired ? 'text-error' : isWarn ? 'text-[#F59E0B]' : 'text-on-surface'}`}>
                      {formatDate(b.expiry_date)}
                    </span>
                    {isExpired && <span className="mr-xs text-xs text-error">(منتهي)</span>}
                    {isWarn && !isExpired && <span className="mr-xs text-xs text-[#F59E0B]">({daysLeft} يوم)</span>}
                  </td>
                  <td className="px-lg py-md">
                    <span className={`font-bold ${b.quantity === 0 ? 'text-error' : b.quantity <= 5 ? 'text-[#F59E0B]' : 'text-on-surface'}`}>
                      {b.quantity} {b.unit}
                    </span>
                  </td>
                  <td className="px-lg py-md text-on-surface-variant">{formatNum(b.purchase_price)}</td>
                  <td className="px-lg py-md text-primary-fixed-dim font-bold">{formatNum(b.selling_price)}</td>
                  <td className="px-lg py-md">
                    <span className={`px-sm py-xs rounded text-label-caps border ${
                      b.status === 'active' ? 'border-primary-container text-primary-container bg-primary-container/10' :
                      b.status === 'expired' ? 'border-error text-error bg-error/10' :
                      'border-outline-variant text-on-surface-variant'
                    }`}>
                      {b.status === 'active' ? 'نشط' : b.status === 'expired' ? 'منتهي' : 'مستنفذ'}
                    </span>
                  </td>
                  <td className="px-lg py-md">
                    <button
                      onClick={() => { setSelectedBatch(b); setAdjForm({ quantity_change: 0, reason: 'damage', notes: '' }); setShowAdjModal(true); }}
                      className="px-sm py-xs text-on-surface-variant border border-outline-variant rounded hover:text-primary-container hover:border-primary-container text-xs"
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdjModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-title-sm font-bold text-primary-container">تعديل مخزون</h2>
              <button onClick={() => setShowAdjModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <p className="text-body-md text-on-surface-variant mb-md">{selectedBatch.product_name} — الكمية الحالية: <strong>{selectedBatch.quantity}</strong></p>
            <div className="space-y-md">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">التغيير في الكمية (+ أو -)</label>
                <input
                  type="number"
                  className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  value={adjForm.quantity_change}
                  onChange={e => setAdjForm({ ...adjForm, quantity_change: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">السبب</label>
                <select
                  className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  value={adjForm.reason}
                  onChange={e => setAdjForm({ ...adjForm, reason: e.target.value })}
                >
                  <option value="damage">تلف</option>
                  <option value="theft">سرقة</option>
                  <option value="expired">انتهاء صلاحية</option>
                  <option value="count_error">خطأ في الجرد</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">ملاحظات</label>
                <textarea
                  className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                  rows={2}
                  value={adjForm.notes}
                  onChange={e => setAdjForm({ ...adjForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-md mt-lg">
              <button onClick={() => setShowAdjModal(false)} className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">إلغاء</button>
              <button
                onClick={() => adjMutation.mutate({ batch_id: selectedBatch.id, product_id: selectedBatch.product_id, ...adjForm })}
                className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
