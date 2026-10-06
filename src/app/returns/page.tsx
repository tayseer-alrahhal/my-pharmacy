'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type SaleItem = { id: string; product_name: string; quantity: number; unit_price: number; total: number; batch_id: string; unit: string };
type SaleDetail = { id: string; invoice_number: string; customer_id: string | null; customer_name: string | null; total: number; items: SaleItem[] };
type ReturnRecord = { id: string; return_number: string; original_sale_id: string; invoice_number: string; return_date: string; reason: string; refund_method: string; total_amount: number };

const reasonOptions = ['تالف', 'خطأ في الصرف', 'غير مرغوب فيه', 'منتهي الصلاحية', 'سبب آخر'];
const refundOptions = [{ value: 'cash', label: 'نقداً' }, { value: 'credit_note', label: 'رصيد للعميل' }];

export default function ReturnsPage() {
  const [showModal, setShowModal]         = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [foundSale, setFoundSale]         = useState<SaleDetail | null>(null);
  const [searching, setSearching]         = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [reason, setReason]               = useState(reasonOptions[0]);
  const [refundMethod, setRefundMethod]   = useState('cash');
  const [toast, setToast]                 = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const qc = useQueryClient();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';

  const { data: returns = [], isLoading } = useQuery<ReturnRecord[]>({
    queryKey: ['returns'],
    queryFn: () => fetch('/api/returns').then(r => r.json()),
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const searchInvoice = async () => {
    if (!invoiceSearch.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(invoiceSearch.trim())}`);
      const data = await res.json();
      if (data.error) { showToast('لم يتم العثور على الفاتورة', 'error'); setFoundSale(null); }
      else { setFoundSale(data); setSelectedItems({}); }
    } finally { setSearching(false); }
  };

  const returnMutation = useMutation({
    mutationFn: (data: object) =>
      fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast(`تم إنشاء المرتجع ${data.return_number}`, 'success');
      qc.invalidateQueries({ queryKey: ['returns'] });
      setShowModal(false);
      setFoundSale(null);
      setInvoiceSearch('');
      setSelectedItems({});
    },
    onError: () => showToast('حدث خطأ', 'error'),
  });

  const submitReturn = () => {
    if (!foundSale) return;
    const items = foundSale.items
      .filter(i => (selectedItems[i.id] || 0) > 0)
      .map(i => ({
        sale_item_id: i.id,
        batch_id: i.batch_id,
        quantity: selectedItems[i.id],
        unit_price: i.unit_price,
        total: i.unit_price * selectedItems[i.id],
        restock: true,
      }));
    if (items.length === 0) { showToast('اختر صنفاً واحداً على الأقل', 'error'); return; }
    const totalAmount = items.reduce((s, i) => s + i.total, 0);
    returnMutation.mutate({
      sale_id: foundSale.id,
      customer_id: foundSale.customer_id,
      reason,
      refund_method: refundMethod,
      total_amount: totalAmount,
      items,
    });
  };

  const formatNum = (n: number) => (n || 0).toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="p-margin flex flex-col gap-lg">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-lg py-sm rounded-lg border font-bold shadow-lg ${
          toast.type === 'success' ? 'bg-surface-container border-primary-container text-primary-container' : 'bg-error-container border-error text-on-error-container'
        }`}>{toast.msg}</div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">المرتجعات</h1>
          <p className="text-body-md text-on-surface-variant">إدارة مرتجعات المبيعات</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-primary-container text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm hover:brightness-110 font-bold">
          <span className="material-symbols-outlined">assignment_return</span>
          مرتجع جديد
        </button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant">
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">رقم المرتجع</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">الفاتورة الأصلية</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">التاريخ</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">السبب</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">طريقة الرد</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">المبلغ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : returns.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] block mb-sm">assignment_return</span>
                لا توجد مرتجعات
              </td></tr>
            ) : returns.map(r => (
              <tr key={r.id} className="hover:bg-surface-container-high">
                <td className="px-lg py-md font-bold text-error">{r.return_number}</td>
                <td className="px-lg py-md text-primary-container">{r.invoice_number}</td>
                <td className="px-lg py-md text-on-surface-variant">{formatDate(r.return_date)}</td>
                <td className="px-lg py-md text-on-surface">{r.reason}</td>
                <td className="px-lg py-md text-on-surface-variant">{r.refund_method === 'cash' ? 'نقداً' : 'رصيد للعميل'}</td>
                <td className="px-lg py-md font-bold text-error">{formatNum(r.total_amount)} {currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-md">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-headline-md font-bold text-primary-container">إنشاء مرتجع جديد</h2>
              <button onClick={() => { setShowModal(false); setFoundSale(null); setInvoiceSearch(''); }}
                className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex gap-md mb-lg">
              <input
                className="flex-1 bg-surface border border-outline-variant rounded-lg p-md text-on-surface outline-none focus:border-primary-container"
                placeholder="رقم الفاتورة (مثال: INV-2026-0001)"
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchInvoice()}
              />
              <button onClick={searchInvoice} disabled={searching}
                className="bg-primary-container text-on-primary px-lg py-md rounded-lg font-bold hover:brightness-110 disabled:opacity-50">
                {searching ? 'جاري البحث...' : 'بحث'}
              </button>
            </div>

            {foundSale && (
              <div className="space-y-lg">
                <div className="bg-surface-container-high border border-outline-variant rounded-lg p-md">
                  <p className="font-bold text-primary-container text-title-sm">{foundSale.invoice_number}</p>
                  {foundSale.customer_name && <p className="text-on-surface-variant text-body-md">العميل: {foundSale.customer_name}</p>}
                  <p className="text-on-surface-variant text-body-md">الإجمالي: {formatNum(foundSale.total)} {currency}</p>
                </div>

                <div>
                  <p className="text-label-caps text-on-surface-variant mb-sm">اختر الأصناف المرتجعة</p>
                  <div className="space-y-sm">
                    {foundSale.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-surface border border-outline-variant rounded-lg p-md gap-md">
                        <div className="flex-1">
                          <p className="font-bold text-on-surface">{item.product_name}</p>
                          <p className="text-xs text-on-surface-variant">{formatNum(item.unit_price)} {currency} × {item.quantity} {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-sm">
                          <label className="text-on-surface-variant text-body-md">الكمية:</label>
                          <input
                            type="number" min="0" max={item.quantity}
                            value={selectedItems[item.id] || ''}
                            onChange={e => {
                              const val = Math.min(parseInt(e.target.value) || 0, item.quantity);
                              setSelectedItems(prev => ({ ...prev, [item.id]: val }));
                            }}
                            className="w-20 bg-surface-container border border-outline-variant rounded px-sm py-xs text-on-surface text-sm outline-none focus:border-primary-container text-left"
                          />
                          <span className="text-on-surface-variant text-xs">/ {item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="text-label-caps text-on-surface-variant mb-sm block">سبب الإرجاع</label>
                    <select value={reason} onChange={e => setReason(e.target.value)}
                      className="w-full bg-surface border border-outline-variant text-on-surface rounded-lg p-md outline-none focus:border-primary-container">
                      {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-label-caps text-on-surface-variant mb-sm block">طريقة الرد</label>
                    <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)}
                      className="w-full bg-surface border border-outline-variant text-on-surface rounded-lg p-md outline-none focus:border-primary-container">
                      {refundOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-primary-container/10 border border-primary-container rounded-lg p-md">
                  <p className="font-bold text-primary-container text-title-sm">
                    إجمالي المرتجع: {formatNum(
                      foundSale.items.filter(i => (selectedItems[i.id] || 0) > 0)
                        .reduce((s, i) => s + i.unit_price * (selectedItems[i.id] || 0), 0)
                    )} {currency}
                  </p>
                </div>

                <div className="flex gap-md">
                  <button onClick={() => { setShowModal(false); setFoundSale(null); }}
                    className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">
                    إلغاء
                  </button>
                  <button onClick={submitReturn} disabled={returnMutation.isPending}
                    className="flex-1 bg-error text-on-error py-md rounded-lg font-bold hover:brightness-110 disabled:opacity-50">
                    {returnMutation.isPending ? 'جاري الحفظ...' : 'تأكيد الإرجاع'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
