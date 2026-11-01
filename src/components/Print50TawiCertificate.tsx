import React, { useState, useRef } from 'react';
import { 
  Printer, 
  ArrowLeft, 
  FileText, 
  Download, 
  CheckCircle2, 
  Copy,
  Building2,
  Share2,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Sliders,
  Check,
  X,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { Voucher, CompanySettings } from '../types';
import { convertToThaiBahtText, formatCurrency } from '../utils/thaiBahtText';

interface Print50TawiCertificateProps {
  voucher: Voucher;
  companySettings: CompanySettings;
  onBack: () => void;
  onUpdateCompanySettings?: (newSettings: CompanySettings) => void;
  onUpdateVoucher?: (updatedVoucher: Voucher) => void;
}

export const Print50TawiCertificate: React.FC<Print50TawiCertificateProps> = ({
  voucher,
  companySettings,
  onBack,
  onUpdateCompanySettings,
  onUpdateVoucher,
}) => {
  const [copyMode, setCopyMode] = useState<'both' | 'copy1' | 'copy2'>('both');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Stamp and Signature States (with default fallback to user uploaded assets)
  const defaultStamp = companySettings.companyStampUrl || '/stamps/company_stamp.svg';
  const defaultSignature = companySettings.payerSignatureUrl || '/signatures/sign_aphiwatch.svg';
  const defaultSignerName = companySettings.payerName || voucher.signatures?.approvedBy || 'นายอภิวัฒน์';

  const [stampUrl, setStampUrl] = useState<string>(
    voucher.signatures?.companyStampUrl || defaultStamp
  );
  const [signatureUrl, setSignatureUrl] = useState<string>(
    voucher.signatures?.payerSignatureUrl || defaultSignature
  );
  const [signerName, setSignerName] = useState<string>(
    voucher.signatures?.approvedBy || defaultSignerName
  );
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [stampPlacement, setStampPlacement] = useState<'overlap' | 'beside' | 'center'>('overlap');

  const stampFileInputRef = useRef<HTMLInputElement>(null);
  const signatureFileInputRef = useRef<HTMLInputElement>(null);

  // Determine form type: PND3 if individual (usually starts with 1-8), PND53 if corporate (starts with 0)
  const isCorporate = voucher.contact.taxId?.startsWith('0') || voucher.contact.name?.includes('บริษัท') || voucher.contact.name?.includes('หจก.');
  const formNumber = isCorporate ? 'ภ.ง.ด.53' : 'ภ.ง.ด.3';

  // Format date to Thai format
  const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  // Handle uploading custom stamp file
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setStampUrl(dataUrl);
        setShowStamp(true);
        triggerToast('อัปโหลดตราประทับบริษัทใหม่เรียบร้อยแล้ว');
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be re-uploaded if needed
    e.target.value = '';
  };

  // Handle uploading custom signature file
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSignatureUrl(dataUrl);
        setShowSignature(true);
        triggerToast('อัปโหลดลายเซ็นต์ผู้มีอำนาจใหม่เรียบร้อยแล้ว');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reset to original uploaded template assets
  const handleResetToOfficialAssets = () => {
    setStampUrl('/stamps/company_stamp.svg');
    setSignatureUrl('/signatures/sign_aphiwatch.svg');
    setSignerName('นายอภิวัฒน์');
    setShowStamp(true);
    setShowSignature(true);
    setStampPlacement('overlap');
    triggerToast('รีเซ็ตเป็นตราประทับและลายเซ็นต์ทางการเรียบร้อยแล้ว');
  };

  // Save current stamp and signature as company default settings
  const handleSaveAsCompanyDefault = () => {
    if (onUpdateCompanySettings) {
      const updated: CompanySettings = {
        ...companySettings,
        companyStampUrl: stampUrl,
        payerSignatureUrl: signatureUrl,
        payerName: signerName,
      };
      onUpdateCompanySettings(updated);
    }

    if (onUpdateVoucher) {
      const updatedV: Voucher = {
        ...voucher,
        signatures: {
          ...voucher.signatures,
          approvedBy: signerName,
          payerSignatureUrl: signatureUrl,
          companyStampUrl: stampUrl,
        },
      };
      onUpdateVoucher(updatedV);
    }

    triggerToast('บันทึกตราประทับและลายเซ็นต์เป็นค่าตั้งต้นของบริษัทเรียบร้อยแล้ว');
  };

  const triggerToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  // Helper to render 13-digit Tax ID boxes
  const renderTaxIdBoxes = (taxId: string = '') => {
    const clean = taxId.replace(/[^0-9]/g, '').padEnd(13, ' ');
    const chars = clean.split('').slice(0, 13);

    return (
      <div className="inline-flex items-center gap-0.5 font-mono text-xs font-bold">
        {/* Box format: X - XXXX - XXXXX - XX - X */}
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[0] || ''}</span>
        <span className="text-slate-500 font-normal px-0.5">-</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[1] || ''}</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[2] || ''}</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[3] || ''}</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[4] || ''}</span>
        <span className="text-slate-500 font-normal px-0.5">-</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[5] || ''}</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[6] || ''}</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[7] || ''}</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[8] || ''}</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[9] || ''}</span>
        <span className="text-slate-500 font-normal px-0.5">-</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[10] || ''}</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[11] || ''}</span>
        <span className="text-slate-500 font-normal px-0.5">-</span>
        <span className="w-5 h-5 border border-slate-700 flex items-center justify-center bg-white">{chars[12] || ''}</span>
      </div>
    );
  };

  // Base income for withholding tax (sum of items with whtRate > 0)
  const taxableBase = voucher.items.reduce((sum, item) => (item.whtRate > 0 ? sum + item.baseAmount : sum), 0) || voucher.subtotal;
  const totalWht = voucher.totalWht;
  const whtRateText = voucher.items.find(i => i.whtRate > 0)?.whtRate || 3;
  const incomeDescription = voucher.items.map(i => i.description).join(', ');

  const renderSingleCopy = (copyNumber: 1 | 2) => {
    return (
      <div 
        key={`copy-${copyNumber}`}
        className="bg-white text-slate-900 p-8 shadow-sm border border-slate-300 max-w-4xl mx-auto rounded-none text-xs leading-normal font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:break-after-page"
        style={{ minHeight: '297mm' }}
      >
        {/* Top bar with copy indicators */}
        <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
          <div className="space-y-0.5">
            <div className={`font-semibold ${copyNumber === 1 ? 'text-slate-950 font-bold underline' : 'text-slate-600'}`}>
              ฉบับที่ 1 (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย ใช้แนบพร้อมกับแบบแสดงรายการภาษี)
            </div>
            <div className={`font-semibold ${copyNumber === 2 ? 'text-slate-950 font-bold underline' : 'text-slate-600'}`}>
              ฉบับที่ 2 (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน)
            </div>
          </div>

          <div className="text-right text-xs">
            <div>เล่มที่: <span className="font-mono font-bold">50ทวิ-{new Date().getFullYear() + 543}</span></div>
            <div>เลขที่: <span className="font-mono font-bold text-blue-900">{voucher.voucherNo.replace('PV', 'WHT')}</span></div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-3">
          <h1 className="text-base font-bold tracking-tight text-slate-950">
            หนังสือรับรองการหักภาษี ณ ที่จ่าย
          </h1>
          <p className="text-xs text-slate-700 font-medium">
            ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร
          </p>
        </div>

        {/* Section 1: Payer (ผู้มีหน้าที่หักภาษี ณ ที่จ่าย) */}
        <div className="border border-slate-800 p-3 mb-3 bg-slate-50/50">
          <div className="flex justify-between items-center mb-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย :-</span>
              <span className="text-[11px] text-slate-500 font-normal">(นิติบุคคล / ผู้จ่ายเงิน)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-700">เลขประจำตัวผู้เสียภาษีอากร (13 หลัก):</span>
              {renderTaxIdBoxes(companySettings.taxId)}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs">
            <div className="col-span-12 flex">
              <span className="font-semibold w-16 shrink-0">ชื่อ:</span>
              <span className="font-bold text-slate-950 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                {companySettings.name} ({companySettings.branch})
              </span>
            </div>
            <div className="col-span-12 flex">
              <span className="font-semibold w-16 shrink-0">ที่อยู่:</span>
              <span className="text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                {companySettings.address} {companySettings.subDistrict} {companySettings.district} {companySettings.province} {companySettings.postalCode} โทร. {companySettings.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Payee (ผู้ถูกหักภาษี ณ ที่จ่าย) */}
        <div className="border border-slate-800 p-3 mb-3 bg-slate-50/50">
          <div className="flex justify-between items-center mb-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>ผู้ถูกหักภาษี ณ ที่จ่าย :-</span>
              <span className="text-[11px] text-slate-500 font-normal">(ผู้รับเงิน / ผู้ให้บริการ)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-700">เลขประจำตัวผู้เสียภาษีอากร (13 หลัก):</span>
              {renderTaxIdBoxes(voucher.contact.taxId)}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs">
            <div className="col-span-12 flex">
              <span className="font-semibold w-16 shrink-0">ชื่อ:</span>
              <span className="font-bold text-slate-950 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                {voucher.contact.name} {voucher.contact.branch ? `(${voucher.contact.branch})` : ''}
              </span>
            </div>
            <div className="col-span-12 flex">
              <span className="font-semibold w-16 shrink-0">ที่อยู่:</span>
              <span className="text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                {voucher.contact.address || 'ไม่ระบุที่อยู่'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Tax Filing Form Type Checkboxes */}
        <div className="border border-slate-800 p-2.5 mb-3 bg-white text-[11px]">
          <div className="font-bold text-slate-900 mb-1.5">
            ลำดับที่ในแบบยื่นรายการภาษี:
          </div>
          <div className="grid grid-cols-4 gap-2 text-slate-800">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" readOnly checked={false} className="w-3.5 h-3.5" />
              <span>(1) ภ.ง.ด.1ก</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" readOnly checked={false} className="w-3.5 h-3.5" />
              <span>(2) ภ.ง.ด.1ก พิเศษ</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" readOnly checked={false} className="w-3.5 h-3.5" />
              <span>(3) ภ.ง.ด.2</span>
            </label>
            <label className="flex items-center gap-1.5 font-bold text-blue-900">
              <input type="checkbox" readOnly checked={!isCorporate} className="w-3.5 h-3.5 accent-blue-600" />
              <span>(4) ภ.ง.ด.3 (บุคคลธรรมดา)</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" readOnly checked={false} className="w-3.5 h-3.5" />
              <span>(5) ภ.ง.ด.2ก</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" readOnly checked={false} className="w-3.5 h-3.5" />
              <span>(6) ภ.ง.ด.3ก</span>
            </label>
            <label className="flex items-center gap-1.5 font-bold text-blue-900">
              <input type="checkbox" readOnly checked={isCorporate} className="w-3.5 h-3.5 accent-blue-600" />
              <span>(7) ภ.ง.ด.53 (นิติบุคคล)</span>
            </label>
            <div className="text-[10px] text-slate-500 italic">
              *อ้างอิงลำดับตามแบบยื่น e-Filing
            </div>
          </div>
        </div>

        {/* Section 4: Income & Withholding Tax Table */}
        <div className="border border-slate-800 mb-3 overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-800 text-center font-bold text-slate-900">
                <th className="py-2 px-3 border-r border-slate-800 text-left w-7/12">
                  ประเภทเงินได้พึงประเมินที่จ่าย
                </th>
                <th className="py-2 px-2 border-r border-slate-800 w-2/12">
                  วัน เดือน หรือปีภาษีที่จ่าย
                </th>
                <th className="py-2 px-2 border-r border-slate-800 w-3/12 text-right">
                  จำนวนเงินที่จ่าย (บาท)
                </th>
                <th className="py-2 px-2 w-3/12 text-right">
                  ภาษีที่หักและนำส่งไว้ (บาท)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              <tr className="hover:bg-slate-50/50">
                <td className="py-1 px-3 border-r border-slate-800 text-slate-700 text-[11px]">
                  1. เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตามมาตรา 40 (1)
                </td>
                <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-400">-</td>
                <td className="py-1 px-2 border-r border-slate-800 text-right text-slate-400">-</td>
                <td className="py-1 px-2 text-right text-slate-400">-</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-1 px-3 border-r border-slate-800 text-slate-700 text-[11px]">
                  2. ค่าธรรมเนียม ค่านายหน้า ฯลฯ ตามมาตรา 40 (2)
                </td>
                <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-400">-</td>
                <td className="py-1 px-2 border-r border-slate-800 text-right text-slate-400">-</td>
                <td className="py-1 px-2 text-right text-slate-400">-</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-1 px-3 border-r border-slate-800 text-slate-700 text-[11px]">
                  3. ค่าแห่งลิขสิทธิ์ ฯลฯ ตามมาตรา 40 (3)
                </td>
                <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-400">-</td>
                <td className="py-1 px-2 border-r border-slate-800 text-right text-slate-400">-</td>
                <td className="py-1 px-2 text-right text-slate-400">-</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-1 px-3 border-r border-slate-800 text-slate-700 text-[11px]">
                  4. ดอกเบี้ย เงินปันผล เงินส่วนแบ่งกำไร ตามมาตรา 40 (4)
                </td>
                <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-400">-</td>
                <td className="py-1 px-2 border-r border-slate-800 text-right text-slate-400">-</td>
                <td className="py-1 px-2 text-right text-slate-400">-</td>
              </tr>

              {/* 5. Main Active Category: Section 3 Tre-Ras (Services, contracting, audit fees) */}
              <tr className="bg-amber-50/50 font-medium">
                <td className="py-2 px-3 border-r border-slate-800">
                  <div className="font-bold text-slate-900">
                    5. การจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่าย ตามคำสั่งกรมสรรพากร (ม.3 เตรส)
                  </div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    ระบุ: <span className="font-semibold text-blue-900">{incomeDescription || 'ค่าบริการวิชาชีพบัญชี / ค่าสอบบัญชี / ค่าจ้างทำของ'}</span> (อัตรา {whtRateText}%)
                  </div>
                </td>
                <td className="py-2 px-2 border-r border-slate-800 text-center font-mono font-medium">
                  {formatThaiDate(voucher.payment.paymentDate || voucher.date)}
                </td>
                <td className="py-2 px-2 border-r border-slate-800 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(taxableBase)}
                </td>
                <td className="py-2 px-2 text-right font-mono font-bold text-amber-900">
                  {formatCurrency(totalWht)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="py-1 px-3 border-r border-slate-800 text-slate-700 text-[11px]">
                  6. อื่นๆ (ระบุ)..........................................................................
                </td>
                <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-400">-</td>
                <td className="py-1 px-2 border-r border-slate-800 text-right text-slate-400">-</td>
                <td className="py-1 px-2 text-right text-slate-400">-</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-800 font-bold">
                <td colSpan={2} className="py-2 px-3 border-r border-slate-800 text-right text-slate-900">
                  รวมเงินที่จ่ายและภาษีที่หักนำส่ง
                </td>
                <td className="py-2 px-2 border-r border-slate-800 text-right font-mono text-sm text-slate-950">
                  {formatCurrency(taxableBase)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-sm text-amber-900">
                  {formatCurrency(totalWht)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 5: Thai Baht Text */}
        <div className="border border-slate-800 p-2.5 mb-3 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 shrink-0 mr-2">
            รวมเงินภาษีที่หักนำส่ง (ตัวอักษร):
          </span>
          <span className="font-bold text-slate-950 font-sarabun text-sm bg-white px-3 py-1 rounded border border-slate-300 w-full text-center">
            ( {convertToThaiBahtText(totalWht)} )
          </span>
        </div>

        {/* Section 6: Payment Condition & Certification */}
        <div className="border border-slate-800 p-3 mb-3 bg-white text-xs">
          <div className="flex items-center gap-6 mb-2 border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-900">ผู้จ่ายเงิน:</span>
            <label className="flex items-center gap-1 font-semibold text-slate-900">
              <input type="checkbox" readOnly checked={true} className="w-3.5 h-3.5 accent-blue-600" />
              <span>(1) หัก ณ ที่จ่าย</span>
            </label>
            <label className="flex items-center gap-1 text-slate-600">
              <input type="checkbox" readOnly checked={false} className="w-3.5 h-3.5" />
              <span>(2) ออกให้ตลอดไป</span>
            </label>
            <label className="flex items-center gap-1 text-slate-600">
              <input type="checkbox" readOnly checked={false} className="w-3.5 h-3.5" />
              <span>(3) ออกให้ครั้งเดียว</span>
            </label>
          </div>

          <div className="grid grid-cols-12 gap-4 items-end pt-2">
            <div className="col-span-6 text-[10px] text-slate-500 leading-relaxed">
              <strong>คำเตือน:</strong> ผู้มีหน้าที่ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย ฝ่าฝืนไม่ปฏิบัติตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร ต้องรับโทษทางอาญาตามมาตรา 35 แห่งประมวลรัษฎากร
              <br /><br />
              <strong>หมายเหตุ:</strong> เลขประจำตัวผู้เสียภาษีอากร 13 หลัก (นิติบุคคลใช้เลขทะเบียนนิติบุคคล DBD, บุคคลธรรมดาใช้เลขประจำตัวประชาชน)
            </div>

            {/* Signature & Official Corporate Stamp Section */}
            <div className="col-span-6 border-l border-slate-200 pl-4 text-center relative">
              <div className="text-[11px] font-semibold text-slate-800 mb-2">
                ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงกับความจริงทุกประการ
              </div>

              {/* Signature and Stamp Graphic Area */}
              <div className="relative min-h-[125px] flex items-center justify-center py-1">
                {/* 1. Official Corporate Stamp Layer (ตราประทับบริษัท) */}
                {showStamp && stampUrl && (
                  <div 
                    className="absolute pointer-events-none select-none transition-all"
                    style={{
                      right: stampPlacement === 'center' 
                        ? 'calc(50% - 68px)' 
                        : stampPlacement === 'beside' 
                        ? '4px' 
                        : '18px',
                      top: stampPlacement === 'overlap' ? '0px' : '6px',
                      zIndex: stampPlacement === 'overlap' ? 1 : 2,
                    }}
                  >
                    <img 
                      src={stampUrl} 
                      alt="ตราประทับบริษัท แอ็คเคาน์ แพลนเน็ท จำกัด" 
                      className="w-32 h-auto object-contain opacity-95"
                      style={{ mixBlendMode: 'multiply' }}
                    />
                  </div>
                )}

                {/* 2. Authorized Signature Layer (ลายเซ็นต์ผู้จ่ายเงิน / ผู้มีอำนาจ) */}
                {showSignature && signatureUrl && (
                  <div 
                    className="absolute pointer-events-none select-none transition-all"
                    style={{
                      left: stampPlacement === 'beside' 
                        ? '16px' 
                        : 'calc(50% - 76px)',
                      top: '14px',
                      zIndex: 3,
                    }}
                  >
                    <img 
                      src={signatureUrl} 
                      alt="ลายเซ็นต์ผู้จ่ายเงิน" 
                      className="w-40 h-auto object-contain"
                      style={{ mixBlendMode: 'multiply' }}
                    />
                  </div>
                )}

                {/* Dotted Signing Line */}
                <div className="w-full pt-20">
                  <div className="border-b border-dotted border-slate-800 w-52 mx-auto mb-1.5"></div>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-900">
                ({signerName})
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                ผู้จ่ายเงิน • วันที่ {formatThaiDate(voucher.payment.paymentDate || voucher.date)}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                <span>ประทับตรานิติบุคคล {companySettings.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Reference */}
        <div className="flex justify-between text-[10px] text-slate-400 pt-1">
          <span>อ้างอิงใบสำคัญจ่าย: {voucher.voucherNo}</span>
          <span>แบบหนังสือรับรองการหักภาษี ณ ที่จ่าย กรมสรรพากร (ฉบับรับรอง e-Filing)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-100 min-h-screen py-8">
      {/* Hidden File Inputs for Stamp and Signature */}
      <input 
        ref={stampFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleStampUpload}
        className="hidden"
        id="stamp-file-input"
      />
      <input 
        ref={signatureFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSignatureUpload}
        className="hidden"
        id="signature-file-input"
      />

      {/* Non-print Top Action Bar */}
      <div className="max-w-4xl mx-auto px-4 mb-6 no-print">
        {/* Success Toast */}
        {saveSuccessMsg && (
          <div className="mb-4 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-medium animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-200 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition font-medium cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับไปใบสำคัญ</span>
              </button>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>หนังสือรับรองการหักภาษี ณ ที่จ่าย 50 ทวิ</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                    {formNumber}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  สำหรับใบสำคัญจ่าย: <strong>{voucher.voucherNo}</strong> • ยอดภาษีหัก: <strong>{formatCurrency(totalWht)} บาท</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy selector */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setCopyMode('both')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    copyMode === 'both' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ฉบับที่ 1 และ 2
                </button>
                <button
                  type="button"
                  onClick={() => setCopyMode('copy1')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    copyMode === 'copy1' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ฉบับที่ 1
                </button>
                <button
                  type="button"
                  onClick={() => setCopyMode('copy2')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    copyMode === 'copy2' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ฉบับที่ 2
                </button>
              </div>

              {/* Toggle Stamp & Signature Settings Drawer */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition cursor-pointer ${
                  isSettingsOpen 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="ปรับแต่งและอัปโหลดตราประทับและลายเซ็นต์"
              >
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>ตราประทับ & ลายเซ็นต์</span>
                {(showStamp || showSignature) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์ 50 ทวิ (Print A4)</span>
              </button>
            </div>
          </div>

          {/* Interactive Stamp & Signature Configuration Drawer */}
          {isSettingsOpen && (
            <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 -mx-4 -mb-4 p-4 rounded-b-xl animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    จัดการตราประทับบริษัท & ลายเซ็นต์ผู้มีอำนาจ (Company Stamp & Signature)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToOfficialAssets}
                    className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-200 transition cursor-pointer"
                    title="รีเซ็ตกลับเป็นไฟล์ที่แนบมา"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAsCompanyDefault}
                    className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1 rounded shadow-xs transition cursor-pointer"
                    title="บันทึกเป็นตราประทับและลายเซ็นต์ประจำบริษัท"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>บันทึกเป็นค่าตั้งต้นของบริษัท</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Company Stamp Management Card */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">ตราประทับบริษัท (Company Stamp)</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={showStamp}
                        onChange={(e) => setShowStamp(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>แสดงตราประทับ</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0">
                      {stampUrl ? (
                        <img 
                          src={stampUrl} 
                          alt="ตราประทับ" 
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 text-center">ไม่มีตราประทับ</span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <p className="text-[11px] text-slate-500 leading-snug">
                        ตราประทับ "บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด" รองรับไฟล์ PNG, JPG, SVG โปร่งใส
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => stampFileInputRef.current?.click()}
                          className="flex items-center gap-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded border border-blue-200 font-medium transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>อัปโหลดตราประทับใหม่</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stamp Placement Options */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">ตำแหน่งการประทับ:</span>
                    <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setStampPlacement('overlap')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${stampPlacement === 'overlap' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600'}`}
                      >
                        ทับลายเซ็นต์
                      </button>
                      <button
                        type="button"
                        onClick={() => setStampPlacement('beside')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${stampPlacement === 'beside' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600'}`}
                      >
                        ด้านข้าง
                      </button>
                      <button
                        type="button"
                        onClick={() => setStampPlacement('center')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${stampPlacement === 'center' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600'}`}
                      >
                        ตรงกลาง
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Authorized Signature Management Card */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">ลายเซ็นต์ผู้จ่ายเงิน (Sign Aphiwatch)</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={showSignature}
                        onChange={(e) => setShowSignature(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>แสดงลายเซ็นต์</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 h-20 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0">
                      {signatureUrl ? (
                        <img 
                          src={signatureUrl} 
                          alt="ลายเซ็นต์" 
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 text-center">ไม่มีลายเซ็นต์</span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <p className="text-[11px] text-slate-500 leading-snug">
                        ลายเซ็นต์หมึกสีน้ำเงินของผู้มีอำนาจ สามารถเปลี่ยนหรืออัปโหลดลายเซ็นต์ใหม่ได้
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => signatureFileInputRef.current?.click()}
                          className="flex items-center gap-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded border border-blue-200 font-medium transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>อัปโหลดลายเซ็นต์ใหม่</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Signer Name Input */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500 shrink-0">ชื่อผู้ลงนาม:</span>
                    <input 
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="เช่น นายอภิวัฒน์ หรือ ผู้มีอำนาจลงนาม"
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable Area */}
      <div className="space-y-6 print:space-y-0">
        {(copyMode === 'both' || copyMode === 'copy1') && renderSingleCopy(1)}
        {(copyMode === 'both' || copyMode === 'copy2') && renderSingleCopy(2)}
      </div>
    </div>
  );
};
