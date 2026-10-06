'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer } from '@/types';

type CustomerSale = { id: string; invoice_number: string; sale_date: string; total: number; payment_method: string; status: string };

export default function CustomersPage() {
  const [showModal, setShowModal]     = useState(false);
  const [editItem, setEditItem]       = useState<Customer | null>(null);
  const [showSettle, setShowSettle]   = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', credit_limit: 0 });
  const qc = useQueryClient();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers').then(r => r.json()),
  });

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';

  const saveMutation = useMutation({
    mutationFn: (data: object) => editItem
      ? fetch(`/api/customers/${editItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setShowModal(false); setEditItem(null); },
  });

  const settleMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      fetch(`/api/customers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settle_amount: amount }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setShowSettle(null); setSettleAmount(''); },
  });

  const openEdit = (c: Customer) => {
    setEditItem(c);
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', credit_limit: c.credit_limit });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', phone: '', address: '', credit_limit: 0 });
    setShowModal(true);
  };

  const { data: customerSales = [] } = useQuery<CustomerSale[]>({
    queryKey: ['customer-sales', profileCustomer?.id],
    queryFn: () => fetch(`/api/sales?customer=${profileCustomer!.id}&limit=50`).then(r => r.json()),
    enabled: !!profileCustomer,
  });

  const formatNum  = (n: number) => n?.toLocaleString('ar-SY') || '0';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' });
  const totalDebt  = customers.reduce((s, c) => s + c.current_balance, 0);

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">العملاء المدينون</h1>
          <p className="text-body-md text-on-surface-variant">إدارة حسابات العملاء والذمم المدينة</p>
        </div>
        <button onClick={openAdd} className="bg-primary-container text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm hover:brightness-110 font-bold">
          <span className="material-symbols-outlined">person_add</span>
          عميل جديد
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-gutter">
        <div className="bg-surface-container border border-outline-variant p-md rounded-xl">
          <p className="text-label-caps text-on-surface-variant mb-xs">إجمالي العملاء</p>
          <p className="text-display font-display text-primary-container">{customers.length}</p>
        </div>
        <div className="bg-surface-container border border-outline-variant p-md rounded-xl">
          <p className="text-label-caps text-on-surface-variant mb-xs">العملاء المدينون</p>
          <p className="text-display font-display text-error">{customers.filter(c => c.current_balance > 0).length}</p>
        </div>
        <div className="bg-surface-container border border-outline-variant p-md rounded-xl">
          <p className="text-label-caps text-on-surface-variant mb-xs">إجمالي الديون</p>
          <p className="text-display font-display text-error">{formatNum(totalDebt)} {currency}</p>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead className="bg-surface-container-highest/50">
            <tr>
              {['اسم العميل', 'الهاتف', 'الرصيد الحالي', 'حد الائتمان', 'إجراءات'].map(h => (
                <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant">لا يوجد عملاء</td></tr>
            ) : customers.map(c => (
              <tr key={c.id} className="hover:bg-surface-container-high transition-colors group">
                <td className="px-lg py-md">
                  <div className="flex items-center gap-sm">
                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '16px' }}>person</span>
                    </div>
                    <span className="font-bold text-on-surface">{c.name}</span>
                  </div>
                </td>
                <td className="px-lg py-md text-on-surface-variant">{c.phone || '—'}</td>
                <td className="px-lg py-md">
                  <span className={`font-bold text-title-sm ${c.current_balance > 0 ? 'text-error' : 'text-primary-container'}`}>
                    {formatNum(c.current_balance)} {currency}
                  </span>
                </td>
                <td className="px-lg py-md text-on-surface-variant">{formatNum(c.credit_limit)} {currency}</td>
                <td className="px-lg py-md">
                  <div className="flex gap-sm opacity-40 group-hover:opacity-100">
                    <button onClick={() => setProfileCustomer(c)}
                      className="px-sm py-xs text-xs bg-surface-container-high border border-outline-variant text-on-surface rounded hover:brightness-110">
                      ملف العميل
                    </button>
                    {c.current_balance > 0 && (
                      <button onClick={() => { setShowSettle(c); setSettleAmount(''); }}
                        className="px-sm py-xs text-xs bg-primary-container text-on-primary rounded hover:brightness-110 font-bold">
                        تسوية
                      </button>
                    )}
                    <button onClick={() => openEdit(c)} className="p-xs text-on-surface-variant hover:text-primary-container">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-title-sm font-bold text-primary-container">{editItem ? 'تعديل عميل' : 'عميل جديد'}</h2>
              <button onClick={() => setShowModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">اسم العميل *</label>
                <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">الهاتف</label>
                  <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">حد الائتمان ({currency})</label>
                  <input type="number" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                    value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">العنوان</label>
                <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-md mt-lg">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">إلغاء</button>
              <button onClick={() => form.name && saveMutation.mutate(form)} disabled={!form.name}
                className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold disabled:opacity-50">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile Drawer */}
      {profileCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-start" onClick={() => setProfileCustomer(null)}>
          <div className="bg-surface-container border-l border-outline-variant w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface-container border-b border-outline-variant p-lg flex justify-between items-start z-10">
              <div>
                <h2 className="text-title-md font-bold text-primary-container">{profileCustomer.name}</h2>
                {profileCustomer.phone && <p className="text-on-surface-variant text-body-md">{profileCustomer.phone}</p>}
                {profileCustomer.address && <p className="text-on-surface-variant text-body-md">{profileCustomer.address}</p>}
              </div>
              <button onClick={() => setProfileCustomer(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-lg space-y-lg">
              <div className="grid grid-cols-2 gap-md">
                <div className={`p-md rounded-xl border ${profileCustomer.current_balance > 0 ? 'bg-error-container/20 border-error/30' : 'bg-primary-container/10 border-primary-container/30'}`}>
                  <p className="text-label-caps text-on-surface-variant mb-xs">الرصيد الحالي</p>
                  <p className={`text-title-lg font-bold ${profileCustomer.current_balance > 0 ? 'text-error' : 'text-primary-container'}`}>
                    {formatNum(profileCustomer.current_balance)} {settings?.primary_currency || 'ل.س.ج'}
                  </p>
                </div>
                <div className="p-md rounded-xl border border-outline-variant bg-surface-container-high">
                  <p className="text-label-caps text-on-surface-variant mb-xs">حد الائتمان</p>
                  <p className="text-title-lg font-bold text-on-surface">{formatNum(profileCustomer.credit_limit)} {settings?.primary_currency || 'ل.س.ج'}</p>
                </div>
              </div>

              {profileCustomer.current_balance > 0 && (
                <button onClick={() => { setProfileCustomer(null); setShowSettle(profileCustomer); setSettleAmount(''); }}
                  className="w-full bg-primary-container text-on-primary py-md rounded-lg font-bold hover:brightness-110 flex items-center justify-center gap-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payments</span>
                  تسوية الدين ({formatNum(profileCustomer.current_balance)} {settings?.primary_currency || 'ل.س.ج'})
                </button>
              )}

              <div>
                <h3 className="text-label-caps text-on-surface-variant mb-md border-b border-outline-variant pb-sm">
                  سجل المشتريات ({customerSales.length} فاتورة)
                </h3>
                {customerSales.length === 0 ? (
                  <p className="text-center py-lg text-on-surface-variant">لا توجد مشتريات</p>
                ) : (
                  <div className="space-y-sm">
                    {customerSales.map(sale => (
                      <div key={sale.id} className="bg-surface border border-outline-variant rounded-lg p-md flex justify-between items-center">
                        <div>
                          <p className="font-bold text-primary-container text-body-md">{sale.invoice_number}</p>
                          <p className="text-xs text-on-surface-variant">{formatDate(sale.sale_date)}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-on-surface">{formatNum(sale.total)} {settings?.primary_currency || 'ل.س.ج'}</p>
                          <p className="text-xs text-on-surface-variant">{sale.payment_method === 'cash' ? 'نقداً' : sale.payment_method === 'credit' ? 'آجل' : 'مختلط'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {showSettle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-sm">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-title-sm font-bold text-primary-container">تسوية دين</h2>
              <button onClick={() => setShowSettle(null)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <p className="text-body-md text-on-surface-variant mb-md">
              العميل: <strong className="text-on-surface">{showSettle.name}</strong>
              <br />الرصيد الحالي: <strong className="text-error">{formatNum(showSettle.current_balance)} {currency}</strong>
            </p>
            <div className="mb-lg">
              <label className="text-label-caps text-on-surface-variant mb-xs block">المبلغ المستلم</label>
              <input type="number" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container text-title-sm font-bold"
                value={settleAmount} onChange={e => setSettleAmount(e.target.value)} autoFocus max={showSettle.current_balance} />
              <button onClick={() => setSettleAmount(String(showSettle.current_balance))}
                className="text-xs text-primary-container mt-xs hover:underline">دفع الكامل</button>
            </div>
            <div className="flex gap-md">
              <button onClick={() => setShowSettle(null)} className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">إلغاء</button>
              <button
                onClick={() => settleMutation.mutate({ id: showSettle.id, amount: parseFloat(settleAmount) || 0 })}
                disabled={!settleAmount || parseFloat(settleAmount) <= 0}
                className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold disabled:opacity-50"
              >
                تأكيد التسوية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
