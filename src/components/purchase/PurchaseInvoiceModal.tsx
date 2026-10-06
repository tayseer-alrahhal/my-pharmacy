'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

type POItem = {
  id: string;
  product_name: string;
  unit?: string;
  quantity_ordered: number;
  unit_price: number;
};

type PODetail = {
  id: string;
  po_number: string;
  supplier_name: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  items: POItem[];
};

type Settings = {
  pharmacy_name?: string;
  pharmacy_phone?: string;
  pharmacy_address?: string;
  primary_currency?: string;
};

interface Props {
  po: PODetail;
  settings: Settings;
  onClose: () => void;
}

const statusLabel: Record<string, string> = {
  draft: 'مسودة',
  sent: 'مُرسل',
  received: 'مستلم',
  cancelled: 'ملغي',
};

export function PurchaseInvoiceModal({ po, settings, onClose }: Props) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const currency = settings.primary_currency || 'ل.س.ج';
  const pharmacyName = settings.pharmacy_name || 'صيدلية الرحال';
  const pharmacyPhone = settings.pharmacy_phone || '';
  const pharmacyAddress = settings.pharmacy_address || '';

  const total = po.items.reduce((s, i) => s + i.quantity_ordered * i.unit_price, 0);
  const formatNum = (n: number) =>
    (n || 0).toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, po.po_number, {
        format: 'CODE128',
        width: 1.8,
        height: 48,
        displayValue: true,
        fontOptions: '',
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 4,
        fontSize: 11,
        background: '#ffffff',
        lineColor: '#0d141d',
        margin: 6,
      });
    }
  }, [po.po_number]);

  const handlePrint = () => {
    const svgEl = barcodeRef.current;
    const svgData = svgEl ? new XMLSerializer().serializeToString(svgEl) : '';
    const svgBase64 = svgData
      ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
      : '';

    const rows = po.items
      .map(
        (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.product_name}</td>
          <td>${item.unit || '—'}</td>
          <td>${item.quantity_ordered}</td>
          <td>${formatNum(item.unit_price)}</td>
          <td>${formatNum(item.quantity_ordered * item.unit_price)}</td>
        </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>فاتورة ${po.po_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; }
    .invoice-wrap { max-width: 720px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d141d; padding-bottom: 14px; margin-bottom: 14px; }
    .pharmacy-info h1 { font-size: 22px; font-weight: 700; color: #0d141d; }
    .pharmacy-info p { font-size: 12px; color: #555; margin-top: 2px; }
    .po-badge { text-align: left; }
    .po-badge .po-num { font-size: 18px; font-weight: 700; color: #0d141d; }
    .po-badge .po-date { font-size: 12px; color: #555; margin-top: 3px; }
    .po-badge .status { display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 10px 14px; }
    .meta-item label { font-size: 10px; color: #888; display: block; margin-bottom: 1px; text-transform: uppercase; letter-spacing: .5px; }
    .meta-item span { font-size: 13px; font-weight: 600; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    thead tr { background: #0d141d; color: #b6f36a; }
    thead th { padding: 9px 10px; font-size: 12px; font-weight: 600; text-align: right; }
    tbody tr:nth-child(even) { background: #f4f4f4; }
    tbody tr td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #e0e0e0; }
    tbody tr td:first-child { color: #888; font-size: 11px; }
    tbody tr td:last-child { font-weight: 600; }
    .totals { display: flex; justify-content: flex-start; margin-bottom: 16px; }
    .totals-box { background: #0d141d; color: #b6f36a; border-radius: 8px; padding: 12px 24px; min-width: 220px; }
    .totals-box .total-label { font-size: 11px; opacity: .8; margin-bottom: 2px; }
    .totals-box .total-val { font-size: 22px; font-weight: 700; }
    .notes-box { background: #fff8e1; border: 1px solid #ffe082; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 12px; color: #5d4037; }
    .barcode-section { display: flex; flex-direction: column; align-items: center; border-top: 1px dashed #ccc; padding-top: 14px; }
    .barcode-section img { max-width: 260px; }
    .barcode-label { font-size: 10px; color: #888; margin-top: 4px; }
    .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 12px; border-top: 1px solid #eee; padding-top: 8px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
<div class="invoice-wrap">
  <div class="header">
    <div class="pharmacy-info">
      <h1>${pharmacyName}</h1>
      ${pharmacyPhone ? `<p>📞 ${pharmacyPhone}</p>` : ''}
      ${pharmacyAddress ? `<p>📍 ${pharmacyAddress}</p>` : ''}
    </div>
    <div class="po-badge">
      <div class="po-num">${po.po_number}</div>
      <div class="po-date">${formatDate(po.created_at)}</div>
      <div class="status">${statusLabel[po.status] || po.status}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <label>المورد</label>
      <span>${po.supplier_name || 'بدون مورد'}</span>
    </div>
    <div class="meta-item">
      <label>عدد الأصناف</label>
      <span>${po.items.length} صنف</span>
    </div>
    ${po.notes ? `<div class="meta-item" style="grid-column:1/-1">
      <label>ملاحظات</label>
      <span>${po.notes}</span>
    </div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>الصنف</th>
        <th>العبوة</th>
        <th>الكمية</th>
        <th>سعر الوحدة</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-label">الإجمالي الكلي</div>
      <div class="total-val">${formatNum(total)} ${currency}</div>
    </div>
  </div>

  <div class="barcode-section">
    ${svgBase64 ? `<img src="${svgBase64}" alt="barcode"/>` : ''}
    <div class="barcode-label">معرّف أمر الشراء · ${pharmacyName}</div>
  </div>

  <div class="footer">
    هذه الوثيقة صادرة من نظام إدارة ${pharmacyName} — ${new Date().toLocaleDateString('ar-SY')}
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-md" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white text-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" dir="rtl">

        {/* ── Header ── */}
        <div className="bg-[#0d141d] text-white px-6 py-4 rounded-t-xl flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-[#b6f36a]">{pharmacyName}</h2>
            {pharmacyPhone && <p className="text-xs text-gray-300 mt-0.5">📞 {pharmacyPhone}</p>}
            {pharmacyAddress && <p className="text-xs text-gray-300 mt-0.5">📍 {pharmacyAddress}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-[#b6f36a]">{po.po_number}</p>
            <p className="text-xs text-gray-300 mt-0.5">{formatDate(po.created_at)}</p>
            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
              po.status === 'received' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
              po.status === 'sent'     ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
              po.status === 'cancelled'? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                          'bg-gray-500/20 text-gray-300 border border-gray-500/30'
            }`}>{statusLabel[po.status] || po.status}</span>
          </div>
        </div>

        {/* ── Meta ── */}
        <div className="grid grid-cols-2 gap-3 bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">المورد</p>
            <p className="font-semibold text-gray-800 text-sm">{po.supplier_name || 'بدون مورد'}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">عدد الأصناف</p>
            <p className="font-semibold text-gray-800 text-sm">{po.items.length} صنف</p>
          </div>
          {po.notes && (
            <div className="col-span-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">ملاحظات</p>
              <p className="text-sm text-gray-700">{po.notes}</p>
            </div>
          )}
        </div>

        {/* ── Items Table ── */}
        <div className="px-6 pt-4 pb-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#0d141d] text-[#b6f36a]">
                {['م', 'الصنف', 'العبوة', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map(h => (
                  <th key={h} className="px-3 py-2 text-right text-xs font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{item.product_name}</td>
                  <td className="px-3 py-2 text-gray-600">{item.unit || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.quantity_ordered}</td>
                  <td className="px-3 py-2 text-gray-700">{formatNum(item.unit_price)}</td>
                  <td className="px-3 py-2 font-bold text-gray-900">{formatNum(item.quantity_ordered * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Total ── */}
        <div className="px-6 py-3 flex justify-start">
          <div className="bg-[#0d141d] text-white rounded-lg px-5 py-3 min-w-[200px]">
            <p className="text-xs text-gray-400 mb-0.5">الإجمالي الكلي</p>
            <p className="text-2xl font-bold text-[#b6f36a]">{formatNum(total)} <span className="text-base">{currency}</span></p>
          </div>
        </div>

        {/* ── Barcode ── */}
        <div className="border-t border-dashed border-gray-200 mx-6 pt-3 pb-2 flex flex-col items-center">
          <svg ref={barcodeRef} />
          <p className="text-[10px] text-gray-400 mt-1">معرّف أمر الشراء · {pharmacyName}</p>
        </div>

        {/* ── Footer Buttons ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-semibold hover:bg-gray-50 text-sm"
          >
            إغلاق
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 bg-[#0d141d] text-[#b6f36a] py-2.5 rounded-lg font-bold hover:brightness-125 flex items-center justify-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            طباعة الفاتورة
          </button>
        </div>
      </div>
    </div>
  );
}
