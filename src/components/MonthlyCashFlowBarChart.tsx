import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet 
} from 'lucide-react';
import { Voucher } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';

interface MonthlyCashFlowBarChartProps {
  vouchers: Voucher[];
  onSelectMonth?: (monthKey: string) => void;
}

const THAI_MONTH_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_MONTH_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

interface MonthlyDataPoint {
  monthIndex: number;
  monthKey: string; // '2026-01'
  monthName: string; // 'ม.ค.'
  monthFull: string; // 'มกราคม'
  income: number; // RV total netPayable
  expense: number; // PV total netPayable
  net: number; // income - expense
  rvCount: number;
  pvCount: number;
  totalVouchers: number;
}

export const MonthlyCashFlowBarChart: React.FC<MonthlyCashFlowBarChartProps> = ({
  vouchers,
  onSelectMonth,
}) => {
  // Extract all available years from vouchers, default to 2026 or current year
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    vouchers.forEach((v) => {
      if (v.date) {
        const y = parseInt(v.date.slice(0, 4), 10);
        if (!isNaN(y) && y > 2000) years.add(y);
      }
    });
    // Add 2026 if empty or not included
    years.add(2026);
    return Array.from(years).sort((a, b) => b - a);
  }, [vouchers]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears[0] || 2026;
  });

  const [barDisplayMode, setBarDisplayMode] = useState<'grouped' | 'stacked'>('grouped');

  // Compute 12 months data for the selected year
  const chartData: MonthlyDataPoint[] = useMemo(() => {
    const months: MonthlyDataPoint[] = [];

    for (let i = 0; i < 12; i++) {
      const monthNum = (i + 1).toString().padStart(2, '0');
      const monthKey = `${selectedYear}-${monthNum}`;

      months.push({
        monthIndex: i,
        monthKey,
        monthName: THAI_MONTH_NAMES[i],
        monthFull: THAI_MONTH_FULL[i],
        income: 0,
        expense: 0,
        net: 0,
        rvCount: 0,
        pvCount: 0,
        totalVouchers: 0,
      });
    }

    vouchers.forEach((v) => {
      if (!v.date) return;
      const vYear = parseInt(v.date.slice(0, 4), 10);
      if (vYear !== selectedYear) return;

      const vMonthIndex = parseInt(v.date.slice(5, 7), 10) - 1;
      if (vMonthIndex >= 0 && vMonthIndex < 12) {
        const item = months[vMonthIndex];
        const amount = Number(v.netPayable) || 0;

        if (v.type === 'RV') {
          item.income += amount;
          item.rvCount += 1;
        } else {
          item.expense += amount;
          item.pvCount += 1;
        }
        item.totalVouchers += 1;
        item.net = item.income - item.expense;
      }
    });

    return months;
  }, [vouchers, selectedYear]);

  // Annual Summary Calculations
  const annualSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalRvCount = 0;
    let totalPvCount = 0;
    let maxIncomeMonth = chartData[0];

    chartData.forEach((m) => {
      totalIncome += m.income;
      totalExpense += m.expense;
      totalRvCount += m.rvCount;
      totalPvCount += m.pvCount;

      if (m.income > (maxIncomeMonth?.income || 0)) {
        maxIncomeMonth = m;
      }
    });

    const netCashFlow = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
      totalRvCount,
      totalPvCount,
      profitMargin,
      bestMonth: maxIncomeMonth.income > 0 ? maxIncomeMonth : null,
    };
  }, [chartData]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyDataPoint;
      const isPositive = data.net >= 0;

      return (
        <div className="bg-slate-900/95 text-white p-4 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2.5 backdrop-blur-xs min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-bold text-sm text-slate-100 font-prompt">
              เดือน{data.monthFull} พ.ศ. {selectedYear + 543}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
              {data.totalVouchers} ฉบับ
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>รายรับ (RV):</span>
              </span>
              <span className="font-bold text-emerald-300">
                ฿{formatCurrency(data.income)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>รายจ่าย (PV):</span>
              </span>
              <span className="font-bold text-rose-300">
                ฿{formatCurrency(data.expense)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between gap-4">
              <span className="text-slate-300 font-sans font-medium">กระแสเงินสดสุทธิ:</span>
              <span className={`font-bold ${isPositive ? 'text-blue-300' : 'text-amber-400'}`}>
                {isPositive ? '+' : ''}฿{formatCurrency(data.net)}
              </span>
            </div>
          </div>

          {onSelectMonth && data.totalVouchers > 0 && (
            <div className="pt-1 text-[10px] text-slate-400 text-center italic">
              คลิกที่แท่งกราฟเพื่อกรองรายการของเดือนนี้
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
      {/* Top Controls & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 font-prompt">
                กราฟเปรียบเทียบรายรับ vs. รายจ่าย รายเดือน (Cash Flow Bar Chart)
              </h3>
              <p className="text-xs text-slate-500">
                แสดงผลกระแสเงินสดรับและจ่ายตลอด 12 เดือน ประจำปี พ.ศ. {selectedYear + 543} ({selectedYear})
              </p>
            </div>
          </div>
        </div>

        {/* Year Selector & Display Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <span className="px-2 text-slate-500 flex items-center gap-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5" />
              <span>ปี:</span>
            </span>
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-mono ${
                  selectedYear === yr
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {yr + 543} ({yr})
              </button>
            ))}
          </div>

          {/* Grouped vs Stacked */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setBarDisplayMode('grouped')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                barDisplayMode === 'grouped'
                  ? 'bg-white text-slate-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แท่งแยกคู่
            </button>
            <button
              type="button"
              onClick={() => setBarDisplayMode('stacked')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                barDisplayMode === 'stacked'
                  ? 'bg-white text-slate-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แท่งซ้อนทับ
            </button>
          </div>
        </div>
      </div>

      {/* Annual KPI Cards for the Selected Year */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Income Card */}
        <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              รายรับรวมปี {selectedYear + 543}
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
              RV ({annualSummary.totalRvCount} ฉบับ)
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-900">
            ฿{formatCurrency(annualSummary.totalIncome)}
          </div>
          <div className="text-[11px] text-emerald-700/80">
            เฉลี่ย ฿{formatCurrency(annualSummary.totalIncome / 12)} / เดือน
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-rose-50/50 rounded-xl p-3.5 border border-rose-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-800 font-medium">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              รายจ่ายรวมปี {selectedYear + 543}
            </span>
            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-mono">
              PV ({annualSummary.totalPvCount} ฉบับ)
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-rose-900">
            ฿{formatCurrency(annualSummary.totalExpense)}
          </div>
          <div className="text-[11px] text-rose-700/80">
            เฉลี่ย ฿{formatCurrency(annualSummary.totalExpense / 12)} / เดือน
          </div>
        </div>

        {/* Net Cash Flow Card */}
        <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-800 font-medium">
            <span className="flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              กระแสเงินสดสุทธิทั้งปี
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
              annualSummary.netCashFlow >= 0 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {annualSummary.netCashFlow >= 0 ? 'เงินสดบวก (+)' : 'เงินสดลบ (-)'}
            </span>
          </div>
          <div className={`text-lg font-bold font-mono ${
            annualSummary.netCashFlow >= 0 ? 'text-blue-900' : 'text-rose-700'
          }`}>
            ฿{formatCurrency(annualSummary.netCashFlow)}
          </div>
          <div className="text-[11px] text-blue-700/80">
            อัตราส่วนกำไรเงินสด {annualSummary.profitMargin.toFixed(1)}%
          </div>
        </div>

        {/* Best Month Card */}
        <div className="bg-indigo-50/50 rounded-xl p-3.5 border border-indigo-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-indigo-800 font-medium">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              เดือนที่รายรับสูงสุด
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono">
              Peak
            </span>
          </div>
          <div className="text-lg font-bold text-indigo-900">
            {annualSummary.bestMonth ? `เดือน${annualSummary.bestMonth.monthFull}` : 'ยังไม่มีข้อมูล'}
          </div>
          <div className="text-[11px] text-indigo-700 font-mono">
            {annualSummary.bestMonth ? `฿${formatCurrency(annualSummary.bestMonth.income)}` : '-'}
          </div>
        </div>
      </div>

      {/* Main Recharts Bar Chart Container */}
      <div className="h-80 sm:h-96 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload[0] && onSelectMonth) {
                const data = e.activePayload[0].payload as MonthlyDataPoint;
                onSelectMonth(data.monthKey);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="monthName"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(val) => {
                if (val >= 1000000) return `฿${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `฿${(val / 1000).toFixed(0)}k`;
                return `฿${val}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 16, fontSize: 12 }}
              formatter={(value) => (
                <span className="text-xs font-medium text-slate-700 mr-2">{value}</span>
              )}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" />

            <Bar
              dataKey="income"
              name="รายรับ (Income - RV)"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={barDisplayMode === 'grouped' ? 24 : 36}
              stackId={barDisplayMode === 'stacked' ? 'a' : undefined}
            />
            <Bar
              dataKey="expense"
              name="รายจ่าย (Expenses - PV)"
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              maxBarSize={barDisplayMode === 'grouped' ? 24 : 36}
              stackId={barDisplayMode === 'stacked' ? 'a' : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Legend & Filter Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
            <span className="text-slate-700 font-medium">ใบสำคัญรับเงิน (RV)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
            <span className="text-slate-700 font-medium">ใบสำคัญจ่ายเงิน (PV)</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          * ข้อมูลจะอัปเดตอัตโนมัติเมื่อมีการออกใบสำคัญหรือซิงค์จาก Google Sheet
        </div>
      </div>
    </div>
  );
};
