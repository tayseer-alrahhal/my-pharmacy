'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ArabicDatePicker from '@/components/shared/ArabicDatePicker';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('daily');
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report', activeReport, dateFrom, dateTo],
    queryFn: () => fetch(`/api/reports?type=${activeReport}&date_from=${dateFrom}&date_to=${dateTo}`).then(r => r.json()),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/settings').then(r => r.json()),
  });

  const currency = settings?.primary_currency || 'ل.س.ج';
  const pharmacyName = settings?.pharmacy_name || 'الصيدلية';

  const formatNum = (n: number) =>
    (n || 0).toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const reportTabs = [
    { id: 'daily', label: 'تقرير المبيعات', icon: 'receipt_long' },
    { id: 'profit', label: 'الربحية', icon: 'account_balance_wallet' },
    { id: 'top-products', label: 'الأكثر مبيعاً', icon: 'trending_up' },
    { id: 'inventory', label: 'المخزون الحالي', icon: 'inventory' },
    { id: 'receivables', label: 'الذمم المدينة', icon: 'credit_score' },
  ];

  const setQuickRange = (range: 'today' | 'month' | 'last-month') => {
    const now = new Date();
    if (range === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (range === 'month') {
      setDateFrom(monthStart);
      setDateTo(today);
    } else {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setDateFrom(lastMonthStart);
      setDateTo(lastMonthEnd);
    }
  };

  const exportToCSV = () => {
    let data: object[] = [];
    const activeTab = reportTabs.find(t => t.id === activeReport);
    const filename = activeTab?.label || 'تقرير';
    if (activeReport === 'daily' && reportData?.salesByDay?.length) data = reportData.salesByDay;
    else if (activeReport === 'top-products' && reportData?.topProducts?.length) data = reportData.topProducts;
    else if (activeReport === 'inventory' && reportData?.inventory?.length) data = reportData.inventory;
    else if (activeReport === 'receivables' && reportData?.receivables?.length) data = reportData.receivables;
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${filename}_${dateFrom}_${dateTo}.csv`,
    });
    a.click();
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const activeLabel = reportTabs.find(t => t.id === activeReport)?.label || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${activeLabel} — ${pharmacyName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            color: #0d1117;
            background: #fff;
            padding: 24px;
            font-size: 13px;
          }
          .header { text-align: center; border-bottom: 2px solid #0d141d; padding-bottom: 16px; margin-bottom: 20px; }
          .header h1 { font-size: 20px; font-weight: bold; color: #0d141d; }
          .header p { color: #555; font-size: 12px; margin-top: 4px; }
          .period { background: #f5f5f5; border-radius: 6px; padding: 8px 16px; text-align: center; margin-bottom: 20px; font-size: 12px; color: #444; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .metric { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
          .metric .label { font-size: 11px; color: #666; margin-bottom: 4px; }
          .metric .value { font-size: 18px; font-weight: bold; color: #0d141d; }
          .metric .unit { font-size: 11px; color: #888; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #0d141d; color: #b6f36a; padding: 8px 12px; text-align: right; font-weight: bold; }
          td { padding: 7px 12px; border-bottom: 1px solid #eee; }
          tr:nth-child(even) td { background: #f9f9f9; }
          .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
          .profit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .profit-card { border: 1px solid #ddd; border-radius: 8px; padding: 14px; }
          .profit-card .label { font-size: 11px; color: #666; margin-bottom: 6px; }
          .profit-card .value { font-size: 20px; font-weight: bold; }
          .no-print { display: none !important; }
          svg, .recharts-wrapper, .recharts-responsive-container { display: none !important; }
          .material-symbols-outlined { display: none !important; }
          @media print {
            body { padding: 12px; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${pharmacyName}</h1>
          <p>${activeLabel}</p>
        </div>
        <div class="period">الفترة: ${new Date(dateFrom + 'T12:00:00').toLocaleDateString('ar-SY', { year:'numeric', month:'long', day:'numeric' })} — ${new Date(dateTo + 'T12:00:00').toLocaleDateString('ar-SY', { year:'numeric', month:'long', day:'numeric' })}</div>
        ${printContent.innerHTML}
        <div class="footer">
          طُبع بتاريخ: ${new Date().toLocaleDateString('ar-SY')} — ${new Date().toLocaleTimeString('ar-SY')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1800);
  };

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <h1 className="text-display font-display text-primary-container">التقارير</h1>
        <div className="flex items-center gap-sm flex-wrap">
          {/* Quick range buttons */}
          <button
            onClick={() => setQuickRange('today')}
            className={`px-md py-sm rounded-lg text-label-large border transition-all ${dateFrom === today && dateTo === today ? 'bg-primary-container text-on-primary border-primary-container' : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}
          >
            اليوم
          </button>
          <button
            onClick={() => setQuickRange('month')}
            className={`px-md py-sm rounded-lg text-label-large border transition-all ${dateFrom === monthStart && dateTo === today ? 'bg-primary-container text-on-primary border-primary-container' : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}
          >
            هذا الشهر
          </button>
          <button
            onClick={() => setQuickRange('last-month')}
            className="px-md py-sm rounded-lg text-label-large border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-all"
          >
            الشهر الماضي
          </button>

          {/* Date range */}
          <div className="flex items-center gap-xs border border-outline-variant rounded-lg px-md py-sm">
            <ArabicDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              label="تاريخ البداية"
              max={dateTo}
            />
            <span className="text-on-surface-variant px-xs">—</span>
            <ArabicDatePicker
              value={dateTo}
              onChange={setDateTo}
              label="تاريخ النهاية"
              min={dateFrom}
            />
          </div>

          {/* CSV Export */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-sm bg-primary-container/10 border border-primary-container text-primary-container px-md py-sm rounded-lg hover:bg-primary-container/20 transition-all font-bold"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            تصدير CSV
          </button>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-sm bg-surface-container-high border border-outline-variant text-on-surface px-md py-sm rounded-lg hover:bg-surface-variant transition-all font-bold"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            طباعة
          </button>
        </div>
      </div>

      <div className="flex gap-sm flex-wrap">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-sm px-md py-sm rounded-lg text-label-caps font-bold border transition-all ${
              activeReport === tab.id ? 'bg-primary-container text-on-primary border-primary-container' : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-xl text-on-surface-variant">جاري التحميل...</div>
      ) : (
        <div ref={printRef}>
          {/* Daily Sales Report */}
          {activeReport === 'daily' && reportData && (
            <div className="flex flex-col gap-lg">
              <div className="grid grid-cols-4 gap-gutter metrics">
                {[
                  { label: 'إجمالي المبيعات', value: formatNum(reportData.summary?.total_sales), unit: currency, icon: 'payments', color: 'text-primary-container' },
                  { label: 'عدد الفواتير', value: reportData.summary?.invoices_count?.toString() || '0', unit: 'فاتورة', icon: 'receipt_long', color: 'text-on-surface' },
                  { label: 'المبيعات النقدية', value: formatNum(reportData.summary?.total_cash), unit: currency, icon: 'money', color: 'text-primary-fixed-dim' },
                  { label: 'المبيعات الآجلة', value: formatNum((reportData.summary?.total_credit || 0) + (reportData.summary?.total_mixed_credit || 0)), unit: currency, icon: 'credit_score', color: 'text-error' },
                ].map((m, i) => (
                  <div key={i} className="bg-surface-container border border-outline-variant p-md rounded-xl metric">
                    <div className="flex justify-between items-start mb-md">
                      <span className="text-label-caps text-on-surface-variant label">{m.label}</span>
                      <span className={`material-symbols-outlined ${m.color}`} style={{ fontSize: '20px' }}>{m.icon}</span>
                    </div>
                    <p className={`text-display font-display ${m.color} value`}>{m.value}</p>
                    <p className="text-body-md text-on-surface-variant mt-xs unit">{m.unit}</p>
                  </div>
                ))}
              </div>

              {reportData.salesByDay?.length > 0 && (
                <div className="bg-surface-container border border-outline-variant rounded-xl p-md no-print">
                  <h3 className="text-title-sm font-bold text-primary-container mb-lg">تطور المبيعات</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reportData.salesByDay}>
                      <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 10 }} tickFormatter={(d: string) => new Date(d + 'T12:00:00').toLocaleDateString('ar-SY', { month: 'numeric', day: 'numeric' })} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#192029', border: '1px solid #424938' }} labelStyle={{ color: '#dce3f0' }} />
                      <Bar dataKey="total" fill="#b6f36a" radius={[2, 2, 0, 0]} name="المبيعات" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sales table for print */}
              {reportData.salesByDay?.length > 0 && (
                <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
                  <h3 className="text-title-sm font-bold text-primary-container p-md border-b border-outline-variant">تفاصيل المبيعات اليومية</h3>
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-surface-container-highest/50">
                      <tr>
                        {['التاريخ', 'عدد الفواتير', 'إجمالي المبيعات'].map(h => (
                          <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {reportData.salesByDay.map((row: { date: string; count: number; total: number }, idx: number) => (
                        <tr key={idx} className="hover:bg-surface-container-high">
                          <td className="px-lg py-md text-on-surface">{new Date(row.date + 'T12:00:00').toLocaleDateString('ar-SY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          <td className="px-lg py-md text-on-surface-variant">{row.count || 0}</td>
                          <td className="px-lg py-md font-bold text-primary-container">{formatNum(row.total)} {currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {reportData.returns && reportData.returns.total_returns > 0 && (
                <div className="bg-surface-container border border-error/30 p-md rounded-xl">
                  <p className="text-label-caps text-on-surface-variant mb-xs">إجمالي المرتجعات</p>
                  <p className="text-title-sm font-bold text-error">{formatNum(reportData.returns.total_returns)} {currency}</p>
                </div>
              )}
            </div>
          )}

          {/* Profit */}
          {activeReport === 'profit' && reportData?.profit && (
            <div className="flex flex-col gap-lg">
              <div className="grid grid-cols-2 gap-gutter profit-grid">
                {[
                  { label: 'الإيرادات', value: formatNum(reportData.profit.revenue), color: 'text-primary-container' },
                  { label: 'تكلفة البضاعة', value: formatNum(reportData.profit.cost), color: 'text-[#F59E0B]' },
                  { label: 'صافي الربح', value: formatNum(reportData.profit.profit), color: 'text-primary-fixed-dim' },
                  { label: 'الخصومات', value: formatNum(reportData.profit.discounts), color: 'text-error' },
                ].map((m, i) => (
                  <div key={i} className="bg-surface-container border border-outline-variant p-lg rounded-xl profit-card">
                    <p className="text-label-caps text-on-surface-variant mb-sm label">{m.label}</p>
                    <p className={`text-headline-md font-bold ${m.color} value`}>{m.value} {currency}</p>
                  </div>
                ))}
              </div>
              {reportData.profit.revenue > 0 && (
                <div className="bg-surface-container border border-outline-variant p-lg rounded-xl profit-card">
                  <p className="text-label-caps text-on-surface-variant mb-sm label">هامش الربح</p>
                  <p className="text-display font-display text-primary-container value">
                    {Math.round((reportData.profit.profit / reportData.profit.revenue) * 100)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Top Products */}
          {activeReport === 'top-products' && reportData?.topProducts && (
            <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead className="bg-surface-container-highest/50">
                  <tr>
                    {['#', 'اسم الدواء', 'الكمية المباعة', 'الإيرادات', 'الربح'].map(h => (
                      <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {reportData.topProducts.map((p: { product_name: string; qty: number; revenue: number; profit: number }, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-container-high">
                      <td className="px-lg py-md text-on-surface-variant">{idx + 1}</td>
                      <td className="px-lg py-md font-bold text-primary-container">{p.product_name}</td>
                      <td className="px-lg py-md text-on-surface">{p.qty}</td>
                      <td className="px-lg py-md text-primary-fixed-dim font-bold">{formatNum(p.revenue)} {currency}</td>
                      <td className="px-lg py-md text-primary-container font-bold">{formatNum(p.profit)} {currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inventory */}
          {activeReport === 'inventory' && reportData?.inventory && (
            <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead className="bg-surface-container-highest/50">
                  <tr>
                    {['الدواء', 'التصنيف', 'الكمية', 'الحد الأدنى', 'القيمة', 'أقرب انتهاء'].map(h => (
                      <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {reportData.inventory.map((p: { product_name: string; category_name: string; total_qty: number; min_stock: number; total_value: number; unit: string; nearest_expiry: string }) => (
                    <tr key={p.product_name} className="hover:bg-surface-container-high">
                      <td className="px-lg py-md font-bold text-primary-container">{p.product_name}</td>
                      <td className="px-lg py-md">
                        <span className="bg-surface-container-highest text-on-surface-variant px-sm py-xs rounded text-xs">{p.category_name || '—'}</span>
                      </td>
                      <td className="px-lg py-md">
                        <span className={`font-bold ${p.total_qty === 0 ? 'text-error' : p.total_qty <= p.min_stock ? 'text-[#F59E0B]' : 'text-on-surface'}`}>
                          {p.total_qty} {p.unit}
                        </span>
                      </td>
                      <td className="px-lg py-md text-on-surface-variant">{p.min_stock}</td>
                      <td className="px-lg py-md text-primary-fixed-dim font-bold">{formatNum(p.total_value)} {currency}</td>
                      <td className="px-lg py-md text-on-surface-variant text-sm">{p.nearest_expiry ? new Date(p.nearest_expiry).toLocaleDateString('ar-SY') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Receivables */}
          {activeReport === 'receivables' && reportData?.receivables && (
            <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead className="bg-surface-container-highest/50">
                  <tr>
                    {['العميل', 'الهاتف', 'الرصيد', 'حد الائتمان', 'آخر شراء'].map(h => (
                      <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {reportData.receivables.map((c: { name: string; phone: string; current_balance: number; credit_limit: number; last_purchase: string }) => (
                    <tr key={c.name} className="hover:bg-surface-container-high">
                      <td className="px-lg py-md font-bold text-on-surface">{c.name}</td>
                      <td className="px-lg py-md text-on-surface-variant">{c.phone || '—'}</td>
                      <td className="px-lg py-md font-bold text-error">{formatNum(c.current_balance)} {currency}</td>
                      <td className="px-lg py-md text-on-surface-variant">{formatNum(c.credit_limit)} {currency}</td>
                      <td className="px-lg py-md text-on-surface-variant text-sm">{c.last_purchase ? new Date(c.last_purchase).toLocaleDateString('ar-SY') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
