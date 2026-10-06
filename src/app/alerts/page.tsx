'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/types';

export default function AlertsPage() {
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts-full'],
    queryFn: () => fetch('/api/alerts').then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';

  const alerts: Alert[] = alertsData?.alerts || [];
  const expired = alerts.filter(a => a.type === 'expired');
  const expiring = alerts.filter(a => a.type === 'expiring_soon');
  const outOfStock = alerts.filter(a => a.type === 'out_of_stock');
  const lowStock = alerts.filter(a => a.type === 'low_stock');

  const AlertCard = ({ alert, idx }: { alert: Alert; idx: number }) => {
    const isUrgent = alert.priority === 'urgent';
    return (
      <div className={`flex items-center justify-between p-md border rounded-lg transition-colors hover:bg-surface-container-high ${
        isUrgent ? 'border-error/30 bg-error-container/5' : 'border-outline-variant bg-surface-container-low'
      }`}>
        <div className="flex items-center gap-md">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUrgent ? 'bg-error-container/20' : 'bg-primary-container/10'}`}>
            <span className={`material-symbols-outlined ${isUrgent ? 'text-error' : 'text-primary-fixed-dim'}`} style={{ fontSize: '20px' }}>
              {alert.type === 'expired' ? 'history_toggle_off' :
               alert.type === 'expiring_soon' ? 'event_busy' :
               alert.type === 'out_of_stock' ? 'remove_shopping_cart' : 'low_priority'}
            </span>
          </div>
          <div>
            <p className="font-bold text-on-surface">{alert.product_name}</p>
            <p className="text-sm text-on-surface-variant">{alert.message}</p>
            {alert.batch_number && <p className="text-xs text-on-surface-variant">دفعة: {alert.batch_number}</p>}
          </div>
        </div>
        <div className="text-left flex flex-col items-end gap-xs">
          {alert.current_quantity !== undefined && (
            <span className={`text-sm font-bold ${isUrgent ? 'text-error' : 'text-[#F59E0B]'}`}>
              {alert.current_quantity} وحدة
            </span>
          )}
          <span className={`px-sm py-xs rounded text-label-caps border ${
            isUrgent ? 'bg-error text-on-error border-error' : 'border-[#F59E0B] text-[#F59E0B]'
          }`}>
            {alert.type === 'expired' ? 'منتهي' :
             alert.type === 'expiring_soon' ? `${alert.days_until_expiry} يوم` :
             alert.type === 'out_of_stock' ? 'نفد' : 'ناقص'}
          </span>
        </div>
      </div>
    );
  };

  const Section = ({ title, icon, alerts, color }: { title: string; icon: string; alerts: Alert[]; color: string }) => {
    if (alerts.length === 0) return null;
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <div className="flex items-center gap-sm mb-md">
          <span className={`material-symbols-outlined ${color}`}>{icon}</span>
          <h2 className={`text-title-sm font-bold ${color}`}>{title}</h2>
          <span className={`mr-auto text-label-caps px-sm py-xs rounded border ${color} border-current`}>{alerts.length}</span>
        </div>
        <div className="space-y-sm">
          {alerts.map((a, i) => <AlertCard key={i} alert={a} idx={i} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">مركز التنبيهات</h1>
          <p className="text-body-md text-on-surface-variant">
            {isLoading ? 'جاري التحميل...' : `${alerts.length} تنبيه نشط`}
          </p>
        </div>
        <div className="flex gap-md">
          {alerts.filter(a => a.priority === 'urgent').length > 0 && (
            <div className="flex items-center gap-sm px-md py-sm bg-error-container text-on-error-container rounded-lg border border-error">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>warning</span>
              <span className="font-bold">{alerts.filter(a => a.priority === 'urgent').length} عاجل</span>
            </div>
          )}
          {alerts.filter(a => a.priority === 'warning').length > 0 && (
            <div className="flex items-center gap-sm px-md py-sm bg-surface-container text-[#F59E0B] rounded-lg border border-[#F59E0B]/30">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications_active</span>
              <span className="font-bold">{alerts.filter(a => a.priority === 'warning').length} تحذير</span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-xl text-on-surface-variant">جاري التحميل...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-xl bg-surface-container border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-[64px] block mb-md text-primary-container">check_circle</span>
          <p className="text-title-sm text-on-surface font-bold mb-sm">لا توجد تنبيهات نشطة</p>
          <p className="text-body-md text-on-surface-variant">كل شيء على ما يرام</p>
        </div>
      ) : (
        <>
          <Section title="منتهية الصلاحية" icon="history_toggle_off" alerts={expired} color="text-error" />
          <Section title="نفد من المخزون" icon="remove_shopping_cart" alerts={outOfStock} color="text-error" />
          <Section title="ستنتهي قريباً" icon="event_busy" alerts={expiring} color="text-[#F59E0B]" />
          <Section title="تحت الحد الأدنى" icon="low_priority" alerts={lowStock} color="text-[#F59E0B]" />
        </>
      )}
    </div>
  );
}
