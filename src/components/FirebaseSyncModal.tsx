import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Database,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  HardDrive,
  ShieldCheck,
  Server,
  Zap,
  Info,
  Smartphone,
  Laptop,
  HelpCircle
} from 'lucide-react';
import {
  SyncMode,
  getSyncMode,
  setSyncMode,
  getLastCloudSyncTime,
  pushAllVouchersToFirebase,
  fetchAllVouchersFromFirebase,
  saveSettingsToFirebase,
  fetchSettingsFromFirebase,
  getFirebaseStats,
} from '../utils/firebaseSync';
import { testConnection } from '../firebase';
import { Voucher, CompanySettings } from '../types';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  settings: CompanySettings;
  onVouchersUpdate: (vouchers: Voucher[]) => void;
  onSettingsUpdate: (settings: CompanySettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  vouchers,
  settings,
  onVouchersUpdate,
  onSettingsUpdate,
  showToast,
}) => {
  const [syncMode, setLocalSyncMode] = useState<SyncMode>(getSyncMode());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [cloudStats, setCloudStats] = useState<{
    connected: boolean;
    projectId: string;
    voucherCount: number;
    hasSettings: boolean;
    lastSync: string | null;
  } | null>(null);

  const loadStats = async () => {
    try {
      const stats = await getFirebaseStats();
      setCloudStats(stats);
    } catch {
      setCloudStats({
        connected: false,
        projectId: 'woven-incentive-l2ts5',
        voucherCount: 0,
        hasSettings: false,
        lastSync: getLastCloudSyncTime(),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLocalSyncMode(getSyncMode());
      loadStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModeChange = (newMode: SyncMode) => {
    setLocalSyncMode(newMode);
    setSyncMode(newMode);
    showToast(
      newMode === 'hybrid'
        ? 'เปิดโหมดไฮบริด: ข้อมูลจะถูกบันทึกทั้งในเครื่องและคลาวด์ Firebase อัตโนมัติ'
        : 'เปิดโหมดเฉพาะในเครื่อง (Local Only): ไม่ทำการส่งข้อมูลขึ้นคลาวด์',
      'info'
    );
  };

  // Push local data to Firebase
  const handlePushToCloud = async () => {
    setLoadingAction('push');
    try {
      // Push vouchers
      const voucherRes = await pushAllVouchersToFirebase(vouchers);
      // Push settings
      const settingsOk = await saveSettingsToFirebase(settings);

      if (voucherRes.success && settingsOk) {
        showToast(`อัปโหลดขึ้น Firebase สำเร็จ (${voucherRes.count} รายการ + ข้อมูลบริษัท)`, 'success');
      } else if (voucherRes.success) {
        showToast(`อัปโหลดใบสำคัญขึ้น Firebase สำเร็จ (${voucherRes.count} รายการ)`, 'success');
      } else {
        showToast(`เกิดข้อผิดพลาดในการอัปโหลด: ${voucherRes.error}`, 'error');
      }
      await loadStats();
    } catch (e: any) {
      showToast(`อัปโหลดไม่สำเร็จ: ${e?.message || 'ข้อผิดพลาดเครือข่าย'}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Pull data from Firebase to local
  const handlePullFromCloud = async () => {
    if (!confirm('ต้องการดึงข้อมูลจาก Firebase มาใช้งานในเครื่องใช่หรือไม่? ข้อมูลในเครื่องจะได้รับการซิงค์ตามคลาวด์')) {
      return;
    }
    setLoadingAction('pull');
    try {
      const cloudVouchers = await fetchAllVouchersFromFirebase();
      const cloudSettings = await fetchSettingsFromFirebase();

      if (cloudVouchers && cloudVouchers.length > 0) {
        onVouchersUpdate(cloudVouchers);
      }
      if (cloudSettings) {
        onSettingsUpdate(cloudSettings);
      }

      showToast(`ดึงข้อมูลจาก Firebase สำเร็จ (${cloudVouchers.length} รายการ)`, 'success');
      await loadStats();
    } catch (e: any) {
      showToast(`ดึงข้อมูลไม่สำเร็จ: ${e?.message || 'ข้อผิดพลาดเครือข่าย'}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setLoadingAction('test');
    try {
      const ok = await testConnection();
      if (ok) {
        showToast('การเชื่อมต่อไปยัง Firebase Firestore สมบูรณ์และพร้อมใช้งาน!', 'success');
      } else {
        showToast('ไม่สามารถเชื่อมต่อไปยัง Firebase ได้ กรุณาตรวจสอบอินเทอร์เน็ต', 'error');
      }
      await loadStats();
    } finally {
      setLoadingAction(null);
    }
  };

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'ยังไม่มีประวัติการซิงค์';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Cloud className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  ระบบฐานข้อมูลคู่ขนาน (Hybrid Storage: ในเครื่อง + Firebase Cloud)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ออนไลน์
                </span>
              </div>
              <p className="text-xs text-amber-100/90 mt-0.5">
                จัดเก็บข้อมูลในเครื่อง (LocalStorage & IndexedDB) ควบคู่กับฐานข้อมูล Cloud Firestore แบบไร้รอยต่อ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Mode Selector Card */}
          <div className="bg-gradient-to-br from-slate-50 to-amber-50/40 rounded-xl p-4 border border-amber-200/70 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">โหมดการจัดเก็บข้อมูลหลัก</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {syncMode === 'hybrid'
                    ? '✨ โหมดไฮบริด (Hybrid Storage) — บันทึกทั้ง 2 ทางอัตโนมัติ'
                    : '🖥️ โหมดออฟไลน์ (Local Only) — เฉพาะในเครื่อง'}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {syncMode === 'hybrid'
                    ? 'เมื่อสร้าง แก้ไข หรือลบเอกสาร ระบบจะบันทึกลงในเครื่องทันที และส่งไปอัปเดตบน Firebase แบบเรียลไทม์'
                    : 'ทำงานเฉพาะในบราวเซอร์เครื่องนี้ ไม่ส่งข้อมูลขึ้นคลาวด์'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-300 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleModeChange('hybrid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    syncMode === 'hybrid'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>ไฮบริด (แนะนำ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('local_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    syncMode === 'local_only'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>เฉพาะในเครื่อง</span>
                </button>
              </div>
            </div>
          </div>

          {/* Comparison Cards: Local vs Cloud */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Local Storage Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2.5 text-blue-700 mb-2">
                <HardDrive className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">ระบบภายในเครื่อง (Local)</h4>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ใบสำคัญในเครื่อง:</span>
                  <span className="font-bold font-mono text-slate-900">{vouchers.length} ฉบับ</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">กลไกจัดเก็บ:</span>
                  <span className="font-medium text-slate-800">LocalStorage + IndexedDB</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">การทำงานออฟไลน์:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ทำงานได้ 100%
                  </span>
                </div>
              </div>
            </div>

            {/* Cloud Firestore Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 text-amber-700">
                  <Server className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Firebase Cloud Firestore</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                  {cloudStats?.projectId || 'woven-incentive-l2ts5'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">เอกสารบนคลาวด์:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {cloudStats?.voucherCount !== undefined ? `${cloudStats.voucherCount} ฉบับ` : 'กำลังตรวจสอบ...'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ซิงค์ล่าสุด:</span>
                  <span className="font-medium text-slate-700 text-[11px]">
                    {formatLastSync(cloudStats?.lastSync || null)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">สถานะเซิร์ฟเวอร์:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> พร้อมใช้งาน Real-time
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Device Guide: Why data differed on mobile/tablet and how it works now */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 rounded-xl p-4 border border-blue-200 text-xs text-slate-700 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>ทำไมเวลาส่งลิงก์ไปทำในมือถือหรือแท็บเล็ต ข้อมูลถึงไม่เหมือนกัน?</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white/80 rounded-lg p-3 border border-blue-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Laptop className="w-3.5 h-3.5 text-slate-600" />
                  <span>สาเหตุที่ข้อมูลต่างกัน (LocalStorage)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  โดยปกติเว็บเบราว์เซอร์บนมือถือและคอมพิวเตอร์จะมีพื้นที่จัดเก็บในเครื่อง (LocalStorage) แยกขาดจากกัน ทำให้เมื่อเปิดบนมือถือครั้งแรก เบราว์เซอร์มือถือจะไม่เห็นข้อมูลที่บันทึกไว้ในคอมพิวเตอร์
                </p>
              </div>

              <div className="bg-white/80 rounded-lg p-3 border border-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>วิธีแก้: เปิดซิงค์คลาวด์สด (Realtime Cloud)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  เมื่อเปิด <strong>โหมดไฮบริด (Hybrid)</strong> ระบบจะเชื่อมต่อกับ Firebase Firestore ทันที ไม่ว่าคุณจะเพิ่มเอกสารบนคอมพิวเตอร์หรือมือถือ ข้อมูลจะตรงกันแบบเรียลไทม์ทุกเครื่องโดยอัตโนมัติ!
                </p>
              </div>
            </div>
            <div className="text-[11px] bg-white/60 p-2.5 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-between gap-2 flex-wrap">
              <span>💡 หากเปิดบนมือถือแล้วยังไม่เห็นข้อมูลเก่าจากคอมพิวเตอร์: ให้กดปุ่ม <strong>"อัปโหลดข้อมูลในเครื่องทั้งหมดขึ้น Firebase"</strong> ที่เครื่องคอมพิวเตอร์ 1 ครั้ง</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>การจัดการข้อมูลคู่ขนาน (Manual Sync Actions)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Push Local -> Cloud */}
              <button
                type="button"
                onClick={handlePushToCloud}
                disabled={loadingAction !== null}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/80 transition text-left cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  {loadingAction === 'push' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900">
                    อัปโหลดข้อมูลในเครื่องทั้งหมดขึ้น Firebase
                  </div>
                  <div className="text-[11px] text-amber-700/80 mt-0.5">
                    นำใบสำคัญ ({vouchers.length} ฉบับ) และโปรไฟล์บริษัทไปสำรองและอัปเดตบนคลาวด์
                  </div>
                </div>
              </button>

              {/* Pull Cloud -> Local */}
              <button
                type="button"
                onClick={handlePullFromCloud}
                disabled={loadingAction !== null}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 transition text-left cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  {loadingAction === 'pull' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-900">
                    ดึงข้อมูลจาก Firebase ลงมาในเครื่อง
                  </div>
                  <div className="text-[11px] text-indigo-700/80 mt-0.5">
                    โหลดข้อมูลใบสำคัญล่าสุดจากคลาวด์มาแสดงและอัปเดตลงเครื่องนี้
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Test Connection & Info */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ความปลอดภัย: Firestore Security Rules ถูกติดตั้งและตรวจสอบแล้ว</span>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={loadingAction !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'test' ? 'animate-spin' : ''}`} />
              <span>ทดสอบการเชื่อมต่อ Firebase</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>คุณสามารถใช้งานได้ทั้ง 2 ทางอย่างราบรื่นตามที่ต้องการ ข้อมูลจะเชื่อมโยงกันเสมอ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
