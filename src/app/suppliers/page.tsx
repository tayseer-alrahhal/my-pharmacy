'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Supplier, PurchaseOrder } from '@/types';

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', payment_terms_days: 30, notes: '' });
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => fetch('/api/suppliers').then(r => r.json()),
  });

  const { data: orders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders'],
    queryFn: () => fetch('/api/purchase-orders').then(r => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: (data: object) => editItem
      ? fetch(`/api/suppliers/${editItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setShowModal(false); setEditItem(null); },
  });

  const updateOrderStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/purchase-orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });

  const openEdit = (s: Supplier) => {
    setEditItem(s);
    setForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', payment_terms_days: s.payment_terms_days, notes: s.notes || '' });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', phone: '', email: '', address: '', payment_terms_days: 30, notes: '' });
    setShowModal(true);
  };

  const formatNum = (n: number) => n?.toLocaleString('ar-SY') || '0';
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ar-SY') : '—';
  const orderStatusLabels: Record<string, string> = { draft: 'مسودة', sent: 'مُرسَل', received: 'مُستلَم', cancelled: 'ملغي' };

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <h1 className="text-display font-display text-primary-container">الموردون وطلبات الشراء</h1>
        <button onClick={openAdd} className="bg-primary-container text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm hover:brightness-110 font-bold">
          <span className="material-symbols-outlined">add</span>
          مورد جديد
        </button>
      </div>

      <div className="flex gap-md border-b border-outline-variant">
        <button onClick={() => setActiveTab('suppliers')} className={`px-lg py-md font-bold text-title-sm transition-colors ${activeTab === 'suppliers' ? 'text-primary-container border-b-2 border-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
          الموردون ({suppliers.length})
        </button>
        <button onClick={() => setActiveTab('orders')} className={`px-lg py-md font-bold text-title-sm transition-colors ${activeTab === 'orders' ? 'text-primary-container border-b-2 border-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
          طلبات الشراء ({orders.length})
        </button>
      </div>

      {activeTab === 'suppliers' && (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead className="bg-surface-container-highest/50">
              <tr>
                {['اسم المورد', 'الهاتف', 'البريد', 'العنوان', 'مدة الدفع', 'الرصيد', 'إجراءات'].map(h => (
                  <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant">لا يوجد موردون</td></tr>
              ) : suppliers.map(s => (
                <tr key={s.id} className="hover:bg-surface-container-high transition-colors group">
                  <td className="px-lg py-md font-bold text-primary-container">{s.name}</td>
                  <td className="px-lg py-md text-on-surface-variant">{s.phone || '—'}</td>
                  <td className="px-lg py-md text-on-surface-variant">{s.email || '—'}</td>
                  <td className="px-lg py-md text-on-surface-variant">{s.address || '—'}</td>
                  <td className="px-lg py-md text-on-surface-variant">{s.payment_terms_days} يوم</td>
                  <td className="px-lg py-md">
                    <span className={`font-bold ${s.balance < 0 ? 'text-error' : 'text-on-surface'}`}>{formatNum(s.balance)}</span>
                  </td>
                  <td className="px-lg py-md">
                    <button onClick={() => openEdit(s)} className="p-xs text-on-surface-variant hover:text-primary-container opacity-40 group-hover:opacity-100">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead className="bg-surface-container-highest/50">
              <tr>
                {['رقم الطلب', 'المورد', 'التاريخ', 'عدد الأصناف', 'الحالة', 'إجراءات'].map(h => (
                  <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {orders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">لا توجد طلبات شراء</td></tr>
              ) : orders.map((o: PurchaseOrder & { items_count?: number }) => (
                <tr key={o.id} className="hover:bg-surface-container-high transition-colors">
                  <td className="px-lg py-md font-bold text-primary-container">{o.po_number}</td>
                  <td className="px-lg py-md text-on-surface">{o.supplier_name || '—'}</td>
                  <td className="px-lg py-md text-on-surface-variant">{formatDate(o.created_at)}</td>
                  <td className="px-lg py-md text-on-surface">{o.items_count || 0} صنف</td>
                  <td className="px-lg py-md">
                    <span className={`px-sm py-xs rounded text-label-caps border ${
                      o.status === 'received' ? 'border-primary-container text-primary-container' :
                      o.status === 'sent' ? 'border-[#F59E0B] text-[#F59E0B]' :
                      o.status === 'cancelled' ? 'border-error text-error' :
                      'border-outline-variant text-on-surface-variant'
                    }`}>
                      {orderStatusLabels[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-lg py-md">
                    <div className="flex gap-sm">
                      {o.status === 'draft' && (
                        <button onClick={() => updateOrderStatus.mutate({ id: o.id, status: 'sent' })}
                          className="text-xs px-sm py-xs border border-outline-variant rounded hover:border-[#F59E0B] text-on-surface-variant hover:text-[#F59E0B]">
                          إرسال
                        </button>
                      )}
                      {o.status === 'sent' && (
                        <button onClick={() => updateOrderStatus.mutate({ id: o.id, status: 'received' })}
                          className="text-xs px-sm py-xs border border-outline-variant rounded hover:border-primary-container text-on-surface-variant hover:text-primary-container">
                          استلام
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-title-sm font-bold text-primary-container">{editItem ? 'تعديل مورد' : 'مورد جديد'}</h2>
              <button onClick={() => setShowModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">اسم المورد *</label>
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
                  <label className="text-label-caps text-on-surface-variant mb-xs block">البريد الإلكتروني</label>
                  <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">العنوان</label>
                <input className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">مدة الدفع (أيام)</label>
                <input type="number" className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none"
                  value={form.payment_terms_days} onChange={e => setForm({ ...form, payment_terms_days: parseInt(e.target.value) || 30 })} />
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
    </div>
  );
}
