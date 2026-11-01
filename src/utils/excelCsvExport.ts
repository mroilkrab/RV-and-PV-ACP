import { Voucher } from '../types';

export interface ExcelCsvExportOptions {
  mode?: 'summary' | 'detailed'; // summary: 1 row per voucher, detailed: 1 row per item
  includeSummaryRow?: boolean;   // Append total row at the bottom
  preserveLeadingZeros?: boolean; // Force text format for Tax ID, Branch, Bank Account, etc.
  filenamePrefix?: string;
  filterDescription?: string;
}

/**
 * Clean and escape string for Excel CSV (RFC 4180 + Excel compatibility)
 */
function escapeCsvValue(val: any, forceExcelText = false): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();

  // Replace newlines with spaces to maintain single-row integrity in Excel
  str = str.replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ');

  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');

  // If forceExcelText is requested (e.g. Tax ID, Branch, Bank Account, Phone, Job No.)
  // Excel will treat ="..." as a literal text formula, keeping leading zeros (e.g. 01055...) and avoiding scientific notation (1.05E+12)
  if (forceExcelText && str.length > 0) {
    return `="${escaped}"`;
  }

  return `"${escaped}"`;
}

/**
 * Format numeric value with 2 decimal places without thousand separators for direct calculation in Excel
 */
function formatExcelNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return Number(num).toFixed(2);
}

/**
 * Generate Excel-compatible CSV string for Summary Mode (1 row per voucher)
 */
export function generateVouchersSummaryCsv(
  vouchers: Voucher[],
  options: ExcelCsvExportOptions = {}
): string {
  const preserveZeros = options.preserveLeadingZeros !== false;
  const includeTotalRow = options.includeSummaryRow !== false;

  const headers = [
    'ลำดับ (No.)',
    'เลขที่เอกสาร (Voucher No.)',
    'ประเภทเอกสาร (Type)',
    'วันที่เอกสาร (Date)',
    'กำหนดชำระ (Due Date)',
    'เลขที่อ้างอิง (Ref No.)',
    'เลขที่งาน (Job No.)',
    'ลูกค้าส่งงาน/ผู้สอบบัญชี (Job Client/Auditor)',
    'ชื่อคู่ค้า/ลูกค้า (Contact Name)',
    'เลขประจำตัวผู้เสียภาษี (Tax ID)',
    'สาขา (Branch)',
    'ที่อยู่ (Address)',
    'เบอร์โทรศัพท์ (Phone)',
    'หมวดบัญชี (Account Categories)',
    'รายละเอียดรายการ (Description)',
    'จำนวนรายการย่อย (Item Count)',
    'ยอดก่อนภาษี THB (Subtotal)',
    'ภาษีมูลค่าเพิ่ม 7% THB (VAT)',
    'ภาษีหัก ณ ที่จ่าย THB (WHT)',
    'ยอดสุทธิ THB (Net Payable)',
    'จำนวนเงินตัวอักษร (Thai Baht Text)',
    'วิธีการชำระเงิน (Payment Method)',
    'ธนาคาร (Bank Name)',
    'เลขที่บัญชี (Account No.)',
    'ชื่อบัญชี (Account Name)',
    'เลขอ้างอิงโอน/เช็ค (Transfer Ref/Cheque)',
    'วันที่ชำระเงิน (Payment Date)',
    'สถานะเอกสาร (Status)',
    'ผู้จัดทำ (Prepared By)',
    'ผู้ตรวจสอบ (Checked By)',
    'ผู้อนุมัติ (Approved By)',
    'ผู้รับเงิน/ผู้จ่ายเงิน (Received/Paid By)',
    'หมายเหตุ (Notes)',
  ];

  let totalSubtotal = 0;
  let totalVat = 0;
  let totalWht = 0;
  let totalNet = 0;

  const rows = vouchers.map((v, idx) => {
    totalSubtotal += Number(v.subtotal) || 0;
    totalVat += Number(v.totalVat) || 0;
    totalWht += Number(v.totalWht) || 0;
    totalNet += Number(v.netPayable) || 0;

    // Combine distinct account categories
    const categories = Array.from(
      new Set(v.items.map((it) => it.accountCategory).filter(Boolean))
    ).join(' | ');

    // Combine descriptions
    const descriptions = v.items
      .map((it, i) => (v.items.length > 1 ? `[${i + 1}] ${it.description}` : it.description))
      .join(' | ');

    return [
      idx + 1,
      escapeCsvValue(v.voucherNo, preserveZeros),
      escapeCsvValue(v.type === 'PV' ? 'ใบสำคัญจ่าย (PV)' : 'ใบสำคัญรับ (RV)'),
      escapeCsvValue(v.date),
      escapeCsvValue(v.dueDate || v.date),
      escapeCsvValue(v.referenceNo || ''),
      escapeCsvValue(v.jobNo || '', preserveZeros),
      escapeCsvValue(v.jobClient || v.auditor || ''),
      escapeCsvValue(v.contact.name),
      escapeCsvValue(v.contact.taxId || '', preserveZeros),
      escapeCsvValue(v.contact.branch || 'สำนักงานใหญ่', preserveZeros),
      escapeCsvValue(v.contact.address || ''),
      escapeCsvValue(v.contact.phone || '', preserveZeros),
      escapeCsvValue(categories),
      escapeCsvValue(descriptions),
      v.items.length,
      formatExcelNumber(v.subtotal),
      formatExcelNumber(v.totalVat),
      formatExcelNumber(v.totalWht),
      formatExcelNumber(v.netPayable),
      escapeCsvValue(v.thaiBahtText || ''),
      escapeCsvValue(v.payment.method || ''),
      escapeCsvValue(v.payment.bankName || ''),
      escapeCsvValue(v.payment.accountNo || '', preserveZeros),
      escapeCsvValue(v.payment.accountName || ''),
      escapeCsvValue(v.payment.transferRef || v.payment.chequeNo || ''),
      escapeCsvValue(v.payment.paymentDate || ''),
      escapeCsvValue(v.status || ''),
      escapeCsvValue(v.signatures?.preparedBy || ''),
      escapeCsvValue(v.signatures?.checkedBy || ''),
      escapeCsvValue(v.signatures?.approvedBy || ''),
      escapeCsvValue(v.signatures?.receivedOrPaidBy || ''),
      escapeCsvValue(v.notes || ''),
    ].join(',');
  });

  // Optional summary total row at bottom
  if (includeTotalRow && vouchers.length > 0) {
    const summaryRow = [
      escapeCsvValue('รวมทั้งสิ้น (TOTAL)'),
      escapeCsvValue(`รวม ${vouchers.length} ฉบับ`),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      formatExcelNumber(totalSubtotal),
      formatExcelNumber(totalVat),
      formatExcelNumber(totalWht),
      formatExcelNumber(totalNet),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ].join(',');
    rows.push(summaryRow);
  }

  // Prepend UTF-8 BOM (\uFEFF) to guarantee Microsoft Excel opens Thai text correctly
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generate Excel-compatible CSV string for Detailed Mode (1 row per item)
 */
export function generateVouchersDetailedCsv(
  vouchers: Voucher[],
  options: ExcelCsvExportOptions = {}
): string {
  const preserveZeros = options.preserveLeadingZeros !== false;
  const includeTotalRow = options.includeSummaryRow !== false;

  const headers = [
    'ลำดับเอกสาร (Voucher No.)',
    'ประเภท (Type)',
    'วันที่เอกสาร (Date)',
    'เลขที่งาน (Job No.)',
    'ชื่อคู่ค้า/ลูกค้า (Contact Name)',
    'เลขประจำตัวผู้เสียภาษี (Tax ID)',
    'ลำดับรายการ (Item No.)',
    'หมวดบัญชี (Account Category)',
    'รายละเอียดรายการ (Item Description)',
    'ยอดเงินฐาน THB (Base Amount)',
    'อัตรา VAT % (VAT Rate)',
    'ภาษีมูลค่าเพิ่ม THB (VAT Amount)',
    'อัตรา WHT % (WHT Rate)',
    'ภาษีหัก ณ ที่จ่าย THB (WHT Amount)',
    'ยอดสุทธิรายการ THB (Item Net Amount)',
    'เลขที่อ้างอิง (Ref No.)',
    'วิธีการชำระเงิน (Payment Method)',
    'ธนาคาร (Bank Name)',
    'เลขที่บัญชี (Account No.)',
    'สถานะเอกสาร (Status)',
    'หมายเหตุ (Notes)',
  ];

  let totalBase = 0;
  let totalVat = 0;
  let totalWht = 0;
  let totalNet = 0;
  let rowCount = 0;

  const rows: string[] = [];

  vouchers.forEach((v) => {
    v.items.forEach((it, itIdx) => {
      rowCount++;
      const base = Number(it.baseAmount) || 0;
      const vat = Number(it.vatAmount) || 0;
      const wht = Number(it.whtAmount) || 0;
      const net = Number(it.netAmount) || (base + vat - wht);

      totalBase += base;
      totalVat += vat;
      totalWht += wht;
      totalNet += net;

      rows.push(
        [
          escapeCsvValue(v.voucherNo, preserveZeros),
          escapeCsvValue(v.type === 'PV' ? 'ใบสำคัญจ่าย (PV)' : 'ใบสำคัญรับ (RV)'),
          escapeCsvValue(v.date),
          escapeCsvValue(v.jobNo || '', preserveZeros),
          escapeCsvValue(v.contact.name),
          escapeCsvValue(v.contact.taxId || '', preserveZeros),
          itIdx + 1,
          escapeCsvValue(it.accountCategory || ''),
          escapeCsvValue(it.description || ''),
          formatExcelNumber(base),
          it.vatRate ?? 7,
          formatExcelNumber(vat),
          it.whtRate ?? 0,
          formatExcelNumber(wht),
          formatExcelNumber(net),
          escapeCsvValue(v.referenceNo || ''),
          escapeCsvValue(v.payment.method || ''),
          escapeCsvValue(v.payment.bankName || ''),
          escapeCsvValue(v.payment.accountNo || '', preserveZeros),
          escapeCsvValue(v.status || ''),
          escapeCsvValue(v.notes || ''),
        ].join(',')
      );
    });
  });

  if (includeTotalRow && rows.length > 0) {
    const summaryRow = [
      escapeCsvValue('รวมทั้งสิ้น (TOTAL)'),
      escapeCsvValue(`รวม ${vouchers.length} ฉบับ (${rowCount} รายการ)`),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      formatExcelNumber(totalBase),
      '',
      formatExcelNumber(totalVat),
      '',
      formatExcelNumber(totalWht),
      formatExcelNumber(totalNet),
      '',
      '',
      '',
      '',
      '',
      '',
    ].join(',');
    rows.push(summaryRow);
  }

  // Prepend UTF-8 BOM (\uFEFF)
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Trigger CSV download in browser
 */
export function downloadExcelCsvFile(csvContent: string, filename: string): {
  success: boolean;
  filename: string;
  byteLength: number;
} {
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
    filename,
    byteLength: blob.size,
  };
}

/**
 * Generate intelligent default filename based on filters
 */
export function generateExportFilename(
  typeFilter: string = 'ALL',
  statusFilter: string = 'ALL',
  prefix: string = 'AccountPlanet_Vouchers'
): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  let typeTag = '';
  if (typeFilter === 'PV') typeTag = '_PV';
  else if (typeFilter === 'RV') typeTag = '_RV';

  let statusTag = '';
  if (statusFilter && statusFilter !== 'ALL') {
    statusTag = `_${statusFilter}`;
  }

  return `${prefix}${typeTag}${statusTag}_${y}${m}${d}_${hh}${mm}.csv`;
}
