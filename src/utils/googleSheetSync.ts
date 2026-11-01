import { Voucher, GoogleSheetSyncConfig, VoucherItem, VoucherType } from '../types';
import { convertToThaiBahtText } from './thaiBahtText';

// Parse CSV text with robust handling for quoted strings and commas
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

// Convert parsed CSV rows into typed Vouchers
export function convertCSVToVouchers(csvRows: string[][]): Voucher[] {
  if (csvRows.length < 2) return [];

  const headers = csvRows[0].map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const vouchers: Voucher[] = [];

  // Helper to find column index by multiple keyword candidates
  const findCol = (keywords: string[]): number => {
    return headers.findIndex((h) => keywords.some((k) => h.includes(k.toLowerCase())));
  };

  const idxDate = findCol(['date', 'วันที่']);
  const idxType = findCol(['type', 'ประเภท', 'pv/rv', 'rv/pv']);
  const idxNo = findCol(['no', 'เลขที่', 'voucherno', 'เลขที่เอกสาร']);
  const idxRef = findCol(['ref', 'อ้างอิง', 'invoiceno']);
  const idxContact = findCol(['contact', 'ลูกค้า', 'ผู้รับเงิน', 'คู่ค้า', 'ชื่อ']);
  const idxTaxId = findCol(['taxid', 'เลขผู้เสียภาษี', 'tax']);
  const idxAddress = findCol(['address', 'ที่อยู่']);
  const idxCategory = findCol(['category', 'หมวดบัญชี', 'หมวด']);
  const idxDesc = findCol(['desc', 'รายการ', 'รายละเอียด', 'description']);
  const idxAmount = findCol(['amount', 'จำนวนเงิน', 'ยอดก่อนภาษี', 'base']);
  const idxVat = findCol(['vat', 'ภาษีมูลค่าเพิ่ม', 'vat7%']);
  const idxWht = findCol(['wht', 'หักณที่จ่าย', '3%', 'ภาษีหัก']);
  const idxNet = findCol(['net', 'สุทธิ', 'ยอดจ่ายสุทธิ', 'ยอดรับสุทธิ']);
  const idxBank = findCol(['bank', 'ธนาคาร']);
  const idxStatus = findCol(['status', 'สถานะ']);

  for (let r = 1; r < csvRows.length; r++) {
    const row = csvRows[r];
    if (!row || row.length === 0 || !row[0]) continue;

    // Detect Type (RV / PV)
    let typeVal: VoucherType = 'PV';
    const rawType = idxType !== -1 ? row[idxType]?.toUpperCase() || '' : '';
    const rawNo = idxNo !== -1 ? row[idxNo]?.toUpperCase() || '' : '';
    
    if (rawType.includes('RV') || rawType.includes('รับ') || rawNo.startsWith('RV')) {
      typeVal = 'RV';
    } else {
      typeVal = 'PV';
    }

    const dateVal = idxDate !== -1 && row[idxDate] ? row[idxDate] : new Date().toISOString().split('T')[0];
    const voucherNo = (idxNo !== -1 && row[idxNo]) ? row[idxNo] : `${typeVal}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(r).padStart(3, '0')}`;
    const refNo = idxRef !== -1 ? row[idxRef] : '';
    const contactName = idxContact !== -1 && row[idxContact] ? row[idxContact] : 'ลูกค้า / ผู้รับเงินทั่วไป';
    const taxId = idxTaxId !== -1 && row[idxTaxId] ? row[idxTaxId] : '0105556026458';
    const address = idxAddress !== -1 && row[idxAddress] ? row[idxAddress] : 'กรุงเทพมหานคร';

    // Account category & auto-calculation
    let category = idxCategory !== -1 && row[idxCategory] ? row[idxCategory] : (typeVal === 'RV' ? 'รายได้ค่าบริการตรวจสอบบัญชี' : 'ค่าบริการตรวจสอบบัญชี');
    const desc = idxDesc !== -1 && row[idxDesc] ? row[idxDesc] : (category || 'รายการทางบัญชี');

    const cleanNum = (str: string | undefined): number => {
      if (!str) return 0;
      const cleaned = str.replace(/[^0-9.-]+/g, '');
      const val = parseFloat(cleaned);
      return isNaN(val) ? 0 : val;
    };

    let baseAmount = idxAmount !== -1 ? cleanNum(row[idxAmount]) : 0;
    if (baseAmount === 0 && idxNet !== -1) {
      baseAmount = cleanNum(row[idxNet]);
    }

    let vatRate = 7;
    let vatAmount = 0;
    if (idxVat !== -1 && row[idxVat]) {
      vatAmount = cleanNum(row[idxVat]);
    } else if (category.includes('ตรวจสอบบัญชี') || category.includes('บริการอื่นๆ')) {
      vatAmount = Math.round(baseAmount * 0.07 * 100) / 100;
    }

    let whtRate = 3;
    let whtAmount = 0;
    if (idxWht !== -1 && row[idxWht]) {
      whtAmount = cleanNum(row[idxWht]);
    } else {
      // Default standard 3% withholding tax for services / audit / commission
      whtAmount = Math.round(baseAmount * 0.03 * 100) / 100;
    }

    let marginAmount: number | undefined = undefined;
    let marginPercent: number | undefined = undefined;
    if (category.includes('40%') || category.includes('ส่วนต่างค่าสอบ')) {
      marginPercent = 40;
      marginAmount = Math.round(baseAmount * 0.4 * 100) / 100;
    }

    let netPayable = 0;
    if (idxNet !== -1 && row[idxNet]) {
      netPayable = cleanNum(row[idxNet]);
    } else {
      if (typeVal === 'RV') {
        netPayable = baseAmount + vatAmount - whtAmount;
      } else {
        netPayable = baseAmount + vatAmount - whtAmount;
      }
    }

    const item: VoucherItem = {
      id: `item-${r}`,
      description: desc,
      accountCategory: category,
      baseAmount,
      marginPercent,
      marginAmount,
      vatRate,
      vatAmount,
      whtRate,
      whtAmount,
      netAmount: netPayable,
    };

    const voucher: Voucher = {
      id: `SHEET-SYNC-${Date.now()}-${r}`,
      voucherNo,
      type: typeVal,
      date: dateVal,
      referenceNo: refNo,
      contact: {
        name: contactName,
        taxId,
        address,
        branch: 'สำนักงานใหญ่',
        branchCode: '00000',
      },
      items: [item],
      subtotal: baseAmount,
      totalVat: vatAmount,
      totalWht: whtAmount,
      netPayable,
      thaiBahtText: convertToThaiBahtText(netPayable),
      payment: {
        method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
        bankName: idxBank !== -1 && row[idxBank] ? row[idxBank] : 'ธนาคารไทยพาณิชย์ (SCB)',
        accountNo: '082-248912-3',
        accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
        paymentDate: dateVal,
      },
      status: (idxStatus !== -1 && row[idxStatus]?.includes('อนุมัติ')) ? 'อนุมัติแล้ว (Approved)' : 'ชำระแล้ว (Completed)',
      signatures: {
        preparedBy: 'ระบบดึงข้อมูล Google Sheet',
        preparedDate: dateVal,
        checkedBy: 'ผู้ตรวจสอบระบบ',
        checkedDate: dateVal,
        approvedBy: 'ผู้มีอำนาจลงนาม',
        approvedDate: dateVal,
        receivedOrPaidBy: contactName,
        receivedOrPaidDate: dateVal,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'GoogleSheet',
    };

    vouchers.push(voucher);
  }

  return vouchers;
}

// Fetch Google Sheet live data directly with server-side proxy
export async function fetchLiveGoogleSheet(config: GoogleSheetSyncConfig): Promise<{
  success: boolean;
  vouchers?: Voucher[];
  error?: string;
  rowCount?: number;
}> {
  try {
    const params = new URLSearchParams();
    if (config.sheetUrl) params.append('url', config.sheetUrl);
    if (config.sheetId) params.append('sheetId', config.sheetId);
    if (config.sheetName) params.append('sheetName', config.sheetName);

    // Call server proxy first to avoid CORS
    const proxyUrl = `/api/sheets/fetch?${params.toString()}`;
    let response = await fetch(proxyUrl);

    if (!response.ok) {
      // Fallback: If URL is direct CSV or if server proxy returned error, attempt direct client fetch if public
      if (config.sheetUrl && config.sheetUrl.includes('/spreadsheets/d/')) {
        const match = config.sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const directUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
          const directResp = await fetch(directUrl);
          if (directResp.ok) {
            response = directResp;
          }
        }
      }
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ (สถานะ ${response.status}) โปรดตรวจสอบการแชร์ชีต`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return {
        success: false,
        error: 'ไม่พบข้อมูลรายการใน Google Sheet (ต้องมีแถวหัวตารางและอย่างน้อย 1 รายการข้อมูล)',
      };
    }

    const vouchers = convertCSVToVouchers(rows);

    return {
      success: true,
      vouchers,
      rowCount: vouchers.length,
    };
  } catch (err: any) {
    console.error('fetchLiveGoogleSheet error:', err);
    return {
      success: false,
      error: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheet',
    };
  }
}

// Generate Sample CSV content for users to copy or upload to Google Sheets
export function generateSampleSheetCSV(): string {
  return `วันที่,ประเภท,เลขที่เอกสาร,เลขอ้างอิง,ชื่อลูกค้า/ผู้รับเงิน,เลขประจำตัวผู้เสียภาษี,หมวดบัญชี,รายละเอียด,จำนวนเงิน,ภาษีมูลค่าเพิ่ม,หัก ณ ที่จ่าย 3%,ยอดสุทธิ,ธนาคาร,สถานะ
2026-09-01,RV,RV-202609-001,INV-6901,บจก. เคมีภัณฑ์ไทยแลนด์,0105557019283,รายได้ค่าบริการตรวจสอบบัญชี,ค่าสอบบัญชีประจำปี 2568,120000,8400,3600,124800,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)
2026-09-05,PV,PV-202609-001,CPA-01,นาย ชัยวัฒน์ สุขสวัสดิ์ (CPA),3100800129482,ค่าบริการตรวจสอบบัญชี,ค่าบริการตรวจสอบบัญชีงวดที่ 1,48000,0,1440,46560,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)
2026-09-08,RV,RV-202609-002,INV-6902,บจก. บางกอก ดีไซน์ สตูดิโอ,0105559021145,รายได้ค่าบริการอื่นๆ,ค่าจัดทำระบบบัญชีและภาษีอากร,45000,3150,1350,46800,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)
2026-09-12,PV,PV-202609-002,CMS-02,นาย วีระยุทธ มิตรประสิทธิ์,1100500412891,ค่านายหน้า,ค่านายหน้าแนะนำลูกค้าตรวจสอบบัญชี,18000,0,540,17460,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)
2026-09-18,PV,PV-202609-003,OFF-01,บจก. มณียา เรียลเอสเตท,0105548019281,ค่าเช่าและสาธารณูปโภค,ค่าเช่าพื้นที่สำนักงานประจำเดือน,25000,1750,1250,25500,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)`;
}
