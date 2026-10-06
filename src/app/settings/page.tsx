'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type FormState = {
  pharmacy_name: string;
  pharmacy_phone: string;
  pharmacy_address: string;
  tax_rate: string;
  max_discount_percent: string;
  expiry_warning_days_1: string;
  expiry_warning_days_2: string;
  primary_currency: string;
  secondary_currency: string;
  exchange_rate: string;
  syp_new_to_usd: string;
  receipt_footer: string;
  backup_path: string;
};

const CURRENCY_OPTIONS = [
  { value: 'ل.س.ج', label: 'ليرة سورية جديدة', symbol: 'ل.س.ج', flag: '🇸🇾' },
  { value: 'USD',   label: 'دولار أمريكي',        symbol: '$',     flag: '🇺🇸' },
];

const defaultForm: FormState = {
  pharmacy_name: '',
  pharmacy_phone: '',
  pharmacy_address: '',
  tax_rate: '0',
  max_discount_percent: '20',
  expiry_warning_days_1: '30',
  expiry_warning_days_2: '60',
  primary_currency: 'ل.س.ج',
  secondary_currency: 'USD',
  exchange_rate: '150',
  syp_new_to_usd: '150',
  receipt_footer: 'شكراً لزيارتكم',
  backup_path: '',
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}

function InputField({ label, value, onChange, type = 'text', placeholder = '' }: FieldProps) {
  return (
    <div>
      <label className="text-label-caps text-on-surface-variant mb-xs block">{label}</label>
      <input
        type={type}
        className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container transition-colors"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saved, setSaved] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/settings').then(r => r.json()),
  });

  const { data: backupsData } = useQuery({
    queryKey: ['backups'],
    queryFn: () => fetch('/api/backup').then(r => r.json()),
  });

  useEffect(() => {
    if (settings) {
      setForm(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const set = (field: keyof FormState) => (val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const saveMutation = useMutation({
    mutationFn: (data: object) =>
      fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const backupMutation = useMutation({
    mutationFn: () => fetch('/api/backup', { method: 'POST' }).then(r => r.json()),
    onSuccess: (data) => {
      setBackupStatus(data.success ? 'تم النسخ الاحتياطي بنجاح' : 'فشل النسخ الاحتياطي');
      qc.invalidateQueries({ queryKey: ['backups'] });
      setTimeout(() => setBackupStatus(null), 3000);
    },
  });

  return (
    <div className="p-margin flex flex-col gap-lg max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-display font-display text-primary-container">الإعدادات</h1>
        <div className="flex gap-md items-center">
          {saved && (
            <span className="text-primary-container text-body-md flex items-center gap-xs">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
              تم الحفظ
            </span>
          )}
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="bg-primary-container text-on-primary px-lg py-sm rounded-lg font-bold hover:brightness-110 disabled:opacity-50 flex items-center gap-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* Pharmacy Info */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg">
        <h2 className="text-title-sm font-bold text-primary-container mb-lg flex items-center gap-sm">
          <span className="material-symbols-outlined">storefront</span>
          بيانات الصيدلية
        </h2>
        <div className="space-y-md">
          <InputField label="اسم الصيدلية" value={form.pharmacy_name} onChange={set('pharmacy_name')} />
          <div className="grid grid-cols-2 gap-md">
            <InputField label="رقم الهاتف" value={form.pharmacy_phone} onChange={set('pharmacy_phone')} />
            <InputField label="العنوان" value={form.pharmacy_address} onChange={set('pharmacy_address')} />
          </div>
          <InputField label="نص تذييل الإيصال" value={form.receipt_footer} onChange={set('receipt_footer')} placeholder="شكراً لزيارتكم" />
        </div>
      </div>

      {/* Financial Settings */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg">
        <h2 className="text-title-sm font-bold text-primary-container mb-lg flex items-center gap-sm">
          <span className="material-symbols-outlined">payments</span>
          الإعدادات المالية
        </h2>
        <div className="space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <InputField label="نسبة الضريبة (%)" value={form.tax_rate} onChange={set('tax_rate')} type="number" />
            <InputField label="الحد الأقصى للخصم (%)" value={form.max_discount_percent} onChange={set('max_discount_percent')} type="number" />
          </div>

          {/* Currency Selector */}
          <div>
            <label className="text-label-caps text-on-surface-variant mb-xs block">العملة الأساسية</label>
            <div className="grid grid-cols-3 gap-sm">
              {CURRENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, primary_currency: opt.value }))}
                  className={`flex flex-col items-center gap-xs py-md px-sm rounded-lg border-2 transition-all font-bold ${
                    form.primary_currency === opt.value
                      ? 'border-primary-container bg-primary-container/10 text-primary-container'
                      : 'border-outline-variant bg-surface text-on-surface-variant hover:border-primary-container/50'
                  }`}
                >
                  <span className="text-2xl">{opt.flag}</span>
                  <span className="text-xs font-bold">{opt.symbol}</span>
                  <span className="text-[10px] text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Exchange Rates */}
          <div className="bg-surface border border-outline-variant rounded-xl p-md">
            <p className="text-label-caps text-on-surface-variant mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>currency_exchange</span>
              سعر الصرف (يدوي)
            </p>
            <div>
              <label className="text-label-caps text-on-surface-variant mb-xs block">سعر الدولار بالليرة السورية الجديدة (ل.س.ج)</label>
              <div className="flex items-center gap-xs">
                <input
                  type="number"
                  className="w-full bg-surface border border-outline-variant rounded-lg p-sm text-on-surface outline-none focus:border-primary-container transition-colors text-left"
                  value={form.syp_new_to_usd}
                  onChange={e => setForm(prev => ({ ...prev, syp_new_to_usd: e.target.value, exchange_rate: e.target.value }))}
                  placeholder="150"
                />
                <span className="text-on-surface-variant text-sm whitespace-nowrap">ل.س.ج / $</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-xs">
                فئات: 10 • 25 • 50 • 100 • 200 • 500 ليرة سورية جديدة
              </p>
            </div>
            {/* Live rate preview */}
            <div className="mt-md pt-md border-t border-outline-variant grid grid-cols-2 gap-sm text-center">
              <div className="bg-surface-container rounded-lg p-sm">
                <p className="text-[10px] text-on-surface-variant">1 $ =</p>
                <p className="font-bold text-primary-container text-sm">{Number(form.syp_new_to_usd || 0).toLocaleString('ar-SY')} ل.س.ج</p>
              </div>
              <div className="bg-surface-container rounded-lg p-sm">
                <p className="text-[10px] text-on-surface-variant">العملة المختارة</p>
                <p className="font-bold text-primary-container text-sm">
                  {CURRENCY_OPTIONS.find(o => o.value === form.primary_currency)?.symbol || form.primary_currency}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Settings */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg">
        <h2 className="text-title-sm font-bold text-primary-container mb-lg flex items-center gap-sm">
          <span className="material-symbols-outlined">inventory_2</span>
          إعدادات المخزون
        </h2>
        <div className="space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <InputField label="تنبيه انتهاء صلاحية (أيام - المستوى 1)" value={form.expiry_warning_days_1} onChange={set('expiry_warning_days_1')} type="number" />
            <InputField label="تنبيه انتهاء صلاحية (أيام - المستوى 2)" value={form.expiry_warning_days_2} onChange={set('expiry_warning_days_2')} type="number" />
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg">
        <h2 className="text-title-sm font-bold text-primary-container mb-lg flex items-center gap-sm">
          <span className="material-symbols-outlined">backup</span>
          النسخ الاحتياطي
        </h2>
        <div className="flex items-center gap-md mb-lg">
          <button
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            className="bg-surface-container-high border border-outline-variant text-on-surface px-lg py-sm rounded-lg font-bold hover:bg-surface-variant flex items-center gap-sm"
          >
            <span className="material-symbols-outlined">cloud_upload</span>
            {backupMutation.isPending ? 'جاري النسخ...' : 'نسخ احتياطي الآن'}
          </button>
          {backupStatus && (
            <span className={`text-body-md flex items-center gap-xs ${backupStatus.includes('نجاح') ? 'text-primary-container' : 'text-error'}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {backupStatus.includes('نجاح') ? 'check_circle' : 'error'}
              </span>
              {backupStatus}
            </span>
          )}
        </div>
        {backupsData?.backups?.length > 0 && (
          <div>
            <p className="text-label-caps text-on-surface-variant mb-sm">النسخ المتاحة:</p>
            <div className="space-y-xs max-h-40 overflow-y-auto">
              {backupsData.backups.map((b: string) => (
                <div key={b} className="flex items-center gap-sm px-md py-xs bg-surface-container-high rounded border border-outline-variant">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>folder</span>
                  <span className="text-body-md text-on-surface">{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
