'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Category = { id: string; name_ar: string; name_en: string | null };

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat]     = useState<Category | null>(null);
  const [form, setForm]           = useState({ name_ar: '', name_en: '' });
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const qc = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const saveMutation = useMutation({
    mutationFn: (data: object) => editCat
      ? fetch(`/api/categories/${editCat.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast(editCat ? 'تم التحديث' : 'تم إضافة التصنيف');
      qc.invalidateQueries({ queryKey: ['categories'] });
      setShowModal(false);
      setEditCat(null);
      setForm({ name_ar: '', name_en: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/categories/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast('تم حذف التصنيف');
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setForm({ name_ar: cat.name_ar, name_en: cat.name_en || '' });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditCat(null);
    setForm({ name_ar: '', name_en: '' });
    setShowModal(true);
  };

  const handleDelete = (cat: Category) => {
    if (!confirm(`هل تريد حذف تصنيف "${cat.name_ar}"؟`)) return;
    deleteMutation.mutate(cat.id);
  };

  return (
    <div className="p-margin flex flex-col gap-lg">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-lg py-sm rounded-lg border font-bold shadow-lg ${
          toast.type === 'success' ? 'bg-surface-container border-primary-container text-primary-container' : 'bg-error-container border-error text-on-error-container'
        }`}>{toast.msg}</div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-display font-display text-primary-container">إدارة التصنيفات</h1>
          <p className="text-body-md text-on-surface-variant">تصنيفات الأدوية والمنتجات</p>
        </div>
        <button onClick={openAdd}
          className="bg-primary-container text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm hover:brightness-110 font-bold">
          <span className="material-symbols-outlined">add</span>
          تصنيف جديد
        </button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant">
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">اسم التصنيف (عربي)</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">الاسم (إنجليزي)</th>
              <th className="px-lg py-md text-right text-label-caps text-on-surface-variant">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-xl text-on-surface-variant">جاري التحميل...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-xl text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] block mb-sm">category</span>
                لا توجد تصنيفات — أضف تصنيفاً جديداً
              </td></tr>
            ) : categories.map(cat => (
              <tr key={cat.id} className="hover:bg-surface-container-high">
                <td className="px-lg py-md font-bold text-on-surface">{cat.name_ar}</td>
                <td className="px-lg py-md text-on-surface-variant">{cat.name_en || '—'}</td>
                <td className="px-lg py-md">
                  <div className="flex gap-sm">
                    <button onClick={() => openEdit(cat)}
                      className="flex items-center gap-xs px-md py-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface hover:bg-surface-variant text-body-md">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                      تعديل
                    </button>
                    <button onClick={() => handleDelete(cat)}
                      className="flex items-center gap-xs px-md py-xs bg-error-container border border-error rounded-lg text-on-error-container hover:brightness-110 text-body-md">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-md">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-sm">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-title-md font-bold text-primary-container">
                {editCat ? 'تعديل تصنيف' : 'تصنيف جديد'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditCat(null); }}
                className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-md">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-sm block">الاسم بالعربية *</label>
                <input
                  className="w-full bg-surface border border-outline-variant rounded-lg p-md text-on-surface outline-none focus:border-primary-container"
                  value={form.name_ar}
                  onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                  placeholder="مثال: مضادات حيوية"
                />
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-sm block">الاسم بالإنجليزية (اختياري)</label>
                <input
                  className="w-full bg-surface border border-outline-variant rounded-lg p-md text-on-surface outline-none focus:border-primary-container"
                  value={form.name_en}
                  onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                  placeholder="Antibiotics"
                />
              </div>

              <div className="flex gap-md pt-sm">
                <button onClick={() => { setShowModal(false); setEditCat(null); }}
                  className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold">
                  إلغاء
                </button>
                <button
                  onClick={() => { if (!form.name_ar.trim()) return; saveMutation.mutate(form); }}
                  disabled={saveMutation.isPending || !form.name_ar.trim()}
                  className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold hover:brightness-110 disabled:opacity-50">
                  {saveMutation.isPending ? 'جاري الحفظ...' : editCat ? 'حفظ التعديل' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
