import React, { useState, useRef } from 'react';
import {
  Download,
  UploadCloud,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  RefreshCw,
  FolderDown,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Voucher, CompanySettings } from '../types';
import {
  downloadBackupToComputer,
  parseAndValidateBackupFile,
  generateBackupFilename,
  BackupValidationResult,
} from '../utils/fileBackup';
import { formatCurrency } from '../utils/thaiBahtText';

interface ComputerBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  companySettings: CompanySettings;
  onRestoreData: (vouchers: Voucher[], settings?: CompanySettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ComputerBackupModal: React.FC<ComputerBackupModalProps> = ({
  isOpen,
  onClose,
  vouchers,
  companySettings,
  onRestoreData,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');

  // Backup State
  const [includeSettings, setIncludeSettings] = useState<boolean>(true);
  const [usePicker, setUsePicker] = useState<boolean>(true);
  const [customFilename, setCustomFilename] = useState<string>(() =>
    generateBackupFilename(companySettings?.name)
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastExportedFile, setLastExportedFile] = useState<string | null>(null);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreCompanySettings, setRestoreCompanySettings] = useState<boolean>(true);
  const [isProcessingRestore, setIsProcessingRestore] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Calculate live statistics
  const rvList = vouchers.filter((v) => v.type === 'RV');
  const pvList = vouchers.filter((v) => v.type === 'PV');
  const rvTotal = rvList.reduce((sum, v) => sum + (Number(v.netPayable) || Number((v as any).totalAmount) || 0), 0);
  const pvTotal = pvList.reduce((sum, v) => sum + (Number(v.netPayable) || Number((v as any).totalAmount) || 0), 0);

  // Handle file download to computer
  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const res = await downloadBackupToComputer(vouchers, companySettings, {
        filename: customFilename.trim() || undefined,
        includeSettings,
        usePickerIfAvailable: usePicker,
      });

      if (res.success) {
        setLastExportedFile(res.filename);
        showToast(
          `ดาวน์โหลดไฟล์สำรองข้อมูลลงเครื่องคอมพิวเตอร์สำเร็จ (${res.voucherCount} ฉบับ, ${(res.fileSizeBytes / 1024).toFixed(1)} KB)`,
          'success'
        );
      } else if (res.cancelled) {
        showToast('ยกเลิกการเลือกตำแหน่งบันทึกไฟล์', 'info');
      } else {
        showToast(res.error || 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์', 'error');
      }
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection for restore
  const handleFileSelect = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showToast('กรุณาเลือกไฟล์สำรองข้อมูลประเภท .json เท่านั้น', 'error');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseAndValidateBackupFile(content);
      setValidationResult(result);
      if (result.isValid) {
        showToast(
          `ตรวจสอบไฟล์สำเร็จ: พบใบสำคัญ ${result.summary.totalCount} ฉบับพร้อมกู้คืน`,
          'success'
        );
      } else {
        showToast(result.errorMessage || 'ไฟล์ไม่ถูกต้องตามรูปแบบ', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Execute restore
  const handleExecuteRestore = () => {
    if (!validationResult || !validationResult.isValid) {
      showToast('กรุณาเลือกไฟล์สำรองข้อมูลที่ถูกต้องก่อนกู้คืน', 'error');
      return;
    }

    const fileVouchers = validationResult.vouchers;
    if (fileVouchers.length === 0 && !validationResult.companySettings) {
      showToast('ไม่พบข้อมูลสำหรับกู้คืนในไฟล์นี้', 'error');
      return;
    }

    setIsProcessingRestore(true);

    try {
      let finalVouchers: Voucher[] = [];

      if (restoreMode === 'replace') {
        finalVouchers = fileVouchers;
      } else {
        // Merge mode: Add vouchers that don't exist by voucherNo or id
        const existingIds = new Set(vouchers.map((v) => v.id));
        const existingNos = new Set(vouchers.map((v) => v.voucherNo.trim().toUpperCase()));

        const newVouchers = fileVouchers.filter(
          (v) => !existingIds.has(v.id) && !existingNos.has(v.voucherNo.trim().toUpperCase())
        );

        finalVouchers = [...vouchers, ...newVouchers];
      }

      const finalSettings =
        restoreCompanySettings && validationResult.companySettings
          ? validationResult.companySettings
          : undefined;

      onRestoreData(finalVouchers, finalSettings);

      showToast(
        restoreMode === 'replace'
          ? `กู้คืนฐานข้อมูลสำเร็จ แทนที่เอกสารทั้งหมด ${finalVouchers.length} ฉบับเรียบร้อยแล้ว`
          : `ผสานข้อมูลสำเร็จ เพิ่มเอกสารใหม่เรียบร้อยแล้ว (รวมทั้งหมด ${finalVouchers.length} ฉบับ)`,
        'success'
      );

      // Close modal
      setTimeout(() => {
        setIsProcessingRestore(false);
        onClose();
      }, 500);
    } catch (err: any) {
      setIsProcessingRestore(false);
      showToast(`เกิดข้อผิดพลาดในการกู้คืน: ${err.message}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-prompt text-white">
                  สำรองและกู้คืนข้อมูลลงเครื่องคอมพิวเตอร์
                </h3>
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Local Computer Backup
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                จัดเก็บไฟล์ฐานข้อมูล .json ลงในคอมพิวเตอร์ของคุณเพื่อความปลอดภัยสูงสุด
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 py-2.5 px-4 font-semibold text-xs border-b-2 transition cursor-pointer ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด Backup ลงเครื่อง</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full font-mono">
              {vouchers.length} ฉบับ
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex items-center gap-2 py-2.5 px-4 font-semibold text-xs border-b-2 transition cursor-pointer ${
              activeTab === 'restore'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>กู้คืนข้อมูลจากไฟล์ในเครื่อง (Restore)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* TAB 1: BACKUP TO COMPUTER */}
          {activeTab === 'backup' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Summary Stats Card */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>ข้อมูลที่จะทำการบันทึกลงไฟล์สำรอง:</span>
                  </span>
                  <span className="text-[11px] font-mono text-indigo-700 font-semibold">
                    {companySettings?.name || 'Account Planet'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs">
                    <span className="text-slate-500 text-[11px] block">ใบสำคัญทั้งหมด</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {vouchers.length} <span className="text-xs font-normal text-slate-500">ฉบับ</span>
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs">
                    <span className="text-emerald-600 text-[11px] font-semibold block">ใบสำคัญรับ (RV)</span>
                    <span className="text-sm font-bold text-emerald-700 font-mono">
                      ฿{formatCurrency(rvTotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{rvList.length} ฉบับ</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs">
                    <span className="text-rose-600 text-[11px] font-semibold block">ใบสำคัญจ่าย (PV)</span>
                    <span className="text-sm font-bold text-rose-700 font-mono">
                      ฿{formatCurrency(pvTotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{pvList.length} ฉบับ</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs">
                    <span className="text-slate-500 text-[11px] block">รูปแบบไฟล์</span>
                    <span className="text-sm font-bold text-indigo-900 font-mono flex items-center gap-1">
                      JSON (UTF-8)
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">✓ Universal</span>
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-3.5 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>ตัวเลือกการบันทึกไฟล์ (Backup Options)</span>
                </h4>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    ชื่อไฟล์สำรองข้อมูล (.json):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="AccountPlanet-Backup-2026-09-24.json"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCustomFilename(generateBackupFilename(companySettings?.name))
                      }
                      className="px-2.5 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-300 cursor-pointer"
                      title="รีเซ็ตเป็นชื่อไฟล์ตามเวลาปัจจุบัน"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeSettings}
                      onChange={(e) => setIncludeSettings(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-medium">
                      รวมข้อมูลการตั้งค่าบริษัทและบัญชีธนาคาร (Company Info, Banks &amp; Stamp)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={usePicker}
                      onChange={(e) => setUsePicker(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span>
                      เปิดหน้าต่างให้เลือกโฟลเดอร์ปลายทางบนคอมพิวเตอร์ (Save As Dialog - หากเบราว์เซอร์รองรับ)
                    </span>
                  </label>
                </div>
              </div>

              {/* Download CTA Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <FolderDown className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
                  <span>
                    {isExporting
                      ? 'กำลังสร้างและดาวน์โหลดไฟล์...'
                      : 'ดาวน์โหลดไฟล์สำรองข้อมูลลงเครื่องคอมพิวเตอร์ (.json)'}
                  </span>
                </button>
              </div>

              {lastExportedFile && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ดาวน์โหลดไฟล์ล่าสุดเรียบร้อย: <strong className="font-mono">{lastExportedFile}</strong> (จัดเก็บอยู่ในโฟลเดอร์ Downloads หรือโฟลเดอร์ที่คุณเลือก)
                  </span>
                </div>
              )}

              {/* Security & Multi-layer Backup Guarantee Notice */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>คำแนะนำในการดูแลข้อมูลบัญชี:</span>
                </div>
                <p>
                  • ท่านสามารถนำไฟล์สำรองนี้ไปเก็บไว้ใน <strong>External Hard Drive, USB Flash Drive</strong> หรืออัปโหลดไว้ใน <strong>Google Drive / OneDrive</strong> ได้อย่างปลอดภัย
                </p>
                <p>
                  • เมื่อใดก็ตามที่เปลี่ยนเครื่องคอมพิวเตอร์ หรือล้างเบราว์เซอร์ สามารถใช้แท็บ <em>"กู้คืนข้อมูลจากไฟล์ในเครื่อง"</em> นำไฟล์เดิมกลับมาทำงานต่อได้ทันที
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE FROM COMPUTER */}
          {activeTab === 'restore' && (
            <div className="space-y-5 animate-in fade-in">
              {/* File Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files && files[0]) {
                    handleFileSelect(files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-indigo-600">
                  {selectedFile ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-slate-800 font-mono">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      ขนาด: {(selectedFile.size / 1024).toFixed(1)} KB • คลิกเพื่อเปลี่ยนไฟล์
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-slate-800">
                      ลากไฟล์สำรอง (.json) มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์
                    </div>
                    <div className="text-xs text-slate-500">
                      รองรับไฟล์สำรองของ Account Planet หรือไฟล์ชุดเอกสารใบสำคัญในรูปแบบ JSON
                    </div>
                  </div>
                )}
              </div>

              {/* Validation Result Box */}
              {validationResult && (
                <div>
                  {validationResult.isValid ? (
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900 border-b border-emerald-200/60 pb-2">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>ตรวจสอบไฟล์สำรองข้อมูลถูกต้อง สมบูรณ์ (Valid Backup)</span>
                        </span>
                        {validationResult.summary.exportedAt && (
                          <span className="text-[11px] font-normal text-emerald-700">
                            สำรองเมื่อ: {validationResult.summary.exportedAt}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                          <span className="text-slate-500 text-[11px] block">จำนวนใบสำคัญ</span>
                          <span className="text-sm font-bold text-slate-800 font-mono">
                            {validationResult.summary.totalCount} ฉบับ
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                          <span className="text-emerald-600 text-[11px] font-semibold block">ใบสำคัญรับ (RV)</span>
                          <span className="text-xs font-bold text-emerald-700 font-mono">
                            ฿{formatCurrency(validationResult.summary.rvAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{validationResult.summary.rvCount} ฉบับ</span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                          <span className="text-rose-600 text-[11px] font-semibold block">ใบสำคัญจ่าย (PV)</span>
                          <span className="text-xs font-bold text-rose-700 font-mono">
                            ฿{formatCurrency(validationResult.summary.pvAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{validationResult.summary.pvCount} ฉบับ</span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                          <span className="text-slate-500 text-[11px] block">การตั้งค่าบริษัท</span>
                          <span className="text-xs font-bold text-indigo-900 block truncate">
                            {validationResult.companySettings ? '✓ มีในไฟล์' : '- ไม่มี'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {validationResult.summary.companyName || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Restore Configuration Options */}
                      <div className="space-y-2 pt-2 border-t border-emerald-200/60 text-xs">
                        <div className="font-semibold text-slate-800">เลือกรูปแบบการกู้คืน:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                              restoreMode === 'replace'
                                ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 text-indigo-950 shadow-xs'
                                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="restoreMode"
                              value="replace"
                              checked={restoreMode === 'replace'}
                              onChange={() => setRestoreMode('replace')}
                              className="mt-0.5 text-indigo-600"
                            />
                            <div>
                              <div className="font-bold text-xs">แทนที่ข้อมูลทั้งหมด (Replace All)</div>
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                ล้างข้อมูลปัจจุบันและแทนที่ด้วย {validationResult.summary.totalCount} ฉบับจากไฟล์นี้ (แนะนำ)
                              </div>
                            </div>
                          </label>

                          <label
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                              restoreMode === 'merge'
                                ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 text-indigo-950 shadow-xs'
                                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="restoreMode"
                              value="merge"
                              checked={restoreMode === 'merge'}
                              onChange={() => setRestoreMode('merge')}
                              className="mt-0.5 text-indigo-600"
                            />
                            <div>
                              <div className="font-bold text-xs">ผสานข้อมูลเดิม (Merge &amp; Append)</div>
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                คงรายการที่มีอยู่เดิมไว้ และเพิ่มเฉพาะรายการที่ยังไม่ซ้ำจากไฟล์สำรอง
                              </div>
                            </div>
                          </label>
                        </div>

                        {validationResult.companySettings && (
                          <label className="flex items-center gap-2 pt-1 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={restoreCompanySettings}
                              onChange={(e) => setRestoreCompanySettings(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                            />
                            <span>
                              กู้คืนการตั้งค่าบริษัทและบัญชีธนาคารตามไฟล์สำรอง ({validationResult.summary.companyName})
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Warning Notice */}
                      <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>คำเตือน:</strong> เมื่อกดกู้คืน ข้อมูลจะถูกเขียนลง LocalStorage และ IndexedDB ทันที
                        </span>
                      </div>

                      {/* Restore Action Button */}
                      <button
                        type="button"
                        onClick={handleExecuteRestore}
                        disabled={isProcessingRestore}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                      >
                        <UploadCloud className={`w-5 h-5 ${isProcessingRestore ? 'animate-bounce' : ''}`} />
                        <span>
                          {isProcessingRestore
                            ? 'กำลังดำเนินการกู้คืนข้อมูล...'
                            : `ยืนยันกู้คืนข้อมูล (${validationResult.summary.totalCount} ฉบับ)`}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <div className="font-bold">ไฟล์ไม่ถูกต้องหรือไม่สามารถกู้คืนได้:</div>
                        <p className="mt-0.5">{validationResult.errorMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Account Planet Dual-Layer Data Protection</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
