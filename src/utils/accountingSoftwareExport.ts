import { Voucher } from '../types';

export type AccountingSoftware = 'peak' | 'express' | 'gl_journal';

export interface AccountingExportOptions {
  software: AccountingSoftware;
  yearMonth?: string; // 'YYYY-MM' e.g. '2026-10'
  docTypeFilter?: 'ALL' | 'PV' | 'RV';
  includeSummaryRow?: boolean;
  dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
}

/**
 * Standard Thai Chart of Accounts mapping
 */
export function getStandardAccountCode(category: string, type: 'PV' | 'RV'): { code: string; name: string } {
  const cat = (category || '').trim().toLowerCase();

  if (type === 'RV') {
    if (cat.includes('ค่าสอบบัญชี') || cat.includes('ตรวจสอบบัญชี') || cat.includes('audit')) {
      return { code: '411101', name: 'รายได้ค่าบริการตรวจสอบบัญชี' };
    }
    if (cat.includes('ค่าทำบัญชี') || cat.includes('บัญชี')) {
      return { code: '411102', name: 'รายได้ค่าบริการจัดทำบัญชี' };
    }
    if (cat.includes('ที่ปรึกษา') || cat.includes('consult')) {
      return { code: '411103', name: 'รายได้ค่าที่ปรึกษา' };
    }
    if (cat.includes('ขาย') || cat.includes('สินค้า')) {
      return { code: '411200', name: 'รายได้จากการขายสินค้า' };
    }
    return { code: '411000', name: category || 'รายได้จากการให้บริการ' };
  }

  // PV - Expenses
  if (cat.includes('เช่า') || cat.includes('rent')) {
    return { code: '532000', name: 'ค่าเช่าสำนักงานและสถานที่' };
  }
  if (cat.includes('บริการ') || cat.includes('จ้าง') || cat.includes('service')) {
    return { code: '531000', name: 'ค่าจ้างและค่าบริการวิชาชีพ' };
  }
  if (cat.includes('สอบบัญชี') || cat.includes('audit')) {
    return { code: '531100', name: 'ค่าธรรมเนียมผู้สอบบัญชี' };
  }
  if (cat.includes('ที่ปรึกษา') || cat.includes('consult')) {
    return { code: '531200', name: 'ค่าบริการที่ปรึกษาธุรกิจและกฎหมาย' };
  }
  if (cat.includes('โฆษณา') || cat.includes('การตลาด') || cat.includes('ad')) {
    return { code: '533000', name: 'ค่าโฆษณาและส่งเสริมการขาย' };
  }
  if (cat.includes('ขนส่ง') || cat.includes('ส่งของ') || cat.includes('transport') || cat.includes('delivery')) {
    return { code: '534000', name: 'ค่าขนส่งและค่าระวาง' };
  }
  if (cat.includes('น้ำมัน') || cat.includes('เดินทาง') || cat.includes('พาหนะ') || cat.includes('travel')) {
    return { code: '535000', name: 'ค่าน้ำมันและค่าพาหนะเดินทาง' };
  }
  if (cat.includes('เครื่องเขียน') || cat.includes('สิ้นเปลือง') || cat.includes('อุปกรณ์') || cat.includes('supply')) {
    return { code: '536000', name: 'ค่าเครื่องเขียนและวัสดุสิ้นเปลือง' };
  }
  if (cat.includes('ไฟ') || cat.includes('น้ำ') || cat.includes('โทรศัพท์') || cat.includes('อินเทอร์เน็ต') || cat.includes('สาธารณูปโภค')) {
    return { code: '537000', name: 'ค่าสาธารณูปโภคและสื่อสาร' };
  }
  if (cat.includes('ธรรมเนียม') || cat.includes('bank') || cat.includes('fee')) {
    return { code: '538000', name: 'ค่าธรรมเนียมธนาคาร' };
  }
  if (cat.includes('เบ็ดเตล็ด') || cat.includes('miscellaneous')) {
    return { code: '539000', name: 'ค่าใช้จ่ายเบ็ดเตล็ด' };
  }

  return { code: '530000', name: category || 'ค่าใช้จ่ายในการดำเนินงาน' };
}

/**
 * Format Date to Thai standard DD/MM/YYYY or YYYY-MM-DD
 */
export function formatExportDate(isoDateString: string, format: 'DD/MM/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY'): string {
  if (!isoDateString) return '';
  const parts = isoDateString.split('-');
  if (parts.length !== 3) return isoDateString;
  const [yyyy, mm, dd] = parts;
  if (format === 'DD/MM/YYYY') {
    return `${dd}/${mm}/${yyyy}`;
  }
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Escape CSV field value for Excel/Windows compatibility (RFC 4180)
 */
function escapeCsv(val: any, forceText = false): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  str = str.replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ');
  const escaped = str.replace(/"/g, '""');

  if (forceText && str.length > 0) {
    return `="${escaped}"`;
  }
  return `"${escaped}"`;
}

function formatNum(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return Number(num).toFixed(2);
}

function isCashPayment(method?: string): boolean {
  if (!method) return false;
  const m = String(method).toLowerCase();
  return m.includes('เงินสด') || m.includes('cash');
}

function isChequePayment(method?: string): boolean {
  if (!method) return false;
  const m = String(method).toLowerCase();
  return m.includes('เช็ค') || m.includes('cheque');
}

function getPaymentChannelLabel(method?: string): string {
  if (isCashPayment(method)) return 'เงินสด';
  if (isChequePayment(method)) return 'เช็ค';
  return 'เงินฝากธนาคาร';
}

/**
 * Returns the current Year-Month string in 'YYYY-MM' format
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Format YYYY-MM to readable Thai month and year (BE & AD)
 */
export function formatThaiMonthYear(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth;
  const [yearStr, monthStr] = yearMonth.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const monthName = thaiMonths[m - 1] || monthStr;
  const beYear = y + 543;
  return `${monthName} ${beYear} (${y})`;
}

/**
 * Filter vouchers by specific month 'YYYY-MM'
 */
export function filterVouchersByMonth(vouchers: Voucher[], yearMonth: string): Voucher[] {
  if (!yearMonth) return vouchers;
  return vouchers.filter((v) => {
    if (!v.date) return false;
    return v.date.startsWith(yearMonth);
  });
}

/**
 * 1. PEAK Engine Compatible CSV
 * Structured specifically for Peak Engine (Expense & Income Batch Import)
 */
export function generatePeakFormatCsv(
  vouchers: Voucher[],
  options: { dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD' } = {}
): string {
  const dateFormat = options.dateFormat || 'DD/MM/YYYY';

  const headers = [
    'วันที่ออกเอกสาร (Issue Date)',
    'เลขที่เอกสาร (Voucher No)',
    'ประเภทเอกสาร (Type)',
    'รหัสผู้ติดต่อ (Contact Code)',
    'ชื่อผู้ติดต่อ (Contact Name)',
    'เลขประจำตัวผู้เสียภาษี (Tax ID)',
    'รหัสสาขา (Branch Code)',
    'ที่อยู่ (Address)',
    'เบอร์โทรศัพท์ (Phone)',
    'เลขที่อ้างอิง/ใบกำกับภาษี (Invoice No)',
    'วันที่ใบกำกับภาษี (Invoice Date)',
    'เลขที่งาน (Job No)',
    'ลำดับรายการ (Item No)',
    'คำอธิบายรายการ (Description)',
    'รหัสผังบัญชี (Account Code)',
    'ชื่อผังบัญชี (Account Name)',
    'มูลค่าก่อนภาษี (Pre-tax Amount)',
    'ประเภทภาษี (VAT Type)',
    'อัตราภาษี (VAT Rate %)',
    'ภาษีมูลค่าเพิ่ม (VAT Amount)',
    'อัตราหัก ณ ที่จ่าย (WHT Rate %)',
    'ภาษีหัก ณ ที่จ่าย (WHT Amount)',
    'แบบยื่นภาษี (WHT Form Type)',
    'ยอดชำระสุทธิ (Net Total)',
    'ช่องทางการชำระ (Payment Method)',
    'ธนาคาร (Bank)',
    'เลขที่บัญชีธนาคาร (Bank Account)',
    'เลขอ้างอิงโอน/เช็ค (Transfer Ref/Cheque)',
    'วันที่ชำระเงิน (Payment Date)',
    'สถานะเอกสาร (Status)',
    'หมายเหตุ (Notes)',
  ];

  const rows: string[] = [];

  vouchers.forEach((v) => {
    const isPV = v.type === 'PV';
    const typeLabel = isPV ? 'บันทึกค่าใช้จ่าย (PV)' : 'ใบเสร็จรับเงิน (RV)';
    const dateFormatted = formatExportDate(v.date, dateFormat);
    const invoiceDateFormatted = formatExportDate(v.payment.paymentDate || v.date, dateFormat);
    const paymentDateFormatted = v.payment.paymentDate ? formatExportDate(v.payment.paymentDate, dateFormat) : dateFormatted;

    // Determine contact code from taxId or voucherNo
    const contactCode = v.contact.taxId ? `CUST-${v.contact.taxId.slice(-6)}` : `CUST-${v.voucherNo.replace(/[^a-zA-Z0-9]/g, '')}`;
    const branchCode = v.contact.branch && v.contact.branch !== 'สำนักงานใหญ่' ? v.contact.branch : '00000';

    // Form type for WHT
    const whtForm = v.contact.taxId && v.contact.taxId.length === 13 && v.contact.taxId.startsWith('0')
      ? 'ภ.ง.ด.53 (นิติบุคคล)'
      : 'ภ.ง.ด.3 (บุคคลธรรมดา)';

    v.items.forEach((item, itemIdx) => {
      const accInfo = getStandardAccountCode(item.accountCategory, v.type);
      const base = Number(item.baseAmount) || 0;
      const vat = Number(item.vatAmount) || 0;
      const wht = Number(item.whtAmount) || 0;
      const net = Number(item.netAmount) || (base + vat - wht);
      const vatType = (item.vatRate && item.vatRate > 0) ? 'แยกภาษี 7%' : 'ไม่มีภาษี';

      rows.push([
        escapeCsv(dateFormatted),
        escapeCsv(v.voucherNo, true),
        escapeCsv(typeLabel),
        escapeCsv(contactCode, true),
        escapeCsv(v.contact.name),
        escapeCsv(v.contact.taxId || '', true),
        escapeCsv(branchCode, true),
        escapeCsv(v.contact.address || ''),
        escapeCsv(v.contact.phone || '', true),
        escapeCsv(v.referenceNo || ''),
        escapeCsv(invoiceDateFormatted),
        escapeCsv(v.jobNo || '', true),
        itemIdx + 1,
        escapeCsv(item.description || accInfo.name),
        escapeCsv(accInfo.code, true),
        escapeCsv(accInfo.name),
        formatNum(base),
        escapeCsv(vatType),
        item.vatRate ?? 7,
        formatNum(vat),
        item.whtRate ?? 0,
        formatNum(wht),
        escapeCsv(wht > 0 ? whtForm : ''),
        formatNum(net),
        escapeCsv(getPaymentChannelLabel(v.payment.method)),
        escapeCsv(v.payment.bankName || ''),
        escapeCsv(v.payment.accountNo || '', true),
        escapeCsv(v.payment.transferRef || v.payment.chequeNo || ''),
        escapeCsv(paymentDateFormatted),
        escapeCsv(v.status),
        escapeCsv(v.notes || (v.jobNo ? `Job: ${v.jobNo}` : '')),
      ].join(','));
    });
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * 2. Express Accounting Compatible CSV
 * Structured specifically for Express Software import (Daily journal & Purchases/Sales)
 */
export function generateExpressFormatCsv(
  vouchers: Voucher[],
  options: { dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD' } = {}
): string {
  const dateFormat = options.dateFormat || 'DD/MM/YYYY';

  const headers = [
    'วันที่เอกสาร (DATE)',
    'เลขที่เอกสาร (VOUCHER_NO)',
    'สมุดรายวัน (JOURNAL_BOOK)',
    'รหัสคู่ค้า (SUPP_CUST_CODE)',
    'ชื่อคู่ค้า (SUPP_CUST_NAME)',
    'เลขประจำตัวผู้เสียภาษี (TAX_ID)',
    'สาขา (BRANCH)',
    'เลขที่ใบกำกับภาษี (TAX_INV_NO)',
    'วันที่ใบกำกับ (TAX_INV_DATE)',
    'คำอธิบายรายการ (DESCRIPTION)',
    'รหัสบัญชี (ACCOUNT_CODE)',
    'ชื่อบัญชี (ACCOUNT_NAME)',
    'เดบิต THB (DEBIT)',
    'เครดิต THB (CREDIT)',
    'ยอดฐานภาษี (TAX_BASE)',
    'อัตราภาษี (VAT_RATE)',
    'ภาษีมูลค่าเพิ่ม (VAT_AMOUNT)',
    'อัตราหัก ณ ที่จ่าย (WHT_RATE)',
    'ภาษีหัก ณ ที่จ่าย (WHT_AMOUNT)',
    'ยอดจ่าย/รับสุทธิ (NET_AMOUNT)',
    'วิธีชำระเงิน (PAYMENT_METHOD)',
    'ธนาคาร/เลขบัญชี (BANK_DETAILS)',
    'เลขที่งาน/อ้างอิง (JOB_REF)',
    'หมายเหตุ (REMARK)'
  ];

  const rows: string[] = [];

  vouchers.forEach((v) => {
    const isPV = v.type === 'PV';
    const journalBook = isPV ? 'PJ (สมุดรายวันจ่าย)' : 'RJ (สมุดรายวันรับ)';
    const dateFormatted = formatExportDate(v.date, dateFormat);
    const invoiceDateFormatted = formatExportDate(v.payment.paymentDate || v.date, dateFormat);
    const suppCode = v.contact.taxId ? (isPV ? `V-${v.contact.taxId.slice(-6)}` : `C-${v.contact.taxId.slice(-6)}`) : (isPV ? 'V-GENERAL' : 'C-GENERAL');
    const branchCode = v.contact.branch && v.contact.branch !== 'สำนักงานใหญ่' ? v.contact.branch : '00000';

    v.items.forEach((item) => {
      const acc = getStandardAccountCode(item.accountCategory, v.type);
      const base = Number(item.baseAmount) || 0;
      const vat = Number(item.vatAmount) || 0;
      const wht = Number(item.whtAmount) || 0;
      const net = Number(item.netAmount) || (base + vat - wht);

      // Debit / Credit allocation:
      // For PV: Expense (Debit), VAT (Debit), WHT (Credit), Cash/Bank (Credit)
      // Here represented per item line:
      const debit = isPV ? formatNum(base) : '0.00';
      const credit = !isPV ? formatNum(base) : '0.00';

      rows.push([
        escapeCsv(dateFormatted),
        escapeCsv(v.voucherNo, true),
        escapeCsv(journalBook),
        escapeCsv(suppCode, true),
        escapeCsv(v.contact.name),
        escapeCsv(v.contact.taxId || '', true),
        escapeCsv(branchCode, true),
        escapeCsv(v.referenceNo || v.voucherNo),
        escapeCsv(invoiceDateFormatted),
        escapeCsv(item.description || acc.name),
        escapeCsv(acc.code, true),
        escapeCsv(acc.name),
        debit,
        credit,
        formatNum(base),
        item.vatRate ?? 7,
        formatNum(vat),
        item.whtRate ?? 0,
        formatNum(wht),
        formatNum(net),
        escapeCsv(v.payment.method ? v.payment.method.toUpperCase() : 'TRANSFER'),
        escapeCsv(`${v.payment.bankName || ''} ${v.payment.accountNo || ''}`.trim(), true),
        escapeCsv(v.jobNo || v.referenceNo || '', true),
        escapeCsv(v.notes || ''),
      ].join(','));
    });
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * 3. General Ledger Journal CSV (Double-Entry Debit/Credit)
 * Fully balanced journal entries ready for any general accounting system
 */
export function generateGlJournalCsv(
  vouchers: Voucher[],
  options: { dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD' } = {}
): string {
  const dateFormat = options.dateFormat || 'DD/MM/YYYY';

  const headers = [
    'วันที่ (Date)',
    'เลขที่ใบสำคัญ (Voucher No)',
    'สมุดรายวัน (Journal)',
    'คำอธิบายเอกสาร (Doc Description)',
    'บรรทัดที่ (Line)',
    'รหัสบัญชี (Account Code)',
    'ชื่อบัญชี (Account Name)',
    'คำอธิบายรายการย่อย (Line Description)',
    'เดบิต THB (Debit)',
    'เครดิต THB (Credit)',
    'ชื่อคู่ค้า (Contact Name)',
    'เลขประจำตัวผู้เสียภาษี (Tax ID)',
    'เลขที่งาน (Job No)',
    'เลขที่อ้างอิง (Ref No)',
  ];

  const rows: string[] = [];

  vouchers.forEach((v) => {
    const isPV = v.type === 'PV';
    const dateFormatted = formatExportDate(v.date, dateFormat);
    const journal = isPV ? 'สมุดรายวันจ่าย (Payment Journal)' : 'สมุดรายวันรับ (Receipt Journal)';
    let lineNo = 1;

    let subtotal = 0;
    let totalVat = 0;
    let totalWht = 0;
    let totalNet = 0;

    // 1. Expense / Income Lines
    v.items.forEach((item) => {
      const acc = getStandardAccountCode(item.accountCategory, v.type);
      const base = Number(item.baseAmount) || 0;
      const vat = Number(item.vatAmount) || 0;
      const wht = Number(item.whtAmount) || 0;
      subtotal += base;
      totalVat += vat;
      totalWht += wht;

      rows.push([
        escapeCsv(dateFormatted),
        escapeCsv(v.voucherNo, true),
        escapeCsv(journal),
        escapeCsv(`${isPV ? 'จ่ายชำระค่า' : 'รับชำระค่า'} ${v.contact.name}`),
        lineNo++,
        escapeCsv(acc.code, true),
        escapeCsv(acc.name),
        escapeCsv(item.description || acc.name),
        isPV ? formatNum(base) : '0.00', // Expense is Debit, Income is Credit
        !isPV ? formatNum(base) : '0.00',
        escapeCsv(v.contact.name),
        escapeCsv(v.contact.taxId || '', true),
        escapeCsv(v.jobNo || '', true),
        escapeCsv(v.referenceNo || ''),
      ].join(','));
    });

    // 2. VAT Line
    if (totalVat > 0) {
      if (isPV) {
        // Input VAT (Debit)
        rows.push([
          escapeCsv(dateFormatted),
          escapeCsv(v.voucherNo, true),
          escapeCsv(journal),
          escapeCsv(`ภาษีซื้อ - ${v.contact.name}`),
          lineNo++,
          escapeCsv('115400', true),
          escapeCsv('ภาษีซื้อ (Input VAT 7%)'),
          escapeCsv(`ภาษีมูลค่าเพิ่ม 7% เอกสาร ${v.voucherNo}`),
          formatNum(totalVat),
          '0.00',
          escapeCsv(v.contact.name),
          escapeCsv(v.contact.taxId || '', true),
          escapeCsv(v.jobNo || '', true),
          escapeCsv(v.referenceNo || ''),
        ].join(','));
      } else {
        // Output VAT (Credit)
        rows.push([
          escapeCsv(dateFormatted),
          escapeCsv(v.voucherNo, true),
          escapeCsv(journal),
          escapeCsv(`ภาษีขาย - ${v.contact.name}`),
          lineNo++,
          escapeCsv('213100', true),
          escapeCsv('ภาษีขาย (Output VAT 7%)'),
          escapeCsv(`ภาษีมูลค่าเพิ่ม 7% เอกสาร ${v.voucherNo}`),
          '0.00',
          formatNum(totalVat),
          escapeCsv(v.contact.name),
          escapeCsv(v.contact.taxId || '', true),
          escapeCsv(v.jobNo || '', true),
          escapeCsv(v.referenceNo || ''),
        ].join(','));
      }
    }

    // 3. Withholding Tax Line
    if (totalWht > 0) {
      if (isPV) {
        // WHT Payable (Credit)
        rows.push([
          escapeCsv(dateFormatted),
          escapeCsv(v.voucherNo, true),
          escapeCsv(journal),
          escapeCsv(`ภาษีหัก ณ ที่จ่ายค้างนำส่ง - ${v.contact.name}`),
          lineNo++,
          escapeCsv('213200', true),
          escapeCsv('ภาษีเงินได้หัก ณ ที่จ่ายค้างจ่าย'),
          escapeCsv(`หัก ณ ที่จ่ายนำส่งสรรพากร ${v.voucherNo}`),
          '0.00',
          formatNum(totalWht),
          escapeCsv(v.contact.name),
          escapeCsv(v.contact.taxId || '', true),
          escapeCsv(v.jobNo || '', true),
          escapeCsv(v.referenceNo || ''),
        ].join(','));
      } else {
        // WHT Receivable / ภาษีถูกหัก ณ ที่จ่าย (Debit)
        rows.push([
          escapeCsv(dateFormatted),
          escapeCsv(v.voucherNo, true),
          escapeCsv(journal),
          escapeCsv(`ภาษีถูกหัก ณ ที่จ่าย - ${v.contact.name}`),
          lineNo++,
          escapeCsv('115300', true),
          escapeCsv('ภาษีเงินได้ถูกหัก ณ ที่จ่าย'),
          escapeCsv(`ถูกหัก ณ ที่จ่ายเอกสาร ${v.voucherNo}`),
          formatNum(totalWht),
          '0.00',
          escapeCsv(v.contact.name),
          escapeCsv(v.contact.taxId || '', true),
          escapeCsv(v.jobNo || '', true),
          escapeCsv(v.referenceNo || ''),
        ].join(','));
      }
    }

    // 4. Bank / Cash Settlement Line
    totalNet = Number(v.netPayable) || (subtotal + (isPV ? totalVat - totalWht : totalVat - totalWht));
    const isCash = isCashPayment(v.payment.method);
    const settlementAccCode = isCash ? '111100' : '111200';
    const settlementAccName = isCash ? 'เงินสดในมือ (Cash on Hand)' : `เงินฝากกระแสรายวัน/ออมทรัพย์ (${v.payment.bankName || 'ธนาคาร'})`;

    rows.push([
      escapeCsv(dateFormatted),
      escapeCsv(v.voucherNo, true),
      escapeCsv(journal),
      escapeCsv(`ชำระเงิน (${isCash ? 'เงินสด' : v.payment.bankName || 'ธนาคาร'})`),
      lineNo++,
      escapeCsv(settlementAccCode, true),
      escapeCsv(settlementAccName),
      escapeCsv(`${isCash ? 'เงินสด' : `${v.payment.bankName || 'ธนาคาร'} เลขที่ ${v.payment.accountNo || ''}`}`.trim()),
      !isPV ? formatNum(totalNet) : '0.00', // RV settles with Debit to Cash/Bank
      isPV ? formatNum(totalNet) : '0.00',  // PV settles with Credit to Cash/Bank
      escapeCsv(v.contact.name),
      escapeCsv(v.contact.taxId || '', true),
      escapeCsv(v.jobNo || '', true),
      escapeCsv(v.referenceNo || ''),
    ].join(','));
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Download Accounting CSV file to user device
 */
export function downloadAccountingCsvFile(
  csvContent: string,
  filename: string
): { success: boolean; byteLength: number; filename: string } {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 2000);

  return {
    success: true,
    byteLength: blob.size,
    filename,
  };
}
