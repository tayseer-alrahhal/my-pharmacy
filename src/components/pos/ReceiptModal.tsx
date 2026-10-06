'use client';

interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  unit?: string;
}

interface ReceiptData {
  invoice_number: string;
  sale_date?: string;
  customer_name?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  payment_method: string;
  items: ReceiptItem[];
}

interface ReceiptModalProps {
  data: ReceiptData;
  pharmacyName: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  currency: string;
  footer?: string;
  onClose: () => void;
  onNewSale: () => void;
}

const payLabel: Record<string, string> = { cash: 'نقداً', credit: 'آجل', mixed: 'مختلط' };

// Arabic Number-to-Words Helper (Tafqeet)
function convertNumberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسمئة'];

  function convertGroup(n: number): string {
    let res = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) {
      res += hundreds[h];
    }

    if (t > 0 || o > 0) {
      if (res !== '') res += ' و';
      if (t < 2) {
        res += ones[t * 10 + o];
      } else {
        if (o > 0) {
          res += ones[o] + ' و';
        }
        res += tens[t];
      }
    }
    return res;
  }

  let result = '';
  let temp = Math.floor(num);

  const groups: number[] = [];
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val === 0) continue;

    let groupText = '';
    if (i === 1) { // Thousands
      if (val === 1) groupText = 'ألف';
      else if (val === 2) groupText = 'ألفان';
      else if (val >= 3 && val <= 10) groupText = convertGroup(val) + ' آلاف';
      else groupText = convertGroup(val) + ' ألف';
    } else if (i === 2) { // Millions
      if (val === 1) groupText = 'مليون';
      else if (val === 2) groupText = 'مليونان';
      else if (val >= 3 && val <= 10) groupText = convertGroup(val) + ' ملايين';
      else groupText = convertGroup(val) + ' مليون';
    } else if (i === 3) { // Billions
      if (val === 1) groupText = 'مليار';
      else if (val === 2) groupText = 'ملياران';
      else if (val >= 3 && val <= 10) groupText = convertGroup(val) + ' مليارات';
      else groupText = convertGroup(val) + ' مليار';
    } else {
      groupText = convertGroup(val);
    }

    if (result !== '') result += ' و';
    result += groupText;
  }

  return result;
}

function formatTafqeet(num: number, currencyCode: string): string {
  const words = convertNumberToArabicWords(num);
  let currencyName = currencyCode;
  if (currencyCode === 'ل.س.ج' || currencyCode === 'ل.س') currencyName = 'ليرة سورية جديدة';
  else if (currencyCode === 'USD') currencyName = 'دولار أمريكي';
  return `( ${words} ${currencyName} فقط )`;
}

export default function ReceiptModal({ data, pharmacyName, pharmacyPhone, pharmacyAddress, currency, footer, onClose, onNewSale }: ReceiptModalProps) {
  const formatNum = (n: number) => (n || 0).toLocaleString('ar-SY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SY', { year: 'numeric', month: 'numeric', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });

  const totalQty = data.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsCount = data.items.length;

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>إيصال — ${data.invoice_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; 
            direction: rtl; 
            color: #000; 
            background: #fff; 
            padding: 12px; 
            font-size: 11px; 
            width: 80mm; 
            margin: 0 auto; 
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          
          .header { margin-bottom: 8px; text-align: center; }
          .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .header p { font-size: 11px; margin: 2px 0; }
          
          .items-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
          .items-table th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 1px; font-weight: bold; }
          .items-table td { padding: 4px 1px; vertical-align: middle; }
          .items-table .num-col { text-align: center; width: 6%; }
          .items-table .name-col { text-align: right; width: 42%; word-break: break-word; }
          .items-table .unit-col { text-align: center; width: 14%; }
          .items-table .qty-col { text-align: center; width: 10%; }
          .items-table .price-col { text-align: left; width: 14%; }
          .items-table .total-col { text-align: left; width: 14%; font-weight: bold; }
          
          .totals-section { font-size: 10px; margin-top: 6px; }
          .totals-section .row { margin: 2px 0; }
          .total-final { font-size: 12px; font-weight: bold; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
          
          .tafqeet { font-style: italic; font-size: 9px; text-align: center; margin: 6px 0; }
          .footer { text-align: center; font-size: 9px; margin-top: 10px; color: #333; }
          .footer p { margin: 2px 0; }
          
          @media print { 
            body { width: 80mm; padding: 0; } 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <!-- Pestle & Mortar SVG Logo -->
          <svg viewBox="0 0 64 64" width="48" height="48" style="margin: 0 auto 6px auto; display: block; fill: #000;">
            <path d="M48.5 7.5l4 4c.8.8.8 2 0 2.8L37 29.8c-.8.8-2 .8-2.8 0l-4-4c-.8-.8-.8-2 0-2.8L45.7 7.5c.8-.8 2-.8 2.8 0z" />
            <path d="M14 26h36c1.1 0 2 .9 2 2v2c0 9.9-8.1 18-18 18s-18-8.1-18-18v-2c0-1.1.9-2 2-2z" />
            <path d="M28 34h8v2h-8zM31 31h2v8h-2z" fill="#fff" />
          </svg>
          <h1>${pharmacyName}</h1>
          <p>خير دواء ... لصحة أفضل</p>
          <div class="divider"></div>
          ${pharmacyAddress ? `<p>العنوان: ${pharmacyAddress}</p>` : ''}
          ${pharmacyPhone ? `<p>تليفون: ${pharmacyPhone}</p>` : ''}
          <p class="bold" style="margin-top: 4px; font-size: 11px;">فاتورة مبيعات أدوية</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="row"><span class="bold">رقم الفاتورة: ${data.invoice_number}</span><span>${dateStr} ${timeStr}</span></div>
        <div class="row"><span>طريقة الدفع:</span><span>${payLabel[data.payment_method] || data.payment_method}</span></div>
        ${data.customer_name ? `<div class="row"><span>العميل:</span><span>${data.customer_name}</span></div>` : ''}
        
        <table class="items-table">
          <thead>
            <tr>
              <th class="num-col">م</th>
              <th class="name-col">الصنف</th>
              <th class="unit-col">العبوة</th>
              <th class="qty-col">الكمية</th>
              <th class="price-col">السعر</th>
              <th class="total-col">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item, idx) => `
              <tr style="border-bottom: 1px dotted #ccc;">
                <td class="num-col">${idx + 1}</td>
                <td class="name-col bold">${item.product_name}</td>
                <td class="unit-col">${item.unit || 'حبة'}</td>
                <td class="qty-col">${item.quantity}</td>
                <td class="price-col">${formatNum(item.unit_price)}</td>
                <td class="total-col">${formatNum(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="totals-section">
          <div class="row"><span>إجمالي الأصناف:</span><span>${itemsCount}</span></div>
          <div class="row"><span>إجمالي الكمية:</span><span>${totalQty}</span></div>
          <div class="row"><span>إجمالي الفاتورة:</span><span>${formatNum(data.subtotal)} ${currency}</span></div>
          ${data.discount_amount > 0 ? `<div class="row"><span>الخصم:</span><span>- ${formatNum(data.discount_amount)} ${currency}</span></div>` : ''}
          ${data.tax_amount > 0 ? `<div class="row"><span>الضريبة:</span><span>+ ${formatNum(data.tax_amount)} ${currency}</span></div>` : ''}
          
          <div class="row total-final"><span>الإجمالي النهائي:</span><span>${formatNum(data.total)} ${currency}</span></div>
          
          ${data.payment_method !== 'credit' ? `
            <div class="row"><span>المبلغ المدفوع:</span><span>${formatNum(data.paid_amount)} ${currency}</span></div>
            ${data.change_amount > 0 ? `<div class="row"><span>الباقي:</span><span>${formatNum(data.change_amount)} ${currency}</span></div>` : ''}
          ` : ''}
        </div>
        
        <div class="tafqeet bold" style="margin-top: 6px;">${formatTafqeet(data.total, currency)}</div>
        
        <div class="divider"></div>
        
        <div class="footer">
          <p>شكراً لتعاملكم معنا</p>
          <p>نتمنى لكم دوام الصحة والعافية</p>
          <p style="font-size: 8px; color: #999; margin-top: 6px;">تمت الطباعة بواسطة نظام إدارة الصيدليات</p>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-md">
      <div className="bg-surface-container border border-outline-variant rounded-xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-lg border-b border-outline-variant flex justify-between items-center flex-shrink-0">
          <h2 className="text-title-md font-bold text-primary-container flex items-center">
            <span className="material-symbols-outlined ml-sm" style={{ fontSize: '20px' }}>receipt</span>
            معاينة إيصال البيع — {data.invoice_number}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Realistic Receipt Paper Container */}
        <div className="p-lg overflow-y-auto flex-1 bg-surface-container-lowest">
          <div className="bg-white text-black p-md shadow-lg border border-gray-300 rounded-sm font-sans mx-auto max-w-[340px]" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            {/* Header info */}
            <div className="text-center space-y-1">
              <svg viewBox="0 0 64 64" width="48" height="48" className="mx-auto block text-black fill-current">
                <path d="M48.5 7.5l4 4c.8.8.8 2 0 2.8L37 29.8c-.8.8-2 .8-2.8 0l-4-4c-.8-.8-.8-2 0-2.8L45.7 7.5c.8-.8 2-.8 2.8 0z" />
                <path d="M14 26h36c1.1 0 2 .9 2 2v2c0 9.9-8.1 18-18 18s-18-8.1-18-18v-2c0-1.1.9-2 2-2z" />
                <path d="M28 34h8v2h-8zM31 31h2v8h-2z" fill="#fff" />
              </svg>
              <h1 className="text-md font-bold leading-tight">{pharmacyName}</h1>
              <p className="text-[10px] text-gray-600">خير دواء ... لصحة أفضل</p>
              
              <div className="border-t border-dashed border-black my-2"></div>
              
              {pharmacyAddress && <p className="text-[10px] text-gray-700">العنوان: {pharmacyAddress}</p>}
              {pharmacyPhone && <p className="text-[10px] text-gray-700">تليفون: {pharmacyPhone}</p>}
              
              <p className="text-[11px] font-bold text-center mt-2 border-y border-dotted border-black py-1">فاتورة مبيعات أدوية</p>
            </div>

            {/* Metadata */}
            <div className="text-[10px] space-y-0.5 mt-2 text-gray-800">
              <div className="flex justify-between font-bold"><span>رقم الفاتورة:</span><span>{data.invoice_number}</span></div>
              <div className="flex justify-between"><span>التاريخ والوقت:</span><span>{dateStr} {timeStr}</span></div>
              <div className="flex justify-between"><span>طريقة الدفع:</span><span>{payLabel[data.payment_method] || data.payment_method}</span></div>
              {data.customer_name && <div className="flex justify-between"><span>العميل:</span><span>{data.customer_name}</span></div>}
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Items Table */}
            <table className="w-full text-[10px] text-black">
              <thead>
                <tr className="border-b border-dashed border-black font-bold">
                  <th className="py-1 text-center w-[8%]">م</th>
                  <th className="py-1 text-right w-[42%]">الصنف</th>
                  <th className="py-1 text-center w-[15%]">العبوة</th>
                  <th className="py-1 text-center w-[10%]">الكمية</th>
                  <th className="py-1 text-left w-[12%]">السعر</th>
                  <th className="py-1 text-left w-[13%]">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-dotted border-gray-300">
                    <td className="py-1 text-center">{idx + 1}</td>
                    <td className="py-1 text-right font-bold">{item.product_name}</td>
                    <td className="py-1 text-center">{item.unit || 'حبة'}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-left">{formatNum(item.unit_price)}</td>
                    <td className="py-1 text-left font-bold">{formatNum(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Totals */}
            <div className="text-[10px] space-y-0.5 text-gray-800">
              <div className="flex justify-between"><span>إجمالي الأصناف:</span><span>{itemsCount}</span></div>
              <div className="flex justify-between"><span>إجمالي الكمية:</span><span>{totalQty}</span></div>
              <div className="flex justify-between"><span>إجمالي الفاتورة:</span><span>{formatNum(data.subtotal)} {currency}</span></div>
              {data.discount_amount > 0 && <div className="flex justify-between"><span>الخصم:</span><span>- {formatNum(data.discount_amount)} {currency}</span></div>}
              {data.tax_amount > 0 && <div className="flex justify-between"><span>الضريبة:</span><span>+ {formatNum(data.tax_amount)} {currency}</span></div>}
              
              <div className="flex justify-between font-bold text-xs border-t border-dashed border-black pt-1 mt-1">
                <span>الإجمالي النهائي:</span>
                <span>{formatNum(data.total)} {currency}</span>
              </div>
              
              {data.payment_method !== 'credit' && (
                <>
                  <div className="flex justify-between"><span>المبلغ المدفوع:</span><span>{formatNum(data.paid_amount)} {currency}</span></div>
                  {data.change_amount > 0 && <div className="flex justify-between text-primary-container font-bold"><span>المتبقي (الباقي):</span><span>{formatNum(data.change_amount)} {currency}</span></div>}
                </>
              )}
            </div>

            {/* Tafqeet */}
            <div className="text-center text-[9px] mt-2 font-bold text-gray-700">
              {formatTafqeet(data.total, currency)}
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Footer notes */}
            <div className="text-center text-[9px] space-y-0.5 text-gray-700">
              <p className="font-bold">ملاحظة: البضاعة المباعة لا ترد ولا تستبدل</p>
              <p>شكراً لتعاملكم معنا</p>
              <p>نتمنى لكم دوام الصحة والعافية</p>
              <p className="text-[7px] text-gray-400 mt-2">تمت الطباعة بواسطة نظام إدارة الصيدليات</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-lg border-t border-outline-variant flex gap-sm flex-shrink-0 bg-surface-container">
          <button onClick={handlePrint}
            className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface py-md rounded-lg font-bold flex items-center justify-center gap-sm hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            طباعة الفاتورة
          </button>
          <button onClick={onNewSale}
            className="flex-1 bg-primary-container text-on-primary py-md rounded-lg font-bold hover:brightness-110 flex items-center justify-center gap-sm transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_shopping_cart</span>
            بيع جديد
          </button>
        </div>
      </div>
    </div>
  );
}

