import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  ArrowRight,
  Database,
  Building2,
  HelpCircle
} from 'lucide-react';
import { CompanySettings, SecurityConfig, AppUserAccount } from '../types';
import { AccountPlanetLogo } from './AccountPlanetLogo';

interface StartupLockScreenProps {
  companySettings: CompanySettings;
  onUnlock: (user?: AppUserAccount) => void;
}

export const StartupLockScreen: React.FC<StartupLockScreenProps> = ({
  companySettings,
  onUnlock,
}) => {
  const security = companySettings.securityConfig || {
    requirePasswordOnStartup: true,
    adminPin: '820820',
    adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
    userAccounts: [
      {
        id: 'user-admin',
        username: 'admin',
        displayName: 'ผู้ดูแลระบบหลัก (Admin)',
        pinOrPassword: '820820',
        role: 'admin',
        createdAt: new Date().toISOString(),
      }
    ],
    lockTimeoutMinutes: 0,
  };

  const users = security.userAccounts && security.userAccounts.length > 0
    ? security.userAccounts
    : [
        {
          id: 'user-admin',
          username: 'admin',
          displayName: security.adminDisplayName || 'ผู้ดูแลระบบหลัก (Admin)',
          pinOrPassword: security.adminPin || '820820',
          role: 'admin' as const,
          createdAt: new Date().toISOString(),
        }
      ];

  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || 'admin');
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const handleAttemptUnlock = (pinToTest?: string) => {
    const entered = (pinToTest !== undefined ? pinToTest : pinInput).trim();
    if (!entered) {
      setErrorMsg('กรุณากรอกรหัสผ่าน หรือ PIN');
      return;
    }

    // Check if entered matches admin master pin
    const isMasterAdminMatch = security.adminPin && entered === security.adminPin.trim();

    // Or matches selected user's pin
    const isUserMatch = selectedUser && entered === selectedUser.pinOrPassword.trim();

    // Or matches any configured user account
    const anyUserMatch = users.find(u => u.pinOrPassword.trim() === entered);

    if (isMasterAdminMatch || isUserMatch || anyUserMatch) {
      setErrorMsg('');
      setIsSuccess(true);
      setTimeout(() => {
        onUnlock(anyUserMatch || selectedUser);
      }, 400);
    } else {
      setErrorMsg('รหัสผ่านหรือ PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      setIsSuccess(false);
    }
  };

  const handleKeypadPress = (num: string) => {
    setErrorMsg('');
    if (pinInput.length < 20) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
    }
  };

  const handleKeypadBackspace = () => {
    setErrorMsg('');
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setErrorMsg('');
    setPinInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AccountPlanetLogo 
                customLogoUrl={companySettings.logoUrl} 
                size="md" 
                hideTaxBadge={true} 
              />
            </div>
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>ระบบล็อคเพื่อความปลอดภัย</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60">
            <div className="text-xs text-slate-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">{companySettings.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              เลขประจำตัวผู้เสียภาษี: {companySettings.taxId} ({companySettings.branch})
            </div>
          </div>
        </div>

        {/* Security Message */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-1 border border-blue-100">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-prompt">
              เข้าสู่ระบบหลัก (สำหรับผู้ดูแลระบบและบัญชี)
            </h2>
            <p className="text-xs text-slate-500">
              ระบบนี้ปกป้องฐานข้อมูลการเงิน เอกสารสำคัญ และการสำรองข้อมูลในเครื่อง (IndexedDB)
            </p>
          </div>

          {/* User Account Selection */}
          {users.length > 1 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                เลือกบัญชีผู้ใช้งาน:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {users.map((u) => {
                  const isSelected = u.id === selectedUserId;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setErrorMsg('');
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold ring-1 ring-blue-400'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <User className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.displayName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Password / PIN Input Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAttemptUnlock();
            }}
            className="space-y-3"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  รหัสผ่าน / PIN ปลดล็อค:
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'ซ่อนรหัส' : 'แสดงรหัส'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setErrorMsg('');
                  }}
                  autoFocus
                  placeholder="กรอก PIN หรือรหัสผ่าน..."
                  className={`w-full px-4 py-2.5 text-center text-lg font-mono tracking-widest rounded-xl border transition focus:outline-none focus:ring-2 ${
                    errorMsg
                      ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/50 text-rose-900'
                      : isSuccess
                      ? 'border-emerald-400 focus:ring-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-300 focus:ring-blue-500 bg-white text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success message */}
            {isSuccess && (
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>รหัสผ่านถูกต้อง กำลังเข้าสู่ระบบ...</span>
              </div>
            )}

            {/* Numeric Keypad for fast clicking */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl text-base font-bold font-mono transition cursor-pointer shadow-2xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="ล้างทั้งหมด"
              >
                ล้าง (C)
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl text-base font-bold font-mono transition cursor-pointer shadow-2xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="ลบตัวสุดท้าย"
              >
                ⌫ ลบ
              </button>
            </div>

            {/* Unlock submit button */}
            <button
              type="submit"
              disabled={isSuccess}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-semibold shadow-md transition cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>ปลดล็อคเข้าสู่ระบบหลัก</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Hint section */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="text-[11px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 cursor-pointer transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>ลืมรหัสผ่าน หรือต้องการความช่วยเหลือ?</span>
            </button>

            {showHint && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 text-left space-y-1">
                <div className="font-semibold text-slate-800">คำแนะนำระบบความปลอดภัย:</div>
                <div>• รหัสผ่านเริ่มต้นของผู้ดูแลระบบหลักคือ: <strong className="font-mono text-blue-700">{security.adminPin || '820820'}</strong></div>
                <div>• พนักงานบัญชี: <strong className="font-mono text-blue-700">8888</strong></div>
                <div>• ท่านสามารถเปลี่ยนรหัสผ่านได้ตลอดเวลาในเมนู <span className="font-semibold">ตั้งค่าระบบ</span> &gt; <span className="font-semibold">ระบบความปลอดภัย &amp; รหัสผ่าน</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-indigo-500" />
            <span>IndexedDB Financial Shield</span>
          </span>
          <span>Account Planet v2.6</span>
        </div>
      </div>
    </div>
  );
};
