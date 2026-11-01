import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  X,
  Database,
  ArrowDownLeft,
  ArrowUpRight,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Cloud,
  ChevronDown,
  LayoutGrid,
  List,
  Filter,
  Briefcase,
  Share2,
  Sparkles
} from 'lucide-react';
import { Customer, CustomerSheetSyncConfig } from '../types';
import {
  fetchLiveGoogleSheetCustomers,
  formatTaxIdWithHyphens,
  mergeCustomers,
  cleanTaxId,
  parseCSVToCustomers,
  downloadCustomersAsExcel,
  downloadCustomersAsCsv,
  downloadCustomersAsJson,
  pushAllCustomersToFirebase,
  reloadAcpMasterCustomers,
} from '../utils/customerSync';
import * as XLSX from 'xlsx';

interface CustomerDirectoryViewProps {
  customers: Customer[];
  onUpdateCustomers: (newCustomers: Customer[]) => void;
  customerSheetConfig: CustomerSheetSyncConfig;
  onUpdateSheetConfig: (config: CustomerSheetSyncConfig) => void;
  onCreateRVWithCustomer?: (customer: Customer) => void;
  onCreatePVWithCustomer?: (customer: Customer) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomerDirectoryView: React.FC<CustomerDirectoryViewProps> = ({
  customers,
  onUpdateCustomers,
  customerSheetConfig,
  onUpdateSheetConfig,
  onCreateRVWithCustomer,
  onCreatePVWithCustomer,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'taxId'>('code');

  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [showSheetSettings, setShowSheetSettings] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState(customerSheetConfig.sheetUrl || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedFullInfoId, setCopiedFullInfoId] = useState<string | null>(null);

  // Notice alert banner
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Add / Edit Modal state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    customerCode: '',
    name: '',
    taxId: '',
    address: '',
    branch: 'สำนักงานใหญ่',
    branchCode: '00000',
    assignedStaff: '',
    phone: '',
    email: '',
    contactPerson: '',
  });

  const notify = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotice({ text, type });
    if (showToast) showToast(text, type);
  };

  // Distinct staff list for filter pills
  const availableStaffs = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.assignedStaff && c.assignedStaff.trim()) {
        set.add(c.assignedStaff.trim());
      }
    });
    return Array.from(set).sort();
  }, [customers]);

  // Filtered & Sorted customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Staff filter
    if (selectedStaffFilter !== 'all') {
      result = result.filter((c) => c.assignedStaff === selectedStaffFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const qDigits = q.replace(/[^0-9]/g, '');

      result = result.filter((c) => {
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = c.customerCode ? c.customerCode.toLowerCase().includes(q) : false;
        const matchAddress = c.address.toLowerCase().includes(q);
        const matchStaff = c.assignedStaff ? c.assignedStaff.toLowerCase().includes(q) : false;
        const matchContact = c.contactPerson ? c.contactPerson.toLowerCase().includes(q) : false;
        const matchPhone = c.phone ? c.phone.includes(q) : false;

        let matchTax = false;
        if (c.taxId) {
          const taxDigits = c.taxId.replace(/[^0-9]/g, '');
          if (qDigits && taxDigits.includes(qDigits)) matchTax = true;
          else if (c.taxId.toLowerCase().includes(q)) matchTax = true;
        }

        return matchName || matchTax || matchAddress || matchCode || matchStaff || matchContact || matchPhone;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'code') {
        const codeA = a.customerCode || a.id || '';
        const codeB = b.customerCode || b.id || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'th');
      }
      if (sortBy === 'taxId') {
        return (a.taxId || '').localeCompare(b.taxId || '');
      }
      return 0;
    });

    return result;
  }, [customers, selectedStaffFilter, searchQuery, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const withTaxId = customers.filter((c) => cleanTaxId(c.taxId).length === 13).length;
    const hqCount = customers.filter((c) => !c.branch || c.branch.includes('สำนักงานใหญ่')).length;
    const fromSheet = customers.filter((c) => c.source === 'GoogleSheet').length;
    return { total, withTaxId, hqCount, fromSheet };
  }, [customers]);

  // Copy helpers
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyFullInfo = (c: Customer) => {
    const full = `ชื่อบริษัท: ${c.name}\nเลขนิติบุคคล: ${c.taxId ? formatTaxIdWithHyphens(c.taxId) : '-'}\nที่อยู่: ${c.address}\nสาขา: ${c.branch || 'สำนักงานใหญ่'}${c.phone ? `\nโทร: ${c.phone}` : ''}${c.assignedStaff ? `\nผู้ส่งงาน: ${c.assignedStaff}` : ''}`;
    navigator.clipboard.writeText(full);
    setCopiedFullInfoId(c.id);
    notify(`คัดลอกข้อมูลบริษัท "${c.name}" ทั้งหมดเรียบร้อยแล้ว`, 'info');
    setTimeout(() => setCopiedFullInfoId(null), 2500);
  };

  // Sync from Google Sheets
  const handleSyncSheet = async () => {
    const targetUrl = sheetUrlInput.trim() || customerSheetConfig.sheetUrl;
    if (!targetUrl) {
      notify('กรุณาระบุลิงก์ Google Sheets ก่อนซิงค์', 'error');
      return;
    }

    setIsSyncing(true);
    notify('กำลังเชื่อมต่อและดึงข้อมูลรายชื่อลูกค้าจาก Google Sheets...', 'info');

    try {
      const result = await fetchLiveGoogleSheetCustomers(targetUrl);
      if (result.success && result.customers && result.customers.length > 0) {
        const merged = mergeCustomers(customers, result.customers);
        onUpdateCustomers(merged);
        onUpdateSheetConfig({
          ...customerSheetConfig,
          sheetUrl: targetUrl,
          lastSyncedAt: new Date().toISOString(),
          status: 'success',
          statusMessage: `ซิงค์สำเร็จ ${result.count} บริษัท`,
        });
        notify(
          `ดึงข้อมูลลูกค้าจาก Google Sheets สำเร็จ! อัปเดต ${result.count} รายการ (รวมทั้งสิ้น ${merged.length} บริษัทในระบบ)`,
          'success'
        );
      } else {
        notify(
          result.error ||
            'ไม่พบข้อมูลลูกค้าในชีต กรุณาตรวจสอบว่าชีตตั้งค่าเป็น "Anyone with the link can view"',
          'error'
        );
      }
    } catch (e: any) {
      notify('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + (e.message || 'ไม่ทราบสาเหตุ'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Push to Cloud (Firebase Firestore)
  const handlePushToCloud = async () => {
    setIsPushingCloud(true);
    notify('กำลังจัดเก็บและซิงค์รายชื่อลูกค้าทั้งหมดขึ้นระบบ Cloud (Firebase Firestore)...', 'info');
    try {
      const res = await pushAllCustomersToFirebase(customers);
      if (res.success) {
        notify(
          `☁️ จัดเก็บรายชื่อลูกค้า ${res.count} บริษัทลงระบบ Cloud สำเร็จ! ข้อมูลจะตรงกันทุกอุปกรณ์ทั้ง PC และสมาร์ทโฟน`,
          'success'
        );
      } else {
        notify('ไม่สามารถจัดเก็บบน Cloud ได้: ' + (res.error || 'กรุณาตรวจสอบอินเทอร์เน็ต'), 'error');
      }
    } catch (err: any) {
      notify('เกิดข้อผิดพลาดในการจัดเก็บบน Cloud: ' + err.message, 'error');
    } finally {
      setIsPushingCloud(false);
    }
  };

  // Reload Authentic 208 ACP Master list
  const handleReloadMaster = () => {
    if (confirm('คุณต้องการโหลดฐานข้อมูลตั้งต้นของลูกค้า ACP ทั้งหมด 208 บริษัทกลับมาใช่หรือไม่?')) {
      const reloaded = reloadAcpMasterCustomers();
      onUpdateCustomers(reloaded);
      notify(`โหลดฐานข้อมูลตั้งต้นลูกค้า ACP ทั้งหมด ${reloaded.length} บริษัทกลับมาเรียบร้อยแล้ว!`, 'success');
    }
  };

  // Excel / CSV / JSON Download Handlers
  const handleExportExcel = () => {
    downloadCustomersAsExcel(customers);
    setDownloadMenuOpen(false);
    notify(`ดาวน์โหลดรายชื่อลูกค้าทั้งหมด ${customers.length} บริษัทเป็นไฟล์ Excel (.xlsx) เรียบร้อยแล้ว`, 'success');
  };

  const handleExportCsv = () => {
    downloadCustomersAsCsv(customers);
    setDownloadMenuOpen(false);
    notify(`ดาวน์โหลดรายชื่อลูกค้าทั้งหมด ${customers.length} บริษัทเป็นไฟล์ CSV (UTF-8 BOM) เรียบร้อยแล้ว`, 'success');
  };

  const handleExportJson = () => {
    downloadCustomersAsJson(customers);
    setDownloadMenuOpen(false);
    notify(`ดาวน์โหลดไฟล์สำรองข้อมูล JSON (.json) ${customers.length} บริษัทเรียบร้อยแล้ว`, 'success');
  };

  // Import file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (jsonRows && jsonRows.length > 1) {
          const imported = parseCSVToCustomers(jsonRows);
          if (imported.length > 0) {
            const merged = mergeCustomers(customers, imported);
            onUpdateCustomers(merged);
            notify(`นำเข้าไฟล์สำเร็จ! อัปเดต ${imported.length} รายการ (รวมทั้งสิ้น ${merged.length} บริษัทในระบบ)`, 'success');
          } else {
            notify('ไม่พบคอลัมน์ที่ตรงกับข้อมูลลูกค้าในไฟล์ที่นำเข้า', 'error');
          }
        }
      } catch (err: any) {
        notify('เกิดข้อผิดพลาดในการเปิดไฟล์: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Add / Edit form openers
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      customerCode: `ACP-${String(customers.length + 1).padStart(4, '0')}`,
      name: '',
      taxId: '',
      address: '',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      assignedStaff: '',
      phone: '',
      email: '',
      contactPerson: '',
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      customerCode: c.customerCode || '',
      name: c.name,
      taxId: c.taxId,
      address: c.address,
      branch: c.branch || 'สำนักงานใหญ่',
      branchCode: c.branchCode || '00000',
      assignedStaff: c.assignedStaff || '',
      phone: c.phone || '',
      email: c.email || '',
      contactPerson: c.contactPerson || '',
    });
    setIsAddEditOpen(true);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`คุณต้องการลบรายชื่อลูกค้า "${name}" ออกจากระบบใช่หรือไม่?`)) {
      const updated = customers.filter((c) => c.id !== id);
      onUpdateCustomers(updated);
      notify(`ลบรายชื่อลูกค้า "${name}" ออกจากระบบเรียบร้อยแล้ว`, 'info');
    }
  };

  const handleSaveCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('กรุณาระบุชื่อบริษัท / ชื่อลูกค้า');
      return;
    }

    if (editingCustomer) {
      const updated = customers.map((c) =>
        c.id === editingCustomer.id
          ? {
              ...c,
              ...formData,
              taxId: cleanTaxId(formData.taxId) || formData.taxId,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      onUpdateCustomers(updated);
      notify(`แก้ไขข้อมูลลูกค้า "${formData.name}" เรียบร้อยแล้ว`, 'success');
    } else {
      const newCust: Customer = {
        id: formData.customerCode || `CUST-${Date.now()}`,
        ...formData,
        taxId: cleanTaxId(formData.taxId) || formData.taxId,
        source: 'Manual',
        updatedAt: new Date().toISOString(),
      };
      onUpdateCustomers([newCust, ...customers]);
      notify(`เพิ่มลูกค้าใหม่ "${formData.name}" เรียบร้อยแล้ว`, 'success');
    }

    setIsAddEditOpen(false);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* View Header with Gradient Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-800/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
                <span>Customer Directory Master</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-300" />
                <span>Google Sheets &amp; Cloud Ready</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-prompt text-white tracking-tight">
              ฐานข้อมูลรายชื่อลูกค้า &amp; นิติบุคคล
            </h1>
            <p className="text-sm text-blue-100/90 max-w-3xl leading-relaxed">
              ดึงข้อมูลรายชื่อลูกค้าจาก Google Sheets (ACP-รายชื่อลูกค้าทั้งหมด), จัดเก็บในระบบ Cloud, 
              พิมพ์ค้นหาชื่อบริษัท หรือเลขนิติบุคคล 13 หลัก เพื่อนำไปออกใบสำคัญรับ (RV), ใบสำคัญจ่าย (PV) และหนังสือรับรอง 50 ทวิได้ทันที
            </p>
          </div>

          {/* Quick Action Top Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSyncSheet}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              title="ดึงข้อมูลรายชื่อลูกค้าล่าสุดจาก Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูล Google Sheets (Sync Live)'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มลูกค้ารายใหม่</span>
            </button>
          </div>
        </div>

        {/* Google Sheet URL Config Link Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">ชีต Google Sheets ที่เชื่อมโยง:</span>
            <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded truncate max-w-md">
              {customerSheetConfig.sheetUrl || 'ACP - รายชื่อลูกค้าทั้งหมด'}
            </span>
            <button
              type="button"
              onClick={() => setShowSheetSettings(!showSheetSettings)}
              className="text-blue-300 hover:text-white underline ml-1 cursor-pointer font-medium"
            >
              {showSheetSettings ? 'ซ่อนการตั้งค่า' : 'เปลี่ยนลิงก์ Google Sheets'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {customerSheetConfig.lastSyncedAt && (
              <span className="text-[11px] text-blue-200/80 font-mono">
                ซิงค์ล่าสุด: {new Date(customerSheetConfig.lastSyncedAt).toLocaleString('th-TH')}
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Sheet URL Input */}
        {showSheetSettings && (
          <div className="mt-3 p-4 bg-white/10 rounded-xl border border-white/15 space-y-2 text-xs">
            <label className="block text-blue-200 font-medium">
              ระบุ URL ลิงก์ Google Sheets (ตั้งค่าการแชร์ในชีตเป็น &quot;ทุกคนที่มีลิงก์มีสิทธิ์ดู&quot; หรือ Anyone with the link can view)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="flex-1 px-3 py-2 bg-white text-slate-900 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 font-mono"
              />
              <button
                type="button"
                onClick={handleSyncSheet}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2 rounded-lg shrink-0 cursor-pointer transition shadow-xs"
              >
                บันทึก &amp; ดึงข้อมูลทันที
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border transition shadow-2xs ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            )}
            <span className="font-medium">{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">ลูกค้าทั้งหมดในระบบ</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-prompt text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">บริษัท/นิติบุคคลในระบบ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">มีเลขนิติบุคคล 13 หลัก</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-prompt text-emerald-700">{stats.withTaxId}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">พร้อมออกใบเสร็จ &amp; 50 ทวิ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">สำนักงานใหญ่ / สาขา</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-prompt text-indigo-900">{stats.hqCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">สำนักงานใหญ่ (Head Office)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">พนักงานผู้รับผิดชอบงาน</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-prompt text-amber-900">{availableStaffs.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">ผู้ส่งงาน (เช่น ปุ๋ย, ซุ่น, จอย...)</div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Cloud, Export */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Main Search Bar */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ค้นหาด้วย: ชื่อบริษัท, เลขนิติบุคคล 13 หลัก, ที่อยู่, รหัสลูกค้า (ACP-xxxx), ผู้ส่งงาน..."
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition shadow-2xs text-slate-900 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Toolbar Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Push to Cloud Button */}
            <button
              type="button"
              onClick={handlePushToCloud}
              disabled={isPushingCloud}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
              title="จัดเก็บรายชื่อลูกค้าทั้งหมดขึ้นระบบ Cloud (Firebase Firestore) ข้อมูลเชื่อมต่อตรงกันทุกอุปกรณ์"
            >
              <Cloud className={`w-3.5 h-3.5 ${isPushingCloud ? 'animate-bounce' : ''}`} />
              <span>{isPushingCloud ? 'กำลังบันทึกลง Cloud...' : 'จัดเก็บบน Cloud'}</span>
            </button>

            {/* Download Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-3.5 py-2 rounded-xl shadow-2xs transition cursor-pointer font-medium"
                title="ดาวน์โหลดรายชื่อลูกค้าทั้งหมดมาจัดเก็บในเครื่องคอมพิวเตอร์"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>ดาวน์โหลดลงเครื่อง</span>
                <ChevronDown className="w-3 h-3 text-emerald-600" />
              </button>

              {downloadMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    เลือกรูปแบบไฟล์สำหรับจัดเก็บในเครื่อง
                  </div>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel Spreadsheet (.xlsx)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">แนะนำ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>ไฟล์ CSV (.csv - UTF-8 BOM)</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ไฟล์สำรอง JSON (.json)</span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Import File Button */}
            <label className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs px-3 py-2 rounded-xl shadow-2xs transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>นำเข้าไฟล์</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Reload Original 208 Master Button */}
            <button
              type="button"
              onClick={handleReloadMaster}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl transition cursor-pointer border border-slate-200"
              title="โหลดรายชื่อลูกค้า ACP ทั้งหมด 208 บริษัทจากฐานข้อมูลหลัก"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>โหลดฐานข้อมูล ACP (208 บริษัท)</span>
            </button>

            {/* Layout Toggle (Cards vs Table) */}
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองแบบการ์ด"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองแบบตาราง"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills Row (Staff / Sort) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-medium flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>ผู้ส่งงาน:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedStaffFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
                selectedStaffFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({customers.length})
            </button>

            {availableStaffs.map((staff) => {
              const count = customers.filter((c) => c.assignedStaff === staff).length;
              return (
                <button
                  key={staff}
                  type="button"
                  onClick={() => setSelectedStaffFilter(staff)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
                    selectedStaffFilter === staff
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {staff} ({count})
                </button>
              );
            })}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="code">รหัสลูกค้า (ACP Code)</option>
              <option value="name">ชื่อบริษัท (ก - ฮ)</option>
              <option value="taxId">เลขทะเบียนนิติบุคคล</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <div>
          แสดงผลลูกค้า <strong>{filteredCustomers.length}</strong> บริษัท (จากทั้งหมด {customers.length} บริษัท)
          {searchQuery && (
            <span className="ml-2 bg-amber-100 text-amber-850 px-2 py-0.5 rounded font-medium">
              คำค้นหา: &quot;{searchQuery}&quot;
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          💡 คลิกปุ่ม <strong>&quot;ออก RV&quot;</strong> หรือ <strong>&quot;ออก PV&quot;</strong> เพื่อดึงข้อมูลลูกค้าไปลงฟอร์มและเปิดใบสำคัญได้ทันที
        </div>
      </div>

      {/* Customers List Render */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">ไม่พบรายชื่อลูกค้าที่ตรงกับเงื่อนไข</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            ลองปรับเปลี่ยนคำค้นหา หรือคลิกปุ่มด้านล่างเพื่อโหลดฐานข้อมูลตั้งต้นของลูกค้า ACP ทั้งหมด 208 บริษัท
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedStaffFilter('all');
              }}
              className="text-xs text-blue-600 underline font-medium cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleReloadMaster}
              className="text-xs text-emerald-700 font-bold underline cursor-pointer"
            >
              โหลดฐานข้อมูล ACP (208 บริษัท)
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all p-5 flex flex-col justify-between group shadow-2xs"
            >
              <div className="space-y-3">
                {/* Card Top: Code & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cust.customerCode && (
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg">
                        {cust.customerCode}
                      </span>
                    )}
                    {cust.assignedStaff && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium px-2 py-0.5 rounded-lg">
                        ผู้ส่ง: {cust.assignedStaff}
                      </span>
                    )}
                    {cust.source === 'GoogleSheet' && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0.2 rounded">
                        Google Sheets
                      </span>
                    )}
                  </div>

                  {/* Edit & Delete & Copy Full Info */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyFullInfo(cust)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="คัดลอกข้อมูลบริษัททั้งหมด"
                    >
                      {copiedFullInfoId === cust.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cust)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="แก้ไขข้อมูลลูกค้า"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="ลบลูกค้ารายนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm font-prompt leading-snug group-hover:text-blue-700 transition">
                    {cust.name}
                  </h3>
                </div>

                {/* Tax ID Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-slate-700 truncate">
                    <span className="text-slate-400 block text-[10px] font-sans">เลขทะเบียนนิติบุคคล 13 หลัก:</span>
                    <strong className="text-blue-900 tracking-wide font-bold">
                      {cust.taxId ? formatTaxIdWithHyphens(cust.taxId) : '(ยังไม่ระบุ)'}
                    </strong>
                  </div>

                  {cust.taxId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(cust.taxId, cust.id)}
                      className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"
                      title="คัดลอกเลขทะเบียนนิติบุคคล 13 หลัก"
                    >
                      {copiedId === cust.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Address Box */}
                <div className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{cust.address || '(ไม่มีที่อยู่)'}</span>
                </div>

                {/* Meta Row: Branch / Phone */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-1">
                  {cust.branch && <span>สาขา: {cust.branch}</span>}
                  {cust.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{cust.phone}</span>
                    </span>
                  )}
                  {cust.contactPerson && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{cust.contactPerson}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Card Bottom: Quick Create RV & PV Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                {onCreateRVWithCustomer && (
                  <button
                    type="button"
                    onClick={() => onCreateRVWithCustomer(cust)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 rounded-xl shadow-2xs transition cursor-pointer"
                    title="ออกใบสำคัญรับ (RV) โดยดึงข้อมูลลูกค้ารายนี้ไปลงฟอร์มทันที"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>ออก RV</span>
                  </button>
                )}

                {onCreatePVWithCustomer && (
                  <button
                    type="button"
                    onClick={() => onCreatePVWithCustomer(cust)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2 px-3 rounded-xl shadow-2xs transition cursor-pointer"
                    title="ออกใบสำคัญจ่าย (PV) โดยดึงข้อมูลลูกค้ารายนี้ไปลงฟอร์มทันที"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>ออก PV</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">รหัส</th>
                  <th className="py-3 px-4">ชื่อบริษัท / ลูกค้า</th>
                  <th className="py-3 px-4">เลขทะเบียนนิติบุคคล 13 หลัก</th>
                  <th className="py-3 px-4">ที่อยู่สำนักงาน / ภ.พ.20</th>
                  <th className="py-3 px-4">ผู้ส่งงาน</th>
                  <th className="py-3 px-4 text-center">ดึงไปออกเอกสาร</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-blue-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {cust.customerCode || cust.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-prompt">
                      <div>{cust.name}</div>
                      {cust.branch && <div className="text-[10px] text-slate-400 font-normal">{cust.branch}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">
                          {cust.taxId ? formatTaxIdWithHyphens(cust.taxId) : '-'}
                        </span>
                        {cust.taxId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(cust.taxId, cust.id)}
                            className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                            title="คัดลอกเลขทะเบียน"
                          >
                            {copiedId === cust.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md truncate" title={cust.address}>
                      {cust.address}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {cust.assignedStaff ? (
                        <span className="bg-amber-50 text-amber-850 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                          {cust.assignedStaff}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {onCreateRVWithCustomer && (
                          <button
                            type="button"
                            onClick={() => onCreateRVWithCustomer(cust)}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] py-1 px-2.5 rounded-lg shadow-2xs transition cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>ออก RV</span>
                          </button>
                        )}
                        {onCreatePVWithCustomer && (
                          <button
                            type="button"
                            onClick={() => onCreatePVWithCustomer(cust)}
                            className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] py-1 px-2.5 rounded-lg shadow-2xs transition cursor-pointer"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            <span>ออก PV</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyFullInfo(cust)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                          title="คัดลอกข้อมูลทั้งหมด"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base font-prompt">
                  {editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มรายชื่อลูกค้าใหม่'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    รหัสลูกค้า (Customer Code)
                  </label>
                  <input
                    type="text"
                    value={formData.customerCode}
                    onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                    placeholder="ACP-0001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ผู้ส่งงาน (พนักงานผู้รับผิดชอบ)
                  </label>
                  <input
                    type="text"
                    value={formData.assignedStaff}
                    onChange={(e) => setFormData({ ...formData, assignedStaff: e.target.value })}
                    placeholder="เช่น ปุ๋ย (PNK), ซุ่น, จอย..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ชื่อบริษัท / ชื่อลูกค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น บริษัท เลิศนที โลหะกิจ 1996 จำกัด"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    เลขทะเบียนนิติบุคคล / เลขผู้เสียภาษี (13 หลัก)
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="เช่น 0105529032035"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    สาขา
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="สำนักงานใหญ่"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ที่อยู่สำนักงาน / ที่อยู่ตาม ภ.พ.20
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="เลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="02-xxx-xxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">ชื่อผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="คุณสมชาย"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  {editingCustomer ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้าในระบบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
