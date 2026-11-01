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
  ArrowRight,
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
  CheckCheck
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
  clearStoredCustomers,
  clearAllCustomersFromFirebase,
  saveCustomers,
  saveCustomerSheetConfig,
} from '../utils/customerSync';
import * as XLSX from 'xlsx';

interface CustomerDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onUpdateCustomers: (newCustomers: Customer[]) => void;
  customerSheetConfig: CustomerSheetSyncConfig;
  onUpdateSheetConfig: (config: CustomerSheetSyncConfig) => void;
  onSelectCustomer?: (customer: Customer) => void;
  onCreateRVWithCustomer?: (customer: Customer) => void;
  onCreatePVWithCustomer?: (customer: Customer) => void;
  isSelectionMode?: boolean;
}

export const CustomerDirectoryModal: React.FC<CustomerDirectoryModalProps> = ({
  isOpen,
  onClose,
  customers,
  onUpdateCustomers,
  customerSheetConfig,
  onUpdateSheetConfig,
  onSelectCustomer,
  onCreateRVWithCustomer,
  onCreatePVWithCustomer,
  isSelectionMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [sheetUrlInput, setSheetUrlInput] = useState(customerSheetConfig.sheetUrl || '');
  const [showSheetSettings, setShowSheetSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [isPushingCloud, setIsPushingCloud] = useState(false);

  // Manual Add / Edit Customer form modal
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    address: '',
    branch: 'สำนักงานใหญ่',
    branchCode: '00000',
    phone: '',
    email: '',
    contactPerson: '',
  });

  if (!isOpen) return null;

  // Filtered customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.trim().toLowerCase();
    const qDigits = q.replace(/[^0-9]/g, '');

    return customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchAddress = c.address.toLowerCase().includes(q);
      const matchContact = c.contactPerson ? c.contactPerson.toLowerCase().includes(q) : false;
      const matchPhone = c.phone ? c.phone.includes(q) : false;
      
      let matchTax = false;
      if (c.taxId) {
        const taxDigits = c.taxId.replace(/[^0-9]/g, '');
        if (qDigits && taxDigits.includes(qDigits)) {
          matchTax = true;
        } else if (c.taxId.toLowerCase().includes(q)) {
          matchTax = true;
        }
      }

      return matchName || matchTax || matchAddress || matchContact || matchPhone;
    });
  }, [customers, searchQuery]);

  // Handle Sync from Google Sheets (Supports both Replace and Merge)
  const handleSyncSheet = async (forcedMode?: 'replace' | 'merge' | any) => {
    const targetUrl = (sheetUrlInput || customerSheetConfig.sheetUrl || '').trim();
    if (!targetUrl) {
      setShowSheetSettings(true);
      setSyncMessage({ text: 'กรุณาระบุลิงก์ Google Sheets ก่อนซิงค์', type: 'error' });
      return;
    }

    const isSpecificMode = forcedMode === 'replace' || forcedMode === 'merge';
    let mode: 'replace' | 'merge' = isSpecificMode ? forcedMode : 'replace';
    if (!isSpecificMode && customers.length > 0) {
      const userChoice = window.confirm(
        `พบข้อมูลลูกค้าเดิมในระบบ ${customers.length} บริษัท\n\n- กด [ตกลง (OK)] เพื่อ "ลบข้อมูลเดิมแล้วแทนที่ด้วยข้อมูลจาก Google Sheets ชุดนี้ทั้งหมด"\n- กด [ยกเลิก (Cancel)] เพื่อ "รวมข้อมูล (Merge)" เพิ่มเติมเข้ากับของเดิม`
      );
      mode = userChoice ? 'replace' : 'merge';
    }

    setIsSyncing(true);
    setSyncMessage({ text: 'กำลังเชื่อมต่อและดึงข้อมูลรายชื่อลูกค้าจาก Google Sheets...', type: 'info' });

    try {
      const result = await fetchLiveGoogleSheetCustomers(targetUrl);
      if (result.success && result.customers && result.customers.length > 0) {
        let finalCustomers: Customer[];
        if (mode === 'replace' || customers.length === 0) {
          finalCustomers = result.customers;
          await clearAllCustomersFromFirebase().catch(() => {});
        } else {
          finalCustomers = mergeCustomers(customers, result.customers);
        }

        onUpdateCustomers(finalCustomers);
        saveCustomers(finalCustomers);
        pushAllCustomersToFirebase(finalCustomers).catch(() => {});

        const updatedConfig = {
          ...customerSheetConfig,
          sheetUrl: targetUrl,
          lastSyncedAt: new Date().toISOString(),
          status: 'success' as const,
          statusMessage: `ซิงค์สำเร็จ ${result.count} บริษัท`,
        };
        onUpdateSheetConfig(updatedConfig);
        saveCustomerSheetConfig(updatedConfig);

        setSyncMessage({
          text:
            mode === 'replace'
              ? `✓ ดึงข้อมูลลูกค้าจาก Google Sheets สำเร็จ! แทนที่ด้วยข้อมูลใหม่ทั้งหมด ${result.count} บริษัท`
              : `✓ ดึงข้อมูลลูกค้าจาก Google Sheets สำเร็จ! เพิ่ม/อัปเดต ${result.count} รายการ (รวมทั้งสิ้น ${finalCustomers.length} บริษัท)`,
          type: 'success',
        });
      } else {
        setSyncMessage({
          text: result.error || 'ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบการแชร์ชีต (ต้องตั้งเป็น Anyone with link can view)',
          type: 'error',
        });
      }
    } catch (e: any) {
      setSyncMessage({ text: 'เกิดข้อผิดพลาด: ' + (e.message || 'ไม่ทราบสาเหตุ'), type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear all sample / customer data
  const handleClearAllCustomers = async () => {
    if (
      window.confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรายชื่อลูกค้าตัวอย่างทั้งหมด (${customers.length} บริษัท) ออกจากระบบ?\n\nเมื่อลบแล้วระบบจะว่างเปล่า เพื่อให้คุณสามารถดึงข้อมูลจริงจาก Google Sheets ได้โดยตรง`
      )
    ) {
      clearStoredCustomers();
      onUpdateCustomers([]);
      await clearAllCustomersFromFirebase().catch(() => {});
      setSyncMessage({ text: 'ลบข้อมูลตัวอย่างเดิมทั้งหมดเรียบร้อยแล้ว พร้อมดึงข้อมูลจาก Google Sheets', type: 'info' });
    }
  };

  // Reload Authentic 208 ACP Master list
  const handleReloadMaster = async () => {
    if (confirm('คุณต้องการโหลดฐานข้อมูลตั้งต้นของลูกค้า ACP ทั้งหมด 208 บริษัทกลับมาใช่หรือไม่?')) {
      const reloaded = reloadAcpMasterCustomers();
      onUpdateCustomers(reloaded);
      await pushAllCustomersToFirebase(reloaded).catch(() => {});
      setSyncMessage({ text: `โหลดฐานข้อมูลตั้งต้นลูกค้า ACP ทั้งหมด ${reloaded.length} บริษัทกลับมาเรียบร้อยแล้ว!`, type: 'success' });
    }
  };

  // Copy Tax ID to clipboard
  const handleCopyTaxId = (taxId: string, id: string) => {
    navigator.clipboard.writeText(taxId);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Add/Edit Modal
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      taxId: '',
      address: '',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '',
      email: '',
      contactPerson: '',
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      taxId: c.taxId,
      address: c.address,
      branch: c.branch || 'สำนักงานใหญ่',
      branchCode: c.branchCode || '00000',
      phone: c.phone || '',
      email: c.email || '',
      contactPerson: c.contactPerson || '',
    });
    setIsAddEditOpen(true);
  };

  // Delete Customer
  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`คุณต้องการลบรายชื่อลูกค้า "${name}" ออกจากระบบใช่หรือไม่?`)) {
      const updated = customers.filter((c) => c.id !== id);
      onUpdateCustomers(updated);
    }
  };

  // Save Add/Edit Customer
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
    } else {
      const newCust: Customer = {
        id: `CUST-${Date.now()}`,
        ...formData,
        taxId: cleanTaxId(formData.taxId) || formData.taxId,
        source: 'Manual',
        updatedAt: new Date().toISOString(),
      };
      onUpdateCustomers([newCust, ...customers]);
    }

    setIsAddEditOpen(false);
  };

  // Download handlers for local storage
  const handleExportExcel = () => {
    downloadCustomersAsExcel(customers);
    setDownloadMenuOpen(false);
    setSyncMessage({
      text: `ดาวน์โหลดรายชื่อลูกค้าทั้งหมด ${customers.length} บริษัทเป็นไฟล์ Excel (.xlsx) ลงเครื่องคอมพิวเตอร์เรียบร้อยแล้ว`,
      type: 'success',
    });
  };

  const handleExportCsv = () => {
    downloadCustomersAsCsv(customers);
    setDownloadMenuOpen(false);
    setSyncMessage({
      text: `ดาวน์โหลดรายชื่อลูกค้าทั้งหมด ${customers.length} บริษัทเป็นไฟล์ CSV (.csv) รองรับภาษาไทย UTF-8 ลงเครื่องเรียบร้อยแล้ว`,
      type: 'success',
    });
  };

  const handleExportJson = () => {
    downloadCustomersAsJson(customers);
    setDownloadMenuOpen(false);
    setSyncMessage({
      text: `ดาวน์โหลดไฟล์สำรองข้อมูล JSON (.json) ${customers.length} บริษัทลงเครื่องเรียบร้อยแล้ว`,
      type: 'success',
    });
  };

  // Push all customers to Firebase Cloud
  const handlePushToCloud = async () => {
    setIsPushingCloud(true);
    setSyncMessage({ text: 'กำลังจัดเก็บและซิงค์รายชื่อลูกค้าทั้งหมดขึ้นระบบ Cloud (Firebase Firestore)...', type: 'info' });
    try {
      const res = await pushAllCustomersToFirebase(customers);
      if (res.success) {
        setSyncMessage({
          text: `☁️ จัดเก็บรายชื่อลูกค้า ${res.count} บริษัทลงระบบ Cloud สำเร็จ! ข้อมูลจะเชื่อมโยงตรงกันทุกอุปกรณ์ทั้ง PC และสมาร์ทโฟน`,
          type: 'success',
        });
      } else {
        setSyncMessage({
          text: 'ไม่สามารถจัดเก็บบน Cloud ได้: ' + (res.error || 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'),
          type: 'error',
        });
      }
    } catch (err: any) {
      setSyncMessage({
        text: 'เกิดข้อผิดพลาดในการจัดเก็บบน Cloud: ' + err.message,
        type: 'error',
      });
    } finally {
      setIsPushingCloud(false);
    }
  };



  // Import from Excel/CSV file upload
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
            setSyncMessage({
              text: `นำเข้าไฟล์สำเร็จ! อัปเดต ${imported.length} รายการ (รวมทั้งสิ้น ${merged.length} บริษัท)`,
              type: 'success',
            });
          } else {
            setSyncMessage({ text: 'ไม่พบคอลัมน์ที่ตรงกับข้อมูลลูกค้าในไฟล์ที่นำเข้า', type: 'error' });
          }
        }
      } catch (err: any) {
        setSyncMessage({ text: 'เกิดข้อผิดพลาดในการเปิดไฟล์: ' + err.message, type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold font-prompt text-white">
                    ฐานข้อมูลรายชื่อลูกค้า & นิติบุคคล
                  </h2>
                  <span className="text-[11px] bg-blue-500/30 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-400/30 font-medium">
                    Google Sheets Live Sync
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 mt-1">
                  ดึงข้อมูลชื่อบริษัท, เลขทะเบียนนิติบุคคล 13 หลัก และที่อยู่สำนักงาน เพื่อนำไปออกใบสำคัญ RV/PV และ 50 ทวิได้ทันที
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sync status & config bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>
                ชีตที่เชื่อมต่อ: <strong>ACP - รายชื่อลูกค้าทั้งหมด</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowSheetSettings(!showSheetSettings)}
                className="text-xs text-blue-300 underline hover:text-white ml-2 cursor-pointer"
              >
                {showSheetSettings ? 'ซ่อนการตั้งค่าลิงก์' : 'แก้ไขลิงก์ Google Sheets'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncSheet}
                disabled={isSyncing}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs shadow-xs transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'กำลังซิงค์...' : 'ดึงข้อมูลจาก Google Sheets (Sync Live)'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Sheet URL Settings Bar */}
          {showSheetSettings && (
            <div className="mt-3 p-3 bg-white/10 rounded-xl border border-white/15 space-y-2">
              <label className="block text-[11px] text-blue-200 font-medium">
                ระบุลิงก์ Google Sheets (ตั้งค่าการแชร์เป็น &quot;ทุกคนที่มีลิงก์มีสิทธิ์ดู&quot; หรือ Anyone with the link can view)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={handleSyncSheet}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shrink-0 cursor-pointer"
                >
                  บันทึก & ซิงค์ทันที
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sync alert banner */}
        {syncMessage && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
              syncMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : syncMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : syncMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              )}
              <span>{syncMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncMessage(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toolbar & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ค้นหาด้วยชื่อบริษัท, เลขนิติบุคคล 13 หลัก, หรือที่อยู่..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Add New Customer */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มลูกค้าใหม่</span>
            </button>

            {/* Cloud Firestore Save Button */}
            <button
              type="button"
              onClick={handlePushToCloud}
              disabled={isPushingCloud}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
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
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-3 py-2 rounded-xl shadow-2xs transition cursor-pointer font-medium"
                title="ดาวน์โหลดรายชื่อลูกค้าทั้งหมดมาจัดเก็บในเครื่องคอมพิวเตอร์"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>ดาวน์โหลดลงเครื่อง</span>
                <ChevronDown className="w-3 h-3 text-emerald-600" />
              </button>

              {downloadMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
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
            <label className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs px-2.5 py-2 rounded-xl shadow-2xs transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">นำเข้าไฟล์</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Clear All Customer / Sample Data Button */}
            <button
              type="button"
              onClick={handleClearAllCustomers}
              disabled={customers.length === 0}
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs px-2.5 py-2 rounded-xl transition cursor-pointer font-medium disabled:opacity-40"
              title="ลบรายชื่อลูกค้าและนิติบุคคลตัวอย่างเดิมทั้งหมดในระบบ เพื่อเตรียมดึงข้อมูลจริงจาก Google Sheets"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>ลบตัวอย่างเดิม</span>
            </button>

            {/* Reload Original 208 Master Button */}
            <button
              type="button"
              onClick={handleReloadMaster}
              className="hidden lg:flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-2.5 py-2 rounded-xl transition cursor-pointer"
              title="โหลดรายชื่อลูกค้า ACP ทั้งหมด 208 บริษัทจากฐานข้อมูลหลัก"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>รีเซ็ต 208 บริษัท</span>
            </button>
          </div>
        </div>

        {/* Results Counter & Helper Bar */}
        <div className="px-5 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span>
              พบลูกค้าทั้งหมด <strong>{filteredCustomers.length}</strong> บริษัท (จากทั้งหมด {customers.length} บริษัทในระบบ)
            </span>
            {searchQuery && (
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-medium">
                กรองคำค้นหา: &quot;{searchQuery}&quot;
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            💡 คลิกเลือกบริษัทเพื่อดึงข้อมูลชื่อ ที่อยู่ และเลขนิติบุคคลไปลงฟอร์มอัตโนมัติ
          </span>
        </div>

        {/* Customer List Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">ไม่พบรายชื่อลูกค้าที่ตรงกับคำค้นหา</div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                ลองค้นหาด้วยคำอื่น หรือกดปุ่ม <strong>&quot;ดึงข้อมูลจาก Google Sheets&quot;</strong> เพื่อซิงค์รายชื่อลูกค้าทั้งหมดเข้ามาในระบบ
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-blue-600 underline cursor-pointer"
                >
                  ล้างคำค้นหา
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleSyncSheet}
                  className="text-xs text-emerald-600 font-semibold underline cursor-pointer"
                >
                  ซิงค์จาก Google Sheets ทันที
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCustomers.map((cust, idx) => (
                <div
                  key={cust.id || `cust-${idx}`}
                  className={`p-4 rounded-xl border transition-all text-left relative flex flex-col justify-between ${
                    selectedCustomerId === cust.id
                      ? 'border-blue-600 bg-blue-50/70 shadow-md ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Top Row: Company Name & Source Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm font-prompt leading-tight">
                            {cust.name}
                          </h4>
                          {cust.source === 'GoogleSheet' && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                              Google Sheets
                            </span>
                          )}
                        </div>

                        {/* Tax ID with Copy Button */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-bold flex items-center gap-1">
                            <span>เลขนิติบุคคล:</span>
                            <span className="text-blue-900">{formatTaxIdWithHyphens(cust.taxId)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyTaxId(cust.taxId, cust.id)}
                            className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                            title="คัดลอกเลขทะเบียนนิติบุคคล 13 หลัก"
                          >
                            {copiedId === cust.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Edit / Delete small menu */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition cursor-pointer"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="ลบรายชื่อ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Address Section */}
                    <div className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{cust.address}</span>
                    </div>

                    {/* Meta info: Branch, Phone, Contact */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
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

                  {/* Action Buttons: Select / Issue RV / Issue PV */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    {onSelectCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          onSelectCustomer(cust);
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>เลือกลูกค้ารายนี้</span>
                      </button>
                    )}

                    {onCreateRVWithCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          onCreateRVWithCustomer(cust);
                          onClose();
                        }}
                        className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-[11px] py-1.5 px-2.5 rounded-lg transition cursor-pointer"
                        title="สร้างใบสำคัญรับ (RV) โดยใช้ข้อมูลลูกค้านี้"
                      >
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                        <span>ออก RV</span>
                      </button>
                    )}

                    {onCreatePVWithCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          onCreatePVWithCustomer(cust);
                          onClose();
                        }}
                        className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-semibold text-[11px] py-1.5 px-2.5 rounded-lg transition cursor-pointer"
                        title="สร้างใบสำคัญจ่าย (PV) โดยใช้ข้อมูลลูกค้านี้"
                      >
                        <ArrowUpRight className="w-3 h-3 text-rose-600" />
                        <span>ออก PV</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            ระบบจัดเก็บในฐานข้อมูลเครื่องและคลาวด์ พร้อมใช้งานทุกอุปกรณ์ทั้งมือถือและแท็บเล็ต
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Manual Add / Edit Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-prompt">
                {editingCustomer ? 'แก้ไขข้อมูลลูกค้า / นิติบุคคล' : 'เพิ่มลูกค้ารายใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อบริษัท / ชื่อลูกค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น บริษัท สยาม ซอฟต์แวร์ อินโนเวชั่น จำกัด"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขทะเบียนนิติบุคคล 13 หลัก
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="เช่น 0105556012498"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สาขา</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="สำนักงานใหญ่ หรือ สาขาที่ 1"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ที่อยู่สำนักงาน / ที่อยู่ตาม ภ.พ.20
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="เช่น 184/55 อาคารฟอรั่ม ทาวเวอร์ ชั้น 18 ถ.รัชดาภิเษก ห้วยขวาง กทม. 10310"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="02-xxx-xxxx"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ติดต่อ (Contact Person)</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="คุณสมชาย"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
