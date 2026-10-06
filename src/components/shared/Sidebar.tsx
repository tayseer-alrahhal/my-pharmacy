'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: 'dashboard', label: 'لوحة التحكم' },
  { href: '/pos', icon: 'point_of_sale', label: 'نقطة البيع', shortcut: 'F2' },
  { href: '/sales', icon: 'receipt_long', label: 'سجل المبيعات' },
  { href: '/returns', icon: 'assignment_return', label: 'المرتجعات' },
  { href: '/inventory/products', icon: 'inventory_2', label: 'المخزون' },
  { href: '/suppliers', icon: 'local_shipping', label: 'الموردين' },
  { href: '/customers', icon: 'groups', label: 'العملاء' },
  { href: '/day-closures', icon: 'event_available', label: 'إغلاق اليوم' },
  { href: '/purchase-orders', icon: 'shopping_cart', label: 'أوامر الشراء' },
  { href: '/categories', icon: 'category', label: 'التصنيفات' },
  { href: '/reports', icon: 'assessment', label: 'التقارير' },
  { href: '/alerts', icon: 'notifications_active', label: 'التنبيهات' },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/inventory/products') return pathname.startsWith('/inventory');
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col bg-surface-container border-l border-outline-variant fixed right-0 top-16 bottom-0 overflow-y-auto custom-scrollbar"
      style={{ width: '260px', zIndex: 40 }}
    >
      <div className="p-lg flex items-center gap-md border-b border-outline-variant">
        <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined">medication</span>
        </div>
        <div>
          <p className="font-bold text-on-surface text-body-lg">صيدلية الرحال</p>
          <p className="text-xs text-on-surface-variant">نظام الإدارة</p>
        </div>
      </div>

      <nav className="flex-1 py-md">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-sm px-md py-sm transition-all ${
              isActive(item.href)
                ? 'text-primary border-r-2 border-primary bg-surface-container-highest scale-[0.98]'
                : 'text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={isActive(item.href) ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="text-body-lg font-body-lg flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-shortcut-hint font-shortcut-hint bg-surface-container-low px-xs py-[2px] rounded border border-outline-variant opacity-60">
                {item.shortcut}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t border-outline-variant py-md">
        <Link
          href="/settings"
          className={`flex items-center gap-sm px-md py-sm transition-all ${
            pathname === '/settings'
              ? 'text-primary border-r-2 border-primary bg-surface-container-highest'
              : 'text-on-surface-variant hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-body-lg font-body-lg">الإعدادات</span>
        </Link>
      </div>
    </aside>
  );
}
