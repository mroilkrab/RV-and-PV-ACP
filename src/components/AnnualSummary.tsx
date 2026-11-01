import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Printer, 
  Download, 
  FileText, 
  Filter, 
  PieChart, 
  BarChart3, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers,
  Search,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { Voucher, CompanySettings, VoucherType } from '../types';
import { formatCurrency, convertToThaiBahtText } from '../utils/thaiBahtText';

interface AnnualSummaryProps {
  vouchers: Voucher[];
  companySettings: CompanySettings;
  onSelectVoucherToPrint: (voucher: Voucher) => void;
  onEditVoucher: (voucher: Voucher) => void;
  onCreateRV: () => void;
  onCreatePV: () => void;
}

export const AnnualSummary: React.FC<AnnualSummaryProps> = ({
  vouchers,
  companySettings,
  onSelectVoucherToPrint,
  onEditVoucher,
  onCreateRV,
  onCreatePV,
}) => {
  // Extract all distinct years from voucher dates
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    vouchers.forEach((v) => {
      const yr = new Date(v.date).getFullYear();
      if (!isNaN(yr)) yearsSet.add(yr);
    });
    // Ensure current year is included
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [vouchers]);

  // Selected year state (default to current year or latest year available)
  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] || new Date().getFullYear());
  const [activeSubTab, setActiveSubTab] = useState<'pnl' | 'monthly' | 'categories' | 'registry'>('pnl');
  const [registryFilterType, setRegistryFilterType] = useState<'ALL' | 'RV' | 'PV'>('ALL');
  const [registrySearch, setRegistrySearch] = useState('');

  // Filter vouchers belonging to the selected fiscal year (1 Jan - 31 Dec)
  const fiscalVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const yr = new Date(v.date).getFullYear();
      return yr === selectedYear;
    });
  }, [vouchers, selectedYear]);

  // Separate RV and PV vouchers
  const rvVouchers = useMemo(() => fiscalVouchers.filter((v) => v.type === 'RV'), [fiscalVouchers]);
  const pvVouchers = useMemo(() => fiscalVouchers.filter((v) => v.type === 'PV'), [fiscalVouchers]);

  // Aggregated Key Metrics
  // Total Revenue (RV)
  const totalRevenueBase = useMemo(() => rvVouchers.reduce((sum, v) => sum + (v.subtotal || 0), 0), [rvVouchers]);
  const totalRevenueVat = useMemo(() => rvVouchers.reduce((sum, v) => sum + (v.totalVat || 0), 0), [rvVouchers]);
  const totalRevenueWht = useMemo(() => rvVouchers.reduce((sum, v) => sum + (v.totalWht || 0), 0), [rvVouchers]);
  const totalRevenueNet = useMemo(() => rvVouchers.reduce((sum, v) => sum + (v.netPayable || 0), 0), [rvVouchers]);

  // Total Expenses (PV)
  const totalExpenseBase = useMemo(() => pvVouchers.reduce((sum, v) => sum + (v.subtotal || 0), 0), [pvVouchers]);
  const totalExpenseVat = useMemo(() => pvVouchers.reduce((sum, v) => sum + (v.totalVat || 0), 0), [pvVouchers]);
  const totalExpenseWht = useMemo(() => pvVouchers.reduce((sum, v) => sum + (v.totalWht || 0), 0), [pvVouchers]);
  const totalExpenseNet = useMemo(() => pvVouchers.reduce((sum, v) => sum + (v.netPayable || 0), 0), [pvVouchers]);

  // Net Profit before Tax
  const netOperatingProfit = totalRevenueBase - totalExpenseBase;
  const netProfitMargin = totalRevenueBase > 0 ? (netOperatingProfit / totalRevenueBase) * 100 : 0;

  // VAT Analysis: Output VAT (ขาย) - Input VAT (ซื้อ)
  const netVatPayable = totalRevenueVat - totalExpenseVat;

  // Expense Category Grouping for PV
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { totalAmount: number; count: number }>();
    pvVouchers.forEach((v) => {
      v.items.forEach((item) => {
        const cat = item.accountCategory || 'ค่าใช้จ่ายทั่วไป';
        const current = map.get(cat) || { totalAmount: 0, count: 0 };
        current.totalAmount += (item.baseAmount || 0);
        current.count += 1;
        map.set(cat, current);
      });
    });

    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        totalAmount: data.totalAmount,
        count: data.count,
        percentage: totalExpenseBase > 0 ? (data.totalAmount / totalExpenseBase) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [pvVouchers, totalExpenseBase]);

  // Revenue Category Grouping for RV
  const revenueByCategory = useMemo(() => {
    const map = new Map<string, { totalAmount: number; count: number }>();
    rvVouchers.forEach((v) => {
      v.items.forEach((item) => {
        const cat = item.accountCategory || 'รายได้ค่าบริการ';
        const current = map.get(cat) || { totalAmount: 0, count: 0 };
        current.totalAmount += (item.baseAmount || 0);
        current.count += 1;
        map.set(cat, current);
      });
    });

    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        totalAmount: data.totalAmount,
        count: data.count,
        percentage: totalRevenueBase > 0 ? (data.totalAmount / totalRevenueBase) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [rvVouchers, totalRevenueBase]);

  // Monthly Breakdown (12 Months)
  const monthlyData = useMemo(() => {
    const thaiMonthNames = [
      'มกราคม (Jan)', 'กุมภาพันธ์ (Feb)', 'มีนาคม (Mar)', 'เมษายน (Apr)',
      'พฤษภาคม (May)', 'มิถุนายน (Jun)', 'กรกฎาคม (Jul)', 'สิงหาคม (Aug)',
      'กันยายน (Sep)', 'ตุลาคม (Oct)', 'พฤศจิกายน (Nov)', 'ธันวาคม (Dec)'
    ];

    const months = thaiMonthNames.map((name, idx) => ({
      monthIndex: idx,
      name,
      rvBase: 0,
      rvNet: 0,
      rvCount: 0,
      pvBase: 0,
      pvNet: 0,
      pvCount: 0,
      netProfit: 0,
    }));

    fiscalVouchers.forEach((v) => {
      const d = new Date(v.date);
      const mIdx = d.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        if (v.type === 'RV') {
          months[mIdx].rvBase += (v.subtotal || 0);
          months[mIdx].rvNet += (v.netPayable || 0);
          months[mIdx].rvCount += 1;
        } else {
          months[mIdx].pvBase += (v.subtotal || 0);
          months[mIdx].pvNet += (v.netPayable || 0);
          months[mIdx].pvCount += 1;
        }
      }
    });

    months.forEach((m) => {
      m.netProfit = m.rvBase - m.pvBase;
    });

    return months;
  }, [fiscalVouchers]);

  // Quarterly Breakdown
  const quarterlyData = useMemo(() => {
    return [
      {
        quarter: 'ไตรมาส 1 (Q1: ม.ค. - มี.ค.)',
        rvBase: monthlyData.slice(0, 3).reduce((acc, m) => acc + m.rvBase, 0),
        pvBase: monthlyData.slice(0, 3).reduce((acc, m) => acc + m.pvBase, 0),
        rvCount: monthlyData.slice(0, 3).reduce((acc, m) => acc + m.rvCount, 0),
        pvCount: monthlyData.slice(0, 3).reduce((acc, m) => acc + m.pvCount, 0),
      },
      {
        quarter: 'ไตรมาส 2 (Q2: เม.ย. - มิ.ย.)',
        rvBase: monthlyData.slice(3, 6).reduce((acc, m) => acc + m.rvBase, 0),
        pvBase: monthlyData.slice(3, 6).reduce((acc, m) => acc + m.pvBase, 0),
        rvCount: monthlyData.slice(3, 6).reduce((acc, m) => acc + m.rvCount, 0),
        pvCount: monthlyData.slice(3, 6).reduce((acc, m) => acc + m.pvCount, 0),
      },
      {
        quarter: 'ไตรมาส 3 (Q3: ก.ค. - ก.ย.)',
        rvBase: monthlyData.slice(6, 9).reduce((acc, m) => acc + m.rvBase, 0),
        pvBase: monthlyData.slice(6, 9).reduce((acc, m) => acc + m.pvBase, 0),
        rvCount: monthlyData.slice(6, 9).reduce((acc, m) => acc + m.rvCount, 0),
        pvCount: monthlyData.slice(6, 9).reduce((acc, m) => acc + m.pvCount, 0),
      },
      {
        quarter: 'ไตรมาส 4 (Q4: ต.ค. - ธ.ค.)',
        rvBase: monthlyData.slice(9, 12).reduce((acc, m) => acc + m.rvBase, 0),
        pvBase: monthlyData.slice(9, 12).reduce((acc, m) => acc + m.pvBase, 0),
        rvCount: monthlyData.slice(9, 12).reduce((acc, m) => acc + m.rvCount, 0),
        pvCount: monthlyData.slice(9, 12).reduce((acc, m) => acc + m.pvCount, 0),
      },
    ].map((q) => ({
      ...q,
      netProfit: q.rvBase - q.pvBase,
      margin: q.rvBase > 0 ? ((q.rvBase - q.pvBase) / q.rvBase) * 100 : 0,
    }));
  }, [monthlyData]);

  // Registry Filtered Vouchers
  const filteredRegistryVouchers = useMemo(() => {
    return fiscalVouchers.filter((v) => {
      if (registryFilterType !== 'ALL' && v.type !== registryFilterType) {
        return false;
      }
      if (registrySearch.trim()) {
        const q = registrySearch.toLowerCase();
        const docNo = (v.voucherNo || '').toLowerCase();
        const contact = (v.contact?.name || '').toLowerCase();
        const jobNo = (v.jobNo || '').toLowerCase();
        const notes = (v.notes || '').toLowerCase();
        return docNo.includes(q) || contact.includes(q) || jobNo.includes(q) || notes.includes(q);
      }
      return true;
    });
  }, [fiscalVouchers, registryFilterType, registrySearch]);

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      'ลำดับ',
      'ประเภท',
      'เลขที่เอกสาร',
      'วันที่',
      'Job No.',
      'ชื่อคู่ค้า/ลูกค้า',
      'เลขประจำตัวผู้เสียภาษี',
      'ยอดก่อนภาษี',
      'ภาษีมูลค่าเพิ่ม 7%',
      'หัก ณ ที่จ่าย',
      'ยอดสุทธิ',
      'สถานะ',
      'วิธีชำระเงิน'
    ];

    const rows = fiscalVouchers.map((v, i) => [
      i + 1,
      v.type === 'RV' ? 'ใบสำคัญรับ (RV)' : 'ใบสำคัญจ่าย (PV)',
      `"${v.voucherNo}"`,
      `"${v.date}"`,
      `"${v.jobNo || ''}"`,
      `"${v.contact?.name || ''}"`,
      `"${v.contact?.taxId || ''}"`,
      v.subtotal.toFixed(2),
      v.totalVat.toFixed(2),
      v.totalWht.toFixed(2),
      v.netPayable.toFixed(2),
      `"${v.status}"`,
      `"${v.payment?.method || ''}"`
    ]);

    const csvContent = '\uFEFF' + [
      `"รายงานสรุปบัญชีและภาษีประจำปี ${selectedYear + 543} (${selectedYear}) - ${companySettings.name}"`,
      `"ยอดรายได้รวม: ${totalRevenueBase.toFixed(2)} บาท"`,
      `"ยอดค่าใช้จ่ายรวม: ${totalExpenseBase.toFixed(2)} บาท"`,
      `"กำไรสุทธิก่อนภาษี: ${netOperatingProfit.toFixed(2)} บาท"`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Annual_Accounting_Summary_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const thaiBuddhistYear = selectedYear + 543;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner & Year Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Annual Accounting Review
              </span>
              <span className="text-xs text-slate-500 font-mono">
                รอบปีบัญชี 1 ม.ค. {thaiBuddhistYear} - 31 ธ.ค. {thaiBuddhistYear}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>สรุปงบการเงินและผลประกอบการประจำปี {thaiBuddhistYear} ({selectedYear})</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              รวบรวมข้อมูลใบสำคัญรับ (RV) และใบสำคัญจ่าย (PV) ทั้งหมดในรอบปี สำหรับการทบทวนบัญชี ปิดงบประจำปี และวางแผนภาษี
            </p>
          </div>

          {/* Year Switcher & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Year selector pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {yr + 543} ({yr})
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              title="ส่งออกรายงานประจำปีเป็นไฟล์ CSV / Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              title="พิมพ์รายงานสรุปงบการเงินประจำปี"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Financial Metric Cards (Hero Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue Card */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              รายได้รวม (Total Revenue)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              ฿{formatCurrency(totalRevenueBase)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>ยอดรับสุทธิ: ฿{formatCurrency(totalRevenueNet)}</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {rvVouchers.length} ใบสำคัญรับ
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>ภาษีขาย (VAT 7%):</span>
            <span className="font-mono font-medium text-slate-800">฿{formatCurrency(totalRevenueVat)}</span>
          </div>
        </div>

        {/* 2. Total Expenses Card */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              ค่าใช้จ่ายรวม (Total Expenses)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              ฿{formatCurrency(totalExpenseBase)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>ยอดจ่ายสุทธิ: ฿{formatCurrency(totalExpenseNet)}</span>
              <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                {pvVouchers.length} ใบสำคัญจ่าย
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>ภาษีซื้อ (VAT 7%):</span>
            <span className="font-mono font-medium text-slate-800">฿{formatCurrency(totalExpenseVat)}</span>
          </div>
        </div>

        {/* 3. Net Operating Profit / Loss Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs relative overflow-hidden ${
          netOperatingProfit >= 0 ? 'border-blue-200' : 'border-amber-200'
        }`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70 ${
            netOperatingProfit >= 0 ? 'bg-blue-50' : 'bg-amber-50'
          }`}></div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              netOperatingProfit >= 0 ? 'text-blue-800' : 'text-amber-800'
            }`}>
              {netOperatingProfit >= 0 ? 'กำไรจากการดำเนินงาน' : 'ขาดทุนสุทธิ (Net Loss)'}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              netOperatingProfit >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {netOperatingProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
              netOperatingProfit >= 0 ? 'text-blue-900' : 'text-amber-900'
            }`}>
              {netOperatingProfit < 0 && '-'}฿{formatCurrency(Math.abs(netOperatingProfit))}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>อัตรากำไร (Net Margin):</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full ${
                netOperatingProfit >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {netProfitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>คำนวณจาก:</span>
            <span className="text-slate-700 font-medium">รายได้ก่อนภาษี - รายจ่ายก่อนภาษี</span>
          </div>
        </div>

        {/* 4. Net VAT & Withholding Tax Summary Card */}
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              สรุปภาษีทางบัญชี (Tax Summary)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs text-slate-500">ภาษีมูลค่าเพิ่มสุทธิ (ภาษีขาย - ภาษีซื้อ):</div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight mt-0.5">
              {netVatPayable >= 0 ? '฿' + formatCurrency(netVatPayable) : '-฿' + formatCurrency(Math.abs(netVatPayable))}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-600">
              {netVatPayable >= 0 ? '(ต้องนำส่งสรรพากร ภ.พ. 30)' : '(มีภาษีซื้อยกไปขอคืน)'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>หัก ณ ที่จ่ายรวมที่ถูกหัก/หักไว้:</span>
            <span className="font-mono font-medium text-amber-800">
              ฿{formatCurrency(totalRevenueWht + totalExpenseWht)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveSubTab('pnl')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSubTab === 'pnl'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>งบกำไรขาดทุนเบื้องต้น (P&L Review)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSubTab === 'monthly'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>สรุปรายไตรมาสและ 12 เดือน</span>
          </button>

          <button
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>แจกแจงตามหมวดบัญชี (Categories)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('registry')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSubTab === 'registry'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ทะเบียนใบสำคัญในรอบปี ({fiscalVouchers.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PRELIMINARY P&L STATEMENT */}
      {activeSubTab === 'pnl' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header of P&L Statement */}
          <div className="p-6 bg-slate-50/70 border-b border-slate-200 text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              {companySettings.name}
            </h2>
            <div className="text-sm font-semibold text-slate-700">
              งบกำไรขาดทุนเบื้องต้น (Preliminary Statement of Comprehensive Income)
            </div>
            <div className="text-xs text-slate-500">
              สำหรับรอบระยะเวลาบัญชี สิ้นสุดวันที่ 31 ธันวาคม {thaiBuddhistYear} (หน่วย: บาท)
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Section 1: รายได้ (Revenue) */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-600 text-sm font-bold text-emerald-900">
                <span>1. รายได้ (REVENUES)</span>
                <span>จำนวนเงิน (บาท)</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {revenueByCategory.length > 0 ? (
                  revenueByCategory.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2.5 px-2 hover:bg-slate-50">
                      <span className="text-slate-700 pl-4">{item.category} ({item.count} รายการ)</span>
                      <span className="font-mono font-medium text-slate-900">{formatCurrency(item.totalAmount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-2.5 px-2 text-slate-500 pl-4 italic">
                    ไม่มีรายการรับเงินในรอบปีนี้
                  </div>
                )}
                {/* Total Revenue Line */}
                <div className="flex justify-between py-3 px-2 bg-emerald-50/50 font-bold text-slate-900 text-xs">
                  <span className="text-emerald-900">รวมรายได้ทั้งหมด (Total Revenues)</span>
                  <span className="font-mono text-sm text-emerald-900 underline decoration-double">
                    {formatCurrency(totalRevenueBase)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: ค่าใช้จ่าย (Expenses) */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b-2 border-rose-600 text-sm font-bold text-rose-900">
                <span>2. ต้นทุนและค่าใช้จ่ายในการดำเนินงาน (OPERATING EXPENSES)</span>
                <span>จำนวนเงิน (บาท)</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {expensesByCategory.length > 0 ? (
                  expensesByCategory.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2.5 px-2 hover:bg-slate-50">
                      <span className="text-slate-700 pl-4">{item.category} ({item.count} รายการ)</span>
                      <span className="font-mono font-medium text-slate-900">{formatCurrency(item.totalAmount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-2.5 px-2 text-slate-500 pl-4 italic">
                    ไม่มีรายการจ่ายเงินในรอบปีนี้
                  </div>
                )}
                {/* Total Expenses Line */}
                <div className="flex justify-between py-3 px-2 bg-rose-50/50 font-bold text-slate-900 text-xs">
                  <span className="text-rose-900">รวมค่าใช้จ่ายทั้งหมด (Total Expenses)</span>
                  <span className="font-mono text-sm text-rose-900 underline decoration-double">
                    {formatCurrency(totalExpenseBase)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: กำไร (ขาดทุน) จากการดำเนินงานก่อนภาษีเงินได้ */}
            <div className="p-4 rounded-xl border-2 border-slate-900 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  3. กำไร (ขาดทุน) สุทธิจากการดำเนินงาน (NET OPERATING PROFIT / LOSS)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  ก่อนหักภาษีเงินได้นิติบุคคลประจำปี (EBT)
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl sm:text-2xl font-extrabold font-mono ${
                  netOperatingProfit >= 0 ? 'text-blue-900' : 'text-rose-700'
                }`}>
                  {netOperatingProfit < 0 && '-'}฿{formatCurrency(Math.abs(netOperatingProfit))}
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  (อัตรากำไรสุทธิ: {netProfitMargin.toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* Section 4: ภาษีมูลค่าเพิ่มและภาษีหัก ณ ที่จ่าย เพื่อทบทวนการยื่นแบบ */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>4. ข้อมูลภาษีเพื่อประกอบการยื่นแบบและปิดงบการเงิน (Tax Review & Reconciliation)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px]">ภาษีขายรวมทั้งปี (Output VAT)</div>
                  <div className="font-mono font-bold text-emerald-800 text-sm mt-1">
                    ฿{formatCurrency(totalRevenueVat)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">จากใบสำคัญรับเงินทั้งหมด</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px]">ภาษีซื้อรวมทั้งปี (Input VAT)</div>
                  <div className="font-mono font-bold text-rose-800 text-sm mt-1">
                    ฿{formatCurrency(totalExpenseVat)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">จากใบสำคัญจ่ายเงินทั้งหมด</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px]">ภาษีถูกหัก ณ ที่จ่าย (WHT Receivable)</div>
                  <div className="font-mono font-bold text-blue-800 text-sm mt-1">
                    ฿{formatCurrency(totalRevenueWht)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">นำไปเป็นเครดิตภาษี ภ.ง.ด. 50 ได้</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px]">ภาษีหัก ณ ที่จ่ายนำส่ง (WHT Payable)</div>
                  <div className="font-mono font-bold text-amber-800 text-sm mt-1">
                    ฿{formatCurrency(totalExpenseWht)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">ที่ได้ยื่น ภ.ง.ด. 3/53 ต่อสรรพากร</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: QUARTERLY & 12 MONTHS BREAKDOWN */}
      {activeSubTab === 'monthly' && (
        <div className="space-y-6">
          {/* 4 Quarters Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quarterlyData.map((q, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>{q.quarter}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    q.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {q.margin.toFixed(0)}% margin
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-emerald-800">
                    <span>รายได้ (RV: {q.rvCount} ใบ):</span>
                    <span className="font-mono font-medium">฿{formatCurrency(q.rvBase)}</span>
                  </div>
                  <div className="flex justify-between text-rose-800">
                    <span>ค่าใช้จ่าย (PV: {q.pvCount} ใบ):</span>
                    <span className="font-mono font-medium">฿{formatCurrency(q.pvBase)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                    <span>กำไรสุทธิ:</span>
                    <span className={`font-mono ${q.netProfit >= 0 ? 'text-blue-900' : 'text-rose-700'}`}>
                      {q.netProfit < 0 && '-'}฿{formatCurrency(Math.abs(q.netProfit))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 12 Months Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  ตารางเปรียบเทียบรายได้ ค่าใช้จ่าย และกำไรสุทธิ รายเดือน (ม.ค. - ธ.ค. {thaiBuddhistYear})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  แจกแจงจำนวนเอกสาร ยอดก่อนภาษี และกำไรจากการดำเนินงานแต่ละเดือน
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">เดือน</th>
                    <th className="py-3 px-3 text-center">จน. RV</th>
                    <th className="py-3 px-4 text-right text-emerald-800">รายได้รวม (RV)</th>
                    <th className="py-3 px-3 text-center">จน. PV</th>
                    <th className="py-3 px-4 text-right text-rose-800">ค่าใช้จ่ายรวม (PV)</th>
                    <th className="py-3 px-4 text-right text-slate-900">กำไร / ขาดทุนสุทธิ</th>
                    <th className="py-3 px-4 text-right">มาร์จิ้น (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyData.map((m) => {
                    const margin = m.rvBase > 0 ? (m.netProfit / m.rvBase) * 100 : 0;
                    return (
                      <tr key={m.monthIndex} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {m.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {m.rvCount > 0 ? (
                            <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                              {m.rvCount}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-emerald-900">
                          {m.rvBase > 0 ? formatCurrency(m.rvBase) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {m.pvCount > 0 ? (
                            <span className="bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                              {m.pvCount}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-rose-900">
                          {m.pvBase > 0 ? formatCurrency(m.pvBase) : '-'}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                          m.netProfit >= 0 ? 'text-blue-900' : 'text-rose-700'
                        }`}>
                          {m.rvBase > 0 || m.pvBase > 0 ? (
                            (m.netProfit < 0 ? '-' : '') + formatCurrency(Math.abs(m.netProfit))
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                          {m.rvBase > 0 ? `${margin.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                    <td className="py-3 px-4">รวมทั้งปี ({selectedYear})</td>
                    <td className="py-3 px-3 text-center font-mono">{rvVouchers.length}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-900">{formatCurrency(totalRevenueBase)}</td>
                    <td className="py-3 px-3 text-center font-mono">{pvVouchers.length}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-900">{formatCurrency(totalExpenseBase)}</td>
                    <td className={`py-3 px-4 text-right font-mono ${netOperatingProfit >= 0 ? 'text-blue-900' : 'text-rose-700'}`}>
                      {netOperatingProfit < 0 && '-'}฿{formatCurrency(Math.abs(netOperatingProfit))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{netProfitMargin.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: EXPENSE & REVENUE CATEGORY BREAKDOWN */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">แจกแจงค่าใช้จ่ายตามหมวดบัญชี (PV)</h3>
                  <div className="text-xs text-slate-500">รวม ฿{formatCurrency(totalExpenseBase)} ({expensesByCategory.length} หมวด)</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {expensesByCategory.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {idx + 1}. {item.category}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ฿{formatCurrency(item.totalAmount)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.count} รายการในหมวดนี้</span>
                    <span className="font-mono font-medium">{item.percentage.toFixed(1)}% ของค่าใช้จ่ายรวม</span>
                  </div>
                </div>
              ))}
              {expensesByCategory.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  ไม่มีข้อมูลค่าใช้จ่ายในรอบปีนี้
                </div>
              )}
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">แจกแจงรายได้ตามหมวดบัญชี (RV)</h3>
                  <div className="text-xs text-slate-500">รวม ฿{formatCurrency(totalRevenueBase)} ({revenueByCategory.length} หมวด)</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {revenueByCategory.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {idx + 1}. {item.category}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ฿{formatCurrency(item.totalAmount)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.count} รายการในหมวดนี้</span>
                    <span className="font-mono font-medium">{item.percentage.toFixed(1)}% ของรายได้รวม</span>
                  </div>
                </div>
              ))}
              {revenueByCategory.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  ไม่มีข้อมูลรายได้ในรอบปีนี้
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: FISCAL YEAR VOUCHERS REGISTRY */}
      {activeSubTab === 'registry' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">กรองตามประเภท:</span>
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setRegistryFilterType('ALL')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    registryFilterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ทั้งหมด ({fiscalVouchers.length})
                </button>
                <button
                  onClick={() => setRegistryFilterType('RV')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    registryFilterType === 'RV' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  รับ RV ({rvVouchers.length})
                </button>
                <button
                  onClick={() => setRegistryFilterType('PV')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    registryFilterType === 'PV' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  จ่าย PV ({pvVouchers.length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                placeholder="ค้นหาเลขที่, คู่ค้า, Job No..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center">ประเภท</th>
                  <th className="py-2.5 px-3">เลขที่เอกสาร</th>
                  <th className="py-2.5 px-3">วันที่</th>
                  <th className="py-2.5 px-3">Job No.</th>
                  <th className="py-2.5 px-4">ชื่อคู่ค้า / ลูกค้า</th>
                  <th className="py-2.5 px-3 text-right">ยอดก่อนภาษี</th>
                  <th className="py-2.5 px-3 text-right">VAT 7%</th>
                  <th className="py-2.5 px-3 text-right">หัก ณ ที่จ่าย</th>
                  <th className="py-2.5 px-3 text-right">ยอดสุทธิ</th>
                  <th className="py-2.5 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegistryVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        v.type === 'RV' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {v.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 font-mono">
                      {v.voucherNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {v.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-700">
                      {v.jobNo || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {v.contact?.name || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {formatCurrency(v.subtotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {v.totalVat > 0 ? formatCurrency(v.totalVat) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                      {v.totalWht > 0 ? formatCurrency(v.totalWht) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950">
                      {formatCurrency(v.netPayable)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectVoucherToPrint(v)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition cursor-pointer"
                          title="พิมพ์เอกสาร A4"
                        >
                          พิมพ์ A4
                        </button>
                        <button
                          onClick={() => onEditVoucher(v)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-medium transition cursor-pointer"
                          title="แก้ไขใบสำคัญ"
                        >
                          แก้ไข
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRegistryVouchers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                      ไม่พบรายการใบสำคัญที่ตรงกับเงื่อนไขในรอบปี {selectedYear}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Internal Control & Audit Notice Footnote */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-800">
            หมายเหตุการตรวจสอบงบการเงินและภาษี (Accounting & Audit Notes):
          </div>
          <div>
            ข้อมูลสรุปผลการดำเนินงานนี้ประมวลผลจากใบสำคัญรับเงิน (RV) และใบสำคัญจ่ายเงิน (PV) ที่มีลายมือชื่อผู้มีอำนาจ 4 ฝ่ายตามระบบการควบคุมภายใน ครบถ้วนตามมาตรฐานประมวลรัษฎากรสำหรับประกอบการยื่นแบบ ภ.ง.ด. 50 / ภ.ง.ด. 51 ประจำปี
          </div>
        </div>
      </div>
    </div>
  );
};
