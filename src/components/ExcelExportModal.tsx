import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Layers, 
  ListOrdered, 
  Filter, 
  Check, 
  Calendar, 
  DollarSign, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Voucher } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { 
  generateVouchersSummaryCsv, 
  generateVouchersDetailedCsv, 
  downloadExcelCsvFile, 
  generateExportFilename 
} from '../utils/excelCsvExport';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredVouchers: Voucher[];
  totalVouchersCount: number;
  typeFilter: string;
  statusFilter: string;
  dateRangeText?: string;
  activeSearchQuery?: string;
  onSuccessToast?: (msg: string) => void;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  filteredVouchers,
  totalVouchersCount,
  typeFilter,
  statusFilter,
  dateRangeText,
  activeSearchQuery,
  onSuccessToast,
}) => {
  const [exportMode, setExportMode] = useState<'summary' | 'detailed'>('summary');
  const [preserveZeros, setPreserveZeros] = useState(true);
  const [includeSummaryRow, setIncludeSummaryRow] = useState(true);
  const [customFilename, setCustomFilename] = useState(() => 
    generateExportFilename(typeFilter, statusFilter)
  );
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Calculate totals of filtered vouchers
  let totalSubtotal = 0;
  let totalVat = 0;
  let totalWht = 0;
  let totalNet = 0;
  let rvCount = 0;
  let pvCount = 0;
  let totalItemsCount = 0;

  filteredVouchers.forEach((v) => {
    totalSubtotal += Number(v.subtotal) || 0;
    totalVat += Number(v.totalVat) || 0;
    totalWht += Number(v.totalWht) || 0;
    totalNet += Number(v.netPayable) || 0;
    totalItemsCount += v.items ? v.items.length : 1;
    if (v.type === 'RV') rvCount++;
    else pvCount++;
  });

  const handleDownload = () => {
    if (filteredVouchers.length === 0) {
      alert('ไม่มีรายการใบสำคัญที่ตรงตามเงื่อนไขเพื่อส่งออก');
      return;
    }

    setIsExporting(true);
    try {
      let csvContent = '';
      const filename = customFilename.trim() || generateExportFilename(typeFilter, statusFilter);

      if (exportMode === 'summary') {
        csvContent = generateVouchersSummaryCsv(filteredVouchers, {
          preserveLeadingZeros: preserveZeros,
          includeSummaryRow,
        });
      } else {
        csvContent = generateVouchersDetailedCsv(filteredVouchers, {
          preserveLeadingZeros: preserveZeros,
          includeSummaryRow,
        });
      }

      const result = downloadExcelCsvFile(csvContent, filename);
      if (result.success) {
        if (onSuccessToast) {
          const modeName = exportMode === 'summary' ? 'สรุปรายใบสำคัญ' : 'แจกแจงรายบรรทัด';
          onSuccessToast(
            `ส่งออกไฟล์ CSV สำหรับ Excel เรียบร้อยแล้ว (${modeName} ${filteredVouchers.length} ฉบับ, ${(result.byteLength / 1024).toFixed(1)} KB)`
          );
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Export error:', err);
      alert(`เกิดข้อผิดพลาดในการส่งออก: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-prompt tracking-wide">
                  ส่งออกข้อมูลสำหรับ Microsoft Excel (.csv)
                </h3>
                <span className="bg-emerald-500/40 text-emerald-100 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/40">
                  Excel UTF-8 BOM
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                ส่งออกรายการตามตัวกรองปัจจุบัน รองรับภาษาไทย 100% เปิดใน Excel ได้ทันทีโดยสระไม่เพี้ยน
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-1.5 transition cursor-pointer relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700">
          {/* Active Filter Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                ข้อมูลที่ผ่านการกรอง (Currently Filtered Data)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {filteredVouchers.length} จากทั้งหมด {totalVouchersCount} ใบสำคัญ
              </span>
            </div>

            {/* Statistics pill row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-[11px] text-slate-500">จำนวนใบสำคัญ</div>
                <div className="text-sm font-bold text-slate-800 font-mono">
                  {filteredVouchers.length} <span className="text-[10px] font-normal text-slate-500">ฉบับ</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  PV: {pvCount} | RV: {rvCount}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-[11px] text-slate-500">ยอดก่อนภาษี</div>
                <div className="text-sm font-bold text-slate-800 font-mono">
                  ฿{formatCurrency(totalSubtotal)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Subtotal</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-[11px] text-slate-500">ภาษี VAT 7%</div>
                <div className="text-sm font-bold text-blue-700 font-mono">
                  ฿{formatCurrency(totalVat)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">VAT Total</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-emerald-200 bg-emerald-50/50">
                <div className="text-[11px] text-emerald-700 font-medium">ยอดสุทธิที่ต้องจ่าย/รับ</div>
                <div className="text-sm font-bold text-emerald-800 font-mono">
                  ฿{formatCurrency(totalNet)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Net Payable</div>
              </div>
            </div>

            {/* Filter context metadata pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-600">
              <span className="text-slate-400">เงื่อนไขปัจจุบัน:</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                ประเภท: {typeFilter === 'ALL' ? 'ทั้งหมด (PV+RV)' : typeFilter === 'PV' ? 'เฉพาะใบสำคัญจ่าย (PV)' : 'เฉพาะใบสำคัญรับ (RV)'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                สถานะ: {statusFilter === 'ALL' ? 'ทุกสถานะ' : statusFilter}
              </span>
              {dateRangeText && (
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {dateRangeText}
                </span>
              )}
              {activeSearchQuery && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                  คำค้น: "{activeSearchQuery}"
                </span>
              )}
            </div>
          </div>

          {/* Export Mode Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              เลือกรูปแบบโครงสร้างตาราง (Export Layout)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Summary */}
              <div
                onClick={() => setExportMode('summary')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  exportMode === 'summary'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                  exportMode === 'summary' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                }`}>
                  {exportMode === 'summary' && <Check className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4 text-emerald-700" />
                    <span>สรุปรายใบสำคัญ (1 แถว ต่อ 1 ใบสำคัญ)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    แนะนำสำหรับรายงานบัญชี ทะเบียนคุมเอกสาร PV/RV รวมยอดก่อนภาษี VAT หัก ณ ที่จ่าย และยอดสุทธิแต่ละฉบับ
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded inline-block">
                    ส่งออกทั้งหมด {filteredVouchers.length} บรรทัด
                  </div>
                </div>
              </div>

              {/* Option 2: Detailed Line Items */}
              <div
                onClick={() => setExportMode('detailed')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  exportMode === 'detailed'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                  exportMode === 'detailed' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                }`}>
                  {exportMode === 'detailed' && <Check className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span>แจกแจงรายบรรทัด (1 แถว ต่อ 1 รายการย่อย)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    แยกย่อยตามรายการสินค้า/บริการ แสดงหมวดบัญชี อัตรา VAT% และ WHT% รายตัว เหมาะสำหรับทำ PivotTable
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded inline-block">
                    ส่งออกทั้งหมด {totalItemsCount} บรรทัด
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compatibility Options */}
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>การตั้งค่าความเข้ากันได้กับ Microsoft Excel</span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preserveZeros}
                  onChange={(e) => setPreserveZeros(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-slate-800">
                    คงรูปแบบเลข 13 หลัก และเลขที่บัญชีธนาคาร (ป้องกันเลข 0 ข้างหน้าหายใน Excel)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    จัดรูปแบบ Tax ID และเลขที่บัญชีแบบ Formula Text (<code className="font-mono text-emerald-700">="01055..."</code>) ทำให้ Excel ไม่ตัดเลขศูนย์นำหน้าทิ้ง และไม่แสดงเป็นสัญกรณ์วิทยาศาสตร์
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSummaryRow}
                  onChange={(e) => setIncludeSummaryRow(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-slate-800">
                    เพิ่มแถวสรุปยอดรวม (Total Row) ท้ายตาราง
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    แทรกบรรทัดรวมยอดเงินก่อนภาษี, ยอดภาษี VAT, ยอดหัก ณ ที่จ่าย และยอดสุทธิทั้งสิ้นไว้ที่แถวล่างสุดของไฟล์
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Filename Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ชื่อไฟล์ที่จะดาวน์โหลด (.csv)
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="AccountPlanet_Vouchers.csv"
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>พร้อมใช้งานร่วมกับ Microsoft Excel 2013-2024 / Office 365</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/80 rounded-xl transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || filteredVouchers.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'กำลังสร้างไฟล์...' : `ดาวน์โหลดไฟล์ CSV สำหรับ Excel (${filteredVouchers.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
