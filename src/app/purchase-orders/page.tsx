'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PurchaseInvoiceModal } from '@/components/purchase/PurchaseInvoiceModal';

type Supplier = { id: string; name: string };
type POItem = { product_id: string; product_name: string; quantity_ordered: number; unit_price: number };
type PO = { id: string; po_number: string; supplier_id: string | null; supplier_name: string | null; status: string; total_amount: number; notes: string | null; created_at: string };
type PODetail = PO & { items: { id: string; product_name: string; unit?: string; quantity_ordered: number; unit_price: number }[] };

const statusLabel: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'مسودة',   cls: 'text-on-surface-variant bg-surface-container-high border-outline-variant' },
  sent:      { label: 'مُرسل',   cls: 'text-[#F59E0B] bg-yellow-500/10 border-yellow-500/30' },
  received:  { label: 'مستلم',  cls: 'text-primary-container bg-primary-container/10 border-primary-container/30' },
  cancelled: { label: 'ملغي',   cls: 'text-error bg-error-container/20 border-error/30' },
};

export default function PurchaseOrdersPage() {
  const [showModal, setShowModal]         = useState(false);
  const [supplierId, setSupplierId]       = useState('');
  const [notes, setNotes]                 = useState('');
  const [poItems, setPoItems]             = useState<POItem[]>([]);
  const [toast, setToast]                 = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [invoicePO, setInvoicePO]         = useState<PODetail | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then(r => r.json()) });
  const currency = settings?.primary_currency || 'ل.س.ج';

  const { data: pos = [], isLoading } = useQuery<PO[]>({
    queryKey: ['purchase-orders'],
    queryFn: () => fetch('/api/purchase-orders').then(r => r.json()),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => fetch('/api/suppliers').then(r => r.json()),
  });

  const { data: products = [] } = useQuery<{ id: string; name_ar: string; unit: string }[]>({
    queryKey: ['products-list'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const createMutation = useMutation({
    mutationFn: (data: object) =>
      fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast(`تم إنشاء أمر الشراء ${data.po_number}`);
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowModal(false);
      setSupplierId('');
      setNotes('');
      setPoItems([]);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/purchase-orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast('تم تحديث الحالة');
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const openInvoice = async (poId: string) => {
    setLoadingInvoice(poId);
    try {
      const data = await fetch(`/api/purchase-orders/${poId}`).then(r => r.json());
      setInvoicePO(data);
    } catch {
      showToast('تعذّر تحميل تفاصيل الأمر', 'error');
    } finally {
      setLoadingInvoice(null);
    }
  };

  const addItem = () => setPoItems(prev => [...prev, { product_id: '', product_name: '', quantity_ordered: 1, unit_price: 0 }]);

  const updateItem = (idx: number, field: keyof POItem, value: string | number) => {
    setPoItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'product_id') {
        const p = (products as { id: string; name_ar: string }[]).find(p => p.id === value);
        return { ...item, product_id: value as string, product_name: p?.name_ar || '' };
      }
      return { ...item, [field]: value };
    }));
  };

  const removeItem = (idx: number) => setPoItems(prev => prev.filter((_, i) => i !== idx));

  const totalAmount = poItems.reduce((s, i) => s + i.quantity_ordered * i.unit_price, 0);

  const handleSubmit = () => {
    if (poItems.length === 0) { showToast('أضف صنفاً واحداً على الأقل', 'error'); return; }
    if (poItems.some(i => !i.product_id)) { showToast('اختر منتجاً لكل صف', 'error'); return; }
    createMutation.mutate({ supplier_id: supplierId || null, notes: notes || null, items: poItems, total_amount: totalAmount });
  };

  const formatNum  = (n: number) => (n || 0).toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="p-margin flex flex-col gap-lg">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-lg py-sm rounded-lg border font-bold shadow-lg ${
          toast.type === 'success' ? 'bg-surface-container border-primary-container text-primary-container' : 'bg-error-container border-error text-on-error-container'
        }`}>{toast.msg}</div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">أوامر الشراء</h1>
          <p className="text-body-md text-on-surface-variant">إدارة طلبات الشراء من الموردين</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-primary-container text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm hover:brightness-110 font-bold">
          <span className="material-symbols-outlined">add</span>
          أمر شراء جديد
        </button>
      </div>

      {/* ── Orders Table ── */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant">
              {['رقم الأمر', 'المورد', 'التاريخ', 'الإجمالي', 'الحالة', 'الإجراءات'].map(h => (
                <th key={h} className="px-lg py-md text-right text-label-caps text-on-surface-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : pos.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] block mb-sm">shopping_cart</span>
                لا توجد أوامر شراء
              </td></tr>
            ) : pos.map(po => {
              const st = statusLabel[po.status] || { label: po.status, cls: '' };
              return (
                <tr key={po.id} className="hover:bg-surface-container-high">
                  <td className="px-lg py-md font-bold text-primary-container">{po.po_number}</td>
                  <td className="px-lg py-md text-on-surface">{po.supplier_name || 'بدون مورد'}</td>
                  <td className="px-lg py-md text-on-surface-variant">{formatDate(po.created_at)}</td>
                  <td className="px-lg py-md font-bold text-on-surface">{formatNum(po.total_amount)} {currency}</td>
                  <td className="px-lg py-md">
                    <span className={`px-sm py-xs rounded-full text-label-caps border ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-lg py-md">
                    <div className="flex gap-xs flex-wrap items-center">
                      {/* Print invoice button */}
                      <button
                        onClick={() => openInvoice(po.id)}
                        disabled={loadingInvoice === po.id}
                        title="عرض الفاتورة"
                        className="px-sm py-xs text-xs bg-surface-container-high border border-outline-variant text-on-surface-variant rounded hover:text-primary-container hover:border-primary-container/40 flex items-center gap-xs disabled:opacity-50"
                      >
                        {loadingInvoice === po.id
                          ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px' }}>progress_activity</span>
                          : <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>receipt_long</span>
                        }
                        فاتورة
                      </button>

                      {po.status === 'draft' && (
                        <button onClick={() => updateStatusMutation.mutate({ id: po.id, status: 'sent' })}
                          className="px-sm py-xs text-xs bg-yellow-500/10 border border-yellow-500/30 text-[#F59E0B] rounded hover:brightness-110">
                          إرسال
                        </button>
                      )}
                      {po.status === 'sent' && (
                        <button onClick={() => updateStatusMutation.mutate({ id: po.id, status: 'received' })}
                          className="px-sm py-xs text-xs bg-primary-container/10 border border-primary-container/30 text-primary-container rounded hover:brightness-110">
                          استلام
                        </button>
                      )}
                      {(po.status === 'draft' || po.status === 'sent') && (
                        <button onClick={() => { if (!confirm('هل تريد إلغاء هذا الأمر؟')) return; updateStatusMutation.mutate({ id: po.id, status: 'cancelled' }); }}
                          className="px-sm py-xs text-xs bg-error-container/20 border border-error/30 text-error rounded hover:brightness-110">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Invoice Modal ── */}
      {invoicePO && (
        <PurchaseInvoiceModal
          po={invoicePO}
          settings={settings || {}}
          onClose={() => setInvoicePO(null)}
        />
      )}

      {/* ── Create PO Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-md">
          <div className="bg-surface-container border border-outline-variant rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-xl border-b border-outline-variant flex justify-between items-center sticky top-0 bg-surface-container z-10">
              <h2 className="text-title-md font-bold text-primary-container">أمر شراء جديد</h2>
              <button onClick={() => { setShowModal(false); setPoItems([]); }}
                className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-xl space-y-lg">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-sm block">المورد (اختياري)</label>
                  <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-md text-on-surface outline-none focus:border-primary-container">
                    <option value="">بدون مورد محدد</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-sm block">ملاحظات</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-md text-on-surface outline-none focus:border-primary-container"
                    placeholder="أي ملاحظات..." />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-sm">
                  <label className="text-label-caps text-on-surface-variant">الأصناف المطلوبة</label>
                  <button onClick={addItem}
                    className="flex items-center gap-xs px-md py-xs bg-primary-container/10 border border-primary-container/30 text-primary-container rounded text-body-md hover:bg-primary-container/20">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                    إضافة صنف
                  </button>
                </div>
                <div className="space-y-sm">
                  {poItems.length === 0 && (
                    <p className="text-center py-lg text-on-surface-variant border border-dashed border-outline-variant rounded-lg">
                      أضف الأصناف المطلوبة
                    </p>
                  )}
                  {poItems.map((item, idx) => (
                    <div key={idx} className="flex gap-sm items-start bg-surface border border-outline-variant rounded-lg p-md">
                      <div className="flex-1">
                        <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}
                          className="w-full bg-surface-container border border-outline-variant rounded p-sm text-on-surface outline-none focus:border-primary-container text-sm mb-sm">
                          <option value="">اختر دواء...</option>
                          {(products as { id: string; name_ar: string }[]).map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                        </select>
                        <div className="flex gap-sm">
                          <div className="flex-1">
                            <label className="text-xs text-on-surface-variant">الكمية</label>
                            <input type="number" min="1" value={item.quantity_ordered}
                              onChange={e => updateItem(idx, 'quantity_ordered', parseInt(e.target.value) || 1)}
                              className="w-full bg-surface-container border border-outline-variant rounded p-sm text-on-surface outline-none focus:border-primary-container text-sm text-left" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-on-surface-variant">سعر الوحدة (تقديري)</label>
                            <input type="number" min="0" value={item.unit_price}
                              onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-surface-container border border-outline-variant rounded p-sm text-on-surface outline-none focus:border-primary-container text-sm text-left" />
                          </div>
                          <div className="flex-1 text-sm text-on-surface-variant mt-4">
                            = {formatNum(item.quantity_ordered * item.unit_price)} {currency}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeItem(idx)} className="text-error hover:brightness-125 mt-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {poItems.length > 0 && (
                <div className="bg-primary-container/10 border border-primary-container rounded-lg p-md">
                  <div className="flex justify-between font-bold text-primary-container text-title-sm">
                    <span>الإجمالي التقديري</span>
                    <span>{formatNum(totalAmount)} {currency}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-md">
                <button onClick={() => { setShowModal(false); setPoItems([]); }}
                  className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">
                  إلغاء
                </button>
                <button onClick={handleSubmit} disabled={createMutation.isPending}
                  className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold hover:brightness-110 disabled:opacity-50">
                  {createMutation.isPending ? 'جاري الحفظ...' : 'إنشاء أمر الشراء'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
