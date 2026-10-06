'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type DayClosure = { id: string; closure_date: string; total_sales: number; total_cash: number; total_credit: number; total_returns: number; actual_cash: number; cash_difference: number; invoices_count: number; notes: string | null };

export default function DayClosuresPage() {
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes]           = useState('');
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const qc = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';

  const { data: closures = [] } = useQuery<DayClosure[]>({
    queryKey: ['day-closures'],
    queryFn: () => fetch('/api/day-closures').then(r => r.json()),
  });

  const { data: todaySales } = useQuery({
    queryKey: ['sales-today'],
    queryFn: () => fetch(`/api/sales?date=${today}&limit=500`).then(r => r.json()),
  });

  const { data: todayReturns } = useQuery({
    queryKey: ['returns-today'],
    queryFn: () => fetch('/api/returns').then(r => r.json()),
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sales = Array.isArray(todaySales) ? todaySales as Record<string, unknown>[] : [];
  const returns = Array.isArray(todayReturns)
    ? (todayReturns as Record<string, unknown>[]).filter(r => (r.return_date as string)?.startsWith(today))
    : [];

  const totalSales   = sales.reduce((s, r) => s + ((r.total as number) || 0), 0);
  const totalCash    = sales.filter(r => r.payment_method === 'cash').reduce((s, r) => s + ((r.paid_amount as number) || 0), 0);
  const totalCredit  = sales.filter(r => r.payment_method === 'credit').reduce((s, r) => s + ((r.total as number) || 0), 0);
  const totalReturns = returns.reduce((s, r) => s + ((r.total_amount as number) || 0), 0);
  const actualCashNum = parseFloat(actualCash) || 0;
  const difference    = actualCashNum - (totalCash - totalReturns);
  const alreadyClosed = closures.some(c => c.closure_date === today);

  const closeMutation = useMutation({
    mutationFn: (data: object) =>
      fetch('/api/day-closures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast('تم إغلاق اليوم بنجاح', 'success');
      qc.invalidateQueries({ queryKey: ['day-closures'] });
      setActualCash('');
      setNotes('');
    },
    onError: () => showToast('حدث خطأ', 'error'),
  });

  const handleClose = () => {
    if (!actualCash) { showToast('أدخل المبلغ الفعلي في الصندوق', 'error'); return; }
    closeMutation.mutate({
      closure_date: today,
      total_sales: totalSales,
      total_cash: totalCash,
      total_credit: totalCredit,
      total_returns: totalReturns,
      actual_cash: actualCashNum,
      cash_difference: difference,
      invoices_count: sales.length,
      notes: notes || null,
    });
  };

  const formatNum  = (n: number) => (n || 0).toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('ar-SY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-margin flex flex-col gap-lg">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-lg py-sm rounded-lg border font-bold shadow-lg ${
          toast.type === 'success' ? 'bg-surface-container border-primary-container text-primary-container' : 'bg-error-container border-error text-on-error-container'
        }`}>{toast.msg}</div>
      )}

      <div>
        <h1 className="text-display font-display text-primary-container">إغلاق اليوم</h1>
        <p className="text-body-md text-on-surface-variant">مطابقة الصندوق اليومي</p>
      </div>

      <div className="grid grid-cols-2 gap-gutter">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <h2 className="text-title-md font-bold text-on-surface border-b border-outline-variant pb-md">
            ملخص اليوم — {formatDate(today)}
          </h2>

          <div className="space-y-sm">
            {[
              { label: 'إجمالي المبيعات', value: totalSales, cls: 'text-primary-container', icon: 'payments' },
              { label: `المبيعات النقدية (${sales.filter(r => r.payment_method === 'cash').length} فاتورة)`, value: totalCash, cls: 'text-primary-container', icon: 'money' },
              { label: `المبيعات الآجلة (${sales.filter(r => r.payment_method === 'credit').length} فاتورة)`, value: totalCredit, cls: 'text-[#F59E0B]', icon: 'credit_score' },
              { label: `المرتجعات (${returns.length} مرتجع)`, value: totalReturns, cls: 'text-error', icon: 'assignment_return', neg: true },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-sm border-b border-outline-variant/50">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>{row.icon}</span>
                  <span className="text-on-surface-variant text-body-md">{row.label}</span>
                </div>
                <span className={`font-bold ${row.cls}`}>
                  {row.neg ? '- ' : ''}{formatNum(row.value)} {currency}
                </span>
              </div>
            ))}

            <div className="flex justify-between items-center pt-sm">
              <span className="font-bold text-on-surface text-title-sm">المتوقع في الصندوق</span>
              <span className="font-bold text-primary-container text-title-md">
                {formatNum(totalCash - totalReturns)} {currency}
              </span>
            </div>
          </div>

          {!alreadyClosed && (
            <div className="pt-md border-t border-outline-variant space-y-md">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-sm block">المبلغ الفعلي في الصندوق</label>
                <input
                  type="number" min="0"
                  value={actualCash}
                  onChange={e => setActualCash(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-md text-on-surface text-title-sm font-bold outline-none focus:border-primary-container text-left"
                  placeholder="0"
                />
              </div>

              {actualCash && (
                <div className={`rounded-lg p-md ${difference >= 0 ? 'bg-primary-container/10 border border-primary-container' : 'bg-error-container/20 border border-error'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-on-surface">الفارق:</span>
                    <span className={`font-bold text-title-md ${difference >= 0 ? 'text-primary-container' : 'text-error'}`}>
                      {difference >= 0 ? '+' : ''}{formatNum(difference)} {currency}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-xs">
                    {difference > 0 ? 'زيادة في الصندوق' : difference < 0 ? 'نقص في الصندوق' : 'الصندوق متطابق تماماً ✓'}
                  </p>
                </div>
              )}

              <div>
                <label className="text-label-caps text-on-surface-variant mb-sm block">ملاحظات (اختياري)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-md text-on-surface outline-none focus:border-primary-container resize-none"
                  rows={2} placeholder="أي ملاحظات إضافية..." />
              </div>

              <button onClick={handleClose} disabled={closeMutation.isPending}
                className="w-full bg-primary-container text-on-primary py-md rounded-lg font-bold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-sm">
                <span className="material-symbols-outlined">event_available</span>
                {closeMutation.isPending ? 'جاري الحفظ...' : 'تأكيد إغلاق اليوم'}
              </button>
            </div>
          )}

          {alreadyClosed && (
            <div className="bg-primary-container/10 border border-primary-container rounded-lg p-md text-center">
              <span className="material-symbols-outlined text-primary-container text-[48px] block mb-sm">check_circle</span>
              <p className="font-bold text-primary-container">تم إغلاق هذا اليوم مسبقاً</p>
            </div>
          )}
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <h2 className="text-title-md font-bold text-on-surface border-b border-outline-variant pb-md">سجل الإغلاقات السابقة</h2>
          {closures.length === 0 ? (
            <p className="text-center text-on-surface-variant py-xl">لا توجد إغلاقات سابقة</p>
          ) : (
            <div className="space-y-sm max-h-[500px] overflow-y-auto custom-scrollbar">
              {closures.slice(0, 30).map(c => (
                <div key={c.id} className="bg-surface border border-outline-variant rounded-lg p-md space-y-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-on-surface text-body-md">{formatDate(c.closure_date)}</span>
                    <span className={`text-label-caps font-bold px-sm py-xs rounded-full ${
                      c.cash_difference === 0 ? 'text-primary-container bg-primary-container/10' :
                      c.cash_difference > 0  ? 'text-[#F59E0B] bg-yellow-500/10' : 'text-error bg-error-container/20'
                    }`}>
                      {c.cash_difference >= 0 ? '+' : ''}{formatNum(c.cash_difference)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-xs text-xs text-on-surface-variant">
                    <span>المبيعات: {formatNum(c.total_sales)} {currency}</span>
                    <span>النقد: {formatNum(c.total_cash)} {currency}</span>
                    <span>الفعلي: {formatNum(c.actual_cash)} {currency}</span>
                    <span>الفواتير: {c.invoices_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
