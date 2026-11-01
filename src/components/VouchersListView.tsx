import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Printer, 
  Edit3, 
  Trash2, 
  Copy, 
  Search, 
  Download, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight,
  ExternalLink,
  CheckCircle2,
  Calendar,
  X,
  RotateCcw,
  SlidersHorizontal,
  Building,
  Hash,
  Clock,
  ChevronDown,
  UploadCloud,
  Check,
  Percent,
  CalendarRange,
  Layers,
  Coins,
  Sparkles,
  ShieldCheck,
  FileEdit,
  XCircle,
  HardDrive,
  Calculator
} from 'lucide-react';
import { Voucher, VoucherType, VoucherStatus, ACCOUNT_CATEGORIES } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { isSampleVoucher } from '../utils/storage';
import { AccountingSoftwareExportModal } from './AccountingSoftwareExportModal';

interface VouchersListProps {
  vouchers: Voucher[];
  onSelectVoucherToPrint: (voucher: Voucher) => void;
  onEditVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
  onDuplicateVoucher: (voucher: Voucher) => void;
  onCreatePV: () => void;
  onCreateRV: () => void;
  onOpenImportModal?: () => void;
  onOpenBackupModal?: () => void;
  onPrint50Tawi?: (voucher: Voucher) => void;
  initialSearchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onUpdateVoucherStatus?: (voucherId: string, newStatus: VoucherStatus) => void;
  isSampleEnabled?: boolean;
  onOpenSampleDataModal?: () => void;
  onToggleSampleData?: (enable: boolean) => void;
  onRemoveSampleDataOnly?: () => void;
  onOpenAccountingExportModal?: () => void;
}

export type SearchScope = 'all' | 'jobNo' | 'voucherNo' | 'contact' | 'taxId' | 'description';
export type DatePreset = 'all' | 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
export type StatusFilter = 'ALL' | 'Paid' | 'Pending' | 'Approved' | 'Draft' | 'Cancelled' | 'WithWht' | 'WithVat' | 'Completed';
export type NormalizedStatus = 'Paid' | 'Pending' | 'Approved' | 'Draft' | 'Cancelled';
export type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'voucher_asc';

export const getNormalizedStatus = (statusStr?: string): NormalizedStatus => {
  if (!statusStr) return 'Pending';
  const s = statusStr.toLowerCase();
  if (s.includes('completed') || s.includes('ชำระแล้ว') || s.includes('paid')) {
    return 'Paid';
  }
  if (s.includes('cancelled') || s.includes('ยกเลิก') || s.includes('cancel')) {
    return 'Cancelled';
  }
  if (s.includes('approved') || s.includes('อนุมัติแล้ว')) {
    return 'Approved';
  }
  if (s.includes('draft') || s.includes('ร่าง')) {
    return 'Draft';
  }
  if (s.includes('pending') || s.includes('รออนุมัติ') || s.includes('รอชำระ')) {
    return 'Pending';
  }
  return 'Pending';
};

const formatThaiDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${day} ${thaiMonthsShort[month - 1]} ${year}`;
};

export const VouchersListView: React.FC<VouchersListProps> = ({
  vouchers,
  onSelectVoucherToPrint,
  onEditVoucher,
  onDeleteVoucher,
  onDuplicateVoucher,
  onCreatePV,
  onCreateRV,
  onOpenImportModal,
  onOpenBackupModal,
  onPrint50Tawi,
  initialSearchQuery = '',
  onSearchQueryChange,
  onUpdateVoucherStatus,
  isSampleEnabled = true,
  onOpenSampleDataModal,
  onToggleSampleData,
  onRemoveSampleDataOnly,
  onOpenAccountingExportModal,
}) => {
  // Modal state for Accounting Software Export fallback
  const [isAccountingModalOpen, setIsAccountingModalOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [dataSourceFilter, setDataSourceFilter] = useState<'all' | 'real_only' | 'sample_only'>('all');

  // Sample vs Real data counts
  const sampleCount = useMemo(() => vouchers.filter(isSampleVoucher).length, [vouchers]);
  const realCount = vouchers.length - sampleCount;

  // Sync initialSearchQuery if passed from global search in Navbar
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== searchQuery) {
      setSearchQuery(initialSearchQuery);
      setSearchScope('all');
    }
  }, [initialSearchQuery]);

  const handleUpdateSearch = (val: string) => {
    setSearchQuery(val);
    if (onSearchQueryChange) {
      onSearchQueryChange(val);
    }
  };

  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  // Filter state
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RV' | 'PV'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Counts for document types & status pills
  const typeCounts = useMemo(() => {
    let rv = 0;
    let pv = 0;
    vouchers.forEach((v) => {
      if (v.type === 'RV') rv++;
      else pv++;
    });
    return { rv, pv, total: vouchers.length };
  }, [vouchers]);

  const statusCounts = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let approved = 0;
    let draft = 0;
    let cancelled = 0;
    let withWht = 0;
    let withVat = 0;

    // Scope counts to current typeFilter if RV or PV is selected
    const relevantVouchers = typeFilter === 'ALL'
      ? vouchers
      : vouchers.filter((v) => v.type === typeFilter);

    relevantVouchers.forEach((v) => {
      const norm = getNormalizedStatus(v.status);
      if (norm === 'Paid') paid++;
      else if (norm === 'Pending') pending++;
      else if (norm === 'Approved') approved++;
      else if (norm === 'Draft') draft++;
      else if (norm === 'Cancelled') cancelled++;

      if (v.totalWht > 0) withWht++;
      if (v.totalVat > 0) withVat++;
    });

    return { 
      total: relevantVouchers.length, 
      paid, 
      pending, 
      approved, 
      draft, 
      cancelled, 
      withWht, 
      withVat,
      completed: paid 
    };
  }, [vouchers, typeFilter]);

  const handleToggleStatusFilter = (target: StatusFilter) => {
    if (statusFilter === target && target !== 'ALL') {
      setStatusFilter('ALL');
    } else {
      setStatusFilter(target);
    }
  };

  // Apply Quick Date Presets
  const handleApplyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-based

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const today = now.toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'last_7_days') {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const today = now.toISOString().slice(0, 10);
      setStartDate(past7);
      setEndDate(today);
    } else if (preset === 'this_month') {
      const start = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last_month') {
      const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_quarter') {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(Date.UTC(y, qStartMonth, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(y, qStartMonth + 3, 0)).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
    setDatePreset('custom');
    if (type === 'start') {
      setStartDate(val);
    } else {
      setEndDate(val);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSearchScope('all');
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setDataSourceFilter('all');
    setSortBy('date_desc');
  };

  // Detect whether any filter is actively applied
  const isFiltered = Boolean(
    searchQuery.trim() ||
    startDate ||
    endDate ||
    typeFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    dataSourceFilter !== 'all'
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (typeFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (startDate || endDate) count++;
    if (categoryFilter !== 'ALL') count++;
    if (dataSourceFilter !== 'all') count++;
    return count;
  }, [searchQuery, typeFilter, statusFilter, startDate, endDate, categoryFilter, dataSourceFilter]);

  // Filter and sort vouchers
  const filteredVouchers = useMemo(() => {
    let result = vouchers.filter((v) => {
      // 1. Type filter
      if (typeFilter !== 'ALL' && v.type !== typeFilter) return false;

      // 2. Category filter
      if (categoryFilter !== 'ALL' && !v.items.some((it) => it.accountCategory === categoryFilter)) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'WithWht') {
          if (!(v.totalWht > 0)) return false;
        } else if (statusFilter === 'WithVat') {
          if (!(v.totalVat > 0)) return false;
        } else {
          const norm = getNormalizedStatus(v.status);
          const target = statusFilter === 'Completed' ? 'Paid' : statusFilter;
          if (norm !== target) return false;
        }
      }

      // 4. Date range filter
      if (startDate && v.date < startDate) return false;
      if (endDate && v.date > endDate) return false;

      // 5. Data source filter
      if (dataSourceFilter === 'real_only' && isSampleVoucher(v)) return false;
      if (dataSourceFilter === 'sample_only' && !isSampleVoucher(v)) return false;

      // 5. Search query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        if (searchScope === 'jobNo') {
          const matchJob = v.jobNo && v.jobNo.toLowerCase().includes(q);
          if (!matchJob) return false;
        } else if (searchScope === 'voucherNo') {
          const matchVoucher = 
            v.voucherNo.toLowerCase().includes(q) || 
            (v.referenceNo && v.referenceNo.toLowerCase().includes(q));
          if (!matchVoucher) return false;
        } else if (searchScope === 'contact') {
          const matchContact = 
            v.contact.name.toLowerCase().includes(q) || 
            (v.contact.taxId && v.contact.taxId.includes(q)) ||
            (v.contact.address && v.contact.address.toLowerCase().includes(q));
          if (!matchContact) return false;
        } else if (searchScope === 'taxId') {
          const matchTax = v.contact.taxId && v.contact.taxId.includes(q);
          if (!matchTax) return false;
        } else if (searchScope === 'description') {
          const matchDesc = v.items.some((it) => it.description.toLowerCase().includes(q));
          if (!matchDesc) return false;
        } else {
          // 'all' scope
          const matchAll = 
            (v.jobNo && v.jobNo.toLowerCase().includes(q)) ||
            (v.auditor && v.auditor.toLowerCase().includes(q)) ||
            (v.jobClient && v.jobClient.toLowerCase().includes(q)) ||
            v.voucherNo.toLowerCase().includes(q) ||
            v.contact.name.toLowerCase().includes(q) ||
            (v.referenceNo && v.referenceNo.toLowerCase().includes(q)) ||
            (v.contact.taxId && v.contact.taxId.includes(q)) ||
            (v.contact.address && v.contact.address.toLowerCase().includes(q)) ||
            (v.payment.bankName && v.payment.bankName.toLowerCase().includes(q)) ||
            (v.payment.accountNo && v.payment.accountNo.includes(q)) ||
            v.items.some((it) => 
              it.description.toLowerCase().includes(q) || 
              it.accountCategory.toLowerCase().includes(q)
            );
          if (!matchAll) return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount_desc') return b.netPayable - a.netPayable;
      if (sortBy === 'amount_asc') return a.netPayable - b.netPayable;
      if (sortBy === 'voucher_asc') return a.voucherNo.localeCompare(b.voucherNo);
      return 0;
    });

    return result;
  }, [vouchers, typeFilter, categoryFilter, statusFilter, startDate, endDate, searchQuery, searchScope, sortBy]);

  // Aggregate totals of filtered vouchers
  const totals = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    let wht = 0;
    let net = 0;
    let rvCount = 0;
    let pvCount = 0;

    filteredVouchers.forEach((v) => {
      subtotal += v.subtotal;
      vat += v.totalVat;
      wht += v.totalWht;
      net += v.netPayable;
      if (v.type === 'RV') rvCount++;
      else pvCount++;
    });

    return { subtotal, vat, wht, net, rvCount, pvCount };
  }, [filteredVouchers]);

  // Export current filtered list to CSV
  const handleExportCSV = () => {
    const headers = [
      'เลขที่เอกสาร',
      'ประเภท',
      'วันที่',
      'อ้างอิง',
      'ชื่อคู่ค้า/ลูกค้า',
      'เลขประจำตัวผู้เสียภาษี',
      'หมวดบัญชี',
      'รายละเอียด',
      'ยอดก่อนภาษี',
      'VAT 7%',
      'หัก ณ ที่จ่าย 3%',
      'ยอดสุทธิ',
      'ธนาคาร',
      'สถานะ'
    ];

    const rows = filteredVouchers.map((v) => [
      `"${v.voucherNo}"`,
      `"${v.type}"`,
      `"${v.date}"`,
      `"${v.referenceNo || ''}"`,
      `"${v.contact.name.replace(/"/g, '""')}"`,
      `"${v.contact.taxId || ''}"`,
      `"${v.items[0]?.accountCategory || ''}"`,
      `"${(v.items[0]?.description || '').replace(/"/g, '""')}"`,
      v.subtotal,
      v.totalVat,
      v.totalWht,
      v.netPayable,
      `"${v.payment.bankName} ${v.payment.accountNo}"`,
      `"${v.status}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Account_Planet_Vouchers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-prompt">
                รายการใบสำคัญรับ (RV) และใบสำคัญจ่าย (PV)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-11">
              จัดเก็บข้อมูล Live Artifacts พร้อมคำนวณหัก ณ ที่จ่าย 3% อัตโนมัติ สามารถค้นหา กรองข้อมูล พิมพ์ A4 หรือส่งออก CSV ได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenImportModal && (
              <button
                onClick={onOpenImportModal}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer"
                title="นำเข้าไฟล์ Excel (.xlsx, .xls), CSV หรือ JSON เข้าสู่ระบบ"
              >
                <UploadCloud className="w-4 h-4 text-blue-600" />
                <span>นำเข้าข้อมูลจริง (Excel/CSV)</span>
              </button>
            )}

            {onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer"
                title="สำรองข้อมูลลงเครื่องคอมพิวเตอร์ (.json) หรือกู้คืนฐานข้อมูล"
              >
                <HardDrive className="w-4 h-4 text-indigo-600" />
                <span>สำรองข้อมูล (Backup)</span>
              </button>
            )}

            {onOpenSampleDataModal && (
              <button
                type="button"
                onClick={onOpenSampleDataModal}
                className={`flex items-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer ${
                  isSampleEnabled && sampleCount > 0
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                }`}
                title="จัดการข้อมูลตัวอย่าง เปิด/ปิด หรือลบตัวอย่างเพื่อเริ่มใช้งานจริง"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{isSampleEnabled && sampleCount > 0 ? `ข้อมูลตัวอย่าง (${sampleCount})` : 'โหมดข้อมูลจริง'}</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>ส่งออก CSV ทั่วไป ({filteredVouchers.length})</span>
            </button>

            {/* Accounting Software CSV Export (Express / PEAK) */}
            <button
              onClick={onOpenAccountingExportModal || (() => setIsAccountingModalOpen(true))}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
              title="ส่งออกใบสำคัญสำหรับโปรแกรมบัญชี Express หรือ PEAK (เลือกเดือนปัจจุบัน)"
            >
              <Calculator className="w-4 h-4 text-blue-200" />
              <span>ส่งออก Express / PEAK</span>
            </button>

            <button
              onClick={onCreatePV}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>+ ออกใบสำคัญจ่าย (PV)</span>
            </button>

            <button
              onClick={onCreateRV}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ ออกใบสำคัญรับ (RV)</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
          {/* Main Search Bar & Document Type Selection */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Primary Search Bar */}
            <div className="relative flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleUpdateSearch(e.target.value)}
                  placeholder={
                    searchScope === 'jobNo'
                      ? 'ค้นหาเฉพาะเลขที่งาน เช่น 70001, JOB-01...'
                      : searchScope === 'voucherNo'
                      ? 'ค้นหาเฉพาะเลขที่ใบสำคัญ เช่น PV202603-001, RV202603-001...'
                      : searchScope === 'contact'
                      ? 'ค้นหาเฉพาะชื่อคู่ค้า, บริษัท, ลูกค้า, หรือที่อยู่...'
                      : searchScope === 'taxId'
                      ? 'ค้นหาเฉพาะเลขประจำตัวผู้เสียภาษี 13 หลัก...'
                      : searchScope === 'description'
                      ? 'ค้นหาเฉพาะคำอธิบายรายการ...'
                      : 'ค้นหา Job No. เช่น 70001, เลขที่เอกสาร, ชื่อบริษัท, ลูกค้า, เลข 13 หลัก, หรือหมวดบัญชี...'
                  }
                  className="w-full pl-10 pr-24 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-xs transition"
                />
                <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      onClick={() => handleUpdateSearch('')}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
                      title="ล้างข้อความค้นหา"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-[11px] font-medium font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {filteredVouchers.length} ฉบับ
                  </span>
                </div>
              </div>
            </div>

            {/* Document Type Selector (All, RV, PV) */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start lg:self-auto flex-shrink-0">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>เอกสารทั้งหมด</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  typeFilter === 'ALL' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {typeCounts.total}
                </span>
              </button>

              <button
                onClick={() => setTypeFilter('RV')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  typeFilter === 'RV'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>รับ (RV)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  typeFilter === 'RV' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {typeCounts.rv}
                </span>
              </button>

              <button
                onClick={() => setTypeFilter('PV')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  typeFilter === 'PV'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>จ่าย (PV)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  typeFilter === 'PV' ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-700'
                }`}>
                  {typeCounts.pv}
                </span>
              </button>
            </div>

            {/* Data Source Selector (When sample data exists in database) */}
            {sampleCount > 0 && (
              <div className="flex items-center p-1 bg-amber-50/80 rounded-xl border border-amber-200 self-start lg:self-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setDataSourceFilter('all')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    dataSourceFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-amber-900/80 hover:text-amber-950'
                  }`}
                >
                  <span>รวมทั้งหมด</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 text-amber-800">
                    {vouchers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDataSourceFilter('real_only')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    dataSourceFilter === 'real_only'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-800 hover:bg-emerald-100/50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ข้อมูลจริง</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    dataSourceFilter === 'real_only' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {realCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDataSourceFilter('sample_only')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    dataSourceFilter === 'sample_only'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-800 hover:bg-amber-100/50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ตัวอย่าง</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    dataSourceFilter === 'sample_only' ? 'bg-amber-700 text-amber-100' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {sampleCount}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Search Scopes Bar */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-medium text-slate-500 mr-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" />
              ขอบเขตการค้นหา:
            </span>
            {[
              { key: 'all', label: 'ทุกช่องข้อมูล' },
              { key: 'jobNo', label: 'เลขที่งาน (Job No.) เช่น 70001' },
              { key: 'voucherNo', label: 'เลขที่ใบสำคัญ / เลขอ้างอิง' },
              { key: 'contact', label: 'ชื่อบริษัท / ลูกค้า / ผู้รับเงิน' },
              { key: 'taxId', label: 'เลขประจำตัวผู้เสียภาษี 13 หลัก' },
              { key: 'description', label: 'รายละเอียดรายการบัญชี' },
            ].map((scope) => (
              <button
                key={scope.key}
                onClick={() => setSearchScope(scope.key as SearchScope)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                  searchScope === scope.key
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {scope.label}
              </button>
            ))}
          </div>

          {/* Filter Toolbar: Status Chips + Date Range + Category + Sort */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/90 space-y-3">
            {/* Status Filter Chips Header & Bar */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  <span>ตัวกรองสถานะใบสำคัญ (Status Filter Chips):</span>
                  {typeFilter !== 'ALL' && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      (แสดงตาม {typeFilter === 'RV' ? 'ใบสำคัญรับ RV' : 'ใบสำคัญจ่าย PV'})
                    </span>
                  )}
                </div>

                {/* Sort Order Control */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-slate-500 font-medium">เรียงตาม:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="py-1 px-2.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                  >
                    <option value="date_desc">วันที่: ล่าสุดก่อน</option>
                    <option value="date_asc">วันที่: เก่าสุดก่อน</option>
                    <option value="amount_desc">ยอดเงิน: มากไปน้อย</option>
                    <option value="amount_asc">ยอดเงิน: น้อยไปมาก</option>
                    <option value="voucher_asc">เลขที่ใบสำคัญ: ก-ฮ</option>
                  </select>
                </div>
              </div>

              {/* Status Chips Row */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                {[
                  {
                    id: 'ALL' as StatusFilter,
                    label: 'ทั้งหมด',
                    count: statusCounts.total,
                    icon: <Layers className="w-3.5 h-3.5" />,
                    activeClass: 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/20',
                    inactiveClass: 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    activeBadge: 'bg-white/20 text-white',
                    inactiveBadge: 'bg-slate-100 text-slate-700',
                  },
                  {
                    id: 'Paid' as StatusFilter,
                    label: 'ชำระแล้ว (Paid)',
                    count: statusCounts.paid,
                    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/20',
                    inactiveClass: 'bg-white text-emerald-800 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/70',
                    activeBadge: 'bg-emerald-700/90 text-white',
                    inactiveBadge: 'bg-emerald-100 text-emerald-800 font-semibold',
                  },
                  {
                    id: 'Pending' as StatusFilter,
                    label: 'รอชำระ (Pending)',
                    count: statusCounts.pending,
                    icon: <Clock className="w-3.5 h-3.5" />,
                    activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-600/20',
                    inactiveClass: 'bg-white text-amber-800 border-amber-200 hover:border-amber-300 hover:bg-amber-50/70',
                    activeBadge: 'bg-amber-700/90 text-white',
                    inactiveBadge: 'bg-amber-100 text-amber-800 font-semibold',
                  },
                  {
                    id: 'Approved' as StatusFilter,
                    label: 'อนุมัติแล้ว (Approved)',
                    count: statusCounts.approved,
                    icon: <ShieldCheck className="w-3.5 h-3.5" />,
                    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-600/20',
                    inactiveClass: 'bg-white text-blue-800 border-blue-200 hover:border-blue-300 hover:bg-blue-50/70',
                    activeBadge: 'bg-blue-700/90 text-white',
                    inactiveBadge: 'bg-blue-100 text-blue-800 font-semibold',
                  },
                  {
                    id: 'Draft' as StatusFilter,
                    label: 'ฉบับร่าง (Draft)',
                    count: statusCounts.draft,
                    icon: <FileEdit className="w-3.5 h-3.5" />,
                    activeClass: 'bg-slate-700 text-white border-slate-700 shadow-xs ring-2 ring-slate-700/20',
                    inactiveClass: 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70',
                    activeBadge: 'bg-slate-800 text-white',
                    inactiveBadge: 'bg-slate-100 text-slate-700 font-semibold',
                  },
                  {
                    id: 'Cancelled' as StatusFilter,
                    label: 'ยกเลิก (Cancelled)',
                    count: statusCounts.cancelled,
                    icon: <XCircle className="w-3.5 h-3.5" />,
                    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-600/20',
                    inactiveClass: 'bg-white text-rose-800 border-rose-200 hover:border-rose-300 hover:bg-rose-50/70',
                    activeBadge: 'bg-rose-700/90 text-white',
                    inactiveBadge: 'bg-rose-100 text-rose-800 font-semibold',
                  },
                ].map((chip) => {
                  const isActive = statusFilter === chip.id || (chip.id === 'Paid' && statusFilter === 'Completed');
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleToggleStatusFilter(chip.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                        isActive ? chip.activeClass : chip.inactiveClass
                      }`}
                      title={`คลิกเพื่อกรองเฉพาะเอกสารสถานะ ${chip.label} (คลิกซ้ำเพื่อยกเลิก)`}
                    >
                      <span className={isActive ? 'text-white' : ''}>{chip.icon}</span>
                      <span>{chip.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? chip.activeBadge : chip.inactiveBadge
                        }`}
                      >
                        {chip.count}
                      </span>
                    </button>
                  );
                })}

                {/* Subtle vertical divider */}
                <div className="h-5 w-px bg-slate-300 shrink-0 mx-0.5" />

                {/* Quick Tax chips */}
                {[
                  {
                    id: 'WithWht' as StatusFilter,
                    label: 'มีหัก ณ ที่จ่าย 3%',
                    count: statusCounts.withWht,
                    icon: <Percent className="w-3.5 h-3.5" />,
                    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-600/20',
                    inactiveClass: 'bg-white text-purple-800 border-purple-200 hover:border-purple-300 hover:bg-purple-50/70',
                    activeBadge: 'bg-purple-700/90 text-white',
                    inactiveBadge: 'bg-purple-100 text-purple-800 font-semibold',
                  },
                  {
                    id: 'WithVat' as StatusFilter,
                    label: 'มี VAT 7%',
                    count: statusCounts.withVat,
                    icon: <Sparkles className="w-3.5 h-3.5" />,
                    activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-600/20',
                    inactiveClass: 'bg-white text-indigo-800 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/70',
                    activeBadge: 'bg-indigo-700/90 text-white',
                    inactiveBadge: 'bg-indigo-100 text-indigo-800 font-semibold',
                  },
                ].map((chip) => {
                  const isActive = statusFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleToggleStatusFilter(chip.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                        isActive ? chip.activeClass : chip.inactiveClass
                      }`}
                      title={`คลิกเพื่อกรองเอกสาร ${chip.label} (คลิกซ้ำเพื่อยกเลิก)`}
                    >
                      <span className={isActive ? 'text-white' : ''}>{chip.icon}</span>
                      <span>{chip.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? chip.activeBadge : chip.inactiveBadge
                        }`}
                      >
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range Picker Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/70">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                  <span>ช่วงวันที่:</span>
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                  {[
                    { key: 'all', label: 'ทั้งหมด' },
                    { key: 'today', label: 'วันนี้' },
                    { key: 'last_7_days', label: '7 วันล่าสุด' },
                    { key: 'this_month', label: 'เดือนนี้' },
                    { key: 'last_month', label: 'เดือนที่แล้ว' },
                    { key: 'this_quarter', label: 'ไตรมาสนี้' },
                    { key: 'this_year', label: 'ปีนี้' },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => handleApplyDatePreset(preset.key as DatePreset)}
                      className={`px-2 py-1 text-[11px] rounded-md font-medium transition cursor-pointer ${
                        datePreset === preset.key && (preset.key !== 'all' || (!startDate && !endDate))
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Explicit Start & End Date Inputs */}
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">จาก:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleCustomDateChange('start', e.target.value)}
                    className="text-xs text-slate-700 focus:outline-none font-mono cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400">―</span>
                  <span className="text-[11px] text-slate-500 font-medium">ถึง:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleCustomDateChange('end', e.target.value)}
                    className="text-xs text-slate-700 focus:outline-none font-mono cursor-pointer"
                  />
                  {(startDate || endDate) && (
                    <button
                      onClick={() => handleApplyDatePreset('all')}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition ml-1"
                      title="ล้างช่วงวันที่"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Thai Formatted Date Range Preview */}
                {(startDate || endDate) && (
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                    {startDate && formatThaiDateDisplay(startDate)}
                    {startDate && endDate && ' ― '}
                    {endDate && formatThaiDateDisplay(endDate)}
                  </span>
                )}
              </div>

              {/* Category Filter & Reset */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600 font-medium">หมวดบัญชี:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="py-1.5 px-2.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[190px] truncate"
                  >
                    <option value="ALL">ทุกหมวดบัญชี</option>
                    {ACCOUNT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {isFiltered && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
                    title="ล้างตัวกรองและคำค้นหาทั้งหมด"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างทั้งหมด ({activeFiltersCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Tag Pills */}
            {isFiltered && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-200/60 text-xs">
                <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  กำลังกรอง ({activeFiltersCount} เงื่อนไข):
                </span>

                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-md text-[11px] font-medium border border-blue-200">
                    <span>
                      {searchScope === 'jobNo' ? 'Job No: ' : searchScope === 'voucherNo' ? 'เลขที่: ' : searchScope === 'contact' ? 'คู่ค้า/ลูกค้า: ' : searchScope === 'taxId' ? 'เลขภาษี: ' : searchScope === 'description' ? 'รายการ: ' : 'ค้นหา: '}
                      "{searchQuery}"
                    </span>
                    <button onClick={() => setSearchQuery('')} className="hover:text-blue-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {typeFilter !== 'ALL' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                    typeFilter === 'RV' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <span>ประเภท: {typeFilter === 'RV' ? 'ใบสำคัญรับ (RV)' : 'ใบสำคัญจ่าย (PV)'}</span>
                    <button onClick={() => setTypeFilter('ALL')} className="cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md text-[11px] font-medium border border-slate-300">
                    <span>
                      สถานะ: {
                        statusFilter === 'Paid' || statusFilter === 'Completed' ? 'ชำระแล้ว (Paid)' : 
                        statusFilter === 'Pending' ? 'รอชำระ (Pending)' : 
                        statusFilter === 'Approved' ? 'อนุมัติแล้ว (Approved)' :
                        statusFilter === 'Draft' ? 'ฉบับร่าง (Draft)' :
                        statusFilter === 'Cancelled' ? 'ยกเลิก (Cancelled)' :
                        statusFilter === 'WithWht' ? 'มีหัก ณ ที่จ่าย 3%' : 
                        'มี VAT 7%'
                      }
                    </span>
                    <button onClick={() => setStatusFilter('ALL')} className="cursor-pointer hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(startDate || endDate) && (
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-md text-[11px] font-medium border border-indigo-200">
                    <span>วันที่: {startDate ? formatThaiDateDisplay(startDate) : 'เริ่มต้น'} ถึง {endDate ? formatThaiDateDisplay(endDate) : 'ปัจจุบัน'}</span>
                    <button onClick={() => handleApplyDatePreset('all')} className="hover:text-indigo-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {categoryFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-md text-[11px] font-medium border border-amber-200">
                    <span>หมวด: {categoryFilter}</span>
                    <button onClick={() => setCategoryFilter('ALL')} className="hover:text-amber-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats of Filtered Result */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="border-r border-slate-100 pr-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            ผลการค้นหา
          </span>
          <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-baseline gap-1">
            <span className="font-mono text-blue-600">{filteredVouchers.length}</span>
            <span className="text-xs text-slate-500 font-normal">/ {vouchers.length} ฉบับ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            RV: {totals.rvCount} | PV: {totals.pvCount}
          </div>
        </div>

        <div className="border-r border-slate-100 pr-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            ยอดรวมสุทธิ (Net)
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            ฿{formatCurrency(totals.net)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ก่อนภาษี: ฿{formatCurrency(totals.subtotal)}
          </div>
        </div>

        <div className="border-r border-slate-100 pr-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            ภาษีหัก ณ ที่จ่าย 3%
          </span>
          <div className="text-lg font-bold font-mono text-amber-800 mt-0.5">
            ฿{formatCurrency(totals.wht)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            หักจากรายการที่กรอง
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            ภาษีมูลค่าเพิ่ม VAT 7%
          </span>
          <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
            ฿{formatCurrency(totals.vat)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ภาษีซื้อ/ภาษีขายในรายการ
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs">
                <th className="py-3 px-3 w-28 whitespace-nowrap">เลขที่เอกสาร</th>
                <th className="py-3 px-3 w-24 whitespace-nowrap">วันที่</th>
                <th className="py-3 px-3 min-w-[180px] whitespace-nowrap">คู่ค้า / ลูกค้า / ผู้รับเงิน</th>
                <th className="py-3 px-3 min-w-[200px] whitespace-nowrap">หมวดบัญชี & รายละเอียด</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">ยอดก่อนภาษี</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">VAT 7%</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">หัก ณ ที่จ่าย 3%</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">ยอดสุทธิ (Net)</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">สถานะ</th>
                <th className="py-3 px-3 text-center w-36 whitespace-nowrap">พิมพ์ / จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-500">
                    {vouchers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto py-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div className="text-center">
                          <h4 className="font-bold text-slate-800 text-base">ยังไม่มีรายการใบสำคัญในระบบ</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            ระบบทำงานในโหมดจริง (ไม่มีข้อมูลตัวอย่าง) พร้อมสำหรับการลงบัญชีกิจการ 
                            ท่านสามารถเริ่มสร้างใบสำคัญใหม่ นำเข้าไฟล์จริง หรือเปิดข้อมูลตัวอย่างกลับมาได้ตลอดเวลา
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
                          <button
                            type="button"
                            onClick={onCreateRV}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition cursor-pointer"
                          >
                            <ArrowDownLeft className="w-4 h-4" />
                            <span>+ ออกใบสำคัญรับ (RV)</span>
                          </button>
                          <button
                            type="button"
                            onClick={onCreatePV}
                            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition cursor-pointer"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                            <span>+ ออกใบสำคัญจ่าย (PV)</span>
                          </button>
                          {onOpenImportModal && (
                            <button
                              type="button"
                              onClick={onOpenImportModal}
                              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
                            >
                              <UploadCloud className="w-4 h-4 text-blue-600" />
                              <span>นำเข้าไฟล์ (Excel/CSV)</span>
                            </button>
                          )}
                          {onToggleSampleData && (
                            <button
                              type="button"
                              onClick={() => onToggleSampleData(true)}
                              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4 text-amber-500" />
                              <span>เปิดข้อมูลตัวอย่าง</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Search className="w-6 h-6" />
                        </div>
                        <span className="font-semibold text-slate-700 text-sm">
                          {statusFilter !== 'ALL'
                            ? `ไม่พบใบสำคัญที่มีสถานะ "${
                                statusFilter === 'Paid' || statusFilter === 'Completed' ? 'ชำระแล้ว (Paid)' :
                                statusFilter === 'Pending' ? 'รอชำระ (Pending)' :
                                statusFilter === 'Approved' ? 'อนุมัติแล้ว (Approved)' :
                                statusFilter === 'Draft' ? 'ฉบับร่าง (Draft)' :
                                statusFilter === 'Cancelled' ? 'ยกเลิก (Cancelled)' :
                                statusFilter === 'WithWht' ? 'มีหัก ณ ที่จ่าย 3%' :
                                statusFilter === 'WithVat' ? 'มี VAT 7%' : statusFilter
                              }"`
                            : 'ไม่พบข้อมูลใบสำคัญที่ตรงกับเงื่อนไขการค้นหา'}
                        </span>
                        <p className="text-xs text-slate-400 max-w-sm">
                          {statusFilter !== 'ALL'
                            ? 'ลองเลือกตัวกรองสถานะอื่น หรือคลิกปุ่ม "แสดงทุกสถานะ" ด้านล่างเพื่อดูเอกสารทั้งหมด'
                            : 'ลองเปลี่ยนคำค้นหา ปรับเปลี่ยนช่วงวันที่ หรือกดปุ่ม "ล้างตัวกรอง" เพื่อแสดงรายการทั้งหมด'}
                        </p>
                        {statusFilter !== 'ALL' && (
                          <button
                            onClick={() => setStatusFilter('ALL')}
                            className="mt-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>แสดงทุกสถานะ (รีเซ็ตตัวกรองสถานะ)</span>
                          </button>
                        )}
                        {isFiltered && statusFilter === 'ALL' && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                          >
                            ล้างตัวกรองทั้งหมด
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((voucher) => {
                  const isRV = voucher.type === 'RV';
                  const isSample = isSampleVoucher(voucher);
                  return (
                    <tr key={voucher.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold font-mono text-slate-900">{voucher.voucherNo}</div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isRV ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isRV ? 'RV (รับ)' : 'PV (จ่าย)'}
                          </span>
                          {isSample && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300"
                              title="ข้อมูลตัวอย่างสำหรับการทดลองใช้"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                              <span>ตัวอย่าง</span>
                            </span>
                          )}
                          {voucher.jobNo && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300"
                              title={`เลขที่งาน (Job No.): ${voucher.jobNo}`}
                            >
                              Job: {voucher.jobNo}
                            </span>
                          )}
                        </div>
                        {voucher.referenceNo && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5" title={`อ้างอิง: ${voucher.referenceNo}`}>
                            อ้างอิง: {voucher.referenceNo}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-mono">
                        {voucher.date}
                      </td>

                      <td className="py-3 px-3 min-w-[180px] max-w-[240px]">
                        <div className="font-semibold text-slate-900 break-words leading-snug">{voucher.contact.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <span>เลข 13 หลัก:</span>
                          <span>{voucher.contact.taxId || '-'}</span>
                        </div>
                        {voucher.type === 'PV' && voucher.auditor && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 truncate max-w-[220px]" title={`ผู้สอบบัญชี: ${voucher.auditor}`}>
                            <span className="font-semibold shrink-0">ผู้สอบ:</span>
                            <span className="truncate">{voucher.auditor}</span>
                          </div>
                        )}
                        {voucher.type === 'RV' && voucher.jobClient && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 truncate max-w-[220px]" title={`ลูกค้าส่งงาน: ${voucher.jobClient}`}>
                            <span className="font-semibold shrink-0">ส่งงาน:</span>
                            <span className="truncate">{voucher.jobClient}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 min-w-[200px] max-w-xs">
                        <div className="font-medium text-slate-800 line-clamp-2 leading-relaxed" title={voucher.items[0]?.description}>
                          {voucher.items[0]?.description || '-'}
                        </div>
                        <span className="inline-block text-[11px] text-blue-700 font-medium bg-blue-50/70 px-1.5 py-0.5 rounded mt-0.5">
                          {voucher.items[0]?.accountCategory || '-'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(voucher.subtotal)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {voucher.totalVat > 0 ? formatCurrency(voucher.totalVat) : '-'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-amber-800 font-medium">
                        {voucher.totalWht > 0 ? `-${formatCurrency(voucher.totalWht)}` : '-'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(voucher.netPayable)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {(() => {
                          const normStatus = getNormalizedStatus(voucher.status);
                          return onUpdateVoucherStatus ? (
                            <div className="relative inline-block text-left">
                              <select
                                value={voucher.status}
                                onChange={(e) => onUpdateVoucherStatus(voucher.id, e.target.value as VoucherStatus)}
                                className={`text-[11px] font-semibold rounded-full pl-2.5 pr-6 py-1 border cursor-pointer focus:outline-none transition appearance-none ${
                                  normStatus === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80'
                                    : normStatus === 'Pending'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/80'
                                    : normStatus === 'Approved'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100/80'
                                    : normStatus === 'Draft'
                                    ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/80'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 line-through hover:bg-rose-100/80'
                                }`}
                                title="คลิกเพื่อเปลี่ยนสถานะเอกสาร"
                              >
                                <option value="ชำระแล้ว (Completed)">ชำระแล้ว (Paid)</option>
                                <option value="รออนุมัติ (Pending)">รอชำระ (Pending)</option>
                                <option value="อนุมัติแล้ว (Approved)">อนุมัติแล้ว (Approved)</option>
                                <option value="ร่าง (Draft)">ฉบับร่าง (Draft)</option>
                                <option value="ยกเลิก (Cancelled)">ยกเลิก (Cancelled)</option>
                              </select>
                              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatusFilter(normStatus)}
                              className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold border cursor-pointer hover:opacity-85 transition shadow-2xs ${
                                normStatus === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : normStatus === 'Pending'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : normStatus === 'Approved'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : normStatus === 'Draft'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300 line-through'
                              }`}
                              title={`คลิกเพื่อกรองเอกสารสถานะ ${voucher.status}`}
                            >
                              <span>{voucher.status}</span>
                            </button>
                          );
                        })()}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectVoucherToPrint(voucher)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="พิมพ์เอกสารใบสำคัญ A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {voucher.type === 'PV' && onPrint50Tawi && (
                            <button
                              onClick={() => onPrint50Tawi(voucher)}
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition cursor-pointer"
                              title="พิมพ์หนังสือรับรองหัก ณ ที่จ่าย 50 ทวิ"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditVoucher(voucher)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDuplicateVoucher(voucher)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="คัดลอกสร้างใหม่"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteVoucher(voucher.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="ลบเอกสาร"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accounting Software Export Modal Fallback */}
      <AccountingSoftwareExportModal
        isOpen={isAccountingModalOpen}
        onClose={() => setIsAccountingModalOpen(false)}
        vouchers={vouchers}
      />
    </div>
  );
};
