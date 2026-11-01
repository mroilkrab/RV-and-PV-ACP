import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { CompanySettings, AppUserAccount } from '../types';

interface AdminUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user?: AppUserAccount) => void;
  companySettings: CompanySettings;
}

export const AdminUnlockModal: React.FC<AdminUnlockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companySettings,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  if (!isOpen) return null;

  const security = companySettings.securityConfig || {
    requirePasswordOnStartup: true,
    adminPin: '820820',
    adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
    userAccounts: [],
  };

  const adminPin = security.adminPin || '820820';
  const adminUsers = (security.userAccounts || []).filter(u => u.role === 'admin');

  const handleVerify = (codeToVerify?: string) => {
    const entered = (codeToVerify !== undefined ? codeToVerify : pinInput).trim();
    if (!entered) {
      setErrorMsg('กรุณากรอกรหัสผ่าน หรือ PIN ของผู้ดูแลระบบ');
      return;
    }

    // Check against Master Admin PIN
    const isMasterMatch = entered === adminPin.trim();

    // Check against any configured admin account
    const matchedAdminUser = adminUsers.find(u => u.pinOrPassword.trim() === entered);

    if (isMasterMatch || matchedAdminUser) {
      setErrorMsg('');
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPinInput('');
        setFailedAttempts(0);
        onSuccess(matchedAdminUser);
      }, 450);
    } else {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      setErrorMsg(`รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง! (ผิดครั้งที่ ${nextFailed}) บุคคลภายนอกไม่ได้รับอนุญาตให้เข้าสู่ระบบหลัก`);
      setPinInput('');
    }
  };

  const handleKeyPress = (digit: string) => {
    if (digit === 'clear') {
      setPinInput('');
      setErrorMsg('');
    } else if (digit === 'backspace') {
      setPinInput(prev => prev.slice(0, -1));
    } else {
      if (pinInput.length < 20) {
        const next = pinInput + digit;
        setPinInput(next);
        setErrorMsg('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Security Badge */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-semibold tracking-wide uppercase mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>เฉพาะผู้ดูแลระบบเท่านั้น (Admin Restricted)</span>
          </div>

          <h3 className="text-lg font-bold font-prompt text-white">
            ยืนยันรหัสผ่านเพื่อเข้าสู่ระบบหลัก
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed px-2">
            ลิงก์นี้ถูกจำกัดให้ดูเฉพาะรายงานแดชบอร์ดสรุปการเงินเท่านั้น บุคคลภายนอกจะไม่สามารถเข้าถึงระบบจัดการเอกสารบัญชีได้
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              กรอกรหัสผ่าน / PIN ผู้ดูแลระบบ (Master Admin PIN):
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerify();
                  }
                }}
                placeholder="กรอกรหัสผ่าน หรือ PIN..."
                autoFocus
                className="w-full pl-9 pr-10 py-3 text-center text-base tracking-widest font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPin ? 'ซ่อนรหัส' : 'แสดงรหัส'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block">เข้าถึงถูกปฏิเสธ (Access Denied)</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Success State */}
          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
              <div>
                <span className="font-bold block">รหัสผ่านถูกต้อง ยืนยันสิทธิ์สำเร็จ!</span>
                <span>กำลังนำท่านเข้าสู่ระบบหลัก...</span>
              </div>
            </div>
          )}

          {/* Compact Quick Numeric Keypad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => {
              if (key === 'clear') {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress('clear')}
                    className="py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    ล้าง
                  </button>
                );
              }
              if (key === 'backspace') {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress('backspace')}
                    className="py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    ⌫ ลบ
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyPress(key)}
                  className="py-2 text-sm font-bold font-mono text-slate-700 bg-slate-100/80 hover:bg-slate-200/90 rounded-lg transition cursor-pointer shadow-2xs"
                >
                  {key}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer text-center"
            >
              ยกเลิก / อยู่หน้าแดชบอร์ดต่อ
            </button>
            <button
              type="button"
              disabled={!pinInput.trim() || isSuccess}
              onClick={() => handleVerify()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              <UserCheck className="w-4 h-4" />
              <span>ยืนยันเข้าสู่ระบบ</span>
            </button>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>รหัสผ่านตั้งค่าได้ในเมนูตั้งค่าระบบ (ค่าเริ่มต้น: 820820)</span>
          </span>
          <span className="font-semibold text-slate-700">{companySettings.name}</span>
        </div>
      </div>
    </div>
  );
};
