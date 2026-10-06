'use client';

import { useState, useRef, useEffect } from 'react';

const DAYS_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplay(str: string): string {
  if (!str) return '';
  const d = parseDate(str);
  if (!d) return str;
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  min?: string;
  max?: string;
}

export default function ArabicDatePicker({ value, onChange, label, min, max }: Props) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseDate(value) || new Date());
  const [tempSelected, setTempSelected] = useState<string>(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = parseDate(value);
    if (selected) setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setTempSelected(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDay = (day: number) => {
    const d = new Date(year, month, day);
    setTempSelected(toIso(d));
  };

  const confirm = () => {
    onChange(tempSelected);
    setOpen(false);
  };

  const cancel = () => {
    setTempSelected(value);
    setOpen(false);
  };

  const isSelected = (day: number) => {
    const d = toIso(new Date(year, month, day));
    return d === tempSelected;
  };

  const isToday = (day: number) => {
    return toIso(new Date(year, month, day)) === toIso(new Date());
  };

  const isDisabled = (day: number) => {
    const d = toIso(new Date(year, month, day));
    if (min && d < min) return true;
    if (max && d > max) return true;
    return false;
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); }}
        className="flex items-center gap-xs text-label-caps text-on-surface hover:text-primary-container transition-colors whitespace-nowrap"
      >
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '15px' }}>calendar_today</span>
        {value ? formatDisplay(value) : (label || 'اختر تاريخ')}
      </button>

      {/* Dropdown Calendar */}
      {open && (
        <div className="absolute top-full mt-sm left-0 z-50 w-72 bg-surface-container border border-outline-variant rounded-xl shadow-2xl overflow-hidden"
          style={{ minWidth: '280px' }}
        >
          {/* Header */}
          <div className="p-md border-b border-outline-variant">
            <p className="text-label-caps text-on-surface-variant text-center mb-md">
              {label || 'اختر التاريخ'}
            </p>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
              </button>
              <span className="text-title-sm font-bold text-on-surface">
                {MONTHS_AR[month]} {year}
              </span>
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
              </button>
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-outline-variant">
            {DAYS_AR.map(d => (
              <div key={d} className="text-center py-sm text-[10px] text-on-surface-variant font-bold">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 p-sm gap-[2px]">
            {cells.map((day, idx) =>
              day === null ? (
                <div key={idx} />
              ) : (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled(day)}
                  onClick={() => !isDisabled(day) && selectDay(day)}
                  className={`
                    w-full aspect-square flex items-center justify-center rounded-full text-body-md font-bold transition-all
                    ${isSelected(day)
                      ? 'bg-primary-container text-on-primary'
                      : isToday(day)
                        ? 'border border-primary-container text-primary-container hover:bg-primary-container/10'
                        : isDisabled(day)
                          ? 'text-on-surface-variant/30 cursor-not-allowed'
                          : 'text-on-surface hover:bg-surface-variant'
                    }
                  `}
                >
                  {day}
                </button>
              )
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-sm p-md border-t border-outline-variant">
            <button
              type="button"
              onClick={cancel}
              className="flex-1 py-sm rounded-lg border border-outline-variant text-on-surface text-label-caps font-bold hover:bg-surface-variant transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={confirm}
              className="flex-1 py-sm rounded-lg bg-primary-container text-on-primary text-label-caps font-bold hover:brightness-110 transition-all"
            >
              تأكيد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
