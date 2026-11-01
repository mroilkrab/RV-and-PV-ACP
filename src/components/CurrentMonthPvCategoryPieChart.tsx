import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  PieChart as PieChartIcon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  Filter,
  DollarSign,
  Tag,
  FileText,
  AlertCircle,
  Percent,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { Voucher, VoucherItem } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { getCurrentYearMonth, formatThaiMonthYear } from '../utils/accountingSoftwareExport';

interface CurrentMonthPvCategoryPieChartProps {
  vouchers: Voucher[];
  onCreatePV?: () => void;
  onSelectVoucherToPrint?: (voucher: Voucher) => void;
  onSelectMonthFilter?: (monthKey: string) => void;
}

// Sophisticated, distinct color palette for expense categories
const CATEGORY_COLORS = [
  '#f43f5e', // Rose 500
  '#6366f1', // Indigo 500
  '#f59e0b', // Amber 500
  '#10b981', // Emerald 500
  '#0ea5e9', // Sky 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#14b8a6', // Teal 500
  '#f97316', // Orange 500
  '#06b6d4', // Cyan 500
  '#84cc16', // Lime 500
  '#64748b', // Slate 500
];

export interface CategorySummary {
  name: string;
  totalAmount: number;
  netAmount: number;
  count: number;
  percentage: number;
  color: string;
  vouchers: {
    voucher: Voucher;
    item: VoucherItem;
  }[];
}

export const CurrentMonthPvCategoryPieChart: React.FC<CurrentMonthPvCategoryPieChartProps> = ({
  vouchers,
  onCreatePV,
  onSelectVoucherToPrint,
  onSelectMonthFilter,
}) => {
  // Current calendar month in YYYY-MM
  const currentCalendarMonth = useMemo(() => getCurrentYearMonth(), []);

  // Collect all months that have PV vouchers
  const availableMonthsWithPv = useMemo(() => {
    const monthSet = new Set<string>();
    vouchers.forEach((v) => {
      if (v.type === 'PV' && v.date) {
        const ym = v.date.slice(0, 7);
        if (ym.match(/^\d{4}-\d{2}$/)) {
          monthSet.add(ym);
        }
      }
    });

    const arr = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    return arr;
  }, [vouchers]);

  // Determine initial selected month:
  // If current calendar month has PV vouchers, use it.
  // Otherwise, if available months exist, default to current month or latest available month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // If current calendar month has data, start with it
    const hasCurrent = vouchers.some(
      (v) => v.type === 'PV' && v.date && v.date.startsWith(currentCalendarMonth)
    );
    if (hasCurrent) return currentCalendarMonth;
    // Otherwise fallback to latest month with data if available, or currentCalendarMonth
    return availableMonthsWithPv[0] || currentCalendarMonth;
  });

  // Chart display options
  const [chartStyle, setChartStyle] = useState<'donut' | 'pie'>('donut');
  const [amountMode, setAmountMode] = useState<'base' | 'net'>('base'); // baseAmount vs netPayable
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Filter PV vouchers for selected month
  const monthPvVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (v.type !== 'PV') return false;
      if (!v.date) return false;
      return v.date.startsWith(selectedMonth);
    });
  }, [vouchers, selectedMonth]);

  // Compute category aggregation
  const { categoryData, totalExpense, totalVouchersCount, topCategory } = useMemo(() => {
    const map = new Map<string, {
      totalAmount: number;
      netAmount: number;
      count: number;
      vouchers: { voucher: Voucher; item: VoucherItem }[];
    }>();

    let grandTotal = 0;

    monthPvVouchers.forEach((v) => {
      if (v.items && v.items.length > 0) {
        v.items.forEach((item) => {
          const cat = (item.accountCategory || 'ค่าใช้จ่ายทั่วไป/ไม่ระบุหมวด').trim();
          const amt = amountMode === 'base' ? (item.baseAmount || 0) : (item.netAmount || 0);

          grandTotal += amt;

          const existing = map.get(cat) || {
            totalAmount: 0,
            netAmount: 0,
            count: 0,
            vouchers: [],
          };

          existing.totalAmount += item.baseAmount || 0;
          existing.netAmount += item.netAmount || 0;
          existing.count += 1;
          existing.vouchers.push({ voucher: v, item });

          map.set(cat, existing);
        });
      } else {
        // Fallback for vouchers without specific items
        const cat = 'ค่าใช้จ่ายทั่วไป/ไม่ระบุหมวด';
        const amt = amountMode === 'base' ? (v.subtotal || v.netPayable || 0) : (v.netPayable || 0);
        grandTotal += amt;

        const existing = map.get(cat) || {
          totalAmount: 0,
          netAmount: 0,
          count: 0,
          vouchers: [],
        };

        existing.totalAmount += v.subtotal || v.netPayable || 0;
        existing.netAmount += v.netPayable || 0;
        existing.count += 1;
        existing.vouchers.push({
          voucher: v,
          item: {
            id: 'fallback',
            description: v.notes || 'ค่าใช้จ่ายทั่วไป',
            accountCategory: cat,
            baseAmount: v.subtotal || v.netPayable,
            vatRate: 0,
            vatAmount: v.totalVat || 0,
            whtRate: 0,
            whtAmount: v.totalWht || 0,
            netAmount: v.netPayable,
          },
        });

        map.set(cat, existing);
      }
    });

    // Convert map to sorted array (highest amount first)
    const sortedCategories = Array.from(map.entries())
      .map(([name, data], idx) => {
        const val = amountMode === 'base' ? data.totalAmount : data.netAmount;
        const percentage = grandTotal > 0 ? (val / grandTotal) * 100 : 0;
        const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

        return {
          name,
          totalAmount: data.totalAmount,
          netAmount: data.netAmount,
          count: data.count,
          percentage,
          color,
          vouchers: data.vouchers,
        } as CategorySummary;
      })
      .sort((a, b) => {
        const valA = amountMode === 'base' ? a.totalAmount : a.netAmount;
        const valB = amountMode === 'base' ? b.totalAmount : b.netAmount;
        return valB - valA;
      });

    const top = sortedCategories.length > 0 ? sortedCategories[0] : null;

    return {
      categoryData: sortedCategories,
      totalExpense: grandTotal,
      totalVouchersCount: monthPvVouchers.length,
      topCategory: top,
    };
  }, [monthPvVouchers, amountMode]);

  // Chart data format for Recharts
  const rechartsPieData = useMemo(() => {
    return categoryData.map((c) => ({
      name: c.name,
      value: amountMode === 'base' ? c.totalAmount : c.netAmount,
      percentage: c.percentage,
      count: c.count,
      color: c.color,
    }));
  }, [categoryData, amountMode]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    const newMonth = `${y}-${String(m).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
    setSelectedCategoryFilter(null);
  };

  const handleNextMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const newMonth = `${y}-${String(m).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
    setSelectedCategoryFilter(null);
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentCalendarMonth);
    setSelectedCategoryFilter(null);
  };

  const handleJumpToLatestDataMonth = () => {
    if (availableMonthsWithPv.length > 0) {
      setSelectedMonth(availableMonthsWithPv[0]);
      setSelectedCategoryFilter(null);
    }
  };

  const isCurrentMonth = selectedMonth === currentCalendarMonth;

  // Custom Tooltip for Recharts Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md min-w-[230px] z-50">
          <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-slate-100 font-prompt truncate">
              {data.name}
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-sans">ยอดเงิน:</span>
              <span className="text-amber-300 font-bold text-sm">
                ฿{formatCurrency(data.value)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="font-sans">สัดส่วนในเดือนนี้:</span>
              <span className="text-emerald-400 font-bold">
                {data.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
              <span className="font-sans">จำนวนรายการ:</span>
              <span>{data.count} รายการ</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label on Pie slices
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    // Only show label if slice is large enough (> 7%)
    if (percent < 0.07) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-bold font-mono pointer-events-none drop-shadow-md select-none"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Active slice hover data
  const activeHoverCategory = useMemo(() => {
    if (!hoveredCategory) return null;
    return categoryData.find((c) => c.name === hoveredCategory) || null;
  }, [hoveredCategory, categoryData]);

  // Filtered vouchers list for drilldown
  const drilldownVouchers = useMemo(() => {
    if (!selectedCategoryFilter) return [];
    const cat = categoryData.find((c) => c.name === selectedCategoryFilter);
    return cat ? cat.vouchers : [];
  }, [selectedCategoryFilter, categoryData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6 transition hover:border-rose-200">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 font-prompt flex items-center gap-2">
                <span>วิเคราะห์สัดส่วนหมวดหมู่ค่าใช้จ่าย (PV)</span>
                {isCurrentMonth ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    เดือนปัจจุบัน
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    งวดประวัติ
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                แผนภูมิวงกลม Recharts แสดงสัดส่วนการกระจายตัวของค่าใช้จ่ายตามหมวดบัญชี
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector & Display Options */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigator Controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-2.5 py-1 text-xs font-bold text-slate-800 font-prompt flex items-center gap-1.5 min-w-[130px] justify-center">
              <Calendar className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{formatThaiMonthYear(selectedMonth)}</span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Current Month Button if not currently on it */}
          {!isCurrentMonth && (
            <button
              onClick={handleResetToCurrentMonth}
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs px-2.5 py-1.5 rounded-xl border border-rose-200 transition cursor-pointer shadow-2xs"
              title="กลับไปยังเดือนปัจจุบันทันที"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เดือนปัจจุบัน</span>
            </button>
          )}

          {/* Amount Calculation Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium">
            <button
              onClick={() => setAmountMode('base')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                amountMode === 'base'
                  ? 'bg-white text-rose-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="คำนวณจากมูลค่าก่อนภาษี (Base Amount)"
            >
              ก่อนภาษี
            </button>
            <button
              onClick={() => setAmountMode('net')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                amountMode === 'net'
                  ? 'bg-white text-rose-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="คำนวณจากยอดจ่ายสุทธิหลังภาษี (Net Amount)"
            >
              จ่ายสุทธิ
            </button>
          </div>

          {/* Donut vs Pie style toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium">
            <button
              onClick={() => setChartStyle('donut')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                chartStyle === 'donut'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              โดนัท
            </button>
            <button
              onClick={() => setChartStyle('pie')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                chartStyle === 'pie'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              พายเต็มวง
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            ยอดรวมค่าใช้จ่าย ({amountMode === 'base' ? 'ก่อนภาษี' : 'จ่ายสุทธิ'})
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-900 mt-1 truncate">
            ฿{formatCurrency(totalExpense)}
          </div>
          <span className="text-[11px] text-rose-600/80 mt-0.5 block">
            ประจำ {formatThaiMonthYear(selectedMonth)}
          </span>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            จำนวนใบสำคัญจ่าย (PV)
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-800 mt-1">
            {totalVouchersCount}{' '}
            <span className="text-xs font-normal text-slate-500">ฉบับ</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {categoryData.reduce((acc, c) => acc + c.count, 0)} รายการย่อย
          </span>
        </div>

        <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
            หมวดค่าใช้จ่ายสูงสุด
          </span>
          <div className="text-sm sm:text-base font-bold font-prompt text-indigo-950 mt-1 truncate" title={topCategory?.name || '-'}>
            {topCategory?.name || 'ไม่มีข้อมูล'}
          </div>
          <span className="text-[11px] text-indigo-700 font-mono mt-0.5 block font-semibold">
            {topCategory ? `${topCategory.percentage.toFixed(1)}% (฿${formatCurrency(amountMode === 'base' ? topCategory.totalAmount : topCategory.netAmount)})` : '-'}
          </span>
        </div>

        <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
            ค่าเฉลี่ยต่อใบสำคัญ
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-900 mt-1 truncate">
            ฿{totalVouchersCount > 0 ? formatCurrency(totalExpense / totalVouchersCount) : '0.00'}
          </div>
          <span className="text-[11px] text-amber-700/80 mt-0.5 block">
            เฉลี่ย {categoryData.length} หมวดบัญชี
          </span>
        </div>
      </div>

      {/* Main Analysis Body: Either Chart + Breakdown OR Empty State */}
      {categoryData.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-200">
            <PieChartIcon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 font-prompt">
              ยังไม่มีข้อมูลใบสำคัญจ่าย (PV) ในเดือน {formatThaiMonthYear(selectedMonth)}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ยังไม่พบการบันทึกใบสำคัญจ่ายในงวดเดือนนี้ คุณสามารถออกใบสำคัญจ่ายใหม่ หรือเลือกดูข้อมูลงวดเดือนที่มีการบันทึกรายการไว้แล้วได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {availableMonthsWithPv.length > 0 && availableMonthsWithPv[0] !== selectedMonth && (
              <button
                onClick={handleJumpToLatestDataMonth}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl border border-slate-300 transition cursor-pointer shadow-2xs"
              >
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>ดูงวดที่มีข้อมูลล่าสุด ({formatThaiMonthYear(availableMonthsWithPv[0])})</span>
              </button>
            )}

            {onCreatePV && (
              <button
                onClick={onCreatePV}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ ออกใบสำคัญจ่าย (PV) ประจำเดือนนี้</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Recharts Pie Chart (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col items-center justify-center relative min-h-[360px]">
            <div className="w-full text-center mb-1">
              <span className="text-xs font-semibold text-slate-600 font-prompt">
                สัดส่วนร้อยละ (%) ค่าใช้จ่ายตามหมวด
              </span>
            </div>

            {/* Recharts Pie Component */}
            <div className="w-full h-[290px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rechartsPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={chartStyle === 'donut' ? 105 : 100}
                    innerRadius={chartStyle === 'donut' ? 62 : 0}
                    paddingAngle={chartStyle === 'donut' ? 2 : 0}
                    dataKey="value"
                    nameKey="name"
                    animationDuration={800}
                    onMouseEnter={(entry: any) => setHoveredCategory(entry?.name || null)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={(entry: any) => {
                      const name = entry?.name;
                      if (name && selectedCategoryFilter === name) {
                        setSelectedCategoryFilter(null);
                      } else if (name) {
                        setSelectedCategoryFilter(name);
                      }
                    }}
                    cursor="pointer"
                  >
                    {rechartsPieData.map((entry, index) => {
                      const isHovered = hoveredCategory === entry.name;
                      const isSelected = selectedCategoryFilter === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke={isSelected ? '#0f172a' : isHovered ? '#334155' : '#ffffff'}
                          strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                          className="transition-all duration-200"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Center Label summary */}
              {chartStyle === 'donut' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  {activeHoverCategory ? (
                    <div className="px-2 animate-fadeIn">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block truncate max-w-[120px]">
                        {activeHoverCategory.name}
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-900 block">
                        ฿{formatCurrency(amountMode === 'base' ? activeHoverCategory.totalAmount : activeHoverCategory.netAmount)}
                      </span>
                      <span className="text-[11px] font-bold font-mono text-rose-600 block">
                        {activeHoverCategory.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <div className="px-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                        รวมจ่ายเดือนนี้
                      </span>
                      <span className="text-base font-bold font-mono text-slate-900 block tracking-tight">
                        ฿{formatCurrency(totalExpense)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        {totalVouchersCount} ฉบับ
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>คลิกที่ชิ้นพายเพื่อเจาะลึกดูรายการเอกสารของหมวดนั้น</span>
            </div>
          </div>

          {/* Right: Detailed Ranked Category Breakdown Table (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-prompt">
                  อันดับหมวดหมู่ค่าใช้จ่าย ({categoryData.length} หมวด)
                </h4>
                <p className="text-[11px] text-slate-500">
                  เรียงลำดับจากยอดค่าใช้จ่ายสูงสุดไปต่ำสุด
                </p>
              </div>

              {selectedCategoryFilter && (
                <button
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                >
                  <span>ล้างตัวกรองหมวด</span>
                  <span className="text-[10px]">✕</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {categoryData.map((cat, idx) => {
                const isSelected = selectedCategoryFilter === cat.name;
                const isHovered = hoveredCategory === cat.name;
                const amt = amountMode === 'base' ? cat.totalAmount : cat.netAmount;

                return (
                  <div
                    key={cat.name}
                    onMouseEnter={() => setHoveredCategory(cat.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => {
                      if (selectedCategoryFilter === cat.name) {
                        setSelectedCategoryFilter(null);
                      } else {
                        setSelectedCategoryFilter(cat.name);
                      }
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/60 border-rose-400 shadow-xs'
                        : isHovered
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-bold text-slate-900 font-prompt truncate">
                          {idx + 1}. {cat.name}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono text-slate-900 text-sm">
                          ฿{formatCurrency(amt)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar showing percentage */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(cat.percentage, 2)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1 font-sans">
                        <span>สัดส่วน:</span>
                        <strong className="text-slate-700 font-mono font-bold">
                          {cat.percentage.toFixed(1)}%
                        </strong>
                      </span>

                      <div className="flex items-center gap-3">
                        <span>{cat.count} รายการ</span>
                        <span className="text-slate-400">|</span>
                        <span>เฉลี่ย/รายการ: ฿{formatCurrency(amt / Math.max(cat.count, 1))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Section: List vouchers when a category slice is selected */}
      {selectedCategoryFilter && drilldownVouchers.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-xs font-bold text-slate-800 font-prompt">
                รายการใบสำคัญจ่ายในหมวด: &ldquo;{selectedCategoryFilter}&rdquo;
              </span>
              <span className="text-[11px] bg-white text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                {drilldownVouchers.length} รายการ
              </span>
            </div>

            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              ปิดหน้าต่างรายการ ✕
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-semibold">เลขที่ PV</th>
                  <th className="py-2.5 px-3 font-semibold">วันที่</th>
                  <th className="py-2.5 px-3 font-semibold">ผู้รับเงิน / ผู้สอบบัญชี</th>
                  <th className="py-2.5 px-3 font-semibold">รายละเอียดรายการ</th>
                  <th className="py-2.5 px-3 font-semibold text-right">ยอดก่อนภาษี</th>
                  <th className="py-2.5 px-3 font-semibold text-right">จ่ายสุทธิ</th>
                  {onSelectVoucherToPrint && (
                    <th className="py-2.5 px-3 text-center font-semibold">พิมพ์/เปิด</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {drilldownVouchers.map(({ voucher, item }, i) => (
                  <tr key={`${voucher.id}-${item.id}-${i}`} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-bold text-rose-700">
                      {voucher.voucherNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {voucher.date}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-800 max-w-[200px] truncate" title={voucher.contact?.name}>
                      {voucher.contact?.name || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 max-w-[220px] truncate" title={item.description}>
                      {item.description || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                      ฿{formatCurrency(item.baseAmount || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                      ฿{formatCurrency(item.netAmount || voucher.netPayable)}
                    </td>
                    {onSelectVoucherToPrint && (
                      <td className="py-2.5 px-3 text-center font-sans">
                        <button
                          onClick={() => onSelectVoucherToPrint(voucher)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>ดูเอกสาร</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
