'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export function TopBar() {
  const [dateStr, setDateStr] = useState('');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const now = new Date();
    setDateStr(now.toLocaleDateString('ar-SY', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }));
    // Load saved theme
    const saved = localStorage.getItem('theme');
    const dark = saved !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('light', !dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('light', !next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const { data: alertsData } = useQuery<{ alerts: { type: string; priority: string }[] }>({
    queryKey: ['alerts-count'],
    queryFn: () => fetch('/api/alerts').then(r => r.json()),
    refetchInterval: 60000,
  });

  const expiredCount  = alertsData?.alerts?.filter(a => a.type === 'expired').length || 0;
  const lowStockCount = alertsData?.alerts?.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock').length || 0;
  const urgentCount   = alertsData?.alerts?.filter(a => a.priority === 'urgent').length || 0;

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-outline-variant flex flex-row-reverse justify-between items-center px-margin"
      style={{ zIndex: 50 }}
    >
      {/* Right: pharmacy name + alert badges */}
      <div className="flex items-center gap-md">
        <Link href="/" className="text-primary-container font-bold text-title-sm">
          صيدلية الرحال
        </Link>
        <div className="flex gap-sm mr-lg">
          {expiredCount > 0 && (
            <Link href="/alerts" className="flex items-center gap-xs px-sm py-xs bg-error-container text-on-error-container rounded-lg border border-error text-label-caps">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
              <span>{expiredCount} منتهي</span>
            </Link>
          )}
          {lowStockCount > 0 && (
            <Link href="/alerts" className="flex items-center gap-xs px-sm py-xs bg-secondary-container text-on-secondary-container rounded-lg border border-outline-variant text-label-caps">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>inventory_2</span>
              <span>{lowStockCount} ناقص</span>
            </Link>
          )}
        </div>
      </div>

      {/* Left: date + theme toggle + notifications */}
      <div className="flex flex-row-reverse items-center gap-sm">
        <span className="text-on-surface-variant text-body-md" suppressHydrationWarning>{dateStr}</span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <Link href="/alerts" className="relative text-primary-container hover:bg-surface-container-high p-sm rounded transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          {urgentCount > 0 && (
            <span className="absolute -top-1 -left-1 bg-error text-on-error text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
              {urgentCount > 9 ? '9+' : urgentCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
