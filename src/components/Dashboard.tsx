import React, { useState, useMemo } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Percent, 
  RefreshCw, 
  ExternalLink, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Edit3, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search,
  ChevronRight,
  TrendingUp,
  Download,
  AlertCircle,
  UploadCloud,
  LineChart,
  BarChart3,
  Share2,
  Check,
  Link,
  Shield,
  Eye,
  Lock,
  HardDrive,
  Sparkles,
  Cloud,
  Calculator,
  PieChart,
  Building2
} from 'lucide-react';
import { Voucher, GoogleSheetSyncConfig, ACCOUNT_CATEGORIES, CompanySettings } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { RvMonthlyRevenueChart } from './RvMonthlyRevenueChart';
import { YearlyTrendAnalysisChart } from './YearlyTrendAnalysisChart';
import { MonthlyCashFlowBarChart } from './MonthlyCashFlowBarChart';
import { CurrentMonthPvCategoryPieChart } from './CurrentMonthPvCategoryPieChart';
import { DashboardPdfReportModal } from './DashboardPdfReportModal';
import { DEFAULT_COMPANY_SETTINGS, isSampleVoucher } from '../utils/storage';

interface DashboardProps {
  vouchers: Voucher[];
  sheetConfig: GoogleSheetSyncConfig;
  companySettings?: CompanySettings;
  onUpdateSheetConfig: (config: GoogleSheetSyncConfig) => void;
  onSyncSheet: () => void;
  isSyncing: boolean;
  onSelectVoucherToPrint: (voucher: Voucher) => void;
  onEditVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
  onDuplicateVoucher: (voucher: Voucher) => void;
  onCreatePV: () => void;
  onCreateRV: () => void;
  onLoadSampleData: () => void;
  onOpenWhtReport?: () => void;
  onOpenAnnualSummary?: () => void;
  onOpenImportModal?: () => void;
  onOpenBackupModal?: () => void;
  onNavigateToVouchers?: () => void;
  isReadOnly?: boolean;
  onExitReadOnly?: () => void;
  hideAdminButton?: boolean;
  isSampleEnabled?: boolean;
  onOpenSampleDataModal?: () => void;
  onToggleSampleData?: (enable: boolean) => void;
  onRemoveSampleDataOnly?: () => void;
  onOpenFirebaseSyncModal?: () => void;
  onOpenAccountingExportModal?: () => void;
  onOpenCustomerDirectory?: () => void;
  customerCount?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  vouchers,
  sheetConfig,
  companySettings,
  onUpdateSheetConfig,
  onSyncSheet,
  isSyncing,
  onSelectVoucherToPrint,
  onEditVoucher,
  onDeleteVoucher,
  onDuplicateVoucher,
  onCreatePV,
  onCreateRV,
  onLoadSampleData,
  onOpenWhtReport,
  onOpenAnnualSummary,
  onOpenImportModal,
  onOpenBackupModal,
  onNavigateToVouchers,
  isReadOnly = false,
  onExitReadOnly,
  hideAdminButton = false,
  isSampleEnabled = true,
  onOpenSampleDataModal,
  onToggleSampleData,
  onRemoveSampleDataOnly,
  onOpenFirebaseSyncModal,
  onOpenAccountingExportModal,
  onOpenCustomerDirectory,
  customerCount = 0,
}) => {
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetSettingsOpen, setIsSheetSettingsOpen] = useState(false);
  const [tempSheetUrl, setTempSheetUrl] = useState(sheetConfig.sheetUrl);
  const [chartViewMode, setChartViewMode] = useState<'cashflow' | 'pv_pie' | 'trend' | 'rv_bar' | 'all'>('cashflow');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hideAdminInShareLink, setHideAdminInShareLink] = useState(true);

  const sampleVouchersCount = vouchers.filter(isSampleVoucher).length;
  const realVouchersCount = vouchers.length - sampleVouchersCount;

  const getShareUrl = () => {
    const base = `${window.location.origin}${window.location.pathname}?view=shared-dashboard`;
    return hideAdminInShareLink ? `${base}&hide_admin=true` : base;
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // Overall Financial Calculations
  const stats = useMemo(() => {
    let totalReceived = 0;
    let totalPaid = 0;
    let totalWhtDeducted = 0; // WHT from RV (customer withheld from us)
    let totalWhtWithheld = 0; // WHT from PV (we withheld from vendor/CPA, must submit to RD)
    let rvCount = 0;
    let pvCount = 0;

    vouchers.forEach((v) => {
      if (v.type === 'RV') {
        totalReceived += v.netPayable;
        totalWhtDeducted += v.totalWht;
        rvCount++;
      } else {
        totalPaid += v.netPayable;
        totalWhtWithheld += v.totalWht;
        pvCount++;
      }
    });

    const netOperating = totalReceived - totalPaid;

    return {
      totalReceived,
      totalPaid,
      netOperating,
      totalWhtDeducted,
      totalWhtWithheld,
      totalWhtCombined: totalWhtDeducted + totalWhtWithheld,
      rvCount,
      pvCount,
      totalCount: vouchers.length,
    };
  }, [vouchers]);

  // Monthly Breakdown
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; rv: number; pv: number; wht: number; net: number; count: number }>();

    vouchers.forEach((v) => {
      const monthKey = v.date ? v.date.slice(0, 7) : '2026-09';
      if (!map.has(monthKey)) {
        map.set(monthKey, { month: monthKey, rv: 0, pv: 0, wht: 0, net: 0, count: 0 });
      }
      const cur = map.get(monthKey)!;
      cur.count++;
      cur.wht += v.totalWht;
      if (v.type === 'RV') {
        cur.rv += v.netPayable;
        cur.net += v.netPayable;
      } else {
        cur.pv += v.netPayable;
        cur.net -= v.netPayable;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [vouchers]);

  // Account Categories Breakdown
  const categoryData = useMemo(() => {
    const map = new Map<string, { category: string; rvTotal: number; pvTotal: number; whtTotal: number; count: number }>();

    vouchers.forEach((v) => {
      v.items.forEach((item) => {
        const cat = item.accountCategory || 'หมวดอื่นๆ';
        if (!map.has(cat)) {
          map.set(cat, { category: cat, rvTotal: 0, pvTotal: 0, whtTotal: 0, count: 0 });
        }
        const cur = map.get(cat)!;
        cur.count++;
        cur.whtTotal += item.whtAmount;
        if (v.type === 'RV') {
          cur.rvTotal += item.netAmount;
        } else {
          cur.pvTotal += item.netAmount;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => (b.rvTotal + b.pvTotal) - (a.rvTotal + a.pvTotal));
  }, [vouchers]);

  // Filtered Vouchers List
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchMonth = selectedMonthFilter === 'all' || (v.date && v.date.startsWith(selectedMonthFilter));
      const matchCat =
        selectedCategoryFilter === 'all' ||
        v.items.some((it) => it.accountCategory === selectedCategoryFilter);
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        v.voucherNo.toLowerCase().includes(query) ||
        v.contact.name.toLowerCase().includes(query) ||
        (v.referenceNo && v.referenceNo.toLowerCase().includes(query)) ||
        (v.contact.taxId && v.contact.taxId.includes(query));

      return matchMonth && matchCat && matchQuery;
    });
  }, [vouchers, selectedMonthFilter, selectedCategoryFilter, searchQuery]);

  const handleSaveSheetUrl = () => {
    const match = tempSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const id = match && match[1] ? match[1] : sheetConfig.sheetId;
    onUpdateSheetConfig({
      ...sheetConfig,
      sheetUrl: tempSheetUrl,
      sheetId: id,
    });
    setIsSheetSettingsOpen(false);
  };

  const formatMonthTh = (ym: string) => {
    if (!ym || ym.length < 7) return ym;
    const [y, m] = ym.split('-');
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const monthIdx = parseInt(m, 10) - 1;
    const thaiYear = parseInt(y, 10) + 543;
    return `${thaiMonths[monthIdx]} ${thaiYear}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Read-Only Shared Mode Banner */}
      {isReadOnly && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-blue-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wide">มุมมองแดชบอร์ดสรุปการเงิน (โหมดแชร์เพื่อดูอย่างเดียว - Shared Read-Only View)</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ปลอดภัย
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                ลิงก์นี้เปิดให้เข้าดูเฉพาะภาพรวมสรุปรายรับ-รายจ่าย ภาษีหัก ณ ที่จ่าย และกราฟแนวโน้มการเงินเท่านั้น โดยแยกสิทธิ์ไม่สามารถเข้าถึงส่วนแก้ไขหรือตั้งค่าอื่นของระบบได้
              </p>
            </div>
          </div>
          {onExitReadOnly && !hideAdminButton && (
            <button
              onClick={onExitReadOnly}
              className="bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white text-xs px-4 py-2 rounded-xl font-medium transition cursor-pointer border border-white/20 shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>เข้าสู่ระบบหลัก (เฉพาะ Admin ใส่รหัสผ่าน)</span>
            </button>
          )}
        </div>
      )}

      {/* Sample Data Mode Banner */}
      {!isReadOnly && (
        isSampleEnabled && sampleVouchersCount > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 border border-amber-400/40">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-amber-950">กำลังเปิดใช้งานโหมดข้อมูลตัวอย่าง (Sample Data Active)</span>
                  <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {sampleVouchersCount} รายการตัวอย่าง
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  ระบบกำลังแสดงข้อมูลตัวอย่างสำหรับการทดลองใช้ หากท่านต้องการบันทึกบัญชีของบริษัทจริง สามารถกด "นำข้อมูลตัวอย่างออก" หรือ "ปิดข้อมูลตัวอย่าง" ได้ทันที
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              {onRemoveSampleDataOnly && (
                <button
                  type="button"
                  onClick={onRemoveSampleDataOnly}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                  title="ลบเฉพาะรายการตัวอย่างออกอย่างปลอดภัย โดยไม่ลบข้อมูลจริง"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>นำข้อมูลตัวอย่างออก</span>
                </button>
              )}
              {onOpenSampleDataModal && (
                <button
                  type="button"
                  onClick={onOpenSampleDataModal}
                  className="flex items-center gap-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                >
                  <span>จัดการข้อมูลตัวอย่าง</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-950 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-900">โหมดใช้งานจริง (Production Mode):</span>{' '}
                <span className="text-emerald-800">
                  {vouchers.length === 0
                    ? 'ระบบว่างเปล่า พร้อมสำหรับการเริ่มบันทึกบัญชีกิจการจริง'
                    : `บันทึกเฉพาะข้อมูลจริงของกิจการ (${realVouchersCount} ฉบับ)`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onToggleSampleData && (
                <button
                  type="button"
                  onClick={() => onToggleSampleData(true)}
                  className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold underline cursor-pointer"
                >
                  เปิดข้อมูลตัวอย่างกลับมา
                </button>
              )}
              {onOpenSampleDataModal && (
                <button
                  type="button"
                  onClick={onOpenSampleDataModal}
                  className="px-2.5 py-1 text-[11px] bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-medium cursor-pointer transition"
                >
                  จัดการโหมดข้อมูล
                </button>
              )}
            </div>
          </div>
        )
      )}

      {/* Top Banner: Executive Dashboard Action Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 transition hover:shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-prompt">
                  ภาพรวมสรุปทางการเงินและภาษี (Executive Financial & Tax Dashboard)
                </h2>
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                  ระบบพร้อมใช้งาน
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                สรุปยอดรายรับ-รายจ่าย ใบสำคัญรับ (RV) ใบสำคัญจ่าย (PV) และภาษีหัก ณ ที่จ่าย ภ.ง.ด. 3/53 ประจำปี 2569
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export PDF Executive Report Button */}
            <button
              onClick={() => setIsPdfExportModalOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
              title="ส่งออกรายงานสรุปภาพรวม แผนภูมิ และข้อมูลทางการเงินเป็นเอกสาร PDF สำหรับรายงานผู้บริหาร (Executive Management Report)"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>พิมพ์ / ส่งออก PDF สำหรับผู้บริหาร</span>
            </button>

            {/* Share Link Button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-3.5 py-2 rounded-lg border border-indigo-200 transition cursor-pointer shadow-xs"
              title="สร้างลิงก์สำหรับส่งให้คนอื่นดูเฉพาะหน้าแดชบอร์ดนี้ ไม่ต้องเห็นส่วนอื่นของระบบ"
            >
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span>แชร์ลิงก์ดูเฉพาะหน้านี้</span>
            </button>

            {onOpenAnnualSummary && (
              <button
                onClick={onOpenAnnualSummary}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs px-3.5 py-2 rounded-lg border border-emerald-200 transition cursor-pointer shadow-xs"
                title="ดูสรุปงบการเงินและผลประกอบการประจำปี (Annual Financial Review & Summary)"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>สรุปงบประจำปี</span>
              </button>
            )}

            {!isReadOnly && onNavigateToVouchers && (
              <button
                onClick={onNavigateToVouchers}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-3.5 py-2 rounded-lg border border-slate-300 transition cursor-pointer"
                title="ไปยังหน้ารายการใบสำคัญทั้งหมดพร้อมตารางขยายกว้าง"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>เปิดหน้ารายการใบสำคัญ ({vouchers.length})</span>
              </button>
            )}

            {!isReadOnly && onOpenImportModal && (
              <button
                onClick={onOpenImportModal}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs px-3.5 py-2 rounded-lg border border-blue-200 transition cursor-pointer"
                title="นำเข้าไฟล์ Excel (.xlsx, .xls), CSV หรือ JSON ข้อมูลจริงเข้าสู่ระบบ"
              >
                <UploadCloud className="w-4 h-4 text-blue-600" />
                <span>นำเข้าไฟล์จริง (Excel/CSV)</span>
              </button>
            )}

            {!isReadOnly && onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-3.5 py-2 rounded-lg border border-indigo-200 transition cursor-pointer"
                title="สำรองข้อมูลลงเครื่องคอมพิวเตอร์ (.json) หรือกู้คืนฐานข้อมูล"
              >
                <HardDrive className="w-4 h-4 text-indigo-600" />
                <span>สำรองข้อมูลลงเครื่อง (Backup)</span>
              </button>
            )}

            {!isReadOnly && onOpenFirebaseSyncModal && (
              <button
                onClick={onOpenFirebaseSyncModal}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 font-semibold text-xs px-3.5 py-2 rounded-lg border border-amber-300 transition cursor-pointer shadow-xs"
                title="ระบบฐานข้อมูลคู่ขนาน (เครื่อง + Firebase Firestore) - คลิกเพื่อจัดการการซิงค์"
              >
                <Cloud className="w-4 h-4 text-amber-600" />
                <span>ฐานข้อมูล Firebase Cloud</span>
              </button>
            )}

            {!isReadOnly && onOpenAccountingExportModal && (
              <button
                onClick={onOpenAccountingExportModal}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
                title="ส่งออกใบสำคัญเดือนปัจจุบันสำหรับโปรแกรมบัญชี Express หรือ PEAK"
              >
                <Calculator className="w-4 h-4 text-blue-200" />
                <span>ส่งออกโปรแกรมบัญชี (Express / PEAK)</span>
              </button>
            )}

            {!isReadOnly && onOpenCustomerDirectory && (
              <button
                onClick={onOpenCustomerDirectory}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 font-semibold text-xs px-3.5 py-2 rounded-lg border border-blue-300 transition cursor-pointer shadow-xs"
                title="ฐานข้อมูลรายชื่อลูกค้าและนิติบุคคล ดึงข้อมูลจาก Google Sheets (ACP-รายชื่อลูกค้าทั้งหมด)"
              >
                <Building2 className="w-4 h-4 text-blue-700" />
                <span>รายชื่อลูกค้า Google Sheets ({customerCount})</span>
              </button>
            )}

            {!isReadOnly && (
              <button
                onClick={onCreateRV}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ ออกใบสำคัญรับ (RV)</span>
              </button>
            )}

            {!isReadOnly && (
              <button
                onClick={onCreatePV}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ ออกใบสำคัญจ่าย (PV)</span>
              </button>
            )}

            <button
              onClick={onSyncSheet}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs px-3 py-2 rounded-lg transition cursor-pointer disabled:opacity-50"
              title="ดึงข้อมูลล่าสุดจาก Google Sheet ทันที"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isSyncing ? 'กำลังดึง...' : 'ซิงค์ข้อมูล'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: 4 Summary Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Received (RV) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ยอดรับเงินรวม (RV)
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight truncate" title={`฿${formatCurrency(stats.totalReceived)}`}>
              ฿{formatCurrency(stats.totalReceived)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center justify-between gap-1">
              <span>ใบสำคัญรับ {stats.rvCount} ฉบับ</span>
              <span className="text-emerald-600 font-semibold font-mono whitespace-nowrap">
                ถูกหัก 3%: ฿{formatCurrency(stats.totalWhtDeducted)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Paid (PV) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ยอดจ่ายเงินรวม (PV)
            </span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight truncate" title={`฿${formatCurrency(stats.totalPaid)}`}>
              ฿{formatCurrency(stats.totalPaid)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center justify-between gap-1">
              <span>ใบสำคัญจ่าย {stats.pvCount} ฉบับ</span>
              <span className="text-rose-600 font-semibold font-mono whitespace-nowrap">
                หัก 3% ไว้: ฿{formatCurrency(stats.totalWhtWithheld)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setChartViewMode('pv_pie')}
            className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center justify-between w-full cursor-pointer transition group"
          >
            <span className="flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5" />
              <span>วิเคราะห์สัดส่วนหมวดค่าใช้จ่าย</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        </div>

        {/* Card 3: Net Cash Flow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ยอดเงินคงเหลือสุทธิ (Net)
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight truncate ${
              stats.netOperating >= 0 ? 'text-blue-900' : 'text-rose-700'
            }`} title={`฿${formatCurrency(stats.netOperating)}`}>
              ฿{formatCurrency(stats.netOperating)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center justify-between gap-1">
              <span>กระแสเงินสดดำเนินงาน</span>
              <span className="text-slate-600 font-medium whitespace-nowrap">รวม {stats.totalCount} รายการ</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Withholding Tax (WHT 3%) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                ภาษีหัก ณ ที่จ่ายรวม (WHT)
              </span>
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Percent className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight truncate" title={`฿${formatCurrency(stats.totalWhtCombined)}`}>
                ฿{formatCurrency(stats.totalWhtCombined)}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center justify-between gap-1">
                <span className="truncate">ต้องนำส่ง ภ.ง.ด.3/53:</span>
                <span className="font-semibold text-indigo-700 font-mono whitespace-nowrap">
                  ฿{formatCurrency(stats.totalWhtWithheld)}
                </span>
              </div>
            </div>
          </div>
          {onOpenWhtReport && (
            <button
              onClick={onOpenWhtReport}
              className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-between w-full cursor-pointer transition"
            >
              <span>ดูสรุปยื่นแบบ ภ.ง.ด. 3 และ 53</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Analytics Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setChartViewMode('cashflow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              chartViewMode === 'cashflow'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>กระแสเงินสด รายรับ vs รายจ่าย (Recharts Bar)</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewMode('pv_pie')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              chartViewMode === 'pv_pie'
                ? 'bg-white text-rose-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-4 h-4 shrink-0 text-rose-600" />
            <span>สัดส่วนหมวดค่าใช้จ่าย PV ประจำเดือน (Recharts Pie)</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewMode('trend')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              chartViewMode === 'trend'
                ? 'bg-white text-blue-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-4 h-4 shrink-0" />
            <span>แนวโน้ม RV vs. PV (12 เดือน)</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewMode('rv_bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              chartViewMode === 'rv_bar'
                ? 'bg-white text-emerald-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>โครงสร้างรายรับรายเดือน (RV)</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
              chartViewMode === 'all'
                ? 'bg-white text-indigo-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>แสดงทุกกราฟ</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 mr-1 hidden md:inline whitespace-nowrap">
            Recharts Visual Analytics
          </span>
          <button
            type="button"
            onClick={() => setIsPdfExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-xl text-xs font-semibold border border-blue-200 transition cursor-pointer shadow-2xs"
            title="ส่งออกมุมมองแดชบอร์ด แผนภูมิ และสรุปข้อมูลทางการเงินเป็น PDF สำหรับผู้บริหาร"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>พิมพ์ / ส่งออก PDF หน้านี้</span>
          </button>
        </div>
      </div>

      {/* Recharts Monthly Cash Flow Bar Chart: Income vs Expenses over selected year */}
      {(chartViewMode === 'cashflow' || chartViewMode === 'all') && (
        <MonthlyCashFlowBarChart
          vouchers={vouchers}
          onSelectMonth={(monthKey) => setSelectedMonthFilter(monthKey)}
        />
      )}

      {/* Recharts Pie Chart: Current Month PV Expense Category Breakdown */}
      {(chartViewMode === 'pv_pie' || chartViewMode === 'all') && (
        <CurrentMonthPvCategoryPieChart
          vouchers={vouchers}
          onCreatePV={onCreatePV}
          onSelectVoucherToPrint={onSelectVoucherToPrint}
          onSelectMonthFilter={(monthKey) => setSelectedMonthFilter(monthKey)}
        />
      )}

      {/* D3 Yearly Trend Analysis Line Chart: RV vs PV over 12 months */}
      {(chartViewMode === 'trend' || chartViewMode === 'all') && (
        <YearlyTrendAnalysisChart
          vouchers={vouchers}
          onSelectVoucherToPrint={onSelectVoucherToPrint}
          onSelectMonth={(monthKey) => setSelectedMonthFilter(monthKey)}
        />
      )}

      {/* D3 Bar Chart: Total Monthly Revenue from Receipt Vouchers (RV) */}
      {(chartViewMode === 'rv_bar' || chartViewMode === 'all') && (
        <RvMonthlyRevenueChart 
          vouchers={vouchers} 
          onSelectVoucherToPrint={onSelectVoucherToPrint} 
        />
      )}

      {/* Analytics Section: Monthly Breakdown & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Breakdown (แยกรายเดือน) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-prompt">
                ยอดรับ - จ่าย - ภาษีหัก แยกรายเดือน
              </h3>
              <p className="text-[11px] text-slate-500">เปรียบเทียบกระแสเงินรับและจ่ายในแต่ละเดือน</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-mono">
              {monthlyData.length} เดือน
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 px-3 font-semibold">เดือน/ปี</th>
                  <th className="py-2 px-3 font-semibold text-right text-emerald-700">รับ (RV)</th>
                  <th className="py-2 px-3 font-semibold text-right text-rose-700">จ่าย (PV)</th>
                  <th className="py-2 px-3 font-semibold text-right text-amber-800">หัก ณ ที่จ่าย</th>
                  <th className="py-2 px-3 font-semibold text-right">สุทธิ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {monthlyData.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      {formatMonthTh(m.month)} ({m.count})
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">
                      {formatCurrency(m.rv)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                      {formatCurrency(m.pv)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-700">
                      {formatCurrency(m.wht)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      m.net >= 0 ? 'text-slate-900' : 'text-rose-700'
                    }`}>
                      {formatCurrency(m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Account Category Breakdown (แยกตามหมวดบัญชี) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-prompt">
                ยอดรับ - จ่าย แยกตามหมวดบัญชี
              </h3>
              <p className="text-[11px] text-slate-500">
                เน้น: ค่าสอบบัญชี, บริการอื่นๆ, ค่านายหน้า, ค่าส่วนต่างค่าสอบ (40%)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChartViewMode('pv_pie')}
                className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer border border-rose-200 shadow-2xs"
                title="เปิดดูกราฟวงกลม Recharts Pie Chart วิเคราะห์สัดส่วนหมวดค่าใช้จ่าย PV"
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Pie Chart PV</span>
              </button>
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-mono">
                {categoryData.length} หมวด
              </span>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
            {categoryData.map((cat) => {
              const total = cat.rvTotal + cat.pvTotal;
              const isAudit = cat.category.includes('ตรวจสอบบัญชี');
              const isMargin40 = cat.category.includes('40%');
              const isCommission = cat.category.includes('นายหน้า');

              return (
                <div
                  key={cat.category}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition bg-slate-50/50 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900 mb-1">
                    <span className="flex items-center gap-1.5">
                      {isMargin40 && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                      {isAudit && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                      {isCommission && <span className="w-2 h-2 rounded-full bg-amber-600"></span>}
                      <span>{cat.category}</span>
                    </span>
                    <span className="font-mono text-slate-800">
                      รวม ฿{formatCurrency(total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
                    <div className="space-x-3">
                      {cat.rvTotal > 0 && (
                        <span className="text-emerald-700">รับ: ฿{formatCurrency(cat.rvTotal)}</span>
                      )}
                      {cat.pvTotal > 0 && (
                        <span className="text-rose-700">จ่าย: ฿{formatCurrency(cat.pvTotal)}</span>
                      )}
                      {cat.whtTotal > 0 && (
                        <span className="text-amber-800">WHT 3%: ฿{formatCurrency(cat.whtTotal)}</span>
                      )}
                    </div>
                    <span>{cat.count} รายการ</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vouchers Overview & Navigation to Dedicated Full Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 font-prompt">
                สรุปภาพรวมเอกสารใบสำคัญในระบบ ({vouchers.length} รายการ)
              </h3>
              <p className="text-xs text-slate-500">
                รายการและคำอธิบายทั้งหมดถูกแยกไปแสดงในหน้าเฉพาะ พร้อมคอลัมน์กว้าง ค้นหา กรอง และพิมพ์ใบสำคัญ/50 ทวิ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfExportModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 transition cursor-pointer"
              title="ส่งออกรายงานสรุปยอดใบสำคัญรับ-จ่าย เป็นไฟล์ PDF ตามช่วงเวลาที่กำหนด"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>พิมพ์รายงาน PDF สรุปยอด</span>
            </button>

            {onNavigateToVouchers && (
              <button
                type="button"
                onClick={onNavigateToVouchers}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                <span>เปิดหน้ารายการใบสำคัญทั้งหมด ({vouchers.length} ฉบับ)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Summary Pill Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-900 block">ใบสำคัญรับ (RV)</span>
              <span className="text-[11px] text-emerald-700">{stats.rvCount} รายการ</span>
            </div>
            <span className="font-mono font-bold text-emerald-800 text-sm">
              ฿{formatCurrency(stats.totalReceived)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-rose-900 block">ใบสำคัญจ่าย (PV)</span>
              <span className="text-[11px] text-rose-700">{stats.pvCount} รายการ</span>
            </div>
            <span className="font-mono font-bold text-rose-800 text-sm">
              ฿{formatCurrency(stats.totalPaid)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-amber-900 block">ภาษีหัก ณ ที่จ่ายรวม (WHT)</span>
              <span className="text-[11px] text-amber-700">ภ.ง.ด. 3/53</span>
            </div>
            <span className="font-mono font-bold text-amber-800 text-sm">
              ฿{formatCurrency(stats.totalWhtDeducted + stats.totalWhtWithheld)}
            </span>
          </div>
        </div>

        {/* Recent 5 Vouchers Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>เอกสารใบสำคัญล่าสุด (5 รายการ):</span>
            {onNavigateToVouchers && (
              <button
                type="button"
                onClick={onNavigateToVouchers}
                className="text-blue-600 hover:text-blue-800 text-xs font-semibold cursor-pointer"
              >
                ดูทั้งหมด ({vouchers.length}) →
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3 w-28">เลขที่เอกสาร</th>
                  <th className="py-2.5 px-3 w-24">วันที่</th>
                  <th className="py-2.5 px-3">ลูกค้า / ผู้รับเงิน</th>
                  <th className="py-2.5 px-3">หมวดบัญชี & รายละเอียด</th>
                  <th className="py-2.5 px-3 text-right">ยอดสุทธิ</th>
                  <th className="py-2.5 px-3 text-center w-24">พิมพ์ A4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-center max-w-sm">
                          <span className="font-bold text-slate-800 text-sm block">ยังไม่มีรายการใบสำคัญในระบบ</span>
                          <span className="text-xs text-slate-400">ระบบว่างเปล่า พร้อมสำหรับบันทึกข้อมูลจริงของกิจการ</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                          <button
                            type="button"
                            onClick={onCreateRV}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>+ ออกใบสำคัญรับ (RV)</span>
                          </button>
                          <button
                            type="button"
                            onClick={onCreatePV}
                            className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>+ ออกใบสำคัญจ่าย (PV)</span>
                          </button>
                          {onToggleSampleData && (
                            <button
                              type="button"
                              onClick={() => onToggleSampleData(true)}
                              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>เปิดข้อมูลตัวอย่าง</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vouchers.slice(0, 5).map((v) => {
                    const isRV = v.type === 'RV';
                    const isSample = isSampleVoucher(v);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-bold font-mono text-slate-900">{v.voucherNo}</div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isRV ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isRV ? 'RV (รับ)' : 'PV (จ่าย)'}
                            </span>
                            {isSample && (
                              <span className="inline-block text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                ตัวอย่าง
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{v.date}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[200px] truncate">{v.contact.name}</td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                          <span className="text-blue-700 font-medium mr-1">[{v.items[0]?.accountCategory || '-'}]</span>
                          {v.items[0]?.description || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ฿{formatCurrency(v.netPayable)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectVoucherToPrint(v)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="พิมพ์ใบสำคัญ A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guidance Prompt */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            💡 ตารางรายละเอียดและคำอธิบายฉบับเต็มที่มีคอลัมน์กว้างถูกย้ายไปที่ <strong>หน้ารายการใบสำคัญทั้งหมด</strong> เพื่อการแสดงผลที่กว้างและชัดเจนที่สุด
          </span>
          {onNavigateToVouchers && (
            <button
              type="button"
              onClick={onNavigateToVouchers}
              className="text-blue-600 font-bold hover:underline cursor-pointer whitespace-nowrap"
            >
              ไปยังหน้ารายการใบสำคัญทั้งหมด →
            </button>
          )}
        </div>
      </div>

      {/* Share Dashboard Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 no-print animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-prompt">
                    แชร์ลิงก์ดูเฉพาะหน้าแดชบอร์ด
                  </h3>
                  <p className="text-xs text-slate-500">
                    ส่งให้ผู้บริหาร คู่ค้า หรือผู้ตรวจสอบบัญชีดูสรุปทางการเงินได้ทันที
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
              <Shield className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <strong className="font-semibold block">สิทธิ์การเข้าถึงแบบจำกัด (Isolated Read-Only):</strong>
                ผู้ที่เปิดผ่านลิงก์นี้จะเห็นเฉพาะหน้าภาพรวมแดชบอร์ด กราฟรายรับ-จ่าย ยอดรวม ภ.ง.ด. และรายการใบสำคัญ (สามารถพิมพ์ได้) โดยจะไม่เห็นเมนูสร้างเอกสาร แก้ไข ลบ หรือส่วนการตั้งค่าระบบใดๆ
              </div>
            </div>

            <div className="space-y-3">
              {/* Option to hide admin switch button */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideAdminInShareLink}
                    onChange={(e) => setHideAdminInShareLink(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>ซ่อนปุ่ม "เข้าสู่ระบบหลัก" สำหรับผู้รับลิงก์ (แนะนำเป็นอย่างยิ่ง)</span>
                    </span>
                    <span className="text-slate-500 block mt-0.5 leading-normal">
                      ผู้ที่เปิดผ่านลิงก์นี้จะไม่เห็นปุ่มเข้าสู่ระบบหลักเลย จะดูได้เฉพาะแดชบอร์ดสรุปเท่านั้น และหากไม่มีรหัสผ่านผู้ดูแลระบบ (Admin PIN) จะไม่สามารถเข้าถึงระบบได้เด็ดขาด
                    </span>
                  </div>
                </label>
              </div>

              <label className="text-xs font-semibold text-slate-700 block">
                ลิงก์แชร์แดชบอร์ดเฉพาะหน้านี้:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl()}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 px-3 py-2.5 rounded-lg text-slate-700 select-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleCopyShareLink}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-semibold text-xs whitespace-nowrap transition cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4" />
                      <span>คัดลอกลิงก์</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                พารามิเตอร์: <code>?view=shared-dashboard{hideAdminInShareLink ? '&hide_admin=true' : ''}</code>
              </span>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-lg font-medium transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Summary Report Export Modal */}
      <DashboardPdfReportModal
        isOpen={isPdfExportModalOpen}
        onClose={() => setIsPdfExportModalOpen(false)}
        vouchers={vouchers}
        companySettings={companySettings || DEFAULT_COMPANY_SETTINGS}
        currentChartView={chartViewMode}
      />
    </div>
  );
};
