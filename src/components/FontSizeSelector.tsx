import React, { useState, useRef, useEffect } from 'react';
import { Type, Check, ChevronDown, Sparkles } from 'lucide-react';
import { FontSizePreference } from '../types';

export interface FontSizeOption {
  id: FontSizePreference;
  label: string;
  sizePx: string;
  shortLabel: string;
  description: string;
  isRecommended?: boolean;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  {
    id: 'compact',
    label: 'กะทัดรัด (Compact)',
    sizePx: '15px',
    shortLabel: 'เล็ก (15px)',
    description: 'เน้นพื้นที่แสดงผลข้อมูลในตารางจำนวนมาก',
  },
  {
    id: 'normal',
    label: 'มาตรฐาน (Normal)',
    sizePx: '16px',
    shortLabel: 'ปกติ (16px)',
    description: 'ขนาดตัวอักษรมาตรฐาน คมชัดเป็นระเบียบ',
  },
  {
    id: 'large',
    label: 'ใหญ่ สบายตา (Large)',
    sizePx: '17.5px',
    shortLabel: 'ใหญ่ (17.5px)',
    description: 'ตัวหนังสือใหญ่ขึ้น อ่านง่ายสบายตา ไม่ต้องเพ่ง',
    isRecommended: true,
  },
  {
    id: 'xlarge',
    label: 'ใหญ่พิเศษ (Extra Large)',
    sizePx: '19.5px',
    shortLabel: 'ใหญ่พิเศษ (19.5px)',
    description: 'ตัวหนังสือใหญ่ชัดเจน เหมาะกับจอขนาดใหญ่หรือสายตายาว',
  },
];

interface FontSizeSelectorProps {
  fontSize: FontSizePreference;
  onChangeFontSize: (size: FontSizePreference) => void;
  variant?: 'topbar' | 'settings-card' | 'mobile';
  className?: string;
}

export const FontSizeSelector: React.FC<FontSizeSelectorProps> = ({
  fontSize,
  onChangeFontSize,
  variant = 'topbar',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentIndex = FONT_SIZE_OPTIONS.findIndex((opt) => opt.id === fontSize);
  const currentOption = FONT_SIZE_OPTIONS[currentIndex] || FONT_SIZE_OPTIONS[2];

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStepDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      onChangeFontSize(FONT_SIZE_OPTIONS[currentIndex - 1].id);
    }
  };

  const handleStepUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < FONT_SIZE_OPTIONS.length - 1) {
      onChangeFontSize(FONT_SIZE_OPTIONS[currentIndex + 1].id);
    }
  };

  // Variant 1: Settings Card (In CompanySettings page)
  if (variant === 'settings-card') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <Type className="w-4 h-4 text-blue-600" />
              <span>ขนาดตัวหนังสือในระบบ (Font Size Scale)</span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                ปัจจุบัน: {currentOption.shortLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ปรับขนาดตัวอักษรให้อ่านง่าย สบายตา โดยระบบจะปรับขนาดข้อความ ปุ่ม ตาราง และฟอร์มทั้งหมดให้อัตโนมัติ (ไม่กระทบขนาดกระดาษพิมพ์ A4)
            </p>
          </div>

          {/* Quick Step Buttons */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleStepDown}
              disabled={currentIndex <= 0}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-700 transition cursor-pointer"
              title="ลดขนาดตัวหนังสือ (A-)"
            >
              A-
            </button>
            <span className="text-slate-300 text-xs px-1">|</span>
            <button
              type="button"
              onClick={handleStepUp}
              disabled={currentIndex >= FONT_SIZE_OPTIONS.length - 1}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-700 transition cursor-pointer"
              title="เพิ่มขนาดตัวหนังสือ (A+)"
            >
              A+
            </button>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FONT_SIZE_OPTIONS.map((opt) => {
            const isSelected = opt.id === fontSize;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeFontSize(opt.id)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      {opt.label}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {opt.isRecommended && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded mb-2">
                      <Sparkles className="w-2.5 h-2.5" />
                      แนะนำ (อ่านสบายตา)
                    </span>
                  )}

                  <p className="text-[11px] text-slate-500 leading-snug">
                    {opt.description}
                  </p>
                </div>

                {/* Visual Sample Text */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                  <div className="text-[10px] text-slate-400 mb-1 font-mono">ตัวอย่างข้อความ ({opt.sizePx}):</div>
                  <div 
                    className="font-medium text-slate-800 truncate"
                    style={{ fontSize: opt.sizePx }}
                  >
                    ใบสำคัญรับ-จ่าย Live Artifacts
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Variant 2: Mobile / Drawer
  if (variant === 'mobile') {
    return (
      <div className={`p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-1.5">
            <Type className="w-4 h-4 text-blue-600" />
            <span>ขนาดตัวหนังสือในระบบ</span>
          </div>
          <span className="text-[11px] text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full font-medium">
            {currentOption.shortLabel}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {FONT_SIZE_OPTIONS.map((opt) => {
            const isSelected = opt.id === fontSize;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeFontSize(opt.id)}
                className={`py-2 px-1 text-center rounded-lg text-xs font-medium border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{opt.id === 'compact' ? 'เล็ก' : opt.id === 'normal' ? 'ปกติ' : opt.id === 'large' ? 'ใหญ่' : 'ใหญ่+'}</span>
                <span className={`text-[10px] opacity-80 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {opt.sizePx}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Variant 3 (Default): Topbar Widget with Immediate A- / A+ and Dropdown
  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      <div className="flex items-center bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-md overflow-hidden text-slate-200 text-xs shadow-2xs transition">
        {/* Step Down (A-) */}
        <button
          type="button"
          onClick={handleStepDown}
          disabled={currentIndex <= 0}
          className="px-2 py-1 hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent text-slate-300 hover:text-white transition cursor-pointer font-bold text-[11px]"
          title="ลดขนาดตัวหนังสือ (A-)"
          aria-label="ลดขนาดตัวหนังสือ"
        >
          A-
        </button>

        {/* Center Label & Popover trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1 flex items-center gap-1.5 hover:bg-slate-800 border-x border-slate-800 text-slate-200 hover:text-white transition cursor-pointer text-xs"
          title="คลิกเพื่อเลือกขนาดตัวหนังสือในระบบ"
        >
          <Type className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="hidden sm:inline font-medium">ขนาด:</span>
          <span className="font-semibold text-blue-300">{currentOption.shortLabel}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Step Up (A+) */}
        <button
          type="button"
          onClick={handleStepUp}
          disabled={currentIndex >= FONT_SIZE_OPTIONS.length - 1}
          className="px-2 py-1 hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent text-slate-300 hover:text-white transition cursor-pointer font-bold text-[11px]"
          title="เพิ่มขนาดตัวหนังสือ (A+)"
          aria-label="เพิ่มขนาดตัวหนังสือ"
        >
          A+
        </button>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-76 sm:w-84 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 text-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <Type className="w-4 h-4 text-blue-600" />
              <span>เลือกขนาดตัวหนังสือในระบบ</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              HTML Root Scale
            </span>
          </div>

          <div className="space-y-1.5">
            {FONT_SIZE_OPTIONS.map((opt) => {
              const isSelected = opt.id === fontSize;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChangeFontSize(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs font-semibold'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{opt.label}</span>
                      {opt.isRecommended && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">
                          แนะนำ
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {opt.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {opt.sizePx}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 stroke-[3]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sample live text */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 bg-slate-50 p-2 rounded-lg text-center">
            <span className="text-[11px] text-slate-500 block mb-0.5">ตัวอย่างการแสดงผล:</span>
            <span className="font-semibold text-slate-800 text-xs">
              ภาษีหัก ณ ที่จ่าย ภ.ง.ด.3/53 • ใบสำคัญรับ-จ่าย Live Artifacts
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
