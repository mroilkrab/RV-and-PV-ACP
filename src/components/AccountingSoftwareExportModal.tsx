import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings2,
  Table,
  Zap,
  Info,
  Building2,
  Calculator
} from 'lucide-react';
import { Voucher } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import {
  AccountingSoftware,
  getCurrentYearMonth,
  formatThaiMonthYear,
  filterVouchersByMonth,
  generatePeakFormatCsv,
  generateExpressFormatCsv,
  generateGlJournalCsv,
  downloadAccountingCsvFile
} from '../utils/accountingSoftwareExport';

interface AccountingSoftwareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  onSuccessToast?: (msg: string) => void;
}

export const AccountingSoftwareExportModal: React.FC<AccountingSoftwareExportModalProps> = ({
  isOpen,
  onClose,
  vouchers,
  onSuccessToast,
}) => {
  // Current month default
  const defaultYearMonth = useMemo(() => getCurrentYearMonth(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultYearMonth);
  const [useAllMonths, setUseAllMonths] = useState<boolean>(false);
  
  // Software format
  const [software, setSoftware] = useState<AccountingSoftware>('peak');
  
  // Doc type filter
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'PV' | 'RV'>('ALL');
  
  // Date format
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  
  // UI states
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Extract unique available months from vouchers to populate quick selector
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    vouchers.forEach((v) => {
      if (v.date && v.date.length >= 7) {
        months.add(v.date.slice(0, 7));
      }
    });
    // Ensure current month is always in the list
    months.add(defaultYearMonth);
    return Array.from(months).sort().reverse();
  }, [vouchers, defaultYearMonth]);

  // Compute filtered vouchers by month and type
  const targetVouchers = useMemo(() => {
    let list = vouchers;
    if (!useAllMonths && selectedMonth) {
      list = filterVouchersByMonth(list, selectedMonth);
    }
    if (docTypeFilter !== 'ALL') {
      list = list.filter((v) => v.type === docTypeFilter);
    }
    // Sort by date descending
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [vouchers, useAllMonths, selectedMonth, docTypeFilter]);

  // Metrics for the selected month
  const metrics = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    let wht = 0;
    let net = 0;
    let pvCount = 0;
    let rvCount = 0;

    targetVouchers.forEach((v) => {
      subtotal += Number(v.subtotal) || 0;
      vat += Number(v.totalVat) || 0;
      wht += Number(v.totalWht) || 0;
      net += Number(v.netPayable) || 0;
      if (v.type === 'PV') pvCount++;
      else rvCount++;
    });

    return {
      count: targetVouchers.length,
      pvCount,
      rvCount,
      subtotal,
      vat,
      wht,
      net,
    };
  }, [targetVouchers]);

  // Generate preview snippet (up to 5 rows)
  const previewData = useMemo(() => {
    if (targetVouchers.length === 0) return { headers: [], rows: [] };
    
    let csv = '';
    if (software === 'peak') {
      csv = generatePeakFormatCsv(targetVouchers.slice(0, 5), { dateFormat });
    } else if (software === 'express') {
      csv = generateExpressFormatCsv(targetVouchers.slice(0, 5), { dateFormat });
    } else {
      csv = generateGlJournalCsv(targetVouchers.slice(0, 5), { dateFormat });
    }

    // Strip BOM
    const cleanCsv = csv.replace(/^\uFEFF/, '');
    const lines = cleanCsv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string) => {
      const result: string[] = [];
      let inQuote = false;
      let buffer = '';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuote = !inQuote;
        } else if (ch === ',' && !inQuote) {
          result.push(buffer.trim().replace(/^="?|"$/g, '').replace(/^"|"$/g, ''));
          buffer = '';
        } else {
          buffer += ch;
        }
      }
      result.push(buffer.trim().replace(/^="?|"$/g, '').replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1, 6).map((l) => parseLine(l));

    return { headers, rows };
  }, [targetVouchers, software, dateFormat]);

  if (!isOpen) return null;

  // Month navigation helpers
  const handlePrevMonth = () => {
    setUseAllMonths(false);
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${prevY}-${prevM}`);
  };

  const handleNextMonth = () => {
    setUseAllMonths(false);
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handleDownload = () => {
    if (targetVouchers.length === 0) {
      alert('ไม่มีรายการใบสำคัญในเดือนที่เลือกเพื่อส่งออก');
      return;
    }

    setIsExporting(true);
    try {
      let csvContent = '';
      let swTag = 'PEAK';
      if (software === 'peak') {
        swTag = 'PEAK';
        csvContent = generatePeakFormatCsv(targetVouchers, { dateFormat });
      } else if (software === 'express') {
        swTag = 'Express';
        csvContent = generateExpressFormatCsv(targetVouchers, { dateFormat });
      } else {
        swTag = 'GL_Journal';
        csvContent = generateGlJournalCsv(targetVouchers, { dateFormat });
      }

      const monthTag = useAllMonths ? 'All_Months' : selectedMonth;
      const typeTag = docTypeFilter === 'ALL' ? 'Vouchers' : docTypeFilter;
      const filename = `${swTag}_${typeTag}_${monthTag}.csv`;

      const result = downloadAccountingCsvFile(csvContent, filename);

      if (result.success) {
        if (onSuccessToast) {
          const swName = software === 'peak' ? 'PEAK Engine' : software === 'express' ? 'โปรแกรม Express' : 'สมุดรายวัน GL';
          const periodName = useAllMonths ? 'ข้อมูลทุกเดือน' : `ประจำเดือน ${formatThaiMonthYear(selectedMonth)}`;
          onSuccessToast(
            `ส่งออกไฟล์ CSV สำหรับ ${swName} เรียบร้อยแล้ว (${periodName}, รวม ${targetVouchers.length} ฉบับ, ${(result.byteLength / 1024).toFixed(1)} KB)`
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
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-white shadow-inner">
              <Calculator className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-prompt tracking-wide text-white">
                  ส่งออกใบสำคัญสำหรับโปรแกรมบัญชี (Express / PEAK)
                </h3>
                <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                  รองรับภาษาไทย UTF-8 BOM
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                แปลงรายการใบสำคัญรับ (RV) และใบสำคัญจ่าย (PV) ให้เข้ากับโครงสร้างโปรแกรมบัญชีชั้นนำของไทย
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl p-1.5 transition cursor-pointer relative z-10"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* 1. Month Selection Banner (Defaults to Current Month) */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    ช่วงเวลาที่ต้องการส่งออก (เลือกเดือน)
                  </span>
                  {selectedMonth === defaultYearMonth && !useAllMonths && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                      ★ เดือนปัจจุบัน (Current Month)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ระบบตั้งค่าเริ่มต้นเป็นเดือนปัจจุบันเพื่อความสะดวกรวดเร็วในการปิดบัญชีประจำงวด
                </p>
              </div>

              {/* Quick Month Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(defaultYearMonth);
                    setUseAllMonths(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                    selectedMonth === defaultYearMonth && !useAllMonths
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  เดือนปัจจุบัน
                </button>

                <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={useAllMonths}
                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40 transition cursor-pointer"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <select
                    value={useAllMonths ? 'ALL' : selectedMonth}
                    onChange={(e) => {
                      if (e.target.value === 'ALL') {
                        setUseAllMonths(true);
                      } else {
                        setUseAllMonths(false);
                        setSelectedMonth(e.target.value);
                      }
                    }}
                    className="text-xs font-bold text-slate-800 bg-transparent px-2 py-1 focus:outline-none cursor-pointer"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatThaiMonthYear(m)} {m === defaultYearMonth ? '(เดือนนี้)' : ''}
                      </option>
                    ))}
                    <option value="ALL">-- ทุกเดือนรวมกัน (All Time) --</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    disabled={useAllMonths}
                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40 transition cursor-pointer"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Monthly KPI Stats Strip */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">จำนวนใบสำคัญ</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {metrics.count} <span className="text-xs font-normal text-slate-500">ฉบับ</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  (PV: {metrics.pvCount} / RV: {metrics.rvCount})
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">ยอดรวมก่อนภาษี</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  ฿{formatCurrency(metrics.subtotal)}
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">ภาษีมูลค่าเพิ่ม 7%</span>
                <span className="text-sm font-bold text-blue-700 font-mono">
                  ฿{formatCurrency(metrics.vat)}
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">หัก ณ ที่จ่าย</span>
                <span className="text-sm font-bold text-amber-700 font-mono">
                  ฿{formatCurrency(metrics.wht)}
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 block">ยอดสุทธิ (Net)</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  ฿{formatCurrency(metrics.net)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Target Accounting Software Format */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                เลือกระบบบัญชีเป้าหมาย (Target Accounting Software)
              </label>
              <span className="text-xs text-slate-500">รองรับการนำเข้าแบบ Batch Import</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: PEAK Engine */}
              <div
                onClick={() => setSoftware('peak')}
                className={`relative rounded-xl p-4 border-2 transition cursor-pointer bg-white ${
                  software === 'peak'
                    ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      PEAK
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">PEAK Engine</h4>
                      <p className="text-[11px] text-slate-500">peakengine.com</p>
                    </div>
                  </div>
                  {software === 'peak' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">
                  ฟอร์แมตสำหรับนำเข้าบิลค่าใช้จ่าย/รายรับ, ผังบัญชี, ภาษีซื้อ/ขาย และใบหัก ณ ที่จ่าย ภ.ง.ด.3/53
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-semibold">
                    บิลซื้อ/จ่าย & ใบเสร็จ
                  </span>
                </div>
              </div>

              {/* Option 2: Express Accounting */}
              <div
                onClick={() => setSoftware('express')}
                className={`relative rounded-xl p-4 border-2 transition cursor-pointer bg-white ${
                  software === 'express'
                    ? 'border-indigo-600 bg-indigo-50/30 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      EXP
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">โปรแกรมบัญชี Express</h4>
                      <p className="text-[11px] text-slate-500">Express Accounting System</p>
                    </div>
                  </div>
                  {software === 'express' && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">
                  ฟอร์แมตสมุดรายวันจ่าย (PJ)/รับ (RJ) พร้อมรหัสผังบัญชี เดบิต/เครดิต และเลขประจำตัวผู้เสียภาษี 13 หลัก
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                    สมุดรายวัน & บันทึกซื้อ/ขาย
                  </span>
                </div>
              </div>

              {/* Option 3: General GL Journal */}
              <div
                onClick={() => setSoftware('gl_journal')}
                className={`relative rounded-xl p-4 border-2 transition cursor-pointer bg-white ${
                  software === 'gl_journal'
                    ? 'border-emerald-600 bg-emerald-50/30 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      GL
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">สมุดรายวันทั่วไป (GL)</h4>
                      <p className="text-[11px] text-slate-500">FlowAccount / SMEMOVE / MAC5</p>
                    </div>
                  </div>
                  {software === 'gl_journal' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">
                  เดบิต/เครดิต บาลานซ์คู่บัญชีครบถ้วน เหมาะสำหรับนำเข้าโปรแกรมบัญชีทุกระบบที่รองรับ Journal Import
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                    Double-Entry Debit/Credit
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Document Filter & Format Options */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              ตัวเลือกการแยกประเภทและรูปแบบ
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Document Type Filter */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">
                  ประเภทเอกสารที่ต้องการนำออก:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocTypeFilter('ALL')}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                      docTypeFilter === 'ALL'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    ทั้งหมด ({metrics.count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocTypeFilter('PV')}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                      docTypeFilter === 'PV'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    เฉพาะใบสำคัญจ่าย ({metrics.pvCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocTypeFilter('RV')}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                      docTypeFilter === 'RV'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    เฉพาะใบสำคัญรับ ({metrics.rvCount})
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * หมายเหตุ: ในโปรแกรม Express และ PEAK มักจะแยกเมนูนำเข้าบิลซื้อ (PV) และบิลขาย (RV)
                </p>
              </div>

              {/* Date Format Option */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">
                  รูปแบบวันที่ในไฟล์ CSV:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDateFormat('DD/MM/YYYY')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                      dateFormat === 'DD/MM/YYYY'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    DD/MM/YYYY (มาตรฐานไทย)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFormat('YYYY-MM-DD')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                      dateFormat === 'YYYY-MM-DD'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    YYYY-MM-DD (ISOสากล)
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Express แนะนำให้ใช้ DD/MM/YYYY เพื่อให้อ่านตรงตามระบบฐานข้อมูล
                </p>
              </div>
            </div>
          </div>

          {/* 4. Live Table Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-700">
                  ตัวอย่างโครงสร้างไฟล์ที่จะส่งออก (แสดง 5 แถวแรก)
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {previewData.headers.length} คอลัมน์
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                {showPreview ? 'ย่อตัวอย่าง' : 'ขยายตัวอย่าง'}
              </button>
            </div>

            {showPreview && (
              <div className="overflow-x-auto max-h-60 p-2">
                {targetVouchers.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    ไม่มีรายการใบสำคัญในเงื่อนไขที่เลือก กรุณาเปลี่ยนเดือนหรือประเภทเอกสาร
                  </div>
                ) : (
                  <table className="min-w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-left font-semibold">
                        {previewData.headers.map((h, i) => (
                          <th key={i} className="p-2 border border-slate-200 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-600 font-mono">
                      {previewData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-blue-50/40">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 border border-slate-200 whitespace-nowrap max-w-xs truncate">
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Helpful Tips Box */}
          <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <span className="font-bold block">คำแนะนำในการนำเข้าโปรแกรมบัญชี:</span>
              <p>
                • <strong>PEAK:</strong> ไปที่เมนู รายจ่าย (Expenses) &gt; บันทึกค่าใช้จ่าย &gt; กดจุดสามจุดมุมบนขวา &gt; เลือก "นำเข้าข้อมูลจากไฟล์ Excel/CSV"
              </p>
              <p>
                • <strong>Express:</strong> บันทึกไฟล์ CSV ลงเครื่อง และใช้โปรแกรมแปลงข้อมูลเข้าตาราง DBF หรือเข้าเมนู สมุดรายวันจ่าย (PJ) / รายวันรับ (RJ)
              </p>
              <p>
                • ไฟล์ถูกบันทึกด้วย <strong>UTF-8 with BOM</strong> ทำให้เปิดใน Microsoft Excel ภาษาไทยไม่เป็นภาษาต่างดาวแน่นอน
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            พร้อมส่งออก: <span className="font-bold text-slate-900">{targetVouchers.length}</span> ฉบับ
            {' '}({useAllMonths ? 'ทุกเดือน' : formatThaiMonthYear(selectedMonth)})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || targetVouchers.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting 
                  ? 'กำลังส่งออก...' 
                  : `ดาวน์โหลด CSV สำหรับ ${software === 'peak' ? 'PEAK' : software === 'express' ? 'Express' : 'สมุดรายวัน GL'}`
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
