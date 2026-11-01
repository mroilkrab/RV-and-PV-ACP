import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  RefreshCw, 
  ShieldCheck, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileSpreadsheet, 
  FolderArchive, 
  Database,
  Menu,
  X,
  ChevronRight,
  SlidersHorizontal,
  Search,
  Lock,
  TrendingUp,
  HardDrive,
  Sparkles,
  CheckCircle2,
  Cloud,
  Calculator,
  Building2
} from 'lucide-react';
import { AccountPlanetLogo } from './AccountPlanetLogo';
import { CompanySettings, GoogleSheetSyncConfig, FontSizePreference } from '../types';
import { FontSizeSelector } from './FontSizeSelector';

export type ActiveTab = 'dashboard' | 'vouchers' | 'vault' | 'create_pv' | 'create_rv' | 'wht_report' | 'settings' | 'tax_guide' | 'annual_summary' | 'customers';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  companySettings: CompanySettings;
  sheetConfig: GoogleSheetSyncConfig;
  onSyncSheet: () => void;
  isSyncing: boolean;
  totalVouchersCount: number;
  onGlobalSearch?: (query: string) => void;
  globalSearchQuery?: string;
  onLockApp?: () => void;
  currentUserRole?: string;
  fontSize?: FontSizePreference;
  onChangeFontSize?: (size: FontSizePreference) => void;
  onOpenBackupModal?: () => void;
  isSampleEnabled?: boolean;
  onOpenSampleDataModal?: () => void;
  onOpenFirebaseSyncModal?: () => void;
  onOpenAccountingExportModal?: () => void;
  isCloudConnected?: boolean;
  onOpenCustomerDirectory?: () => void;
  customerCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  companySettings,
  sheetConfig,
  onSyncSheet,
  isSyncing,
  totalVouchersCount,
  onGlobalSearch,
  globalSearchQuery = '',
  onLockApp,
  currentUserRole,
  fontSize = 'large',
  onChangeFontSize,
  onOpenBackupModal,
  isSampleEnabled = true,
  onOpenSampleDataModal,
  onOpenFirebaseSyncModal,
  onOpenAccountingExportModal,
  isCloudConnected = false,
  onOpenCustomerDirectory,
  customerCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(globalSearchQuery);

  const handleSearchSubmit = (queryText: string) => {
    if (onGlobalSearch) {
      onGlobalSearch(queryText);
    }
    setActiveTab('vouchers');
    setMobileMenuOpen(false);
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print w-full">
      {/* Top Banner with Quick Company Tax ID, Sync & Direct Settings Link */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-200 border-b border-slate-800">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-1.5 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400 shrink-0 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 text-[11px] sm:text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">ระบบ Live Artifacts บัญชีสรรพากร</span>
              <span className="sm:hidden">Live Artifacts</span>
            </span>
            <span className="text-slate-700 hidden md:inline">|</span>
            <span className="truncate hidden md:flex items-center gap-1.5 text-slate-300">
              <span>เลขผู้เสียภาษี:</span>
              <strong className="text-white font-mono tracking-wide">{companySettings.taxId}</strong>
              <span className="text-slate-400">({companySettings.branch})</span>
            </span>
            <span className="text-slate-700 hidden lg:inline">|</span>

            {/* Quick Sample Data Status / Manager Button */}
            {onOpenSampleDataModal && (
              <button
                onClick={onOpenSampleDataModal}
                className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full cursor-pointer transition text-[11px] font-medium border ${
                  isSampleEnabled
                    ? 'bg-amber-950/80 border-amber-600/70 text-amber-200 hover:bg-amber-900/90'
                    : 'bg-emerald-950/80 border-emerald-600/70 text-emerald-200 hover:bg-emerald-900/90'
                }`}
                title={
                  isSampleEnabled
                    ? 'กำลังเปิดใช้งานข้อมูลตัวอย่าง (12 รายการ) - คลิกเพื่อจัดการหรือปิด/ล้างตัวอย่างเพื่อเริ่มใช้งานจริง'
                    : 'โหมดใช้งานจริง (ไม่มีข้อมูลตัวอย่าง) - คลิกเพื่อจัดการข้อมูล'
                }
              >
                <Sparkles className={`w-3 h-3 ${isSampleEnabled ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span>{isSampleEnabled ? 'ข้อมูลตัวอย่าง: เปิด' : 'โหมดข้อมูลจริง'}</span>
              </button>
            )}

            <span className="text-slate-700 hidden lg:inline">|</span>
            {onOpenBackupModal ? (
              <button 
                onClick={onOpenBackupModal}
                className="hidden lg:inline-flex items-center gap-1.5 text-indigo-200 bg-indigo-950/80 border border-indigo-700/80 px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-indigo-900 transition text-[11px] font-medium"
                title="สำรองข้อมูลลงเครื่องคอมพิวเตอร์ (.json) หรือกู้คืนข้อมูล"
              >
                <HardDrive className="w-3 h-3 text-indigo-400" />
                <span>สำรองข้อมูลลงคอม (Backup)</span>
              </button>
            ) : (
              <button 
                onClick={() => handleSelectTab('settings')}
                className="hidden lg:inline-flex items-center gap-1.5 text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-indigo-900/70 transition text-[11px]"
                title="ระบบสำรองข้อมูลอัตโนมัติ IndexedDB - คลิกเพื่อจัดการจุดสำรองข้อมูล"
              >
                <Database className="w-3 h-3 text-indigo-400" />
                <span>IndexedDB Auto-Backup</span>
              </button>
            )}

            {onOpenFirebaseSyncModal && (
              <>
                <span className="text-slate-700 hidden sm:inline">|</span>
                <button
                  onClick={onOpenFirebaseSyncModal}
                  className="hidden sm:inline-flex items-center gap-1.5 text-amber-200 bg-gradient-to-r from-amber-950/90 to-orange-950/90 border border-amber-600/70 hover:border-amber-500 px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-amber-900 transition text-[11px] font-medium shadow-xs"
                  title="ระบบคลาวด์ซิงค์เรียลไทม์ (PC / มือถือ / แท็บเล็ต ข้อมูลตรงกันตลอดเวลา)"
                >
                  <span className="relative flex h-2 w-2">
                    {isCloudConnected ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    )}
                  </span>
                  <Cloud className="w-3 h-3 text-amber-400" />
                  <span>{isCloudConnected ? 'Cloud เรียลไทม์' : 'Firebase Cloud'}</span>
                </button>
              </>
            )}

            {onOpenAccountingExportModal && (
              <>
                <span className="text-slate-700 hidden xl:inline">|</span>
                <button
                  onClick={onOpenAccountingExportModal}
                  className="hidden xl:inline-flex items-center gap-1.5 text-blue-200 bg-blue-950/80 border border-blue-700/60 hover:border-blue-400 px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-blue-900 transition text-[11px] font-medium shadow-xs"
                  title="ส่งออกใบสำคัญสำหรับโปรแกรมบัญชี Express หรือ PEAK (เลือกเดือนปัจจุบัน)"
                >
                  <Calculator className="w-3 h-3 text-blue-400" />
                  <span>ส่งออก Express/PEAK</span>
                </button>
              </>
            )}
          </div>

          {/* Persistent Global Search Bar (Job No., Company Name, Voucher No.) */}
          <div className="flex-1 max-w-[220px] sm:max-w-xs md:max-w-sm relative mx-1 sm:mx-2 min-w-[150px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (onGlobalSearch) onGlobalSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit(localSearch);
                }
              }}
              placeholder="ค้นหา Job No. เช่น 70001, บริษัท..."
              className="w-full bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-md pl-8 pr-12 py-1 text-[11px] text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              title="ค้นหาเอกสารทั้งหมด เช่น Job No. 70001, ชื่อบริษัท หรือเลขที่ใบสำคัญ (กด Enter เพื่อค้นหา)"
            />
            {localSearch ? (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  if (onGlobalSearch) onGlobalSearch('');
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="hidden sm:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500 bg-slate-800/80 px-1 py-0.2 rounded border border-slate-700 pointer-events-none">
                ↵
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Font Size Selector Widget (A- / A+ / Popup) */}
            {onChangeFontSize && (
              <FontSizeSelector
                fontSize={fontSize}
                onChangeFontSize={onChangeFontSize}
                variant="topbar"
              />
            )}

            {/* Lock App Button (if enabled) */}
            {onLockApp && (
              <button
                onClick={onLockApp}
                className="flex items-center gap-1 bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 border border-amber-800/80 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer"
                title="ล็อคหน้าจอเพื่อความปลอดภัย (ต้องใส่รหัสผ่าน/PIN เพื่อเข้าใช้งานต่อ)"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">ล็อคระบบ</span>
              </button>
            )}

            {/* Quick Backup to Computer Button on top bar */}
            {onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="flex items-center gap-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/80 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer"
                title="สำรองข้อมูลลงเครื่องคอมพิวเตอร์ (.json) หรือกู้คืนข้อมูล"
              >
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">สำรองข้อมูล</span>
              </button>
            )}

            {/* Quick Settings shortcut button on top bar */}
            <button
              onClick={() => handleSelectTab('settings')}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer"
              title="ตั้งค่าระบบ ข้อมูลบริษัท และบัญชีธนาคาร"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">ตั้งค่าระบบ</span>
            </button>

            {/* Google Sheet Sync button */}
            <button
              onClick={onSyncSheet}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 sm:px-3 py-1 rounded-md text-xs transition-all font-medium shadow-xs disabled:opacity-50 whitespace-nowrap cursor-pointer hover:shadow-sm"
              title="ดึงข้อมูลอัพเดตล่าสุดจาก Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูล Google Sheet'}</span>
              <span className="sm:hidden">{isSyncing ? 'ดึงข้อมูล...' : 'ซิงค์ชีต'}</span>
            </button>

            {sheetConfig.lastSyncedAt && (
              <span className="hidden 2xl:inline text-[11px] text-slate-400 whitespace-nowrap font-mono">
                ดึงล่าสุด: {new Date(sheetConfig.lastSyncedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4.75rem] sm:min-h-[5.25rem] py-2 gap-3">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-2 cursor-pointer shrink-0 transition-opacity hover:opacity-95"
            onClick={() => handleSelectTab('dashboard')}
          >
            <AccountPlanetLogo 
              customLogoUrl={companySettings.logoUrl} 
              size="md" 
              hideTaxBadge={true} 
            />
          </div>

          {/* Desktop Nav Items (visible on xl and up: 6 core tabs nicely grouped without any overlap) */}
          <nav className="hidden xl:flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs 2xl:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>แดชบอร์ด</span>
            </button>

            <button
              onClick={() => handleSelectTab('vouchers')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs 2xl:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'vouchers'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>รายการใบสำคัญ</span>
              <span className="bg-slate-100 text-slate-700 text-xs px-1.5 py-0.5 rounded-full font-mono font-semibold">
                {totalVouchersCount}
              </span>
            </button>

            <button
              onClick={() => handleSelectTab('vault')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs 2xl:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FolderArchive className="w-4 h-4 shrink-0 text-indigo-600" />
              <span>คลังไฟล์แนบ</span>
            </button>

            <button
              onClick={() => handleSelectTab('wht_report')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs 2xl:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'wht_report'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200'
                  : 'text-indigo-800 hover:bg-indigo-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>ภาษี ภ.ง.ด. 3/53</span>
            </button>

            <button
              onClick={() => handleSelectTab('tax_guide')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs 2xl:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'tax_guide'
                  ? 'bg-amber-50 text-amber-800 font-semibold ring-1 ring-amber-200'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>วิเคราะห์สรรพากร</span>
            </button>

            <button
              onClick={() => handleSelectTab('annual_summary')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs 2xl:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'annual_summary'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-200'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>สรุปงบประจำปี</span>
            </button>

            <button
              onClick={() => handleSelectTab('customers')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs 2xl:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="ฐานข้อมูลรายชื่อลูกค้าและนิติบุคคล ดึงข้อมูลจาก Google Sheets (ACP-รายชื่อลูกค้าทั้งหมด)"
            >
              <Building2 className={`w-4 h-4 shrink-0 ${activeTab === 'customers' ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>รายชื่อลูกค้า</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'customers' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {customerCount || 0}
              </span>
            </button>

            <button
              onClick={() => handleSelectTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs 2xl:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>ตั้งค่าระบบ</span>
            </button>
          </nav>

          {/* Right Action Group: Quick PV & RV creation buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Create Buttons on Desktop */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => handleSelectTab('create_pv')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'create_pv'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-rose-700 hover:bg-rose-50 border border-rose-200'
                }`}
                title="สร้างใบสำคัญจ่ายเงิน (PV)"
              >
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>+ จ่าย (PV)</span>
              </button>

              <button
                onClick={() => handleSelectTab('create_rv')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'create_rv'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                }`}
                title="สร้างใบสำคัญรับเงิน (RV)"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                <span>+ รับ (RV)</span>
              </button>
            </div>

            {/* Quick settings shortcut on mobile/tablet screens when desktop nav is hidden */}
            <button
              onClick={() => handleSelectTab('settings')}
              className={`xl:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer border ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="ตั้งค่าระบบ"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">ตั้งค่า</span>
            </button>

            {/* Hamburger / Menu toggle for tablet and mobile screens */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              aria-label={mobileMenuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
              title="เปิดเมนูการนำทางทั้งหมด"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-rose-600" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Horizontal Quick Scroller (With smooth touch scroll and full padding) */}
        <div className="xl:hidden flex items-center gap-1.5 py-2 overflow-x-auto border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => handleSelectTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            แดชบอร์ด
          </button>
          <button
            onClick={() => handleSelectTab('vouchers')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vouchers' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>ใบสำคัญ</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
              activeTab === 'vouchers' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalVouchersCount}
            </span>
          </button>
          <button
            onClick={() => handleSelectTab('vault')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer ${
              activeTab === 'vault' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            คลังไฟล์แนบ
          </button>
          <button
            onClick={() => handleSelectTab('customers')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'customers' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>รายชื่อลูกค้า</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
              activeTab === 'customers' ? 'bg-blue-700 text-white' : 'bg-blue-200 text-blue-900'
            }`}>
              {customerCount || 0}
            </span>
          </button>
          <button
            onClick={() => handleSelectTab('create_pv')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'create_pv' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ จ่าย (PV)</span>
          </button>
          <button
            onClick={() => handleSelectTab('create_rv')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'create_rv' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ รับ (RV)</span>
          </button>
          <button
            onClick={() => handleSelectTab('wht_report')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer ${
              activeTab === 'wht_report' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            ภ.ง.ด. 3/53
          </button>
          <button
            onClick={() => handleSelectTab('tax_guide')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer ${
              activeTab === 'tax_guide' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            วิเคราะห์สรรพากร
          </button>
          <button
            onClick={() => handleSelectTab('annual_summary')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer ${
              activeTab === 'annual_summary' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            สรุปงบประจำปี
          </button>
          <button
            onClick={() => handleSelectTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>ตั้งค่าระบบ</span>
          </button>
        </div>
      </div>

      {/* Responsive Full Navigation Drawer / Modal (When hamburger button is clicked) */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-start">
          <div className="bg-white border-b border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-top duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  AP
                </div>
                <div>
                  <div className="font-extrabold text-slate-950 text-base sm:text-lg font-prompt leading-snug">{companySettings.name}</div>
                  <div className="text-xs text-blue-700 font-bold tracking-wide">ACCOUNT PLANET CO., LTD.</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">Tax ID: {companySettings.taxId}</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                title="ปิดเมนู"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Grid */}
            <div className="p-4 space-y-3">
              {/* Mobile Global Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    if (onGlobalSearch) onGlobalSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit(localSearch);
                    }
                  }}
                  placeholder="ค้นหา Job No. เช่น 70001, ชื่อบริษัท..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-16 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => handleSearchSubmit(localSearch)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg cursor-pointer"
                >
                  ค้นหา
                </button>
              </div>

              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-1">
                เมนูหลักของระบบ
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectTab('dashboard')}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">แดชบอร์ดสรุปข้อมูล</div>
                      <div className="text-xs text-slate-400">กราฟและกระแสเงินสดรวม</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleSelectTab('vouchers')}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    activeTab === 'vouchers'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">รายการใบสำคัญทั้งหมด</div>
                      <div className="text-xs text-slate-400">{totalVouchersCount} ฉบับในระบบ</div>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono font-semibold">
                    {totalVouchersCount}
                  </span>
                </button>

                <button
                  onClick={() => handleSelectTab('vault')}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    activeTab === 'vault'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <FolderArchive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">คลังไฟล์แนบลูกค้า</div>
                      <div className="text-xs text-slate-400">สลิปและเอกสารต้นฉบับ</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleSelectTab('wht_report')}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    activeTab === 'wht_report'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">ภาษี ภ.ง.ด. 3/53</div>
                      <div className="text-xs text-slate-400">แบบยื่นภาษีและ 50 ทวิ</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleSelectTab('tax_guide')}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    activeTab === 'tax_guide'
                      ? 'bg-amber-50 border-amber-200 text-amber-800 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">วิเคราะห์สรรพากร</div>
                      <div className="text-xs text-slate-400">เกณฑ์ความเสี่ยงภาษีสรรพากร</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleSelectTab('annual_summary')}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    activeTab === 'annual_summary'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">สรุปงบการเงินประจำปี</div>
                      <div className="text-xs text-slate-400">รายได้ รายจ่าย กำไรสุทธิ P&L</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleSelectTab('customers')}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    activeTab === 'customers'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold ring-1 ring-blue-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 font-prompt">ฐานข้อมูลรายชื่อลูกค้า (Customer Directory)</div>
                      <div className="text-xs text-slate-500">{customerCount} บริษัทในระบบ • ซิงค์ Google Sheets</div>
                    </div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
                    {customerCount}
                  </span>
                </button>
              </div>

              {/* Quick Create Buttons Grid */}
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-2">
                ออกเอกสารใหม่
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectTab('create_pv')}
                  className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-medium transition cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
                  <div className="text-left">
                    <div className="text-xs font-bold">+ ใบสำคัญจ่าย (PV)</div>
                    <div className="text-[11px] text-rose-600">บันทึกรายจ่าย</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectTab('create_rv')}
                  className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-medium transition cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <div className="text-xs font-bold">+ ใบสำคัญรับ (RV)</div>
                    <div className="text-[11px] text-emerald-600">บันทึกรายรับ</div>
                  </div>
                </button>
              </div>

              {/* Font Size Selector for Mobile */}
              {onChangeFontSize && (
                <div className="pt-1">
                  <FontSizeSelector
                    fontSize={fontSize}
                    onChangeFontSize={onChangeFontSize}
                    variant="mobile"
                  />
                </div>
              )}

              {/* Quick Sample Data Manager in Mobile Drawer */}
              {onOpenSampleDataModal && (
                <button
                  onClick={() => {
                    onOpenSampleDataModal();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSampleEnabled
                      ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-950'
                      : 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSampleEnabled ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">
                        {isSampleEnabled ? 'ข้อมูลตัวอย่าง: กำลังเปิดอยู่' : 'โหมดข้อมูลจริง: เปิดใช้งาน'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {isSampleEnabled ? 'คลิกเพื่อปิด/ล้างตัวอย่าง เพื่อเริ่มใช้จริง' : 'ระบบว่างเปล่า พร้อมบันทึกบัญชีจริง'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {/* Quick Backup Option in Mobile Drawer */}
              {onOpenBackupModal && (
                <button
                  onClick={() => {
                    onOpenBackupModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-800 flex items-center justify-center">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">สำรองข้อมูลลงคอมพิวเตอร์ (.json)</div>
                      <div className="text-xs text-indigo-700">ดาวน์โหลดหรือกู้คืนฐานข้อมูลจากไฟล์ในเครื่อง</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </button>
              )}

              {/* Quick Firebase Cloud Option in Mobile Drawer */}
              {onOpenFirebaseSyncModal && (
                <button
                  onClick={() => {
                    onOpenFirebaseSyncModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-950 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center relative">
                      <Cloud className="w-4 h-4" />
                      {isCloudConnected && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        <span>ฐานข้อมูลคลาวด์ Firebase</span>
                        {isCloudConnected && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded-sm">
                            ซิงค์สดเรียลไทม์
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-amber-800/80">
                        {isCloudConnected
                          ? 'ข้อมูลเชื่อมโยงตรงกันทุกเครื่อง (PC, มือถือ, Tablet)'
                          : 'ซิงค์ข้อมูลระหว่างเครื่องและคลาวด์อัตโนมัติ'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600" />
                </button>
              )}

              {/* Quick Accounting Software Export in Mobile Drawer */}
              {onOpenAccountingExportModal && (
                <button
                  onClick={() => {
                    onOpenAccountingExportModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-300 bg-blue-50/80 hover:bg-blue-100 text-blue-950 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-200 text-blue-800 flex items-center justify-center">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">ส่งออกโปรแกรมบัญชี (Express / PEAK)</div>
                      <div className="text-xs text-blue-800/80">แปลงไฟล์ CSV สำหรับเดือนปัจจุบัน</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-600" />
                </button>
              )}

              {/* Prominent System Settings Card */}
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-2">
                การตั้งค่าและเครื่องมือระบบ
              </div>
              <button
                onClick={() => handleSelectTab('settings')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    activeTab === 'settings' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">ตั้งค่าระบบ & ธนาคาร (Settings)</div>
                    <div className={`text-xs ${activeTab === 'settings' ? 'text-blue-100' : 'text-slate-500'}`}>
                      ข้อมูลบริษัท, บัญชีธนาคาร, โลโก้, และระบบสำรองข้อมูล
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  onSyncSheet();
                  setMobileMenuOpen(false);
                }}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition flex-1 justify-center"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'กำลังดึงข้อมูลชีต...' : 'ดึงข้อมูล Google Sheet สด'}</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                ปิดเมนู
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
