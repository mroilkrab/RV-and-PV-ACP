import React, { useState } from 'react';
import { 
  Sparkles, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  Info, 
  Layers, 
  ShieldCheck, 
  FileText,
  ToggleLeft,
  ToggleRight,
  Database
} from 'lucide-react';
import { Voucher } from '../types';
import { isSampleVoucher } from '../utils/storage';

interface SampleDataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  isSampleEnabled: boolean;
  onToggleSampleData: (enable: boolean) => void;
  onRemoveSampleDataOnly: () => void;
  onClearAllVouchers: () => void;
  onRestoreSampleData: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SampleDataManagerModal: React.FC<SampleDataManagerModalProps> = ({
  isOpen,
  onClose,
  vouchers,
  isSampleEnabled,
  onToggleSampleData,
  onRemoveSampleDataOnly,
  onClearAllVouchers,
  onRestoreSampleData,
  showToast,
}) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmRemoveSamples, setConfirmRemoveSamples] = useState(false);

  if (!isOpen) return null;

  const sampleCount = vouchers.filter(isSampleVoucher).length;
  const realCount = vouchers.filter((v) => !isSampleVoucher(v)).length;
  const totalCount = vouchers.length;

  const handleToggle = () => {
    const nextState = !isSampleEnabled;
    onToggleSampleData(nextState);
    if (nextState) {
      showToast('เปิดใช้งานข้อมูลตัวอย่างเรียบร้อยแล้ว (โหลดตัวอย่าง 12 รายการ)', 'success');
    } else {
      showToast('ปิดข้อมูลตัวอย่างเรียบร้อยแล้ว (ซ่อน/นำข้อมูลตัวอย่างออก)', 'info');
    }
  };

  const handleExecuteRemoveSamples = () => {
    onRemoveSampleDataOnly();
    setConfirmRemoveSamples(false);
    showToast(`นำข้อมูลตัวอย่างออกเรียบร้อยแล้ว (เหลือข้อมูลจริง ${realCount} รายการ)`, 'success');
  };

  const handleExecuteClearAll = () => {
    onClearAllVouchers();
    setConfirmClearAll(false);
    showToast('ล้างรายการใบสำคัญทั้งหมดเรียบร้อยแล้ว ระบบเริ่มต้นใหม่ 0 รายการ', 'info');
  };

  const handleExecuteRestore = () => {
    onRestoreSampleData();
    showToast('โหลดข้อมูลตัวอย่าง 12 รายการกลับมาเรียบร้อยแล้ว', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">จัดการข้อมูลตัวอย่างและการเริ่มต้นระบบจริง</h3>
              <p className="text-xs text-slate-300">เปิด-ปิด ข้อมูลตัวอย่าง หรือล้างข้อมูลเพื่อเริ่มใช้งานจริง</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Current Status Overview Cards */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-medium text-slate-500 mb-0.5">ใบสำคัญทั้งหมด</div>
              <div className="text-xl font-bold font-mono text-slate-900">{totalCount}</div>
              <div className="text-[10px] text-slate-400">ฉบับ</div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
              <div className="text-[11px] font-medium text-amber-700 mb-0.5 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>ข้อมูลตัวอย่าง</span>
              </div>
              <div className="text-xl font-bold font-mono text-amber-900">{sampleCount}</div>
              <div className="text-[10px] text-amber-600">ฉบับ</div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
              <div className="text-[11px] font-medium text-emerald-700 mb-0.5 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>ข้อมูลจริงของกิจการ</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-900">{realCount}</div>
              <div className="text-[10px] text-emerald-600">ฉบับ</div>
            </div>
          </div>

          {/* Section 1: Main Toggle Switch */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">
                  {isSampleEnabled ? 'กำลังเปิดใช้งานข้อมูลตัวอย่าง (Demo Mode)' : 'โหมดข้อมูลจริง (Clean / Production Mode)'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSampleEnabled 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {isSampleEnabled ? 'เปิดอยู่ (ON)' : 'ปิดอยู่ (OFF)'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {isSampleEnabled
                  ? 'ระบบกำลังแสดงรายการตัวอย่าง (12 รายการ) สำหรับทดลองสร้างเอกสาร และดูตัวอย่างรายงาน'
                  : 'ระบบทำงานในโหมดจริง ไม่แสดงข้อมูลตัวอย่าง พร้อมสำหรับการลงบัญชีกิจการ'}
              </p>
            </div>

            <button
              onClick={handleToggle}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
                isSampleEnabled
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSampleEnabled ? (
                <>
                  <ToggleRight className="w-4 h-4" />
                  <span>กดเพื่อปิดข้อมูลตัวอย่าง</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  <span>กดเพื่อเปิดข้อมูลตัวอย่าง</span>
                </>
              )}
            </button>
          </div>

          {/* Section 2: Action Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ตัวเลือกการจัดการข้อมูล
            </h4>

            {/* Option A: Remove Sample Data Only (Safe) */}
            <div className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>ลบเฉพาะข้อมูลตัวอย่าง (ปลอดภัย ไม่แตะต้องข้อมูลจริง)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ลบเฉพาะ 12 รายการตัวอย่างออกอย่างถาวร ข้อมูลจริง {realCount} รายการจะยังคงอยู่ครบถ้วน
                </p>
              </div>

              {confirmRemoveSamples ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleExecuteRemoveSamples}
                    className="px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition cursor-pointer"
                  >
                    ยืนยันลบตัวอย่าง
                  </button>
                  <button
                    onClick={() => setConfirmRemoveSamples(false)}
                    className="px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (sampleCount === 0) {
                      showToast('ไม่มีข้อมูลตัวอย่างในระบบให้ลบแล้ว', 'info');
                      return;
                    }
                    setConfirmRemoveSamples(true);
                  }}
                  disabled={sampleCount === 0}
                  className="px-3 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg transition cursor-pointer shrink-0 disabled:opacity-40"
                >
                  ลบเฉพาะข้อมูลตัวอย่าง
                </button>
              )}
            </div>

            {/* Option B: Restore Sample Data */}
            <div className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                  <span>โหลดข้อมูลตัวอย่าง 12 รายการกลับมาใหม่</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  เพิ่มข้อมูลตัวอย่างกลับเข้ามาในระบบเพื่อดูแนวทางการลงบัญชี (จะไม่ลบข้อมูลจริงที่ท่านสร้างไว้)
                </p>
              </div>

              <button
                onClick={handleExecuteRestore}
                className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg transition cursor-pointer shrink-0"
              >
                โหลดตัวอย่างกลับมา
              </button>
            </div>

            {/* Option C: Clean Slate (Wipe All Vouchers to 0) */}
            <div className="border border-rose-100 bg-rose-50/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>ล้างข้อมูลใบสำคัญทั้งหมด (เริ่มระบบใหม่เป็น 0 ฉบับ)</span>
                </div>
                <p className="text-[11px] text-rose-700/80">
                  ลบใบสำคัญทั้งหมดทั้งตัวอย่างและข้อมูลจริง เพื่อให้ระบบว่างเปล่า 100% สำหรับเริ่มบันทึกใหม่
                </p>
              </div>

              {confirmClearAll ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleExecuteClearAll}
                    className="px-2.5 py-1 text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg transition cursor-pointer"
                  >
                    ยืนยันล้างทั้งหมด
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (totalCount === 0) {
                      showToast('ระบบว่างเปล่าอยู่แล้ว ไม่มีรายการใบสำคัญให้ล้าง', 'info');
                      return;
                    }
                    setConfirmClearAll(true);
                  }}
                  disabled={totalCount === 0}
                  className="px-3 py-1.5 text-xs bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 font-semibold rounded-lg transition cursor-pointer shrink-0 disabled:opacity-40"
                >
                  ล้างเอกสารทั้งหมด
                </button>
              )}
            </div>
          </div>

          {/* Explanatory Notice */}
          <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>คำแนะนำสำหรับผู้ใช้งานจริง:</strong> หากคุณต้องการใช้ระบบสำหรับบันทึกบัญชีของบริษัทจริง 
              สามารถกดปุ่ม <strong>"ปิดข้อมูลตัวอย่าง"</strong> หรือ <strong>"ลบเฉพาะข้อมูลตัวอย่าง"</strong> ได้ทันที 
              ระบบจะไม่นำข้อมูลตัวอย่างกลับมาอีกเมื่อรีเฟรชหน้าจอ และท่านสามารถเริ่มสร้างใบสำคัญรับ (RV) หรือใบสำคัญจ่าย (PV) ของจริงได้ทันที
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
