import React, { useState, useMemo } from 'react';
import { 
  Voucher, 
  CompanySettings, 
  WhtFormType, 
  WhtReportEntry, 
  WhtFormSummary 
} from '../types';
import { 
  buildWithholdingTaxSummaries, 
  getAvailableTaxMonths, 
  exportWhtToCsv, 
  exportWhtToRdPrep,
  formatThaiDate
} from '../utils/taxReportUtils';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  AlertCircle, 
  User, 
  Building2, 
  Calendar, 
  HelpCircle, 
  Search, 
  ExternalLink,
  ShieldAlert,
  Clock,
  ArrowRight,
  Filter,
  FileText
} from 'lucide-react';

interface WithholdingTaxReportProps {
  vouchers: Voucher[];
  companySettings: CompanySettings;
  onSelectVoucherToPrint?: (voucher: Voucher) => void;
  onEditVoucher?: (voucher: Voucher) => void;
  onPrint50Tawi?: (voucher: Voucher) => void;
}

export const WithholdingTaxReport: React.FC<WithholdingTaxReportProps> = ({
  vouchers,
  companySettings,
  onSelectVoucherToPrint,
  onEditVoucher,
  onPrint50Tawi,
}) => {
  const availableMonths = useMemo(() => getAvailableTaxMonths(vouchers), [vouchers]);
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid_and_approved'>('paid_and_approved');
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'pnd3' | 'pnd53' | 'guide'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<WhtFormType | null>(null);

  // Build summaries
  const { pnd3, pnd53, totalCombinedTax, totalCombinedBase } = useMemo(() => {
    return buildWithholdingTaxSummaries(vouchers, selectedMonth, statusFilter);
  }, [vouchers, selectedMonth, statusFilter]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Download CSV
  const handleDownloadCsv = (summary: WhtFormSummary) => {
    const csvData = exportWhtToCsv(summary, companySettings);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `WHT_${summary.formName.replace(/\s+/g, '')}_${summary.monthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download RD Prep Text File
  const handleDownloadRdPrep = (summary: WhtFormSummary) => {
    const textData = exportWhtToRdPrep(summary, companySettings);
    const blob = new Blob(['\uFEFF' + textData], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RDPREP_${summary.formName.replace(/\s+/g, '')}_${summary.monthKey}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter entries by search query
  const filterEntries = (entries: WhtReportEntry[]) => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.payeeName.toLowerCase().includes(q) ||
        e.payeeTaxId.includes(q) ||
        e.voucherNo.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
    );
  };

  const filteredPnd3Entries = useMemo(() => filterEntries(pnd3.entries), [pnd3.entries, searchQuery]);
  const filteredPnd53Entries = useMemo(() => filterEntries(pnd53.entries), [pnd53.entries, searchQuery]);

  // Print single form view
  if (printMode) {
    const summary = printMode === 'PND3' ? pnd3 : pnd53;
    return (
      <div className="bg-white min-h-screen text-slate-900 p-8 font-sans max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none">
        {/* Print Bar (Hidden in Print) */}
        <div className="no-print mb-6 p-4 bg-slate-100 rounded-xl flex items-center justify-between border border-slate-200">
          <div className="text-sm">
            กำลังแสดงหน้าพิมพ์แบบฟอร์ม <strong>{summary.formTitle}</strong> ประจำงวด <strong>{summary.monthThaiName}</strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm shadow-xs"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสาร (A4)
            </button>
            <button
              onClick={() => setPrintMode(null)}
              className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 text-sm"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>

        {/* Printable Paper */}
        <div className="border border-slate-300 p-6 rounded-sm bg-white">
          {/* Header */}
          <div className="text-center pb-4 border-b border-slate-300">
            <h1 className="text-xl font-bold text-slate-900">
              ใบแนบแบบยื่นรายการภาษีเงินได้หัก ณ ที่จ่าย ({summary.formName})
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              ตามมาตรา 3 เตรส และมาตรา 50 แห่งประมวลรัษฎากร • ประจำเดือนภาษี {summary.monthThaiName}
            </p>
          </div>

          {/* Company Withholding Agent Details */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-300 text-xs">
            <div>
              <p><strong>ชื่อผู้มีหน้าที่หักภาษี ณ ที่จ่าย:</strong> {companySettings.name}</p>
              <p className="mt-0.5"><strong>เลขประจำตัวผู้เสียภาษีอากร:</strong> {companySettings.taxId}</p>
              <p className="mt-0.5"><strong>สาขา:</strong> {companySettings.branch} (รหัส {companySettings.branchCode || '00000'})</p>
            </div>
            <div>
              <p><strong>ที่อยู่สำนักงาน:</strong> {companySettings.address} {companySettings.subDistrict} {companySettings.district} {companySettings.province} {companySettings.postalCode}</p>
              <p className="mt-0.5"><strong>เบอร์โทรศัพท์:</strong> {companySettings.phone}</p>
              <p className="mt-0.5"><strong>กำหนดเวลายื่นแบบ (e-Filing):</strong> ภายใน {summary.taxFilingDeadlineOnline}</p>
            </div>
          </div>

          {/* Summary Box */}
          <div className="my-4 bg-slate-50 border border-slate-200 p-3 text-xs grid grid-cols-4 gap-2 text-center rounded">
            <div>
              <span className="text-slate-500 block">จำนวนรายผู้มีเงินได้</span>
              <strong className="text-sm">{summary.totalPayees} ราย</strong>
            </div>
            <div>
              <span className="text-slate-500 block">จำนวนใบสำคัญ/รายการ</span>
              <strong className="text-sm">{summary.totalTransactions} รายการ</strong>
            </div>
            <div>
              <span className="text-slate-500 block">รวมยอดเงินได้ที่จ่ายทั้งสิ้น</span>
              <strong className="text-sm">{summary.totalBaseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong>
            </div>
            <div>
              <span className="text-slate-500 block">รวมยอดภาษีที่หักและนำส่งทั้งสิ้น</span>
              <strong className="text-sm text-rose-700">{summary.totalWhtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-[11px] border-collapse border border-slate-300 mt-2">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-300 p-1.5 text-center w-10">ลำดับ</th>
                <th className="border border-slate-300 p-1.5 text-left">ชื่อ-สกุล/นิติบุคคล และเลขประจำตัวผู้เสียภาษี</th>
                <th className="border border-slate-300 p-1.5 text-center w-20">วันที่จ่าย</th>
                <th className="border border-slate-300 p-1.5 text-left">ประเภทเงินได้ / เลขที่ PV</th>
                <th className="border border-slate-300 p-1.5 text-center w-14">อัตรา</th>
                <th className="border border-slate-300 p-1.5 text-right w-24">จำนวนเงินที่จ่าย</th>
                <th className="border border-slate-300 p-1.5 text-right w-24">ภาษีที่นำส่ง</th>
                <th className="border border-slate-300 p-1.5 text-center w-12">เงื่อนไข</th>
              </tr>
            </thead>
            <tbody>
              {summary.entries.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-1.5 text-center font-mono">{item.sequence}</td>
                  <td className="border border-slate-300 p-1.5">
                    <div className="font-semibold text-slate-800">{item.payeeName}</div>
                    <div className="text-slate-500 font-mono text-[10px]">เลขประจำตัว: {item.payeeTaxId} ({item.branch})</div>
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center">{formatThaiDate(item.paymentDate)}</td>
                  <td className="border border-slate-300 p-1.5">
                    <div>{item.description}</div>
                    <div className="text-slate-400 text-[10px]">มาตรา {item.incomeSection} • Ref: {item.voucherNo}</div>
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center">{item.whtRate}%</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">
                    {item.baseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold text-rose-700">
                    {item.whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center">หัก ณ ที่จ่าย</td>
                </tr>
              ))}
              {summary.entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="border border-slate-300 p-4 text-center text-slate-400">
                    ไม่มีรายการภาษีหัก ณ ที่จ่ายในงวดนี้
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={5} className="border border-slate-300 p-2 text-right">
                  ยอดรวมทั้งสิ้น ({summary.entries.length} รายการ):
                </td>
                <td className="border border-slate-300 p-2 text-right font-mono">
                  {summary.totalBaseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-300 p-2 text-right font-mono text-rose-700">
                  {summary.totalWhtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-300 p-2 text-center">-</td>
              </tr>
            </tfoot>
          </table>

          {/* Legal Certification and Signature Block */}
          <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-700">
            <div>
              <p className="font-semibold text-slate-800 mb-1">คำรับรองของผู้มีหน้าที่หักภาษี ณ ที่จ่าย:</p>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                ข้าพเจ้าขอรับรองว่า รายการที่ได้ระบุไว้ข้างต้นนี้ เป็นรายการที่ถูกต้องและเป็นความจริงทุกประการ
                ได้มีการหักภาษี ณ ที่จ่ายตามอัตราที่กฎหมายกำหนด และพร้อมนำส่งสรรพากร
              </p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-48 border-b border-dashed border-slate-400 mt-8 mb-1"></div>
              <p className="text-slate-600">(ลงชื่อ)..................................................................... ผู้มีอำนาจลงนาม</p>
              <p className="text-slate-500 text-[10px] mt-1">วันที่ ......... / ........................ / ...............</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>รายงานสรุปภาษีหัก ณ ที่จ่าย (Withholding Tax Report)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            รายงานสรุป ภ.ง.ด. 3 และ ภ.ง.ด. 53 รายเดือน
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            ประมวลผลอัตโนมัติจากใบสำคัญจ่าย (PV) ทั้งหมดในระบบ เพื่อนำตัวเลขสรุปไปกรอกยื่นแบบแสดงรายการภาษีผ่านระบบ e-Filing ของกรมสรรพากรได้ทันที
          </p>
        </div>

        {/* Filter Controls: Month & Payment Status */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-medium shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">ดูทุกงวดภาษี</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  เดือน {m === '2026-09' ? 'กันยายน 2569' : m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-medium shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="paid_and_approved">เฉพาะจ่ายแล้ว/อนุมัติ (Cash Basis)</option>
              <option value="all">รวมทุกสถานะ (ยกเว้นยกเลิก)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Combined Tax to Remit */}
        <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>ภาษีหัก ณ ที่จ่ายรวมที่ต้องนำส่ง</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-amber-300">
            ฿{totalCombinedTax.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>ฐานเงินได้รวม: ฿{totalCombinedBase.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            <span className="text-slate-400">({pnd3.totalTransactions + pnd53.totalTransactions} ฉบับ)</span>
          </div>
        </div>

        {/* ภ.ง.ด. 3 Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> ภ.ง.ด. 3 (บุคคลธรรมดา)
            </span>
            <span className="text-xs font-mono text-slate-500">{pnd3.totalPayees} ราย</span>
          </div>
          <div className="mt-3 text-xl font-bold font-mono text-slate-900">
            ฿{pnd3.totalWhtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ยอดจ่ายเงินได้: ฿{pnd3.totalBaseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* ภ.ง.ด. 53 Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-purple-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> ภ.ง.ด. 53 (นิติบุคคล)
            </span>
            <span className="text-xs font-mono text-slate-500">{pnd53.totalPayees} ราย</span>
          </div>
          <div className="mt-3 text-xl font-bold font-mono text-slate-900">
            ฿{pnd53.totalWhtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ยอดจ่ายเงินได้: ฿{pnd53.totalBaseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* e-Filing Deadline Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>กำหนดยื่นแบบภาษี ({pnd3.monthThaiName})</span>
            </div>
            <div className="mt-2 text-xs font-medium text-slate-700">
              ยื่น e-Filing ผ่านเน็ต: <strong className="text-rose-600">{pnd3.taxFilingDeadlineOnline}</strong>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              (ยื่นแบบกระดาษ: ภายใน {pnd3.taxFilingDeadlineRegular})
            </div>
          </div>
          <a
            href="https://efiling.rd.go.th"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 group"
          >
            <span>เข้าสู่ระบบ e-Filing กรมสรรพากร</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </a>
        </div>
      </div>

      {/* Report Sub-Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveReportTab('overview')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeReportTab === 'overview'
                ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>1. สรุปตัวเลขกรอกยื่นแบบ e-Filing (Fast-Fill)</span>
          </button>

          <button
            onClick={() => setActiveReportTab('pnd3')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeReportTab === 'pnd3'
                ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <User className="w-4 h-4 text-blue-600" />
            <span>2. แบบ ภ.ง.ด. 3 (บุคคลธรรมดา)</span>
            <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {pnd3.entries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveReportTab('pnd53')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeReportTab === 'pnd53'
                ? 'bg-white text-purple-700 border-purple-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>3. แบบ ภ.ง.ด. 53 (นิติบุคคล)</span>
            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {pnd53.entries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveReportTab('guide')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeReportTab === 'guide'
                ? 'bg-white text-amber-800 border-amber-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>4. ขั้นตอนและข้อกำหนดสรรพากร</span>
          </button>
        </div>

        {/* Tab 1: Fast-Fill e-Filing Screen Copy Box */}
        {activeReportTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Explanatory Banner */}
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <strong className="font-semibold text-blue-950">
                  ระบบจัดเตรียมตัวเลขพร้อมกรอกในหน้าเว็บยื่นแบบของกรมสรรพากร (e-Filing Ready):
                </strong>
                <p className="mt-0.5 text-blue-800">
                  คลิกที่ปุ่ม <Copy className="inline w-3 h-3 text-blue-600" /> ข้างช่องตัวเลขเพื่อคัดลอกยอดเงินไปวางในระบบยื่นแบบแสดงรายการภาษีหัก ณ ที่จ่าย (ภ.ง.ด.3 หรือ ภ.ง.ด.53) ได้ทันทีโดยไม่ต้องคำนวณซ้ำ
                </p>
              </div>
            </div>

            {/* Side by side: PND 3 and PND 53 fast-fill cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PND 3 Summary Box */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <h2 className="font-semibold text-sm">แบบ ภ.ง.ด. 3 (บุคคลธรรมดา)</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPrintMode('PND3')}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> พิมพ์ A4
                    </button>
                    <button
                      onClick={() => handleDownloadCsv(pnd3)}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* General Filing Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-500">เลขประจำตัวผู้เสียภาษี:</span>
                      <span className="font-mono font-semibold ml-1.5 text-slate-800">{companySettings.taxId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">สาขา:</span>
                      <span className="font-semibold ml-1.5 text-slate-800">{companySettings.branchCode || '00000'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">จำนวนรายผู้มีเงินได้:</span>
                      <span className="font-semibold ml-1.5 text-blue-700">{pnd3.totalPayees} ราย</span>
                    </div>
                    <div>
                      <span className="text-slate-500">จำนวนใบสำคัญ:</span>
                      <span className="font-semibold ml-1.5 text-slate-800">{pnd3.totalTransactions} ฉบับ</span>
                    </div>
                  </div>

                  {/* Breakdown by Category and Income Section */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      รายการสรุปแยกตามประเภทเงินได้ (นำไปกรอกหน้าเว็บสรรพากร):
                    </h3>
                    <div className="space-y-2">
                      {pnd3.categoryGroups.map((grp, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                          <div className="flex items-center justify-between font-medium text-slate-800">
                            <span>{grp.sectionTitle}</span>
                            <span className="text-blue-600 font-semibold">{grp.whtRate}% ({grp.payeeCount} ราย)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">ยอดเงินได้:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-semibold text-slate-800">
                                  {grp.totalBaseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                                <button
                                  onClick={() => handleCopy(grp.totalBaseAmount.toFixed(2), `pnd3_base_${idx}`)}
                                  className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                                  title="คัดลอกยอดเงินได้"
                                >
                                  {copiedKey === `pnd3_base_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">ภาษีที่หัก:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-rose-600">
                                  {grp.totalWhtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                                <button
                                  onClick={() => handleCopy(grp.totalWhtAmount.toFixed(2), `pnd3_tax_${idx}`)}
                                  className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                                  title="คัดลอกยอดภาษี"
                                >
                                  {copiedKey === `pnd3_tax_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {pnd3.categoryGroups.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-lg">
                          ไม่มีรายการจ่ายให้บุคคลธรรมดาในงวดภาษีนี้
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PND 3 Total Box */}
                  <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-blue-900 font-semibold block">ยอดภาษี ภ.ง.ด. 3 ที่ต้องนำส่งทั้งสิ้น:</span>
                      <span className="text-blue-700 text-[11px]">
                        ฐานเงินได้รวม ฿{pnd3.totalBaseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-blue-900">
                        ฿{pnd3.totalWhtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => handleCopy(pnd3.totalWhtAmount.toFixed(2), 'pnd3_total')}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition shadow-2xs"
                        title="คัดลอกยอดภาษีรวม ภ.ง.ด. 3"
                      >
                        {copiedKey === 'pnd3_total' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PND 53 Summary Box */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-purple-700 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <h2 className="font-semibold text-sm">แบบ ภ.ง.ด. 53 (นิติบุคคล)</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPrintMode('PND53')}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> พิมพ์ A4
                    </button>
                    <button
                      onClick={() => handleDownloadCsv(pnd53)}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* General Filing Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-500">เลขประจำตัวผู้เสียภาษี:</span>
                      <span className="font-mono font-semibold ml-1.5 text-slate-800">{companySettings.taxId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">สาขา:</span>
                      <span className="font-semibold ml-1.5 text-slate-800">{companySettings.branchCode || '00000'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">จำนวนรายผู้มีเงินได้:</span>
                      <span className="font-semibold ml-1.5 text-purple-700">{pnd53.totalPayees} ราย</span>
                    </div>
                    <div>
                      <span className="text-slate-500">จำนวนใบสำคัญ:</span>
                      <span className="font-semibold ml-1.5 text-slate-800">{pnd53.totalTransactions} ฉบับ</span>
                    </div>
                  </div>

                  {/* Breakdown by Category and Income Section */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      รายการสรุปแยกตามประเภทเงินได้ (นำไปกรอกหน้าเว็บสรรพากร):
                    </h3>
                    <div className="space-y-2">
                      {pnd53.categoryGroups.map((grp, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                          <div className="flex items-center justify-between font-medium text-slate-800">
                            <span>{grp.sectionTitle}</span>
                            <span className="text-purple-600 font-semibold">{grp.whtRate}% ({grp.payeeCount} ราย)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">ยอดเงินได้:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-semibold text-slate-800">
                                  {grp.totalBaseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                                <button
                                  onClick={() => handleCopy(grp.totalBaseAmount.toFixed(2), `pnd53_base_${idx}`)}
                                  className="text-slate-400 hover:text-purple-600 p-0.5 rounded cursor-pointer"
                                  title="คัดลอกยอดเงินได้"
                                >
                                  {copiedKey === `pnd53_base_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">ภาษีที่หัก:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-rose-600">
                                  {grp.totalWhtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                                <button
                                  onClick={() => handleCopy(grp.totalWhtAmount.toFixed(2), `pnd53_tax_${idx}`)}
                                  className="text-slate-400 hover:text-purple-600 p-0.5 rounded cursor-pointer"
                                  title="คัดลอกยอดภาษี"
                                >
                                  {copiedKey === `pnd53_tax_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {pnd53.categoryGroups.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-lg">
                          ไม่มีรายการจ่ายให้นิติบุคคลในงวดภาษีนี้
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PND 53 Total Box */}
                  <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-purple-900 font-semibold block">ยอดภาษี ภ.ง.ด. 53 ที่ต้องนำส่งทั้งสิ้น:</span>
                      <span className="text-purple-700 text-[11px]">
                        ฐานเงินได้รวม ฿{pnd53.totalBaseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-purple-900">
                        ฿{pnd53.totalWhtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => handleCopy(pnd53.totalWhtAmount.toFixed(2), 'pnd53_total')}
                        className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md cursor-pointer transition shadow-2xs"
                        title="คัดลอกยอดภาษีรวม ภ.ง.ด. 53"
                      >
                        {copiedKey === 'pnd53_total' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: PND 3 Detailed List (บุคคลธรรมดา) */}
        {activeReportTab === 'pnd3' && (
          <div className="p-6 space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้รับเงิน, เลขประจำตัวผู้เสียภาษี, เลขที่ PV..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintMode('PND3')}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" /> พิมพ์ใบแนบ A4
                </button>
                <button
                  onClick={() => handleDownloadCsv(pnd3)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> ส่งออก CSV
                </button>
                <button
                  onClick={() => handleDownloadRdPrep(pnd3)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="ไฟล์ข้อความ (.txt) สำหรับอัปโหลดผ่านโปรแกรม RD Prep หรือ e-Filing"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Text File (RD Prep)
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">ลำดับ</th>
                    <th className="px-3 py-2.5">ผู้มีเงินได้ (บุคคลธรรมดา)</th>
                    <th className="px-3 py-2.5">เลข 13 หลัก</th>
                    <th className="px-3 py-2.5 text-center">วันที่จ่าย</th>
                    <th className="px-3 py-2.5">ประเภทเงินได้ / เลขที่ PV</th>
                    <th className="px-3 py-2.5 text-center">อัตรา</th>
                    <th className="px-3 py-2.5 text-right">จำนวนเงินที่จ่าย</th>
                    <th className="px-3 py-2.5 text-right text-rose-700">ภาษีหัก 3%</th>
                    <th className="px-3 py-2.5 text-center">ใบสำคัญ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPnd3Entries.map((item) => (
                    <tr key={item.sequence} className="hover:bg-slate-50/70 transition">
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400">{item.sequence}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900">{item.payeeName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.payeeAddress}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{item.payeeTaxId}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{formatThaiDate(item.paymentDate)}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-slate-800">{item.description}</div>
                        <div className="text-[10px] text-blue-600">{item.incomeSection}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">{item.whtRate}%</td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium">
                        {item.baseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">
                        {item.whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const v = vouchers.find(x => x.voucherNo === item.voucherNo || x.id === item.voucherId);
                            if (v) {
                              if (onPrint50Tawi) onPrint50Tawi(v);
                              else if (onSelectVoucherToPrint) onSelectVoucherToPrint(v);
                            }
                          }}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded cursor-pointer transition font-medium"
                          title="พิมพ์หนังสือรับรอง 50 ทวิ (พร้อมตราประทับและลายเซ็นต์)"
                        >
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span>{item.voucherNo}</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredPnd3Entries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                        ไม่พบรายการใบสำคัญจ่ายที่เข้าข่าย ภ.ง.ด. 3 ในเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-right">
                      รวมทั้งสิ้น ({filteredPnd3Entries.length} รายการ):
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {filteredPnd3Entries.reduce((s, e) => s + e.baseAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-rose-700">
                      {filteredPnd3Entries.reduce((s, e) => s + e.whtAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: PND 53 Detailed List (นิติบุคคล) */}
        {activeReportTab === 'pnd53' && (
          <div className="p-6 space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อนิติบุคคล, เลข 13 หลัก, เลขที่ PV..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintMode('PND53')}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" /> พิมพ์ใบแนบ A4
                </button>
                <button
                  onClick={() => handleDownloadCsv(pnd53)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> ส่งออก CSV
                </button>
                <button
                  onClick={() => handleDownloadRdPrep(pnd53)}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="ไฟล์ข้อความ (.txt) สำหรับอัปโหลดผ่านโปรแกรม RD Prep หรือ e-Filing"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Text File (RD Prep)
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">ลำดับ</th>
                    <th className="px-3 py-2.5">นิติบุคคลผู้มีเงินได้</th>
                    <th className="px-3 py-2.5">เลข 13 หลัก (DBD)</th>
                    <th className="px-3 py-2.5 text-center">วันที่จ่าย</th>
                    <th className="px-3 py-2.5">ประเภทเงินได้ / เลขที่ PV</th>
                    <th className="px-3 py-2.5 text-center">อัตรา</th>
                    <th className="px-3 py-2.5 text-right">จำนวนเงินที่จ่าย</th>
                    <th className="px-3 py-2.5 text-right text-rose-700">ภาษีหักนำส่ง</th>
                    <th className="px-3 py-2.5 text-center">ใบสำคัญ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPnd53Entries.map((item) => (
                    <tr key={item.sequence} className="hover:bg-slate-50/70 transition">
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400">{item.sequence}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900">{item.payeeName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.payeeAddress} ({item.branch})</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{item.payeeTaxId}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{formatThaiDate(item.paymentDate)}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-slate-800">{item.description}</div>
                        <div className="text-[10px] text-purple-600">{item.incomeSection}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">{item.whtRate}%</td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium">
                        {item.baseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">
                        {item.whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const v = vouchers.find(x => x.voucherNo === item.voucherNo || x.id === item.voucherId);
                            if (v) {
                              if (onPrint50Tawi) onPrint50Tawi(v);
                              else if (onSelectVoucherToPrint) onSelectVoucherToPrint(v);
                            }
                          }}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-0.5 rounded cursor-pointer transition font-medium"
                          title="พิมพ์หนังสือรับรอง 50 ทวิ (พร้อมตราประทับและลายเซ็นต์)"
                        >
                          <FileText className="w-3 h-3 text-purple-500" />
                          <span>{item.voucherNo}</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredPnd53Entries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                        ไม่พบรายการใบสำคัญจ่ายที่เข้าข่าย ภ.ง.ด. 53 ในเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-right">
                      รวมทั้งสิ้น ({filteredPnd53Entries.length} รายการ):
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {filteredPnd53Entries.reduce((s, e) => s + e.baseAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-rose-700">
                      {filteredPnd53Entries.reduce((s, e) => s + e.whtAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Step-by-Step e-Filing Guide & Revenue Code Rules */}
        {activeReportTab === 'guide' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step by Step Guide */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  ขั้นตอนการนำตัวเลขไปยื่นแบบ e-Filing ของกรมสรรพากร
                </h3>
                <ol className="space-y-3 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
                  <li>
                    เข้าสู่เว็บไซต์ <strong>efiling.rd.go.th</strong> และเข้าสู่ระบบด้วยเลขประจำตัวผู้เสียภาษี <strong>0105556026458</strong>
                  </li>
                  <li>
                    เลือกเมนู <strong>"ยื่นแบบภาษีเงินได้หัก ณ ที่จ่าย"</strong> แล้วเลือกแบบ <strong>ภ.ง.ด. 3</strong> หรือ <strong>ภ.ง.ด. 53</strong>
                  </li>
                  <li>
                    ระบุ <strong>เดือน/ปีภาษี</strong> ที่ต้องการยื่น (ระบบคำนวณตามวันที่จ่ายเงินจริงในใบสำคัญจ่าย PV)
                  </li>
                  <li>
                    <strong>วิธีกรอกข้อมูล:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-500">
                      <li><strong>วิธีกรอกสรุปยอด (Fast-Fill):</strong> ไปที่แท็บ 1 ของหน้านี้ กดปุ่ม <Copy className="inline w-3 h-3 text-blue-500" /> คัดลอกยอดเงินได้และยอดภาษีไปใส่ในแต่ละช่อง</li>
                      <li><strong>วิธีอัปโหลดไฟล์:</strong> ดาวน์โหลดไฟล์ Text (RD Prep) จากแท็บ 2 หรือ 3 แล้วนำไปแปลงผ่านโปรแกรม RD Prep หรืออัปโหลดเข้าหน้าเว็บทันที</li>
                    </ul>
                  </li>
                  <li>
                    ตรวจสอบยอดเงินรวมภาษีที่ต้องชำระ ให้ตรงกับช่อง <strong>"ภาษีหัก ณ ที่จ่ายรวมที่ต้องนำส่ง"</strong> ในหน้านี้
                  </li>
                  <li>
                    ยืนยันการยื่นแบบ และพิมพ์ใบแจ้งการชำระเงิน (Pay-in Slip) หรือสแกนชำระผ่าน QR Code ธนาคารไทยพาณิชย์ (SCB)
                  </li>
                </ol>
              </div>

              {/* Legal & Tax Criteria */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  เกณฑ์การหักภาษี ณ ที่จ่ายที่สำคัญ (ตามประมวลรัษฎากร)
                </h3>
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-lg">
                    <strong className="text-amber-900 block">1. ภ.ง.ด. 3 กับ ภ.ง.ด. 53 ต่างกันอย่างไร?</strong>
                    <p className="mt-1 text-amber-800">
                      • <strong>ภ.ง.ด. 3</strong> ใช้เมื่อผู้รับเงินเป็น <strong>บุคคลธรรมดา</strong> (เช่น ผู้สอบบัญชี CPA, นายหน้า, ฟรีแลนซ์)<br />
                      • <strong>ภ.ง.ด. 53</strong> ใช้เมื่อผู้รับเงินเป็น <strong>นิติบุคคล</strong> (เช่น บริษัทจำกัด, ห้างหุ้นส่วนจำกัด)
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-800 block">2. อัตราภาษีหัก ณ ที่จ่ายที่พบบ่อยในธุรกิจบริการบัญชี</strong>
                    <p className="mt-1 text-slate-600">
                      • <strong>ค่าสอบบัญชี CPA / วิชาชีพบัญชี:</strong> หัก 3% (ม.40(6))<br />
                      • <strong>ค่านายหน้า:</strong> หัก 3% (ม.40(2))<br />
                      • <strong>ค่าบริการ / จ้างทำของ / ค่าซอฟต์แวร์:</strong> หัก 3% (ม.40(8))<br />
                      • <strong>ค่าเช่าพื้นที่สำนักงาน:</strong> หัก 5% (ม.40(5))
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-800 block">3. กำหนดเวลาและเบี้ยปรับเงินเพิ่ม</strong>
                    <p className="mt-1 text-slate-600">
                      ต้องยื่นแบบและนำส่งภาษีภายในวันที่ 7 ของเดือนถัดไป (กรณีปกติ) หรือภายในวันที่ 15 ของเดือนถัดไป (กรณียื่นผ่านอินเทอร์เน็ต e-Filing) หากล่าช้าจะมีเงินเพิ่ม 1.5% ต่อเดือน และค่าปรับแบบอาญา
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
