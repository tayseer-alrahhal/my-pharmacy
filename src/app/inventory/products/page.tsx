'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, Category } from '@/types';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name_ar: '', name_en: '', barcode: '', category_id: '', unit: 'علبة',
    min_stock: 10, requires_prescription: false, notes: '', selling_price: ''
  });
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', search, categoryFilter],
    queryFn: () => {
      let url = '/api/products?';
      if (search) url += `q=${encodeURIComponent(search)}&`;
      if (categoryFilter) url += `category_id=${categoryFilter}`;
      return fetch(url).then(r => r.json());
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/settings').then(r => r.json()),
  });

  const currency = settings?.primary_currency || 'ل.س.ج';

  const saveMutation = useMutation({
    mutationFn: (data: object) => editProduct
      ? fetch(`/api/products/${editProduct.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowModal(false);
      setEditProduct(null);
      setForm({ name_ar: '', name_en: '', barcode: '', category_id: '', unit: 'علبة', min_stock: 10, requires_prescription: false, notes: '', selling_price: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name_ar: p.name_ar, name_en: p.name_en || '', barcode: p.barcode || '',
      category_id: p.category_id || '', unit: p.unit, min_stock: p.min_stock,
      requires_prescription: p.requires_prescription, notes: p.notes || '',
      selling_price: p.selling_price ? String(p.selling_price) : '',
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name_ar: '', name_en: '', barcode: '', category_id: '', unit: 'علبة', min_stock: 10, requires_prescription: false, notes: '', selling_price: '' });
    setShowModal(true);
  };

  const formatNum = (n: number) => n?.toLocaleString('ar-SY') || '0';

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => (p.total_quantity || 0) <= p.min_stock && (p.total_quantity || 0) > 0).length;
  const outOfStockCount = products.filter(p => (p.total_quantity || 0) === 0).length;
  const totalValue = products.reduce((s, p) => s + (p.total_quantity || 0) * (p.selling_price || 0), 0);

  return (
    <div className="p-margin flex flex-col gap-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">إدارة المخزون</h1>
          <p className="text-body-md text-on-surface-variant">كتالوج الأدوية وتتبع المخزون</p>
        </div>
        <div className="flex gap-md">
          <button
            onClick={openAdd}
            className="bg-primary-container text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm hover:brightness-110 font-bold"
          >
            <span className="material-symbols-outlined">add</span>
            إضافة دواء جديد
          </button>
        </div>
      </div>

      {/* Inventory Sub-nav */}
      <div className="flex gap-md border-b border-outline-variant">
        <button className="px-lg py-md text-primary-container border-b-2 border-primary-container font-bold text-title-sm">كتالوج الأدوية</button>
        <a href="/inventory/batches" className="px-lg py-md text-on-surface-variant hover:text-on-surface transition-colors text-title-sm">تتبع الدفعات</a>
        <a href="/inventory/grn" className="px-lg py-md text-on-surface-variant hover:text-on-surface transition-colors text-title-sm">استقبال بضاعة</a>
        <a href="/inventory/adjustments" className="px-lg py-md text-on-surface-variant hover:text-on-surface transition-colors text-title-sm">تعديلات المخزون</a>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-gutter">
        {[
          { label: 'إجمالي الأصناف', value: totalProducts.toString(), icon: 'inventory', color: 'text-primary-fixed-dim' },
          { label: 'أصناف منتهية', value: outOfStockCount.toString(), icon: 'running_with_errors', color: 'text-error', badge: 'عاجل', badgeColor: 'bg-error-container/20 text-error' },
          { label: 'تحت الحد الأدنى', value: lowStockCount.toString(), icon: 'low_priority', color: 'text-secondary', badge: 'تنبيه', badgeColor: 'bg-secondary-container/20 text-secondary' },
          { label: 'قيمة المخزون', value: formatNum(totalValue), icon: 'receipt_long', color: 'text-primary', unit: currency },
        ].map((m, i) => (
          <div key={i} className="bg-surface-container border border-outline-variant p-md rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className={`material-symbols-outlined ${m.color}`}>{m.icon}</span>
              {m.badge && <span className={`text-xs px-sm py-xs rounded ${m.badgeColor}`}>{m.badge}</span>}
            </div>
            <div className="mt-md">
              <p className="text-on-surface-variant text-label-caps">{m.label}</p>
              <p className={`text-headline-md font-bold mt-xs ${m.color}`}>
                {m.value} {m.unit && <span className="text-sm">{m.unit}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-surface-container border border-outline-variant p-md rounded-xl flex items-center gap-md">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            className="w-full bg-background border border-outline-variant rounded-lg py-sm pr-xl pl-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
            placeholder="البحث عن دواء، باركود..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-background border border-outline-variant rounded-lg py-sm px-md text-on-surface-variant outline-none focus:border-primary-container"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">كل التصنيفات</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead className="bg-surface-container-highest/50">
            <tr>
              {['اسم الدواء', 'الباركود', 'التصنيف', 'الوحدة', 'الحد الأدنى', 'المخزون', 'سعر البيع', 'الإجراءات'].map(h => (
                <th key={h} className="px-lg py-md text-label-caps text-on-surface-variant border-b border-outline-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant">لا توجد أدوية</td></tr>
            ) : products.map(p => {
              const isLow = (p.total_quantity || 0) <= p.min_stock && (p.total_quantity || 0) > 0;
              const isOut = (p.total_quantity || 0) === 0;
              return (
                <tr key={p.id} className="hover:bg-surface-container-high transition-colors group">
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: '18px' }}>medication</span>
                      </div>
                      <div>
                        <p className="text-body-lg font-bold text-primary-container">{p.name_ar}</p>
                        {p.name_en && <p className="text-xs text-on-surface-variant">{p.name_en}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-md font-mono text-on-surface-variant text-sm">{p.barcode || '—'}</td>
                  <td className="px-lg py-md">
                    <span className="bg-surface-container-highest text-on-surface-variant px-sm py-xs rounded text-xs">{p.category_name || '—'}</span>
                  </td>
                  <td className="px-lg py-md text-on-surface-variant">{p.unit}</td>
                  <td className="px-lg py-md text-on-surface-variant">{p.min_stock}</td>
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <span className={`text-title-sm font-bold ${isOut ? 'text-error' : isLow ? 'text-[#F59E0B]' : 'text-primary-container'}`}>
                        {p.total_quantity || 0}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${isOut ? 'bg-error' : isLow ? 'bg-[#F59E0B]' : 'bg-primary-container'}`}></span>
                    </div>
                  </td>
                  <td className="px-lg py-md text-primary-fixed-dim font-bold">{p.selling_price ? formatNum(p.selling_price) : '—'}</td>
                  <td className="px-lg py-md">
                    <div className="flex gap-sm opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)} className="p-xs text-on-surface-variant hover:text-primary-container">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button onClick={() => confirm('تأكيد الحذف؟') && deleteMutation.mutate(p.id)} className="p-xs text-on-surface-variant hover:text-error">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-lg flex justify-between items-center bg-surface-container-low border-t border-outline-variant">
          <p className="text-body-md text-on-surface-variant">عرض {products.length} صنف</p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-title-sm font-bold text-primary-container">
                {editProduct ? 'تعديل دواء' : 'إضافة دواء جديد'}
              </h2>
              <button onClick={() => setShowModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">الاسم بالعربي *</label>
                  <input
                    className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                    value={form.name_ar}
                    onChange={e => setForm({ ...form, name_ar: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">الاسم بالإنجليزي</label>
                  <input
                    className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                    value={form.name_en}
                    onChange={e => setForm({ ...form, name_en: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">الباركود</label>
                  <input
                    className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                    value={form.barcode}
                    onChange={e => setForm({ ...form, barcode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">التصنيف</label>
                  <select
                    className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                    value={form.category_id}
                    onChange={e => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">اختر التصنيف</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">الوحدة</label>
                  <select
                    className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                  >
                    {['علبة', 'حبة', 'زجاجة', 'أنبوب', 'مل', 'أمبول', 'قطعة', 'أخرى'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-xs block">الحد الأدنى للمخزون</label>
                  <input
                    type="number"
                    className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                    value={form.min_stock}
                    onChange={e => setForm({ ...form, min_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              {/* Selling Price */}
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">سعر البيع</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container pl-lg"
                    value={form.selling_price}
                    onChange={e => setForm({ ...form, selling_price: e.target.value })}
                    placeholder="0"
                  />
                  <span className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md pointer-events-none">
                    {settings?.primary_currency || 'ل.س.ج'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <input
                  type="checkbox"
                  id="prescription"
                  checked={form.requires_prescription}
                  onChange={e => setForm({ ...form, requires_prescription: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="prescription" className="text-body-md text-on-surface cursor-pointer">يحتاج وصفة طبية</label>
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-xs block">ملاحظات</label>
                <textarea
                  className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-md mt-lg">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">
                إلغاء
              </button>
              <button
                onClick={() => form.name_ar && saveMutation.mutate(form)}
                disabled={!form.name_ar || saveMutation.isPending}
                className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold hover:brightness-110 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
