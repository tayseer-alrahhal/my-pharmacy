'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const payLabel: Record<string, string> = { cash: 'نقداً', credit: 'آجل', mixed: 'مختلط' };
const statusLabel: Record<string, { label: string; cls: string }> = {
  completed:      { label: 'مكتملة',     cls: 'text-primary-container bg-primary-container/10' },
  partial_return: { label: 'مرتجع جزئي', cls: 'text-[#F59E0B] bg-yellow-500/10' },
  returned:       { label: 'مرتجع كلي',  cls: 'text-error bg-error-container/20' },
};

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';
  const pharmacyName = settings?.pharmacy_name || 'الصيدلية';

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => fetch(`/api/sales/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatNum  = (n: number) => (n || 0).toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    if (!sale) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    const items = (sale.items || []) as Record<string, unknown>[];
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة — ${sale.invoice_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; direction: rtl; color: #111; background: #fff; padding: 24px; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #0d141d; padding-bottom: 16px; margin-bottom: 20px; }
          .header h1 { font-size: 22px; font-weight: bold; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 12px; color: #444; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #0d141d; color: #b6f36a; padding: 8px 12px; text-align: right; font-weight: bold; font-size: 12px; }
          td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
          tr:nth-child(even) td { background: #f9f9f9; }
          .totals { max-width: 300px; margin-right: auto; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
          .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals .total { font-weight: bold; font-size: 16px; border-top: 2px solid #0d141d; padding-top: 8px; margin-top: 4px; }
          .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
          .material-symbols-outlined { display: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${pharmacyName}</h1>
          <p style="color:#555;margin-top:4px">فاتورة مبيعات</p>
        </div>
        <div class="meta">
          <div><strong>رقم الفاتورة:</strong> ${sale.invoice_number}</div>
          <div><strong>التاريخ:</strong> ${formatDate(sale.sale_date)}</div>
          <div><strong>طريقة الدفع:</strong> ${payLabel[sale.payment_method] || sale.payment_method}</div>
          ${sale.customer_name ? `<div><strong>العميل:</strong> ${sale.customer_name}</div>` : ''}
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>الدواء</th><th>الوحدة</th><th>الكمية</th><th>سعر الوحدة</th><th>الخصم</th><th>الإجمالي</th>
          </tr></thead>
          <tbody>
            ${items.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${item.product_name}</strong></td>
                <td>${item.unit || ''}</td>
                <td>${item.quantity}</td>
                <td>${formatNum(item.unit_price as number)} ${currency}</td>
                <td>${formatNum(item.discount_amount as number)} ${currency}</td>
                <td><strong>${formatNum(item.total as number)} ${currency}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span>المجموع الفرعي</span><span>${formatNum(sale.subtotal)} ${currency}</span></div>
          ${sale.discount_amount > 0 ? `<div class="row"><span>الخصم</span><span>- ${formatNum(sale.discount_amount)} ${currency}</span></div>` : ''}
          ${sale.tax_amount > 0 ? `<div class="row"><span>الضريبة</span><span>+ ${formatNum(sale.tax_amount)} ${currency}</span></div>` : ''}
          <div class="row total"><span>الإجمالي</span><span>${formatNum(sale.total)} ${currency}</span></div>
          <div class="row"><span>المدفوع</span><span>${formatNum(sale.paid_amount)} ${currency}</span></div>
          ${sale.change_amount > 0 ? `<div class="row"><span>الباقي</span><span>${formatNum(sale.change_amount)} ${currency}</span></div>` : ''}
        </div>
        <div class="footer">طُبع بتاريخ: ${new Date().toLocaleDateString('ar-SY')}</div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 1200);
  };

  if (isLoading) return <div className="p-margin text-center text-on-surface-variant py-xl">جاري التحميل...</div>;
  if (!sale || sale.error) return (
    <div className="p-margin text-center py-xl">
      <p className="text-on-surface-variant mb-md">لم يتم العثور على الفاتورة</p>
      <Link href="/sales" className="text-primary-container hover:underline">← العودة لسجل المبيعات</Link>
    </div>
  );

  const st = statusLabel[sale.status] || { label: sale.status, cls: '' };
  const items = (sale.items || []) as Record<string, unknown>[];

  return (
    <div className="p-margin flex flex-col gap-lg">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-lg py-sm rounded-lg border font-bold shadow-lg ${
          toast.type === 'success' ? 'bg-surface-container border-primary-container text-primary-container' : 'bg-error-container border-error text-on-error-container'
        }`}>{toast.msg}</div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <Link href="/sales" className="text-on-surface-variant hover:text-primary-container text-body-md flex items-center gap-xs mb-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
            سجل المبيعات
          </Link>
          <h1 className="text-display font-display text-primary-container">{sale.invoice_number}</h1>
          <div className="flex items-center gap-sm mt-xs">
            <span className={`px-sm py-xs rounded-full text-label-caps font-bold ${st.cls}`}>{st.label}</span>
            <span className="text-on-surface-variant text-body-md">{formatDate(sale.sale_date)}</span>
          </div>
        </div>
        <div className="flex gap-sm">
          <button onClick={handlePrint}
            className="flex items-center gap-sm px-lg py-sm bg-surface-container border border-outline-variant text-on-surface rounded-lg hover:bg-surface-variant font-bold">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            طباعة
          </button>
          {sale.status === 'completed' && (
            <Link href={`/returns?invoice=${sale.invoice_number}`}
              className="flex items-center gap-sm px-lg py-sm bg-error-container text-on-error-container rounded-lg hover:brightness-110 font-bold">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment_return</span>
              إنشاء مرتجع
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-gutter">
        {[
          { label: 'العميل', value: sale.customer_name || 'عميل نقدي', icon: 'person' },
          { label: 'طريقة الدفع', value: payLabel[sale.payment_method] || sale.payment_method, icon: 'payments' },
          { label: 'عدد الأصناف', value: `${items.length} صنف`, icon: 'medication' },
        ].map(card => (
          <div key={card.label} className="bg-surface-container border border-outline-variant p-md rounded-xl flex items-center gap-md">
            <span className="material-symbols-outlined text-primary-container" style={{ fontSize: '28px' }}>{card.icon}</span>
            <div>
              <p className="text-label-caps text-on-surface-variant">{card.label}</p>
              <p className="font-bold text-on-surface">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant">
              {['الدواء', 'الوحدة', 'الكمية', 'سعر الوحدة', 'الخصم', 'الإجمالي'].map(h => (
                <th key={h} className="px-lg py-md text-right text-label-caps text-on-surface-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-surface-container-high">
                <td className="px-lg py-md font-bold text-on-surface">{item.product_name as string}</td>
                <td className="px-lg py-md text-on-surface-variant">{item.unit as string}</td>
                <td className="px-lg py-md text-on-surface">{item.quantity as number}</td>
                <td className="px-lg py-md text-on-surface">{formatNum(item.unit_price as number)} {currency}</td>
                <td className="px-lg py-md text-error">{(item.discount_amount as number) > 0 ? `- ${formatNum(item.discount_amount as number)}` : '—'}</td>
                <td className="px-lg py-md font-bold text-primary-container">{formatNum(item.total as number)} {currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-sm min-w-72">
          <div className="flex justify-between text-on-surface-variant"><span>المجموع الفرعي</span><span>{formatNum(sale.subtotal)} {currency}</span></div>
          {sale.discount_amount > 0 && <div className="flex justify-between text-error"><span>الخصم</span><span>- {formatNum(sale.discount_amount)} {currency}</span></div>}
          {sale.tax_amount > 0 && <div className="flex justify-between text-on-surface-variant"><span>الضريبة</span><span>+ {formatNum(sale.tax_amount)} {currency}</span></div>}
          <div className="flex justify-between font-bold text-on-surface border-t border-outline-variant pt-sm text-title-sm">
            <span>الإجمالي</span>
            <span className="text-primary-container">{formatNum(sale.total)} {currency}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant"><span>المدفوع</span><span>{formatNum(sale.paid_amount)} {currency}</span></div>
          {sale.change_amount > 0 && <div className="flex justify-between text-primary-container font-bold"><span>الباقي للعميل</span><span>{formatNum(sale.change_amount)} {currency}</span></div>}
        </div>
      </div>
    </div>
  );
}
