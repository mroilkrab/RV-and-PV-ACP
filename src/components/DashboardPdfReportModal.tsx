import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  X, 
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  FileText,
  CheckSquare,
  Square,
  Download,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { Voucher, CompanySettings } from '../types';
import { formatCurrency, convertToThaiBahtText } from '../utils/thaiBahtText';

interface DashboardPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  companySettings: CompanySettings;
  currentChartView?: 'cashflow' | 'pv_pie' | 'trend' | 'rv_bar' | 'all';
}

const THAI_MONTH_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_MONTH_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const CATEGORY_COLORS = [
  '#2563eb', // Blue 600
  '#f43f5e', // Rose 500
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#06b6d4', // Cyan 500
  '#ec4899', // Pink 500
  '#14b8a6', // Teal 500
  '#f97316', // Orange 500
  '#64748b', // Slate 500
  '#84cc16', // Lime 500
  '#d97706', // Amber 600
];

export const DashboardPdfReportModal: React.FC<DashboardPdfReportModalProps> = ({
  isOpen,
  onClose,
  vouchers,
  companySettings,
  currentChartView = 'all',
}) => {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(`${currentYear}-12-31`);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RV' | 'PV'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'preview' | 'config'>('preview');

  // Print options toggles
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeMonthlyTable, setIncludeMonthlyTable] = useState(true);
  const [includeCategoryBreakdown, setIncludeCategoryBreakdown] = useState(true);
  const [includeTransactionsList, setIncludeTransactionsList] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Format date helper for Thai Display
  const formatDisplayThaiDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const yearTh = parseInt(parts[0], 10) + 543;
        return `${parts[2]}/${parts[1]}/${yearTh}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Quick preset ranges
  const applyPreset = (preset: string) => {
    const y = currentYear;
    switch (preset) {
      case 'year2569': // Year 2026 / 2569
        setStartDate(`${y}-01-01`);
        setEndDate(`${y}-12-31`);
        break;
      case 'currentMonth': {
        const now = new Date();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        setStartDate(`${now.getFullYear()}-${m}-01`);
        setEndDate(`${now.getFullYear()}-${m}-${String(lastDay).padStart(2, '0')}`);
        break;
      }
      case 'q1':
        setStartDate(`${y}-01-01`);
        setEndDate(`${y}-03-31`);
        break;
      case 'q2':
        setStartDate(`${y}-04-01`);
        setEndDate(`${y}-06-30`);
        break;
      case 'q3':
        setStartDate(`${y}-07-01`);
        setEndDate(`${y}-09-30`);
        break;
      case 'q4':
        setStartDate(`${y}-10-01`);
        setEndDate(`${y}-12-31`);
        break;
      case 'all':
        setStartDate('2020-01-01');
        setEndDate('2030-12-31');
        break;
      default:
        break;
    }
  };

  // Filtered Vouchers matching range and filters
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      // Date filter
      if (startDate && v.date < startDate) return false;
      if (endDate && v.date > endDate) return false;

      // Type filter
      if (typeFilter !== 'ALL' && v.type !== typeFilter) return false;

      // Category filter
      if (selectedCategory !== 'ALL') {
        const matchCat = v.items.some((item) => item.accountCategory === selectedCategory);
        if (!matchCat) return false;
      }

      return true;
    }).sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [vouchers, startDate, endDate, typeFilter, selectedCategory]);

  // Aggregate statistics for the filtered period
  const stats = useMemo(() => {
    let totalRvAmount = 0;
    let totalPvAmount = 0;
    let totalRvWht = 0;
    let totalPvWht = 0;
    let totalRvSubtotal = 0;
    let totalPvSubtotal = 0;
    let rvCount = 0;
    let pvCount = 0;

    // Category breakdown map
    const categoryMap: {
      [key: string]: {
        category: string;
        count: number;
        rvTotal: number;
        pvTotal: number;
        whtTotal: number;
      };
    } = {};

    filteredVouchers.forEach((v) => {
      const isRV = v.type === 'RV';
      if (isRV) {
        rvCount++;
        totalRvAmount += v.netPayable;
        totalRvWht += v.totalWht;
        totalRvSubtotal += v.subtotal;
      } else {
        pvCount++;
        totalPvAmount += v.netPayable;
        totalPvWht += v.totalWht;
        totalPvSubtotal += v.subtotal;
      }

      // Process items for category breakdown
      v.items.forEach((item) => {
        const cat = item.accountCategory || 'ไม่ระบุหมวดหมู่';
        if (!categoryMap[cat]) {
          categoryMap[cat] = {
            category: cat,
            count: 0,
            rvTotal: 0,
            pvTotal: 0,
            whtTotal: 0,
          };
        }
        categoryMap[cat].count++;
        if (isRV) {
          categoryMap[cat].rvTotal += item.netAmount;
        } else {
          categoryMap[cat].pvTotal += item.netAmount;
        }
        categoryMap[cat].whtTotal += item.whtAmount;
      });
    });

    const categoryBreakdown = Object.values(categoryMap).sort(
      (a, b) => b.pvTotal + b.rvTotal - (a.pvTotal + a.rvTotal)
    );

    const netCashFlow = totalRvAmount - totalPvAmount;
    const totalWht = totalRvWht + totalPvWht;
    const profitMargin = totalRvAmount > 0 ? (netCashFlow / totalRvAmount) * 100 : 0;

    return {
      rvCount,
      pvCount,
      totalCount: filteredVouchers.length,
      totalRvAmount,
      totalPvAmount,
      totalRvWht,
      totalPvWht,
      totalWht,
      totalRvSubtotal,
      totalPvSubtotal,
      netCashFlow,
      profitMargin,
      categoryBreakdown,
    };
  }, [filteredVouchers]);

  // Unique categories from vouchers for dropdown
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    vouchers.forEach((v) => {
      v.items.forEach((item) => {
        if (item.accountCategory) set.add(item.accountCategory);
      });
    });
    return Array.from(set);
  }, [vouchers]);

  // 12-Month Performance Chart & Table Data
  const monthlyChartData = useMemo(() => {
    const targetYear = parseInt(startDate.slice(0, 4), 10) || currentYear;
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = (i + 1).toString().padStart(2, '0');
      const monthKey = `${targetYear}-${monthNum}`;
      return {
        monthIndex: i,
        monthKey,
        monthName: THAI_MONTH_NAMES[i],
        monthFull: THAI_MONTH_FULL[i],
        income: 0,
        expense: 0,
        net: 0,
        wht: 0,
        rvCount: 0,
        pvCount: 0,
        totalVouchers: 0,
      };
    });

    filteredVouchers.forEach((v) => {
      if (!v.date) return;
      const [vYear, vMonth] = v.date.split('-');
      const vY = parseInt(vYear, 10);
      const vM = parseInt(vMonth, 10);
      if (vY === targetYear && vM >= 1 && vM <= 12) {
        const m = months[vM - 1];
        if (v.type === 'RV') {
          m.income += v.netPayable;
          m.rvCount++;
        } else {
          m.expense += v.netPayable;
          m.pvCount++;
        }
        m.wht += v.totalWht;
        m.totalVouchers++;
      }
    });

    months.forEach((m) => {
      m.net = m.income - m.expense;
    });

    return months;
  }, [filteredVouchers, startDate, currentYear]);

  // PV Expense Category Pie Chart Data
  const pvCategoryPieData = useMemo(() => {
    const pvCategories = stats.categoryBreakdown
      .filter((c) => c.pvTotal > 0)
      .map((c, idx) => ({
        name: c.category,
        value: c.pvTotal,
        count: c.count,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        percentage: stats.totalPvAmount > 0 ? (c.pvTotal / stats.totalPvAmount) * 100 : 0,
      }));
    return pvCategories;
  }, [stats]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // ----------------------------------------------------
  // PREVIEW / PRINT VIEW (Clean Print-Ready A4 Executive Layout)
  // ----------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      {/* Top Control Bar (Hidden on print) */}
      <div className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 px-4 py-3 shadow-md no-print">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-white block font-prompt">
                  รายงานสรุปภาพรวมและแผนภูมิสำหรับผู้บริหาร (Executive PDF Report)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatDisplayThaiDate(startDate)} — {formatDisplayThaiDate(endDate)} ({filteredVouchers.length} ฉบับ)
                </span>
              </div>
            </div>

            {/* Quick Presets in top bar */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => applyPreset('year2569')}
                className="px-2 py-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                ทั้งปี 2569
              </button>
              <button
                type="button"
                onClick={() => applyPreset('currentMonth')}
                className="px-2 py-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                เดือนนี้
              </button>
              <button
                type="button"
                onClick={() => applyPreset('q1')}
                className="px-2 py-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                Q1
              </button>
              <button
                type="button"
                onClick={() => applyPreset('q2')}
                className="px-2 py-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                Q2
              </button>
              <button
                type="button"
                onClick={() => applyPreset('q3')}
                className="px-2 py-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                Q3
              </button>
              <button
                type="button"
                onClick={() => applyPreset('q4')}
                className="px-2 py-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                Q4
              </button>
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="px-2 py-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                ทั้งหมด
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Section Toggles */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300">
              <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>กราฟ/แผนภูมิ</span>
              </label>
              <span className="text-slate-600">|</span>
              <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={includeMonthlyTable}
                  onChange={(e) => setIncludeMonthlyTable(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>ตาราง 12 เดือน</span>
              </label>
              <span className="text-slate-600">|</span>
              <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={includeTransactionsList}
                  onChange={(e) => setIncludeTransactionsList(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>รายการใบสำคัญ</span>
              </label>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer shrink-0"
              title="สั่งพิมพ์หรือบันทึกเป็น PDF ผ่านเบราว์เซอร์"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์หรือบันทึกเป็น PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="ปิดหน้าต่างรายงาน"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Printable Paper Canvas (Optimized for standard A4 Portrait print) */}
      <div className="p-4 sm:p-8 flex justify-center">
        <div className="print-container bg-white text-slate-900 w-full max-w-4xl p-6 sm:p-10 rounded-2xl shadow-2xl border border-slate-200">
          
          {/* Header: Company & Title */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 print-avoid-break">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold font-prompt text-sm shadow-xs">
                    AP
                  </div>
                  <div>
                    <h1 className="text-base sm:text-xl font-bold font-prompt text-slate-900 leading-tight">
                      {companySettings.name}
                    </h1>
                    <p className="text-[11px] text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                      {companySettings.address}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-700 mt-2 font-mono">
                  <span>เลขประจำตัวผู้เสียภาษี: <strong>{companySettings.taxId || '-'}</strong></span>
                  <span>สาขา: <strong>{companySettings.branch || 'สำนักงานใหญ่'}</strong></span>
                  {companySettings.phone && <span>โทร: <strong>{companySettings.phone}</strong></span>}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded">
                  EXECUTIVE MANAGEMENT REPORT
                </span>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  รหัสเอกสาร: EMR-{startDate.replace(/-/g, '')}-{endDate.replace(/-/g, '')}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 text-center bg-slate-50 border border-slate-300 py-3 px-4 rounded-xl">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-prompt">
                รายงานสรุปภาพรวมและแผนภูมิการเงินสำหรับผู้บริหาร
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                (Executive Financial Performance, Cash Flow & Expense Analysis Report)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-blue-900 mt-1.5 font-mono">
                <span className="bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded">
                  ช่วงเวลา: {formatDisplayThaiDate(startDate)} ถึง {formatDisplayThaiDate(endDate)}
                </span>
                <span className="bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded">
                  รวมทั้งสิ้น {filteredVouchers.length} ฉบับ
                </span>
                {typeFilter !== 'ALL' && (
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                    {typeFilter === 'RV' ? 'เฉพาะใบสำคัญรับ RV' : 'เฉพาะใบสำคัญจ่าย PV'}
                  </span>
                )}
                {selectedCategory !== 'ALL' && (
                  <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                    หมวด: {selectedCategory}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Executive Financial Summary KPI Grid */}
          <div className="mb-6 print-avoid-break">
            <h3 className="text-xs font-bold text-slate-800 mb-2 font-prompt uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>1. ตัวชี้วัดทางการเงินหลัก (Key Executive Financial Indicators)</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* RV Income */}
              <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/60 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 font-semibold block">ยอดรายรับรวม (RV)</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    {stats.rvCount} ฉบับ
                  </span>
                </div>
                <span className="text-lg font-bold font-mono text-emerald-900 mt-1 block">
                  ฿{formatCurrency(stats.totalRvAmount)}
                </span>
                <span className="text-[10px] text-emerald-700 mt-1 block font-mono">
                  ภาษีถูกหัก 3%: ฿{formatCurrency(stats.totalRvWht)}
                </span>
              </div>

              {/* PV Expense */}
              <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50/60 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-rose-800 font-semibold block">ยอดรายจ่ายรวม (PV)</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    {stats.pvCount} ฉบับ
                  </span>
                </div>
                <span className="text-lg font-bold font-mono text-rose-900 mt-1 block">
                  ฿{formatCurrency(stats.totalPvAmount)}
                </span>
                <span className="text-[10px] text-rose-700 mt-1 block font-mono">
                  ภาษีหักนำส่ง: ฿{formatCurrency(stats.totalPvWht)}
                </span>
              </div>

              {/* Net Cash Flow */}
              <div className="p-3.5 rounded-xl border border-blue-300 bg-blue-50/60 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-blue-800 font-semibold block">กระแสเงินสดสุทธิ (Net)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    stats.profitMargin >= 0 ? 'bg-blue-200 text-blue-900' : 'bg-rose-200 text-rose-900'
                  }`}>
                    {stats.profitMargin.toFixed(1)}% Margin
                  </span>
                </div>
                <span className={`text-lg font-bold font-mono mt-1 block ${
                  stats.netCashFlow >= 0 ? 'text-blue-900' : 'text-rose-700'
                }`}>
                  ฿{formatCurrency(stats.netCashFlow)}
                </span>
                <span className="text-[10px] text-slate-600 mt-1 block">
                  {stats.netCashFlow >= 0 ? 'สภาพคล่องบวก (Surplus)' : 'รายจ่ายเกินรายรับ (Deficit)'}
                </span>
              </div>

              {/* WHT */}
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/60 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-800 font-semibold block">ภาษีหัก ณ ที่จ่ายรวม</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    ภ.ง.ด. 3/53
                  </span>
                </div>
                <span className="text-lg font-bold font-mono text-amber-900 mt-1 block">
                  ฿{formatCurrency(stats.totalWht)}
                </span>
                <span className="text-[10px] text-amber-800 mt-1 block font-mono">
                  สุทธิหัก/นำส่งภาษีสรรพากร
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Visual Charts (Recharts Rendered with isAnimationActive={false} for Crisp Print/PDF) */}
          {includeCharts && (
            <div className="mb-6 space-y-5 print-avoid-break">
              <h3 className="text-xs font-bold text-slate-800 mb-2 font-prompt uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span>2. แผนภูมิวิเคราะห์กระแสเงินสดและสัดส่วนค่าใช้จ่าย (Executive Visual Analytics)</span>
                </span>
                <span className="text-[10px] font-normal text-slate-500">
                  เวกเตอร์คมชัดสูง (Vector Print Quality)
                </span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Monthly Cash Flow Bar Chart */}
                <div className="lg:col-span-7 p-4 rounded-xl border border-slate-300 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 font-prompt">
                      เปรียบเทียบกระแสเงินสด รายรับ (RV) vs. รายจ่าย (PV) รายเดือน
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">หน่วย: บาท (THB)</span>
                  </div>

                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyChartData}
                        margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="monthName" 
                          tick={{ fontSize: 10, fill: '#475569' }}
                          axisLine={{ stroke: '#cbd5e1' }}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 9, fill: '#64748b' }}
                          tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip 
                          formatter={(value: any) => [`฿${formatCurrency(Number(value))}`, '']}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                          iconSize={8}
                        />
                        <Bar 
                          dataKey="income" 
                          name="รายรับ (RV)" 
                          fill="#10b981" 
                          radius={[3, 3, 0, 0]} 
                          isAnimationActive={false}
                        />
                        <Bar 
                          dataKey="expense" 
                          name="รายจ่าย (PV)" 
                          fill="#f43f5e" 
                          radius={[3, 3, 0, 0]} 
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PV Expense Category Pie / Donut Chart */}
                <div className="lg:col-span-5 p-4 rounded-xl border border-slate-300 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 font-prompt">
                        สัดส่วนหมวดค่าใช้จ่าย (PV Expense Distribution)
                      </span>
                      <span className="text-[10px] text-rose-600 font-bold font-mono">
                        {pvCategoryPieData.length} หมวด
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">
                      คำนวณจากยอดสุทธิใบสำคัญจ่ายรวม ฿{formatCurrency(stats.totalPvAmount)}
                    </p>
                  </div>

                  {pvCategoryPieData.length === 0 ? (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                      ไม่พบข้อมูลค่าใช้จ่ายในช่วงเวลานี้
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-36 h-36 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pvCategoryPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={28}
                              outerRadius={56}
                              paddingAngle={2}
                              dataKey="value"
                              isAnimationActive={false}
                            >
                              {pvCategoryPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: any, name: any) => [`฿${formatCurrency(Number(value))}`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend List */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {pvCategoryPieData.slice(0, 5).map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px] gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="truncate text-slate-700 font-medium">{cat.name}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900 shrink-0">
                              {cat.percentage.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                        {pvCategoryPieData.length > 5 && (
                          <div className="text-[9px] text-slate-400 text-right italic">
                            และอีก {pvCategoryPieData.length - 5} หมวด (ดูตารางด้านล่าง)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Month-by-Month Financial Performance Table */}
          {includeMonthlyTable && (
            <div className="mb-6 print-avoid-break">
              <h3 className="text-xs font-bold text-slate-800 mb-2 font-prompt uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>3. ตารางสรุปผลประกอบการรายเดือน (Monthly Financial Performance Summary)</span>
                </span>
                <span className="text-[10px] font-normal text-slate-500">ปี {startDate.slice(0, 4)}</span>
              </h3>

              <div className="overflow-x-auto rounded-lg border border-slate-300">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-1.5 px-2.5">เดือน</th>
                      <th className="py-1.5 px-2 text-center">เอกสาร</th>
                      <th className="py-1.5 px-2.5 text-right text-emerald-800">รายรับรวม (RV)</th>
                      <th className="py-1.5 px-2.5 text-right text-rose-800">รายจ่ายรวม (PV)</th>
                      <th className="py-1.5 px-2.5 text-right text-blue-900">กระแสเงินสดสุทธิ (Net)</th>
                      <th className="py-1.5 px-2.5 text-right text-amber-800">หัก ณ ที่จ่าย (WHT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyChartData.map((m, idx) => {
                      const hasData = m.income > 0 || m.expense > 0;
                      return (
                        <tr 
                          key={m.monthKey} 
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                        >
                          <td className="py-1.5 px-2.5 font-medium text-slate-900">
                            {m.monthFull} ({m.monthName})
                          </td>
                          <td className="py-1.5 px-2 text-center text-slate-600 font-mono text-[10px]">
                            {hasData ? `${m.totalVouchers} ฉบับ` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-emerald-800">
                            {m.income > 0 ? `฿${formatCurrency(m.income)}` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-rose-800">
                            {m.expense > 0 ? `฿${formatCurrency(m.expense)}` : '-'}
                          </td>
                          <td className={`py-1.5 px-2.5 text-right font-mono font-semibold ${
                            m.net > 0 ? 'text-blue-900' : m.net < 0 ? 'text-rose-700' : 'text-slate-400'
                          }`}>
                            {hasData ? `฿${formatCurrency(m.net)}` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-amber-800">
                            {m.wht > 0 ? `฿${formatCurrency(m.wht)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                      <td className="py-2 px-2.5">ยอดรวมทั้งสิ้น (12 เดือน):</td>
                      <td className="py-2 px-2 text-center font-mono text-[11px]">
                        {stats.totalCount} ฉบับ
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-emerald-800">
                        ฿{formatCurrency(stats.totalRvAmount)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-rose-800">
                        ฿{formatCurrency(stats.totalPvAmount)}
                      </td>
                      <td className={`py-2 px-2.5 text-right font-mono ${
                        stats.netCashFlow >= 0 ? 'text-blue-900' : 'text-rose-700'
                      }`}>
                        ฿{formatCurrency(stats.netCashFlow)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-amber-800">
                        ฿{formatCurrency(stats.totalWht)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Category Breakdown */}
          {includeCategoryBreakdown && stats.categoryBreakdown.length > 0 && (
            <div className="mb-6 print-avoid-break">
              <h3 className="text-xs font-bold text-slate-800 mb-2 font-prompt uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>4. สรุปสัดส่วนตามหมวดบัญชี (Account Category Distribution)</span>
                </span>
                <span className="text-[10px] font-normal text-slate-500">
                  {stats.categoryBreakdown.length} หมวดรายการ
                </span>
              </h3>

              <div className="overflow-x-auto rounded-lg border border-slate-300">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                      <th className="py-1.5 px-3">หมวดบัญชี</th>
                      <th className="py-1.5 px-3 text-center w-16">จำนวน</th>
                      <th className="py-1.5 px-3 text-right">ยอดรับ (RV)</th>
                      <th className="py-1.5 px-3 text-right text-rose-800">ยอดจ่าย (PV)</th>
                      <th className="py-1.5 px-3 text-center w-20">สัดส่วน PV</th>
                      <th className="py-1.5 px-3 text-right">ภาษีหัก ณ ที่จ่าย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.categoryBreakdown.map((cat, idx) => {
                      const pvPercent = stats.totalPvAmount > 0 ? (cat.pvTotal / stats.totalPvAmount) * 100 : 0;
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                          <td className="py-1.5 px-3 font-medium text-slate-900">
                            {cat.category}
                          </td>
                          <td className="py-1.5 px-3 text-center text-slate-600 font-mono text-[10px]">{cat.count}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-emerald-800">
                            {cat.rvTotal > 0 ? `฿${formatCurrency(cat.rvTotal)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold text-rose-800">
                            {cat.pvTotal > 0 ? `฿${formatCurrency(cat.pvTotal)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono text-[10px] text-slate-600">
                            {pvPercent > 0 ? `${pvPercent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-amber-800">
                            {cat.whtTotal > 0 ? `฿${formatCurrency(cat.whtTotal)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Detailed Vouchers Table */}
          {includeTransactionsList && (
            <div className="mb-6 print-avoid-break">
              <h3 className="text-xs font-bold text-slate-800 mb-2 font-prompt uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  <span>5. ทะเบียนรายการใบสำคัญรับ-จ่าย ทั้งหมดในช่วงเวลา ({filteredVouchers.length} ฉบับ)</span>
                </span>
                <span className="text-[10px] font-normal text-slate-500">หน่วย: บาท (THB)</span>
              </h3>

              <div className="overflow-x-auto rounded-lg border border-slate-300">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2 px-2 text-center w-8">ลำดับ</th>
                      <th className="py-2 px-2 w-20">วันที่</th>
                      <th className="py-2 px-2 w-24">เลขที่เอกสาร</th>
                      <th className="py-2 px-2 w-14 text-center">ประเภท</th>
                      <th className="py-2 px-2 min-w-[150px]">ลูกค้า / ผู้รับเงิน</th>
                      <th className="py-2 px-2 min-w-[180px]">หมวดบัญชี & รายละเอียด</th>
                      <th className="py-2 px-2 text-right w-24">ยอดก่อนภาษี</th>
                      <th className="py-2 px-2 text-right w-20">หัก ณ ที่จ่าย</th>
                      <th className="py-2 px-2 text-right w-24">ยอดสุทธิ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500">
                          ไม่พบรายการใบสำคัญในช่วงเวลาที่กำหนด
                        </td>
                      </tr>
                    ) : (
                      filteredVouchers.map((v, idx) => {
                        const isRV = v.type === 'RV';
                        return (
                          <tr key={v.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-1.5 px-2 text-center text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                            <td className="py-1.5 px-2 text-slate-700 font-mono whitespace-nowrap text-[10px]">
                              {formatDisplayThaiDate(v.date)}
                            </td>
                            <td className="py-1.5 px-2 font-mono font-bold text-slate-900 whitespace-nowrap text-[10px]">
                              {v.voucherNo}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isRV ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isRV ? 'RV (รับ)' : 'PV (จ่าย)'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2">
                              <div className="font-medium text-slate-900 leading-tight text-[11px] truncate max-w-[160px]">
                                {v.contact.name}
                              </div>
                              {v.contact.taxId && (
                                <div className="text-[9px] text-slate-500 font-mono">
                                  Tax: {v.contact.taxId}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="text-blue-800 font-semibold text-[10px] mr-1">
                                [{v.items[0]?.accountCategory || '-'}]
                              </span>
                              <span className="text-slate-700 text-[10px] leading-snug truncate inline-block max-w-[150px]">
                                {v.items[0]?.description || '-'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-700 text-[10px]">
                              {formatCurrency(v.subtotal)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-amber-800 text-[10px]">
                              {v.totalWht > 0 ? `-${formatCurrency(v.totalWht)}` : '-'}
                            </td>
                            <td className={`py-1.5 px-2 text-right font-mono font-bold text-[10px] ${
                              isRV ? 'text-emerald-800' : 'text-slate-900'
                            }`}>
                              {formatCurrency(v.netPayable)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* Table Footer Totals */}
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                      <td colSpan={6} className="py-2 px-3 text-right">
                        ยอดรวมสุทธิทั้งสิ้น ({filteredVouchers.length} ฉบับ):
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[11px]">
                        ฿{formatCurrency(stats.totalRvSubtotal + stats.totalPvSubtotal)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-amber-800 text-[11px]">
                        {stats.totalWht > 0 ? `฿${formatCurrency(stats.totalWht)}` : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-blue-900 text-[11px]">
                        ฿{formatCurrency(stats.totalRvAmount + stats.totalPvAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Thai Baht text summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 mb-6 flex flex-wrap items-center justify-between gap-2 text-xs print-avoid-break">
            <span className="text-slate-600 font-medium">
              จำนวนเงินหมุนเวียนรวมทั้งสิ้น (ตัวอักษร):
            </span>
            <span className="font-bold text-slate-900 font-prompt">
              {convertToThaiBahtText(stats.totalRvAmount + stats.totalPvAmount)}
            </span>
          </div>

          {/* Section 6: Official Signatures Section for Management Approval */}
          {includeSignatures && (
            <div className="pt-6 border-t-2 border-slate-300 mt-6 grid grid-cols-3 gap-6 text-center text-xs print-avoid-break">
              <div className="space-y-12">
                <p className="text-slate-700 font-semibold">ผู้จัดทำรายงาน (Prepared By)</p>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 w-4/5 mx-auto"></div>
                  <p className="text-[11px] text-slate-700">(......................................................)</p>
                  <p className="text-[10px] text-slate-500">เจ้าหน้าที่การเงิน / บัญชี</p>
                  <p className="text-[10px] text-slate-500">วันที่: ......./......./............</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="text-slate-700 font-semibold">ผู้ตรวจสอบบัญชี (Audited / Reviewed By)</p>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 w-4/5 mx-auto"></div>
                  <p className="text-[11px] text-slate-700">(......................................................)</p>
                  <p className="text-[10px] text-slate-500">สมุห์บัญชี / ผู้ตรวจสอบ</p>
                  <p className="text-[10px] text-slate-500">วันที่: ......./......./............</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="text-slate-700 font-semibold">กรรมการผู้มีอำนาจลงนาม (Authorized Approval)</p>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 w-4/5 mx-auto"></div>
                  <p className="text-[11px] text-slate-700">(......................................................)</p>
                  <p className="text-[10px] text-slate-500">กรรมการผู้จัดการ / ผู้บริหารสูงสุด</p>
                  <p className="text-[10px] text-slate-500">วันที่: ......./......./............</p>
                </div>
              </div>
            </div>
          )}

          {/* Official Footer Note */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono print-avoid-break">
            เอกสารสรุปยอดรายงานการเงินเพื่อการบริหาร จัดพิมพ์จากระบบ AccountPlanet e-Voucher เมื่อ {new Date().toLocaleString('th-TH')}
          </div>
        </div>
      </div>
    </div>
  );
};
