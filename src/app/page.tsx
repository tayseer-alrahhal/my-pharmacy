'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const DynamicChart = dynamic(
  () => import('@/components/dashboard/SalesChart'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-on-surface-variant">جاري التحميل...</div> }
);

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: reportData } = useQuery({
    queryKey: ['report-daily', today],
    queryFn: () => fetch(`/api/reports?type=daily&date_from=${weekAgo}&date_to=${today}`).then(r => r.json()),
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetch('/api/alerts').then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/settings').then(r => r.json()),
  });

  const summary = reportData?.summary || {};
  const salesByDay = reportData?.salesByDay || [];
  const topProducts = reportData?.topProducts || [];
  const alerts = alertsData?.alerts || [];
  const currency = settingsData?.primary_currency || 'ل.س.ج';

  const urgentAlerts = alerts.filter((a: { priority: string }) => a.priority === 'urgent');
  const warningAlerts = alerts.filter((a: { priority: string }) => a.priority === 'warning');

  const todayReport = reportData?.salesByDay?.find((d: { date: string }) => d.date === today);
  const todaySales = todayReport?.total || 0;
  const todayCount = todayReport?.count || 0;

  const formatNum = (n: number) => n?.toLocaleString('ar-SY') || '0';

  const dayNames: Record<string, string> = {
    'Sunday': 'الأحد', 'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء',
    'Wednesday': 'الأربعاء', 'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت'
  };

  const chartData = salesByDay.map((d: { date: string; total: number; count: number }) => {
    const dayName = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    return { day: dayNames[dayName] || dayName, total: d.total, count: d.count };
  });

  void summary;

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <h1 className="text-display font-display text-primary-container">لوحة التحكم</h1>
        <div className="flex gap-md">
          <Link
            href="/pos"
            className="bg-primary-container text-on-primary hover:brightness-110 px-lg py-sm rounded-lg flex items-center gap-sm transition-all border-2 border-transparent focus:border-primary-fixed"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span className="font-bold text-title-sm">عملية بيع جديدة</span>
            <span className="text-shortcut-hint bg-on-primary/10 px-xs py-[2px] rounded">F2</span>
          </Link>
          <Link
            href="/inventory/grn"
            className="bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-variant px-lg py-sm rounded-lg flex items-center gap-sm transition-all"
          >
            <span className="material-symbols-outlined">add_box</span>
            <span className="font-bold">استقبال بضاعة</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-gutter">
        <div className="bg-surface-container p-md border border-outline-variant rounded-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 h-full bg-primary-container"></div>
          <div className="flex flex-col gap-xs">
            <span className="text-label-caps text-on-surface-variant">مبيعات اليوم</span>
            <span className="text-display font-display text-primary-container" suppressHydrationWarning>{formatNum(todaySales)}</span>
            <span className="text-body-md text-primary-fixed-dim">{currency}</span>
          </div>
          <span className="material-symbols-outlined absolute bottom-md left-md text-[48px] opacity-10 group-hover:opacity-20 transition-opacity text-primary-container">payments</span>
        </div>

        <div className="bg-surface-container p-md border border-outline-variant rounded-lg relative overflow-hidden group">
          <div className="flex flex-col gap-xs">
            <span className="text-label-caps text-on-surface-variant">فواتير اليوم</span>
            <span className="text-display font-display text-on-surface">{todayCount}</span>
            <span className="text-body-md text-on-surface-variant">فاتورة بيع</span>
          </div>
          <span className="material-symbols-outlined absolute bottom-md left-md text-[48px] opacity-10 group-hover:opacity-20 transition-opacity">receipt_long</span>
        </div>

        <div className="bg-surface-container p-md border border-outline-variant rounded-lg relative overflow-hidden group">
          <div className="flex flex-col gap-xs">
            <span className="text-label-caps text-on-surface-variant">تنبيهات عاجلة</span>
            <span className={`text-display font-display ${urgentAlerts.length > 0 ? 'text-error' : 'text-on-surface'}`}>
              {urgentAlerts.length}
            </span>
            <span className="text-body-md text-on-surface-variant">تنبيه عاجل</span>
          </div>
          <span className="material-symbols-outlined absolute bottom-md left-md text-[48px] opacity-10 group-hover:opacity-20 transition-opacity text-error">warning</span>
        </div>

        <div className="bg-surface-container p-md border border-outline-variant rounded-lg relative overflow-hidden group">
          <div className="flex flex-col gap-xs">
            <span className="text-label-caps text-on-surface-variant">تحذيرات</span>
            <span className={`text-display font-display ${warningAlerts.length > 0 ? 'text-[#F59E0B]' : 'text-on-surface'}`}>
              {warningAlerts.length}
            </span>
            <span className="text-body-md text-on-surface-variant">تحذير نشط</span>
          </div>
          <span className="material-symbols-outlined absolute bottom-md left-md text-[48px] opacity-10 group-hover:opacity-20 transition-opacity">notifications_active</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Alerts */}
        <div className="col-span-8 bg-surface-container border border-outline-variant rounded-lg p-md flex flex-col">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-title-sm font-bold text-primary-container flex items-center gap-sm">
              <span className="material-symbols-outlined">notification_important</span>
              التنبيهات النشطة
            </h2>
            <Link href="/alerts" className="text-on-surface-variant hover:text-primary-container transition-colors text-body-md">
              عرض الكل ({alerts.length})
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-outline-variant">
            {alerts.length === 0 && (
              <div className="py-lg text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] block mb-sm">check_circle</span>
                لا توجد تنبيهات نشطة
              </div>
            )}
            {alerts.slice(0, 5).map((alert: { type: string; priority: string; product_name: string; message: string; expiry_date?: string; current_quantity?: number; min_stock?: number }, idx: number) => (
              <div key={idx} className="py-md flex items-center justify-between hover:bg-surface-variant/30 px-sm transition-colors">
                <div className="flex items-center gap-md">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    alert.priority === 'urgent' ? 'bg-error-container/20' : 'bg-primary-container/10'
                  }`}>
                    <span className={`material-symbols-outlined ${
                      alert.priority === 'urgent' ? 'text-error' : 'text-primary-fixed-dim'
                    }`}>
                      {alert.type === 'expired' ? 'history_toggle_off' :
                       alert.type === 'expiring_soon' ? 'event_busy' : 'low_priority'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-title-sm font-bold">{alert.product_name}</span>
                    <span className="text-body-md text-on-surface-variant">{alert.message}</span>
                  </div>
                </div>
                <span className={`px-md py-xs rounded text-label-caps border ${
                  alert.priority === 'urgent'
                    ? 'bg-error text-on-error border-error'
                    : 'border-primary-container text-primary-container'
                }`}>
                  {alert.type === 'expired' ? 'منتهي' :
                   alert.type === 'expiring_soon' ? 'قريب الانتهاء' :
                   alert.type === 'out_of_stock' ? 'نفد' : 'ناقص'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-4 bg-surface-container border border-outline-variant rounded-lg p-md flex flex-col">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-title-sm font-bold text-primary-container flex items-center gap-sm">
              <span className="material-symbols-outlined">bar_chart</span>
              مبيعات آخر 7 أيام
            </h2>
          </div>
          <div className="flex-1 min-h-[200px]">
            {mounted ? (
              <DynamicChart data={chartData} />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-on-surface-variant">
                جاري التحميل...
              </div>
            )}
          </div>
          <div className="mt-md pt-md border-t border-outline-variant">
            <div className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant">إجمالي الأسبوع</span>
              <span className="text-title-sm font-bold text-primary-container" suppressHydrationWarning>
                {formatNum(salesByDay.reduce((s: number, d: { total: number }) => s + d.total, 0))} {currency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-lg p-md">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-title-sm font-bold text-primary-container flex items-center gap-sm">
              <span className="material-symbols-outlined">trending_up</span>
              الأكثر مبيعاً هذا الأسبوع
            </h2>
          </div>
          <div className="grid grid-cols-5 gap-md">
            {topProducts.slice(0, 5).map((p: { product_name: string; qty: number; revenue: number }, idx: number) => (
              <div key={idx} className="border border-outline-variant p-sm rounded-lg hover:border-primary-container transition-all">
                <div className="flex items-center justify-center w-10 h-10 bg-surface-container-high rounded-lg mb-sm mx-auto">
                  <span className="material-symbols-outlined text-primary-fixed-dim">medication</span>
                </div>
                <p className="text-body-md font-bold text-center truncate">{p.product_name}</p>
                <div className="flex justify-between mt-xs">
                  <span className="text-shortcut-hint text-on-surface-variant">{p.qty} وحدة</span>
                  <span className="text-shortcut-hint text-primary-fixed-dim font-bold" suppressHydrationWarning>{formatNum(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
