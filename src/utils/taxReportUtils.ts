import { 
  Voucher, 
  ContactInfo, 
  CompanySettings, 
  WhtFormType, 
  WhtReportEntry, 
  WhtCategoryGroup, 
  WhtFormSummary 
} from '../types';

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTH_SHORT_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * Classify payee into ภ.ง.ด. 3 (Individual) or ภ.ง.ด. 53 (Juristic Person)
 */
export function classifyPayeeForm(contact: ContactInfo): WhtFormType {
  const name = (contact.name || '').trim().toLowerCase();
  const taxId = (contact.taxId || '').replace(/\D/g, '');

  // If name contains clear juristic person indicators
  const juristicKeywords = [
    'บจก', 'บริษัท', 'หจก', 'ห้างหุ้นส่วน', 'มหาชน', 'จำกัด', 
    'มูลนิธิ', 'สมาคม', 'องค์กร', 'co., ltd', 'co.,ltd', 'inc.', 'corp.'
  ];
  if (juristicKeywords.some((kw) => name.includes(kw))) {
    return 'PND53';
  }

  // If tax ID starts with '0' (Standard for Thai registered entities like 01055...)
  if (taxId.startsWith('0')) {
    return 'PND53';
  }

  // If name starts with individual titles
  const individualPrefixes = ['นาย', 'นาง', 'น.ส.', 'นางสาว', 'คุณ', 'ดร.', 'อาจารย์'];
  if (individualPrefixes.some((p) => contact.name.trim().startsWith(p))) {
    return 'PND3';
  }

  // Thai 13-digit citizen IDs typically start with 1, 2, 3, 4, 5, 6, 7, 8
  if (taxId.length === 13 && /^[1-8]/.test(taxId)) {
    return 'PND3';
  }

  // Default fallback: if has "CPA" or "ผู้สอบบัญชี" without "บจก", treat as individual PND3
  if (name.includes('cpa') || name.includes('ผู้สอบบัญชี')) {
    return 'PND3';
  }

  return 'PND3';
}

/**
 * Get Income Section classification according to Thai Revenue Code
 */
export function getIncomeSectionInfo(category: string, formType: WhtFormType): { section: string; title: string; defaultRate: number } {
  const cat = (category || '').trim();

  if (cat.includes('สอบบัญชี')) {
    return {
      section: formType === 'PND3' ? 'ม.40(6)' : 'ม.40(8)',
      title: formType === 'PND3' ? 'ม.40(6) วิชาชีพบัญชี/ตรวจสอบบัญชี' : 'ม.40(8) ค่าบริการตรวจสอบบัญชี',
      defaultRate: 3,
    };
  }

  if (cat.includes('ค่านายหน้า')) {
    return {
      section: formType === 'PND3' ? 'ม.40(2)' : 'ม.40(8)',
      title: formType === 'PND3' ? 'ม.40(2) ค่านายหน้า/ค่าบำเหน็จ' : 'ม.40(8) ค่านายหน้า (ค่าบริการ)',
      defaultRate: 3,
    };
  }

  if (cat.includes('เช่า')) {
    return {
      section: 'ม.40(5)',
      title: 'ม.40(5) ค่าเช่าทรัพย์สิน',
      defaultRate: 5,
    };
  }

  if (cat.includes('โฆษณา')) {
    return {
      section: 'ม.40(8)',
      title: 'ม.40(8) ค่าโฆษณา',
      defaultRate: 2,
    };
  }

  if (cat.includes('ขนส่ง')) {
    return {
      section: 'ม.40(8)',
      title: 'ม.40(8) ค่าขนส่ง',
      defaultRate: 1,
    };
  }

  // General service / professional service
  return {
    section: 'ม.40(8)',
    title: 'ม.40(8) ค่าจ้างทำของ / ค่าบริการ',
    defaultRate: 3,
  };
}

/**
 * Convert YYYY-MM into Thai Month and Buddhist Year (e.g. 2026-09 -> กันยายน 2569)
 */
export function formatThaiMonth(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey || 'ทุกเดือน';
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const beYear = parseInt(yearStr, 10) + 543;
  const monthName = THAI_MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} ${beYear}`;
}

/**
 * Format date string (YYYY-MM-DD) into Thai display format (e.g. 15 ก.ย. 2569)
 */
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  const beYear = parseInt(y, 10) + 543;
  return `${parseInt(d, 10)} ${THAI_MONTH_SHORT_NAMES[monthIdx] || m} ${beYear}`;
}

/**
 * Calculate Revenue Department e-Filing submission deadlines for a given month
 */
export function calculateTaxDeadlines(monthKey: string): { regularDeadline: string; onlineDeadline: string } {
  if (!monthKey || !monthKey.includes('-')) {
    return { regularDeadline: 'วันที่ 7 ของเดือนถัดไป', onlineDeadline: 'วันที่ 15 ของเดือนถัดไป' };
  }

  const [yStr, mStr] = monthKey.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10); // 1-12

  // Next month
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const nextMonthIdx = nextMonth - 1;
  const nextBeYear = nextYear + 543;
  const monthShort = THAI_MONTH_SHORT_NAMES[nextMonthIdx];

  return {
    regularDeadline: `7 ${monthShort} ${nextBeYear}`,
    onlineDeadline: `15 ${monthShort} ${nextBeYear}`,
  };
}

/**
 * Extract all unique months (YYYY-MM) available in vouchers
 */
export function getAvailableTaxMonths(vouchers: Voucher[]): string[] {
  const monthsSet = new Set<string>();
  vouchers.forEach((v) => {
    if (v.date && v.date.length >= 7) {
      monthsSet.add(v.date.slice(0, 7));
    }
  });

  const sorted = Array.from(monthsSet).sort().reverse();
  // If no months found, default to current month
  if (sorted.length === 0) {
    const now = new Date();
    sorted.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }
  return sorted;
}

/**
 * Build monthly summaries for ภ.ง.ด. 3 and ภ.ง.ด. 53
 */
export function buildWithholdingTaxSummaries(
  vouchers: Voucher[],
  selectedMonth: string, // 'all' or 'YYYY-MM'
  statusFilter: 'all' | 'paid_and_approved' = 'paid_and_approved'
): { pnd3: WhtFormSummary; pnd53: WhtFormSummary; totalCombinedTax: number; totalCombinedBase: number } {
  // Filter for Payment Vouchers (PV) only
  let pvList = vouchers.filter((v) => v.type === 'PV');

  // Status filtering: Cash basis taxation requires actual payment or approval
  if (statusFilter === 'paid_and_approved') {
    pvList = pvList.filter((v) => 
      v.status === 'ชำระแล้ว (Completed)' || v.status === 'อนุมัติแล้ว (Approved)'
    );
  } else {
    // Exclude cancelled vouchers
    pvList = pvList.filter((v) => v.status !== 'ยกเลิก (Cancelled)');
  }

  // Month filtering
  if (selectedMonth && selectedMonth !== 'all') {
    pvList = pvList.filter((v) => v.date && v.date.startsWith(selectedMonth));
  }

  const pnd3Entries: WhtReportEntry[] = [];
  const pnd53Entries: WhtReportEntry[] = [];

  let pnd3Seq = 1;
  let pnd53Seq = 1;

  pvList.forEach((voucher) => {
    const formType = classifyPayeeForm(voucher.contact);

    // Process each item in voucher that has withholding tax
    voucher.items.forEach((item) => {
      if (item.whtAmount > 0 || item.whtRate > 0) {
        const secInfo = getIncomeSectionInfo(item.accountCategory, formType);
        const entry: WhtReportEntry = {
          sequence: formType === 'PND3' ? pnd3Seq++ : pnd53Seq++,
          voucherId: voucher.id,
          voucherNo: voucher.voucherNo,
          paymentDate: voucher.payment?.paymentDate || voucher.date,
          payeeName: voucher.contact.name,
          payeeTaxId: voucher.contact.taxId || '-',
          payeeAddress: voucher.contact.address || '-',
          branch: voucher.contact.branch || voucher.contact.branchCode || 'สำนักงานใหญ่',
          formType,
          incomeCategory: item.accountCategory,
          incomeSection: secInfo.section,
          description: item.description || item.accountCategory,
          baseAmount: item.baseAmount,
          whtRate: item.whtRate || secInfo.defaultRate,
          whtAmount: item.whtAmount,
          withholdingCondition: '1', // 1 = หัก ณ ที่จ่าย
        };

        if (formType === 'PND3') {
          pnd3Entries.push(entry);
        } else {
          pnd53Entries.push(entry);
        }
      }
    });
  });

  // Group entries by income section & tax rate for e-filing form page 1
  function createCategoryGroups(entries: WhtReportEntry[], formType: WhtFormType): WhtCategoryGroup[] {
    const groupsMap = new Map<string, WhtCategoryGroup>();

    entries.forEach((e) => {
      const key = `${e.incomeSection}_${e.whtRate}`;
      const secInfo = getIncomeSectionInfo(e.incomeCategory, formType);
      
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          incomeSection: e.incomeSection,
          sectionTitle: secInfo.title,
          whtRate: e.whtRate,
          totalBaseAmount: 0,
          totalWhtAmount: 0,
          payeeCount: 0,
          transactionCount: 0,
        });
      }

      const group = groupsMap.get(key)!;
      group.totalBaseAmount += e.baseAmount;
      group.totalWhtAmount += e.whtAmount;
      group.transactionCount += 1;
    });

    // Count unique payees per group
    groupsMap.forEach((group, key) => {
      const uniquePayees = new Set(
        entries
          .filter((e) => `${e.incomeSection}_${e.whtRate}` === key)
          .map((e) => e.payeeTaxId || e.payeeName)
      );
      group.payeeCount = uniquePayees.size;
    });

    return Array.from(groupsMap.values()).sort((a, b) => a.incomeSection.localeCompare(b.incomeSection));
  }

  const pnd3Groups = createCategoryGroups(pnd3Entries, 'PND3');
  const pnd53Groups = createCategoryGroups(pnd53Entries, 'PND53');

  const pnd3TotalBase = pnd3Entries.reduce((sum, e) => sum + e.baseAmount, 0);
  const pnd3TotalWht = pnd3Entries.reduce((sum, e) => sum + e.whtAmount, 0);
  const pnd3UniquePayees = new Set(pnd3Entries.map((e) => e.payeeTaxId || e.payeeName)).size;

  const pnd53TotalBase = pnd53Entries.reduce((sum, e) => sum + e.baseAmount, 0);
  const pnd53TotalWht = pnd53Entries.reduce((sum, e) => sum + e.whtAmount, 0);
  const pnd53UniquePayees = new Set(pnd53Entries.map((e) => e.payeeTaxId || e.payeeName)).size;

  const deadlines = calculateTaxDeadlines(selectedMonth === 'all' ? '' : selectedMonth);

  const pnd3: WhtFormSummary = {
    formType: 'PND3',
    formName: 'ภ.ง.ด. 3',
    formTitle: 'ภาษีเงินได้หัก ณ ที่จ่าย สำหรับบุคคลธรรมดา (ภ.ง.ด. 3)',
    monthKey: selectedMonth,
    monthThaiName: selectedMonth === 'all' ? 'รวมทุกงวดภาษี' : formatThaiMonth(selectedMonth),
    taxFilingDeadlineRegular: deadlines.regularDeadline,
    taxFilingDeadlineOnline: deadlines.onlineDeadline,
    totalBaseAmount: pnd3TotalBase,
    totalWhtAmount: pnd3TotalWht,
    totalPayees: pnd3UniquePayees,
    totalTransactions: pnd3Entries.length,
    categoryGroups: pnd3Groups,
    entries: pnd3Entries,
  };

  const pnd53: WhtFormSummary = {
    formType: 'PND53',
    formName: 'ภ.ง.ด. 53',
    formTitle: 'ภาษีเงินได้หัก ณ ที่จ่าย สำหรับนิติบุคคล (ภ.ง.ด. 53)',
    monthKey: selectedMonth,
    monthThaiName: selectedMonth === 'all' ? 'รวมทุกงวดภาษี' : formatThaiMonth(selectedMonth),
    taxFilingDeadlineRegular: deadlines.regularDeadline,
    taxFilingDeadlineOnline: deadlines.onlineDeadline,
    totalBaseAmount: pnd53TotalBase,
    totalWhtAmount: pnd53TotalWht,
    totalPayees: pnd53UniquePayees,
    totalTransactions: pnd53Entries.length,
    categoryGroups: pnd53Groups,
    entries: pnd53Entries,
  };

  return {
    pnd3,
    pnd53,
    totalCombinedTax: pnd3TotalWht + pnd53TotalWht,
    totalCombinedBase: pnd3TotalBase + pnd53TotalBase,
  };
}

/**
 * Generate CSV text for withholding tax attachment list
 */
export function exportWhtToCsv(summary: WhtFormSummary, company: CompanySettings): string {
  const headers = [
    'ลำดับที่',
    'เลขประจำตัวผู้เสียภาษีอากร',
    'ชื่อ-นามสกุล หรือชื่อนิติบุคคล',
    'สาขา',
    'ที่อยู่',
    'วัน เดือน ปี ที่จ่าย',
    'เลขที่ใบสำคัญจ่าย (PV)',
    'ประเภทเงินได้',
    'มาตราเงินได้',
    'อัตราภาษี (%)',
    'จำนวนเงินที่จ่าย (บาท)',
    'ภาษีที่หักและนำส่ง (บาท)',
    'เงื่อนไขการหัก (1=หัก ณ ที่จ่าย)'
  ];

  const rows = summary.entries.map((e) => [
    e.sequence,
    `="${e.payeeTaxId}"`, // formatted for excel to preserve leading zeros
    `"${e.payeeName.replace(/"/g, '""')}"`,
    `"${e.branch.replace(/"/g, '""')}"`,
    `"${e.payeeAddress.replace(/"/g, '""')}"`,
    e.paymentDate,
    e.voucherNo,
    `"${e.description.replace(/"/g, '""')}"`,
    `"${e.incomeSection}"`,
    `${e.whtRate}%`,
    e.baseAmount.toFixed(2),
    e.whtAmount.toFixed(2),
    e.withholdingCondition
  ]);

  const summaryRow = [
    'รวมทั้งสิ้น',
    '',
    `รวมผู้มีเงินได้ ${summary.totalPayees} ราย`,
    '',
    '',
    '',
    `รวม ${summary.totalTransactions} รายการ`,
    '',
    '',
    '',
    summary.totalBaseAmount.toFixed(2),
    summary.totalWhtAmount.toFixed(2),
    ''
  ];

  const metaHeader = [
    `"ใบแนบ ${summary.formName} - ${summary.formTitle}"`,
    `"บริษัท: ${company.name} (เลขประจำตัวผู้เสียภาษี ${company.taxId})"`,
    `"ประจำเดือนภาษี: ${summary.monthThaiName}"`,
    ''
  ].join('\n');

  const csvContent = '\uFEFF' + metaHeader + '\n' + [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
    summaryRow.join(',')
  ].join('\n');

  return csvContent;
}

/**
 * Generate Revenue Department RD Prep flat text file format
 * Pipe-delimited standard format used by Thai Revenue Department software
 */
export function exportWhtToRdPrep(summary: WhtFormSummary, company: CompanySettings): string {
  // RD Prep standard format:
  // Seq|TaxID|Branch|Title/Prefix|FirstName|LastName|Address|Date(DDMMYYYY)|IncomeType|Rate|BaseAmount|TaxAmount|Condition
  const lines = summary.entries.map((e) => {
    const cleanTax = (e.payeeTaxId || '').replace(/\D/g, '').padEnd(13, '0').slice(0, 13);
    const branchCode = e.branch.includes('สำนักงานใหญ่') ? '00000' : (e.branch.replace(/\D/g, '') || '00000').padStart(5, '0');
    
    // Parse date into DDMMYYYY (Buddhist era or CE based on RD)
    let ddmmyyyy = '';
    if (e.paymentDate) {
      const [y, m, d] = e.paymentDate.split('-');
      const beYear = parseInt(y, 10) + 543;
      ddmmyyyy = `${String(d).padStart(2, '0')}${String(m).padStart(2, '0')}${beYear}`;
    }

    // Split name if individual
    let prefix = '';
    let fName = e.payeeName;
    let lName = '';

    if (summary.formType === 'PND3') {
      const knownPrefixes = ['นาย', 'นางสาว', 'นาง', 'น.ส.', 'ดร.'];
      for (const p of knownPrefixes) {
        if (fName.startsWith(p)) {
          prefix = p;
          fName = fName.slice(p.length).trim();
          break;
        }
      }
      const parts = fName.split(/\s+/);
      if (parts.length > 1) {
        fName = parts[0];
        lName = parts.slice(1).join(' ');
      }
    }

    return [
      e.sequence,
      cleanTax,
      branchCode,
      prefix,
      fName,
      lName,
      e.payeeAddress.replace(/\|/g, ' '),
      ddmmyyyy,
      e.incomeSection,
      e.whtRate.toFixed(2),
      e.baseAmount.toFixed(2),
      e.whtAmount.toFixed(2),
      e.withholdingCondition
    ].join('|');
  });

  return lines.join('\r\n');
}
