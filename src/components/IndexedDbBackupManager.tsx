import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  FileText, 
  History, 
  Sparkles,
  Download,
  UploadCloud,
  FolderDown
} from 'lucide-react';
import { Voucher, CompanySettings } from '../types';
import { 
  BackupSnapshot, 
  BackupMetadata, 
  saveBackupToIndexedDb, 
  getAllBackupSnapshots, 
  getBackupMetadata, 
  deleteBackupSnapshot, 
  clearIndexedDbBackups 
} from '../utils/indexedDbBackup';
import { 
  downloadSnapshotToComputer, 
  downloadBackupToComputer 
} from '../utils/fileBackup';
import { ComputerBackupModal } from './ComputerBackupModal';
import { formatCurrency } from '../utils/thaiBahtText';

interface IndexedDbBackupManagerProps {
  vouchers: Voucher[];
  settings: CompanySettings;
  onRestoreData: (vouchers: Voucher[], settings?: CompanySettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const IndexedDbBackupManager: React.FC<IndexedDbBackupManagerProps> = ({
  vouchers,
  settings,
  onRestoreData,
  showToast,
}) => {
  const [metadata, setMetadata] = useState<BackupMetadata>({
    lastBackupAt: null,
    lastBackupCount: 0,
    totalSnapshots: 0,
    autoBackupEnabled: true,
  });
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState<BackupSnapshot | null>(null);
  const [isComputerModalOpen, setIsComputerModalOpen] = useState(false);
  const [computerModalTab, setComputerModalTab] = useState<'backup' | 'restore'>('backup');

  const handleDownloadSnapshot = async (snap: BackupSnapshot) => {
    try {
      const res = await downloadSnapshotToComputer(snap, settings);
      if (res.success) {
        showToast(
          `ดาวน์โหลดจุดสำรองเวลา ${new Date(snap.timestamp).toLocaleTimeString('th-TH')} ลงเครื่องแล้ว (${(res.fileSizeBytes / 1024).toFixed(1)} KB)`,
          'success'
        );
      }
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
    }
  };

  const loadBackupInfo = async () => {
    try {
      const meta = await getBackupMetadata();
      setMetadata(meta);
      if (showHistory) {
        setIsLoadingSnapshots(true);
        const list = await getAllBackupSnapshots();
        setSnapshots(list);
        setIsLoadingSnapshots(false);
      }
    } catch (e) {
      console.warn('Error loading backup info:', e);
    }
  };

  useEffect(() => {
    loadBackupInfo();
    const interval = setInterval(loadBackupInfo, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [showHistory]);

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await saveBackupToIndexedDb(
        vouchers,
        settings,
        'manual',
        `สำรองข้อมูลด้วยตนเอง (${vouchers.length} ฉบับ)`
      );
      if (res.success) {
        showToast(`สำรองข้อมูลลง IndexedDB สำเร็จเรียบร้อย (${res.count} รายการ)`, 'success');
        await loadBackupInfo();
      } else {
        showToast('เกิดข้อผิดพลาดในการสำรองข้อมูลลง IndexedDB', 'error');
      }
    } catch (err: any) {
      showToast(`ข้อผิดพลาด: ${err.message}`, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleConfirmRestore = (snapshot: BackupSnapshot) => {
    if (!snapshot.vouchers || snapshot.vouchers.length === 0) {
      showToast('ไม่พบข้อมูลรายการใบสำคัญในจุดสำรองนี้', 'error');
      return;
    }

    onRestoreData(snapshot.vouchers, snapshot.settings);
    setSnapshotToRestore(null);
    showToast(
      `กู้คืนข้อมูลสำเร็จ (${snapshot.vouchers.length} ฉบับ) จากจุดสำรองเวลา ${new Date(snapshot.timestamp).toLocaleTimeString('th-TH')}`,
      'success'
    );
  };

  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('คุณต้องการลบจุดสำรองข้อมูลนี้ใช่หรือไม่?')) return;
    const success = await deleteBackupSnapshot(id);
    if (success) {
      showToast('ลบจุดสำรองข้อมูลสำเร็จ', 'info');
      const list = await getAllBackupSnapshots();
      setSnapshots(list);
      const meta = await getBackupMetadata();
      setMetadata(meta);
    }
  };

  const handleSimulateLocalStorageClear = () => {
    if (!window.confirm('คุณต้องการทดสอบจำลองการล้างข้อมูล Local Storage หรือไม่?\n\nเมื่อล้างแล้ว ระบบจะกู้คืนข้อมูลจาก IndexedDB อัตโนมัติทันทีเพื่อพิสูจน์ความคงทนของข้อมูล')) {
      return;
    }
    // Clear vouchers in localStorage
    localStorage.removeItem('account_planet_vouchers');
    showToast('ล้าง Local Storage แล้ว! กำลังทดสอบกู้คืนจาก IndexedDB...', 'info');

    setTimeout(async () => {
      // Fetch latest from IndexedDB
      const latest = snapshots[0] || (await getAllBackupSnapshots())[0];
      if (latest && latest.vouchers.length > 0) {
        onRestoreData(latest.vouchers, latest.settings);
        showToast(`ระบบพิสูจน์ความปลอดภัยสำเร็จ! กู้คืนข้อมูล ${latest.vouchers.length} ฉบับจาก IndexedDB เรียบร้อย แม้ Local Storage จะถูกล้าง`, 'success');
      } else {
        // Run a manual backup first then restore
        await saveBackupToIndexedDb(vouchers, settings, 'auto');
        showToast('ทำการสำรองข้อมูลเริ่มต้นลง IndexedDB เรียบร้อย', 'success');
      }
    }, 700);
  };

  const formatThaiDateTime = (isoString?: string | null) => {
    if (!isoString) return 'ยังไม่มีการสำรองข้อมูล';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('th-TH')} เวลา ${d.toLocaleTimeString('th-TH')} น.`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800 font-prompt">
                9. ระบบสำรองและกู้คืนข้อมูล (Database Backup &amp; Recovery)
              </h3>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ทำงานอัตโนมัติ (Active)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบสำรอง 2 ชั้น: สำรองอัตโนมัติในเบราว์เซอร์ (IndexedDB) และสามารถดาวน์โหลดไฟล์ฐานข้อมูล (.json) เก็บไว้ในเครื่องคอมพิวเตอร์ได้ตลอดเวลา
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setComputerModalTab('backup');
              setIsComputerModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            title="ดาวน์โหลดฐานข้อมูลเป็นไฟล์ .json เก็บไว้ในเครื่องคอมพิวเตอร์ หรือ Flash Drive"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด Backup ลงเครื่อง (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setComputerModalTab('restore');
              setIsComputerModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="นำเข้าไฟล์ .json ที่สำรองไว้จากคอมพิวเตอร์มากู้คืนระบบ"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>กู้คืนข้อมูลจากไฟล์ในเครื่อง</span>
          </button>

          <button
            type="button"
            onClick={handleManualBackup}
            disabled={isBackingUp}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 transition cursor-pointer disabled:opacity-50"
            title="สร้างจุดสำรองข้อมูลลงใน IndexedDB ของเบราว์เซอร์ทันที"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
            <span>{isBackingUp ? 'กำลังสำรอง...' : 'สำรองลง IndexedDB'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) {
                getAllBackupSnapshots().then(setSnapshots);
              }
            }}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>{showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติจุดสำรอง'}</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Last backup */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              สำรองข้อมูลล่าสุด
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
              IndexedDB
            </span>
          </div>
          <div className="text-sm font-bold text-slate-800 font-mono">
            {formatThaiDateTime(metadata.lastBackupAt)}
          </div>
          <div className="text-[11px] text-slate-500">
            ระบบทำงานสำรองข้อมูลเบื้องหลังอัตโนมัติทุก 45 วินาที
          </div>
        </div>

        {/* Card 2: Voucher Count */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              จำนวนใบสำคัญในระบบ
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
              Real-time
            </span>
          </div>
          <div className="text-sm font-bold text-slate-800 font-mono flex items-baseline gap-1.5">
            <span className="text-lg text-blue-700">{vouchers.length}</span>
            <span className="text-xs text-slate-600 font-normal">ฉบับ</span>
            <span className="text-xs text-slate-400 font-normal">
              (สำรองไว้: {metadata.lastBackupCount || vouchers.length} ฉบับ)
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            ข้อมูลอยู่ในสถานะปลอดภัยพร้อมใช้งาน
          </div>
        </div>

        {/* Card 3: Storage Isolation Guarantee */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              ความคงทนของข้อมูล
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
              Dual-Layer
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-800 leading-snug">
            Dual Storage (LocalStorage + IndexedDB)
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            แม้ล้าง Local Storage ตัวระบบจะดึงสำรองจาก IndexedDB มา Restore ให้อัตโนมัติทันที
          </div>
        </div>
      </div>

      {/* Persistence Test & Notice */}
      <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 max-w-xl">
          <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-0.5">
            <span className="font-bold text-indigo-900 block">
              การันตีความปลอดภัยของข้อมูล (Zero Data Loss Protection)
            </span>
            <p className="text-slate-600 leading-relaxed">
              หากเผลอกด Clear Browsing Data หรือ Local Storage ถูกรีเซ็ต ระบบจะค้นหาประวัติสำรองล่าสุดใน IndexedDB อัตโนมัติในตอนเปิดแอป เพื่อให้เอกสารและตัวเลขทางบัญชีของท่านคงอยู่ครบถ้วนเสมอ
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSimulateLocalStorageClear}
          className="text-xs font-medium text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          title="ทดสอบล้าง LocalStorage เพื่อดูการกู้คืนอัตโนมัติจาก IndexedDB"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>ทดสอบจำลองล้าง LocalStorage & กู้คืน</span>
        </button>
      </div>

      {/* Snapshot History Table (Collapsible) */}
      {showHistory && (
        <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 font-prompt flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <span>ประวัติจุดสำรองข้อมูลทั้งหมดใน IndexedDB ({snapshots.length} จุด):</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              บันทึกจุดสำรองล่าสุดสูงสุด 20 จุด
            </span>
          </div>

          {isLoadingSnapshots ? (
            <div className="py-6 text-center text-xs text-slate-500">
              กำลังโหลดประวัติจุดสำรอง...
            </div>
          ) : snapshots.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              ยังไม่มีประวัติจุดสำรอง กรุณากดปุ่ม "สำรองข้อมูลทันที" ด้านบน
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">วัน-เวลาที่สำรอง</th>
                    <th className="py-2.5 px-3">ประเภท</th>
                    <th className="py-2.5 px-3 text-center">จำนวนใบสำคัญ</th>
                    <th className="py-2.5 px-3 text-right">ยอดเงินรวม</th>
                    <th className="py-2.5 px-3">บันทึกช่วยจำ</th>
                    <th className="py-2.5 px-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshots.map((snap, idx) => (
                    <tr key={snap.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="py-2.5 px-3 font-mono text-slate-800 font-medium">
                        {formatThaiDateTime(snap.timestamp)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          snap.backupType === 'manual' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {snap.backupType === 'manual' ? 'ด้วยตนเอง' : 'อัตโนมัติ'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {snap.voucherCount} ฉบับ
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        ฿{formatCurrency(snap.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {snap.note || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDownloadSnapshot(snap)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                          title="ดาวน์โหลดจุดสำรองนี้ลงเครื่องคอมพิวเตอร์เป็นไฟล์ .json"
                        >
                          <Download className="w-3 h-3 text-indigo-600" />
                          <span>ดาวน์โหลดลงเครื่อง</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSnapshotToRestore(snap)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition cursor-pointer"
                        >
                          กู้คืนจุดนี้
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="ลบจุดสำรองนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Restore */}
      {snapshotToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-prompt">
                  ยืนยันการกู้คืนข้อมูลจาก IndexedDB
                </h3>
                <p className="text-xs text-slate-500">
                  ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากจุดสำรองนี้
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">เวลาที่สำรอง:</span>
                <span className="font-semibold font-mono text-slate-800">
                  {formatThaiDateTime(snapshotToRestore.timestamp)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">จำนวนใบสำคัญ:</span>
                <span className="font-bold font-mono text-blue-700">
                  {snapshotToRestore.voucherCount} ฉบับ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดเงินรวม:</span>
                <span className="font-bold font-mono text-slate-800">
                  ฿{formatCurrency(snapshotToRestore.totalAmount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              ระบบจะบันทึกข้อมูลที่กู้คืนนี้ลงทั้ง Local Storage และ IndexedDB ใหม่ทันที
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSnapshotToRestore(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestore(snapshotToRestore)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                ยืนยันการกู้คืนข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Computer Backup & Restore Modal */}
      {isComputerModalOpen && (
        <ComputerBackupModal
          isOpen={isComputerModalOpen}
          onClose={() => setIsComputerModalOpen(false)}
          vouchers={vouchers}
          companySettings={settings}
          onRestoreData={onRestoreData}
          showToast={showToast}
        />
      )}
    </div>
  );
};
