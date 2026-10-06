'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const statusLabel: Record<string, { label: string; cls: string }> = {
  completed:      { label: 'مكتملة',    cls: 'text-primary-container bg-primary-container/10' },
  partial_return: { label: 'مرتجع جزئي', cls: 'text-[#F59E0B] bg-yellow-500/10' },
  returned:       { label: 'مرتجع كلي',  cls: 'text-error bg-error-container/20' },
};

const payLabel: Record<string, string> = {
  cash: 'نقداً', credit: 'آجل', mixed: 'مختلط',
};

export default function SalesPage() {
  const [search, setSearch]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', search, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('invoice', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to',   dateTo);
      params.set('limit', '100');
      return fetch(`/api/sales?${params}`).then(r => r.json());
    },
  });

  const formatNum = (n: number) => (n || 0).toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const today = new Date().toISOString().split('T')[0];
  const totalSales = (sales as Record<string, unknown>[]).reduce((s, r) => s + ((r.total as number) || 0), 0);

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">سجل المبيعات</h1>
          <p className="text-body-md text-on-surface-variant">جميع الفواتير والمبيعات</p>
        </div>
        <div className="flex gap-sm">
          <button onClick={() => { setDateFrom(today); setDateTo(today); }}
            className="px-md py-sm bg-surface-container border border-outline-variant text-on-surface rounded-lg text-body-md hover:bg-surface-variant">
            اليوم
          </button>
          <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); }}
            className="px-md py-sm bg-surface-container border border-outline-variant text-on-surface rounded-lg text-body-md hover:bg-surface-variant">
            الكل
          </button>
        </div>
      </div>

      <div className="flex gap-md flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: '18px' }}>search</span>
          <input
            className="w-full bg-surface-container border border-outline-variant text-on-surface rounded-lg p-md pr-xl focus:border-primary-container outline-none"
            placeholder="بحث برقم الفاتورة أو العميل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-surface-container border border-outline-variant text-on-surface rounded-lg p-md focus:border-primary-container outline-none" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-surface-container border border-outline-variant text-on-surface rounded-lg p-md focus:border-primary-container outline-none" />
      </div>

      <div className="grid grid-cols-3 gap-gutter">
        <div className="bg-surface-container border border-outline-variant p-md rounded-xl">
          <p className="text-label-caps text-on-surface-variant mb-xs">عدد الفواتير</p>
          <p className="text-display font-display text-primary-container">{(sales as unknown[]).length}</p>
        </div>
        <div className="bg-surface-container border border-outline-variant p-md rounded-xl">
          <p className="text-label-caps text-on-surface-variant mb-xs">إجمالي المبيعات</p>
          <p className="text-display font-display text-primary-container">{formatNum(totalSales)} {currency}</p>
        </div>
        <div className="bg-surface-container border border-outline-variant p-md rounded-xl">
          <p className="text-label-caps text-on-surface-variant mb-xs">المرتجعات</p>
          <p className="text-display font-display text-error">
            {(sales as Record<string, unknown>[]).filter(s => s.status === 'returned' || s.status === 'partial_return').length}
          </p>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant">
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">رقم الفاتورة</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">التاريخ</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">العميل</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">الإجمالي</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">طريقة الدفع</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">الحالة</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">تفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : (sales as Record<string, unknown>[]).length === 0 ? (
              <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] block mb-sm">receipt_long</span>
                لا توجد فواتير
              </td></tr>
            ) : (
              (sales as Record<string, unknown>[]).map(sale => {
                const st = statusLabel[sale.status as string] || { label: sale.status as string, cls: '' };
                return (
                  <tr key={sale.id as string} className="hover:bg-surface-container-high transition-colors">
                    <td className="px-lg py-md font-bold text-primary-container">{sale.invoice_number as string}</td>
                    <td className="px-lg py-md text-on-surface-variant text-body-md">{formatDate(sale.sale_date as string)}</td>
                    <td className="px-lg py-md text-on-surface">{(sale.customer_name as string) || '—'}</td>
                    <td className="px-lg py-md font-bold text-on-surface">{formatNum(sale.total as number)} {currency}</td>
                    <td className="px-lg py-md text-on-surface-variant">{payLabel[sale.payment_method as string] || sale.payment_method as string}</td>
                    <td className="px-lg py-md">
                      <span className={`px-sm py-xs rounded-full text-label-caps font-bold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-lg py-md">
                      <Link href={`/sales/${sale.id as string}`}
                        className="flex items-center gap-xs text-primary-container hover:underline text-body-md">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                        عرض
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
