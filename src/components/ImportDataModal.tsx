import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  ArrowRight,
  Database,
  RefreshCw,
  PlusCircle,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Voucher, VoucherType, ACCOUNT_CATEGORIES } from '../types';
import { convertToThaiBahtText, formatCurrency } from '../utils/thaiBahtText';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedVouchers: Voucher[], mode: 'replace' | 'append') => void;
  currentCount: number;
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentCount,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedVouchers, setParsedVouchers] = useState<Voucher[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Convert raw 2D array or object array to Voucher[]
  const parseRowsToVouchers = (rows: (string | number)[][]): Voucher[] => {
    if (rows.length < 2) return [];

    const headers = rows[0].map((h) => String(h || '').toLowerCase().trim().replace(/\s+/g, ''));

    const findCol = (keywords: string[]): number => {
      return headers.findIndex((h) => keywords.some((k) => h.includes(k.toLowerCase())));
    };

    const idxDate = findCol(['date', 'วันที่', 'docdate']);
    const idxType = findCol(['type', 'ประเภท', 'pv/rv', 'rv/pv', 'kind']);
    const idxNo = findCol(['no', 'เลขที่', 'voucherno', 'docno', 'เลขที่เอกสาร']);
    const idxRef = findCol(['ref', 'อ้างอิง', 'invoiceno', 'ใบแจ้งหนี้', 'inv']);
    const idxContact = findCol(['contact', 'ลูกค้า', 'ผู้รับเงิน', 'ผู้จ่ายเงิน', 'คู่ค้า', 'ชื่อ']);
    const idxTaxId = findCol(['taxid', 'เลขประจำตัวผู้เสียภาษี', 'tax', 'เลขผู้เสียภาษี']);
    const idxAddress = findCol(['address', 'ที่อยู่']);
    const idxCategory = findCol(['category', 'หมวดบัญชี', 'หมวด', 'ผังบัญชี']);
    const idxDesc = findCol(['desc', 'รายการ', 'รายละเอียด', 'description', 'detail']);
    const idxAmount = findCol(['amount', 'จำนวนเงิน', 'ยอดก่อนภาษี', 'base', 'subtotal', 'ก่อนvat']);
    const idxVat = findCol(['vat', 'ภาษีมูลค่าเพิ่ม', 'vat7%', 'ภาษีขาย', 'ภาษีซื้อ']);
    const idxWht = findCol(['wht', 'หักณที่จ่าย', '3%', 'ภาษีหัก', 'ภาษีหักณที่จ่าย']);
    const idxNet = findCol(['net', 'สุทธิ', 'ยอดสุทธิ', 'ยอดจ่ายสุทธิ', 'ยอดรับสุทธิ', 'total']);
    const idxBank = findCol(['bank', 'ธนาคาร', 'paymentmethod', 'จ่ายโดย']);
    const idxNote = findCol(['note', 'หมายเหตุ']);

    const vouchers: Voucher[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || row.every((c) => c === '' || c === undefined || c === null)) continue;

      const rawType = idxType !== -1 ? String(row[idxType] || '').toUpperCase() : '';
      const rawNo = idxNo !== -1 ? String(row[idxNo] || '').toUpperCase() : '';

      let typeVal: VoucherType = 'PV';
      if (rawType.includes('RV') || rawType.includes('รับ') || rawType.includes('RECEIPT') || rawNo.startsWith('RV')) {
        typeVal = 'RV';
      } else {
        typeVal = 'PV';
      }

      // Format date
      let dateVal = '';
      if (idxDate !== -1 && row[idxDate]) {
        const rawDate = String(row[idxDate]).trim();
        // Handle Excel serial date if number
        if (!isNaN(Number(rawDate)) && Number(rawDate) > 30000 && Number(rawDate) < 70000) {
          const jsDate = new Date((Number(rawDate) - (25567 + 2)) * 86400 * 1000);
          dateVal = jsDate.toISOString().split('T')[0];
        } else if (rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts.length === 3) {
            let y = parseInt(parts[2], 10);
            if (y > 2500) y -= 543; // Buddhist Era
            dateVal = `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        } else if (rawDate.includes('-')) {
          dateVal = rawDate.slice(0, 10);
        }
      }
      if (!dateVal) {
        dateVal = new Date().toISOString().split('T')[0];
      }

      const voucherNo = (idxNo !== -1 && row[idxNo] && String(row[idxNo]).trim())
        ? String(row[idxNo]).trim()
        : `${typeVal}-${dateVal.replace(/-/g, '').slice(0, 6)}-${String(r).padStart(3, '0')}`;

      const refInvoiceNo = idxRef !== -1 && row[idxRef] ? String(row[idxRef]).trim() : '';
      const contactName = idxContact !== -1 && row[idxContact] ? String(row[idxContact]).trim() : (typeVal === 'RV' ? 'ลูกค้าองค์กรทั่วไป' : 'คู่ค้า / ผู้ให้บริการ');
      const taxId = idxTaxId !== -1 && row[idxTaxId] ? String(row[idxTaxId]).replace(/[^0-9]/g, '').slice(0, 13) : '0105556026458';
      const address = idxAddress !== -1 && row[idxAddress] ? String(row[idxAddress]).trim() : 'กรุงเทพมหานคร';

      // Parse amounts
      const parseNum = (val: any): number => {
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9.-]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      };

      const rawAmount = idxAmount !== -1 ? parseNum(row[idxAmount]) : 0;
      const rawVat = idxVat !== -1 ? parseNum(row[idxVat]) : 0;
      const rawWht = idxWht !== -1 ? parseNum(row[idxWht]) : 0;
      const rawNet = idxNet !== -1 ? parseNum(row[idxNet]) : 0;

      let subtotal = rawAmount;
      let vatAmount = rawVat;
      let withholdingTaxAmount = rawWht;
      let netTotal = rawNet;

      // Auto-calculate if only net or subtotal given
      if (subtotal === 0 && netTotal > 0) {
        subtotal = Math.round((netTotal / 1.04) * 100) / 100;
        vatAmount = Math.round(subtotal * 0.07 * 100) / 100;
        withholdingTaxAmount = Math.round(subtotal * 0.03 * 100) / 100;
      } else if (subtotal > 0) {
        if (vatAmount === 0) vatAmount = Math.round(subtotal * 0.07 * 100) / 100;
        if (withholdingTaxAmount === 0) withholdingTaxAmount = Math.round(subtotal * 0.03 * 100) / 100;
        if (netTotal === 0) netTotal = subtotal + vatAmount - withholdingTaxAmount;
      }

      const description = idxDesc !== -1 && row[idxDesc] 
        ? String(row[idxDesc]).trim() 
        : (typeVal === 'RV' ? 'ค่าบริการตรวจสอบบัญชีและให้คำปรึกษา' : 'ค่าบริการและค่าใช้จ่ายดำเนินงาน');

      const category = idxCategory !== -1 && row[idxCategory]
        ? String(row[idxCategory]).trim()
        : (typeVal === 'RV' ? '4100-รายได้ค่าบริการ' : '5300-ค่าใช้จ่ายในการดำเนินงาน');

      const bankInfo = idxBank !== -1 && row[idxBank] ? String(row[idxBank]).trim() : 'ธนาคารไทยพาณิชย์ (SCB)';
      const notes = idxNote !== -1 && row[idxNote] ? String(row[idxNote]).trim() : '';

      vouchers.push({
        id: `v-imp-${Date.now()}-${r}`,
        voucherNo,
        type: typeVal,
        date: dateVal,
        referenceNo: refInvoiceNo,
        contact: {
          name: contactName,
          taxId,
          address,
          branch: 'สำนักงานใหญ่',
          branchCode: '00000',
        },
        items: [
          {
            id: `item-${r}-1`,
            description,
            accountCategory: category,
            baseAmount: subtotal,
            vatRate: vatAmount > 0 ? 7 : 0,
            vatAmount,
            whtRate: withholdingTaxAmount > 0 ? 3 : 0,
            whtAmount: withholdingTaxAmount,
            netAmount: netTotal,
          }
        ],
        subtotal,
        totalVat: vatAmount,
        totalWht: withholdingTaxAmount,
        netPayable: netTotal,
        thaiBahtText: convertToThaiBahtText(netTotal),
        payment: {
          method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
          bankName: bankInfo,
          accountNo: '123-4-56789-0',
          accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
          paymentDate: dateVal,
          transferRef: refInvoiceNo || 'TRF-IMP',
        },
        notes,
        status: 'ชำระแล้ว (Completed)',
        signatures: {
          preparedBy: 'เจ้าหน้าที่บัญชี',
          preparedDate: dateVal,
          checkedBy: 'สมชาย นักตรวจสอบ',
          checkedDate: dateVal,
          approvedBy: 'วิชัย ผู้จัดการฝ่ายการเงิน',
          approvedDate: dateVal,
          receivedOrPaidBy: contactName,
          receivedOrPaidDate: dateVal,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'Import',
      });
    }

    return vouchers;
  };

  const processSelectedFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const fileName = selectedFile.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        const text = await selectedFile.text();
        const json = JSON.parse(text);
        const list = Array.isArray(json) ? json : (json.vouchers || []);
        if (!list || list.length === 0) {
          throw new Error('ไม่พบข้อมูลใบสำคัญในไฟล์ JSON');
        }
        setParsedVouchers(list);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const worksheet = wb.Sheets[firstSheetName];
        const data: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const list = parseRowsToVouchers(data);
        if (list.length === 0) {
          throw new Error('ไม่พบแถวข้อมูลใบสำคัญที่ถูกต้องในไฟล์ Excel');
        }
        setParsedVouchers(list);
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await selectedFile.text();
        // Split rows
        const rows = text.split(/\r?\n/).filter((line) => line.trim().length > 0).map((line) => {
          // Detect delimiter
          const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
          return line.split(delimiter).map((col) => col.replace(/^["']|["']$/g, '').trim());
        });
        const list = parseRowsToVouchers(rows);
        if (list.length === 0) {
          throw new Error('ไม่พบแถวข้อมูลใบสำคัญที่ถูกต้องในไฟล์ CSV');
        }
        setParsedVouchers(list);
      } else {
        throw new Error('รูปแบบไฟล์ไม่รองรับ กรุณาใช้ไฟล์ .xlsx, .xls, .csv หรือ .json');
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์');
      setParsedVouchers([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedVouchers.length === 0) return;
    onImportSuccess(parsedVouchers, importMode);
    onClose();
  };

  // Download sample template
  const handleDownloadTemplate = () => {
    const sampleData = [
      ['วันที่', 'ประเภท', 'เลขที่เอกสาร', 'เลขที่อ้างอิง', 'ชื่อคู่ค้า/ลูกค้า', 'เลขประจำตัวผู้เสียภาษี', 'หมวดบัญชี', 'รายละเอียดรายการ', 'ยอดก่อนภาษี', 'VAT 7%', 'หัก ณ ที่จ่าย 3%', 'ยอดสุทธิ', 'ธนาคาร'],
      ['2026-03-05', 'RV', 'RV-202603-001', 'INV-690301', 'บริษัท สยาม โกลบอล เทรดดิ้ง จำกัด', '0105559012345', '4100-รายได้ค่าบริการ', 'บริการตรวจสอบบัญชีประจำงวด', 150000, 10500, 4500, 156000, 'ธนาคารไทยพาณิชย์ (SCB)'],
      ['2026-03-10', 'PV', 'PV-202603-001', 'PO-9042', 'บริษัท โปร สเตชั่นเนอรี่ แอนด์ ซัพพลาย จำกัด', '0105553044123', '5300-ค่าใช้จ่ายในการดำเนินงาน', 'ค่าอุปกรณ์สำนักงานและแบบพิมพ์เอกสาร', 45000, 3150, 1350, 46800, 'ธนาคารไทยพาณิชย์ (SCB)'],
      ['2026-03-15', 'RV', 'RV-202603-002', 'INV-690302', 'บริษัท เอเชีย เทค อินโนเวชั่น จำกัด', '0105561088712', '4100-รายได้ค่าบริการ', 'ที่ปรึกษาระบบบัญชีภาษีอากร', 200000, 14000, 6000, 208000, 'ธนาคารไทยพาณิชย์ (SCB)'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vouchers_Template');
    XLSX.writeFile(wb, 'AccountPlanet_Vouchers_Template.xlsx');
  };

  // Statistics of parsed vouchers
  const rvCount = parsedVouchers.filter((v) => v.type === 'RV').length;
  const pvCount = parsedVouchers.filter((v) => v.type === 'PV').length;
  const totalNet = parsedVouchers.reduce((acc, v) => acc + v.netPayable, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-prompt">นำเข้าข้อมูลจริงเข้าสู่ระบบ</h3>
              <p className="text-xs text-slate-300">
                รองรับไฟล์ Excel (.xlsx, .xls), CSV (.csv) หรือ JSON สำหรับใบสำคัญรับ-จ่าย
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Dropzone Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-blue-500 bg-blue-50/60'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json,.txt"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="w-14 h-14 mx-auto mb-3 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
              <UploadCloud className="w-7 h-7" />
            </div>

            <p className="text-sm font-semibold text-slate-800">
              {file ? file.name : 'ลากไฟล์ข้อมูลจริงมาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              รองรับไฟล์ Excel (.xlsx, .xls), CSV (.csv) และ JSON
            </p>

            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
              </span>
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> CSV
              </span>
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded">
                <FileJson className="w-3.5 h-3.5 text-amber-600" /> JSON
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">ไม่สามารถประมวลผลไฟล์ได้:</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Parsed Preview Strip */}
          {parsedVouchers.length > 0 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ตรวจพบข้อมูลพร้อมนำเข้า {parsedVouchers.length} รายการ
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    ยอดรวมสุทธิ: ฿{formatCurrency(totalNet)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-[11px] text-slate-500 block">ใบสำคัญรับ (RV)</span>
                    <span className="text-sm font-bold text-emerald-600">{rvCount} ฉบับ</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-[11px] text-slate-500 block">ใบสำคัญจ่าย (PV)</span>
                    <span className="text-sm font-bold text-rose-600">{pvCount} ฉบับ</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-[11px] text-slate-500 block">ภาษีหัก 3% รวม</span>
                    <span className="text-sm font-bold text-indigo-600">
                      ฿{formatCurrency(parsedVouchers.reduce((a, b) => a + b.totalWht, 0))}
                    </span>
                  </div>
                </div>

                {/* Sample items preview list */}
                <div className="mt-3 max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 text-xs">
                  {parsedVouchers.slice(0, 5).map((v, i) => (
                    <div key={v.id || i} className="p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          v.type === 'RV' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {v.voucherNo}
                        </span>
                        <span className="text-slate-700 truncate max-w-[200px]">{v.contact.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-900">฿{formatCurrency(v.netPayable)}</span>
                        <span className="text-[10px] text-slate-400 block">{v.date}</span>
                      </div>
                    </div>
                  ))}
                  {parsedVouchers.length > 5 && (
                    <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50">
                      ... และอีก {parsedVouchers.length - 5} รายการ
                    </div>
                  )}
                </div>
              </div>

              {/* Import Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  ตัวเลือกรูปแบบการบันทึกข้อมูล:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      importMode === 'replace'
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                        แทนที่ข้อมูลเดิมทั้งหมด
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        ล้างข้อมูลจำลองเดิม ({currentCount} รายการ) และใช้ข้อมูลจริงชุดนี้เป็นข้อมูลหลัก
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      importMode === 'append'
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                        นำเข้าเพิ่มจากข้อมูลเดิม
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        ผสานรายการใหม่เข้ากับรายการเดิมที่มีอยู่แล้วในระบบ
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Download Template helper */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>ต้องการดูตัวอย่างคอลัมน์ Excel?</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={parsedVouchers.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer ${
              parsedVouchers.length > 0 && !isProcessing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ยืนยันนำเข้าข้อมูล ({parsedVouchers.length} รายการ)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
