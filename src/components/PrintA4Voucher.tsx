import React, { useState } from 'react';
import { 
  Printer, 
  ArrowLeft, 
  Building,
  FileText,
  Upload,
  Sparkles,
  X,
  Check,
  RotateCcw,
  Image as ImageIcon,
  Sliders,
  CheckCircle2,
  Trash2,
  UserCheck,
  Award,
  Briefcase
} from 'lucide-react';
import { Voucher, CompanySettings, VoucherSignatures } from '../types';
import { AccountPlanetLogo } from './AccountPlanetLogo';
import { formatCurrency, convertToThaiBahtText } from '../utils/thaiBahtText';
import { fileToOptimizedDataUrl } from '../utils/imageUtils';

interface PrintA4VoucherProps {
  voucher: Voucher;
  companySettings: CompanySettings;
  onBack: () => void;
  onPrint50Tawi?: (voucher: Voucher) => void;
  onUpdateVoucher?: (voucher: Voucher) => void;
  onUpdateCompanySettings?: (settings: CompanySettings) => void;
}

export const PrintA4Voucher: React.FC<PrintA4VoucherProps> = ({
  voucher,
  companySettings,
  onBack,
  onPrint50Tawi,
  onUpdateVoucher,
  onUpdateCompanySettings,
}) => {
  const isRV = voucher.type === 'RV';

  // Local state for signatures and stamp to support real-time preview and editing
  const [signatures, setSignatures] = useState<VoucherSignatures>({
    preparedBy: voucher.signatures?.preparedBy ?? companySettings.defaultPreparedBy ?? 'ผู้จัดทำบัญชี',
    preparedDate: voucher.signatures?.preparedDate || voucher.date,
    preparedBySignatureUrl: voucher.signatures?.preparedBySignatureUrl ?? companySettings.defaultPreparedBySignatureUrl ?? '/signatures/sign_napak.svg',
    checkedBy: voucher.signatures?.checkedBy ?? companySettings.defaultCheckedBy ?? 'ผู้จัดการแผนกบัญชี',
    checkedDate: voucher.signatures?.checkedDate || voucher.date,
    checkedBySignatureUrl: voucher.signatures?.checkedBySignatureUrl ?? companySettings.defaultCheckedBySignatureUrl ?? '',
    approvedBy: voucher.signatures?.approvedBy ?? companySettings.defaultApprovedBy ?? 'กรรมการผู้จัดการ',
    approvedDate: voucher.signatures?.approvedDate || voucher.date,
    approvedBySignatureUrl: voucher.signatures?.approvedBySignatureUrl ?? companySettings.defaultApprovedBySignatureUrl ?? '/signatures/sign_aphiwatch.svg',
    receivedOrPaidBy: voucher.signatures?.receivedOrPaidBy || voucher.contact?.name || (isRV ? 'ผู้รับเงิน / การเงิน' : 'ผู้รับเงิน / คู่ค้า'),
    receivedOrPaidDate: voucher.signatures?.receivedOrPaidDate || voucher.payment?.paymentDate || voucher.date,
    receivedOrPaidSignatureUrl: voucher.signatures?.receivedOrPaidSignatureUrl ?? companySettings.defaultReceivedOrPaidSignatureUrl ?? '',
  });

  const [showCompanyStamp, setShowCompanyStamp] = useState<boolean>(
    voucher.signatures?.showCompanyStamp ?? companySettings.defaultShowStampOnVouchers ?? true
  );
  const [companyStampUrl, setCompanyStampUrl] = useState<string>(
    voucher.signatures?.companyStampUrl || companySettings.companyStampUrl || '/stamps/company_stamp.svg'
  );
  const [stampPlacement, setStampPlacement] = useState<'approved' | 'received' | 'center' | 'all'>(
    voucher.signatures?.stampPlacement || 'approved'
  );

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Sync updates back to the parent voucher
  const persistChanges = (newSignatures = signatures, newStamp = companyStampUrl, newShowStamp = showCompanyStamp, newPlacement = stampPlacement) => {
    if (onUpdateVoucher) {
      onUpdateVoucher({
        ...voucher,
        signatures: {
          ...newSignatures,
          companyStampUrl: newStamp,
          showCompanyStamp: newShowStamp,
          stampPlacement: newPlacement,
        },
      });
    }
  };

  // Upload handler for 4-party signatures
  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldKey: 'preparedBySignatureUrl' | 'checkedBySignatureUrl' | 'approvedBySignatureUrl' | 'receivedOrPaidSignatureUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      const updatedSigs = { ...signatures, [fieldKey]: dataUrl };
      setSignatures(updatedSigs);
      persistChanges(updatedSigs);
      triggerToast('อัปโหลดลายเซ็นต์ใหม่เรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถอัปโหลดไฟล์รูปภาพได้');
    }
    e.target.value = '';
  };

  // Upload handler for company stamp
  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      setCompanyStampUrl(dataUrl);
      setShowCompanyStamp(true);
      persistChanges(signatures, dataUrl, true);
      triggerToast('อัปโหลดตราประทับนิติบุคคลใหม่เรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถอัปโหลดไฟล์ตราประทับได้');
    }
    e.target.value = '';
  };

  // Save current signatures and stamp as company defaults
  const handleSaveAsCompanyDefault = () => {
    if (onUpdateCompanySettings) {
      onUpdateCompanySettings({
        ...companySettings,
        companyStampUrl,
        defaultShowStampOnVouchers: showCompanyStamp,
        defaultPreparedBy: signatures.preparedBy,
        defaultPreparedBySignatureUrl: signatures.preparedBySignatureUrl,
        defaultCheckedBy: signatures.checkedBy,
        defaultCheckedBySignatureUrl: signatures.checkedBySignatureUrl,
        defaultApprovedBy: signatures.approvedBy,
        defaultApprovedBySignatureUrl: signatures.approvedBySignatureUrl,
        defaultReceivedOrPaidBy: signatures.receivedOrPaidBy,
        defaultReceivedOrPaidSignatureUrl: signatures.receivedOrPaidSignatureUrl,
      });
      triggerToast('บันทึกลายเซ็นต์และตราประทับเป็นค่าเริ่มต้นของบริษัทเรียบร้อยแล้ว');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-3 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Control Bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ</span>
        </button>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>รูปแบบ:</span>
          <span className="font-semibold text-slate-800">มาตรฐานกระดาษ A4 (ตามหลักสรรพากร)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Customization Button */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-lg font-medium text-xs shadow-xs transition cursor-pointer"
            title="ปรับแต่งลายเซ็นต์ 4 ฝ่าย และตราประทับนิติบุคคล"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>ปรับแต่งลายเซ็นต์ & ตราประทับ</span>
          </button>

          {voucher.type === 'PV' && onPrint50Tawi && (
            <button
              onClick={() => onPrint50Tawi(voucher)}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-lg font-medium text-xs shadow-xs transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-700" />
              <span>พิมพ์ 50 ทวิ (หัก ณ ที่จ่าย)</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์เอกสาร A4 / PDF</span>
          </button>
        </div>
      </div>

      {/* Official A4 Document Canvas */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 sm:p-12 rounded-lg shadow-md border border-slate-200 print-container text-slate-900 text-[13px] leading-relaxed">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-5">
          <div className="flex items-start gap-4">
            <AccountPlanetLogo
              customLogoUrl={companySettings.logoUrl}
              size="xl"
              showText={false}
              isPrint={true}
              className="flex-shrink-0"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {companySettings.name}
              </h1>
              <p className="text-xs text-slate-600 font-medium">ACCOUNT PLANET CO., LTD.</p>
              <div className="text-xs text-slate-700 mt-1 max-w-md leading-relaxed">
                <div>120/820 หมู่บ้านมณียาวิลล์ ซอย 7D (วชิรธรรมสาธิต 12)</div>
                <div>ซอยสุขุมวิท 101/1 แขวงบางนาเหนือ เขตบางนา กรุงเทพฯ 10260</div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 mt-1">
                <span>เลขประจำตัวผู้เสียภาษี: <strong className="font-semibold text-slate-900">{companySettings.taxId}</strong></span>
                <span>สาขา: <strong className="font-semibold text-slate-900">{companySettings.branch} ({companySettings.branchCode})</strong></span>
                <span>โทรศัพท์: <strong>{companySettings.phone}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded font-bold text-sm tracking-wider uppercase">
              {isRV ? 'ใบสำคัญรับเงิน' : 'ใบสำคัญจ่ายเงิน'}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase mt-0.5 tracking-wider">
              {isRV ? 'RECEIPT VOUCHER (RV)' : 'PAYMENT VOUCHER (PV)'}
            </div>

            <div className="mt-3 text-xs text-right space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200 w-48">
              <div className="flex justify-between">
                <span className="text-slate-500">เลขที่เอกสาร:</span>
                <span className="font-mono font-bold text-blue-900">{voucher.voucherNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วันที่ (Date):</span>
                <span className="font-semibold text-slate-800">{voucher.date}</span>
              </div>
              {voucher.jobNo && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Job No.:</span>
                  <span className="font-mono font-bold text-blue-950 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200 text-xs">
                    {voucher.jobNo}
                  </span>
                </div>
              )}
              {voucher.referenceNo && (
                <div className="flex justify-between">
                  <span className="text-slate-500">เลขอ้างอิง:</span>
                  <span className="font-mono text-slate-700">{voucher.referenceNo}</span>
                </div>
              )}
              {voucher.type === 'PV' && voucher.auditor && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-indigo-800 font-medium text-[11px] shrink-0">ผู้สอบบัญชี:</span>
                  <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[110px] text-right" title={voucher.auditor}>
                    {voucher.auditor}
                  </span>
                </div>
              )}
              {voucher.type === 'RV' && voucher.jobClient && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-teal-800 font-medium text-[11px] shrink-0">ลูกค้าส่งงาน:</span>
                  <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[110px] text-right" title={voucher.jobClient}>
                    {voucher.jobClient}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact / Vendor / Customer Info */}
        <div className="border border-slate-300 rounded-lg p-3.5 mb-5 bg-slate-50/50">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-700" />
            <span>{isRV ? 'ข้อมูลลูกค้า / ผู้ชำระเงิน (Customer Information)' : 'ข้อมูลผู้รับเงิน / คู่ค้า (Payee / Vendor Information)'}</span>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs">
            <div className="col-span-8">
              <span className="text-slate-500">ชื่อผู้ติดต่อ/บริษัท: </span>
              <span className="font-bold text-slate-900 text-sm">{voucher.contact.name}</span>
              {voucher.contact.branch && (
                <span className="ml-2 text-slate-600 font-medium">({voucher.contact.branch})</span>
              )}
            </div>

            <div className="col-span-4 text-right">
              <span className="text-slate-500">เลขประจำตัวผู้เสียภาษี: </span>
              <span className="font-mono font-bold text-slate-900">{voucher.contact.taxId || '-'}</span>
            </div>

            <div className="col-span-12">
              <span className="text-slate-500">ที่อยู่: </span>
              <span className="text-slate-700">{voucher.contact.address || '-'}</span>
            </div>

            {(voucher.contact.phone || voucher.contact.contactPerson) && (
              <div className="col-span-12 flex gap-4 text-slate-600 text-[11px] pt-1">
                {voucher.contact.contactPerson && (
                  <span>ผู้ติดต่อ: <strong>{voucher.contact.contactPerson}</strong></span>
                )}
                {voucher.contact.phone && (
                  <span>เบอร์โทร: <strong>{voucher.contact.phone}</strong></span>
                )}
              </div>
            )}

            {voucher.type === 'PV' && voucher.auditor && (
              <div className="col-span-12 mt-1 pt-1.5 border-t border-slate-200 flex items-center justify-between bg-indigo-50/70 px-2.5 py-1.5 rounded border border-indigo-100">
                <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                  <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>ผู้สอบบัญชี (Auditor / CPA):</span>
                </div>
                <span className="font-semibold text-indigo-950 text-xs">{voucher.auditor}</span>
              </div>
            )}

            {voucher.type === 'RV' && voucher.jobClient && (
              <div className="col-span-12 mt-1 pt-1.5 border-t border-slate-200 flex items-center justify-between bg-teal-50/70 px-2.5 py-1.5 rounded border border-teal-100">
                <div className="flex items-center gap-1.5 text-teal-900 font-bold text-xs">
                  <Briefcase className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>ลูกค้าที่ส่งงาน (Job Client / Delivery):</span>
                </div>
                <span className="font-semibold text-teal-950 text-xs">{voucher.jobClient}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-800 rounded-lg overflow-hidden mb-5">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-800 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center">ลำดับ</th>
                <th className="py-2.5 px-3 border-r border-slate-300">รายการและคำอธิบายสินค้า/บริการ (Description)</th>
                <th className="py-2.5 px-3 border-r border-slate-300 w-28 text-right">จำนวนเงิน</th>
                <th className="py-2.5 px-3 border-r border-slate-300 w-20 text-right">ภาษี 7%</th>
                <th className="py-2.5 px-3 border-r border-slate-300 w-24 text-right">หัก ณ ที่จ่าย</th>
                <th className="py-2.5 px-3 w-28 text-right">ยอดรวมสุทธิ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {voucher.items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 border-r border-slate-300 text-center font-mono text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 font-medium text-slate-900 leading-relaxed">
                    <div>{item.description}</div>
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono text-slate-900">
                    {formatCurrency(item.baseAmount)}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono text-slate-700">
                    {item.vatAmount > 0 ? formatCurrency(item.vatAmount) : '-'}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono text-amber-800">
                    {item.whtAmount > 0 ? `(${formatCurrency(item.whtAmount)})` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(item.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes Section */}
        <div className="grid grid-cols-12 gap-4 mb-5">
          <div className="col-span-7 space-y-3">
            {/* Thai Baht text banner */}
            <div className="bg-slate-50 border border-slate-300 p-2.5 rounded text-xs">
              <span className="text-slate-500 font-medium">จำนวนเงินตัวอักษร: </span>
              <span className="font-bold text-slate-900">
                {voucher.thaiBahtText || convertToThaiBahtText(voucher.netPayable) || '...........................................................................................'}
              </span>
            </div>

            {/* Payment Details */}
            <div className="border border-slate-300 p-3 rounded text-xs space-y-1 bg-slate-50/50">
              <div className="font-bold text-slate-800 text-[11px] mb-1">
                วิธีการชำระเงิน (Payment Method): {voucher.payment.method}
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>ธนาคาร: <strong>{voucher.payment.bankName || '-'}</strong></div>
                <div>เลขที่บัญชี: <strong>{voucher.payment.accountNo || '-'}</strong></div>
                <div>ชื่อบัญชี: <strong>{voucher.payment.accountName || '-'}</strong></div>
                <div>วันที่ชำระ: <strong>{voucher.payment.paymentDate || voucher.date}</strong></div>
                {voucher.payment.recipientBankName && (
                  <div>ธนาคารผู้รับเงิน: <strong>{voucher.payment.recipientBankName}</strong></div>
                )}
                {voucher.payment.recipientAccountNo && (
                  <div>เลขที่บัญชีผู้รับเงิน: <strong>{voucher.payment.recipientAccountNo}</strong></div>
                )}
              </div>
            </div>

            {voucher.notes && (
              <div className="text-xs text-slate-600 bg-amber-50/60 border border-amber-200 p-2 rounded">
                <span className="font-semibold text-amber-900">หมายเหตุ: </span>
                <span>{voucher.notes}</span>
              </div>
            )}
          </div>

          <div className="col-span-5 bg-slate-50 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
            <div className="flex justify-between text-slate-700">
              <span>รวมยอดเงินก่อนภาษี (Subtotal):</span>
              <span className="font-mono font-medium">{formatCurrency(voucher.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
              <span className="font-mono font-medium">{formatCurrency(voucher.totalVat)}</span>
            </div>
            <div className="flex justify-between text-amber-800">
              <span>หัก ภาษี ณ ที่จ่าย 3% (Withholding Tax):</span>
              <span className="font-mono font-medium">-{formatCurrency(voucher.totalWht)}</span>
            </div>
            <div className="pt-2 border-t-2 border-slate-800 flex justify-between items-center text-sm font-bold text-slate-900">
              <span>{isRV ? 'ยอดรับสุทธิ (Net Received):' : 'ยอดจ่ายสุทธิ (Net Payable):'}</span>
              <span className="font-mono text-base text-blue-900">{formatCurrency(voucher.netPayable)}</span>
            </div>
          </div>
        </div>

        {/* Standard Internal Control Signatures (4 Boxes) */}
        <div className="mt-8 pt-4 border-t border-slate-300 relative">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-2">
            <span>ลายมือชื่อผู้มีอำนาจตามระบบการควบคุมภายในและประมวลรัษฎากร</span>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="no-print text-[10px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1 font-normal ml-1"
            >
              <Sliders className="w-3 h-3" />
              <span>(คลิกเพื่อปรับเปลี่ยนลายเซ็นต์/ตราประทับ)</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center text-xs relative">
            {/* Stamp Overlap for Center placement */}
            {showCompanyStamp && companyStampUrl && stampPlacement === 'center' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none select-none">
                <img
                  src={companyStampUrl}
                  alt="ตราประทับนิติบุคคล"
                  className="w-24 h-24 object-contain opacity-88 mix-blend-multiply rotate-[-7deg] drop-shadow-xs"
                />
              </div>
            )}

            {/* Box 1: ผู้จัดทำ */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between min-h-[125px] relative group hover:border-blue-400 transition">
              <div className="font-semibold text-slate-800 text-[11px]">ผู้จัดทำ (Prepared By)</div>
              <div className="my-0.5 flex items-center justify-center h-12 relative overflow-hidden">
                {signatures.preparedBySignatureUrl ? (
                  <img
                    src={signatures.preparedBySignatureUrl}
                    alt="ลายมือชื่อผู้จัดทำ"
                    className="max-h-12 w-auto object-contain pointer-events-none drop-shadow-xs"
                  />
                ) : (
                  <div className="w-full border-b border-dashed border-slate-400 my-auto"></div>
                )}
              </div>
              <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
              <div>
                <div className="text-slate-900 font-medium text-[11px]">
                  ({signatures.preparedBy || '........................................'})
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">
                  วันที่: {signatures.preparedDate || voucher.date || '..... / ..... / .........'}
                </div>
              </div>
            </div>

            {/* Box 2: ผู้ตรวจจ่าย/ตรวจสอบ */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between min-h-[125px] relative group hover:border-blue-400 transition">
              <div className="font-semibold text-slate-800 text-[11px]">ผู้ตรวจสอบ (Checked By)</div>
              <div className="my-0.5 flex items-center justify-center h-12 relative overflow-hidden">
                {signatures.checkedBySignatureUrl ? (
                  <img
                    src={signatures.checkedBySignatureUrl}
                    alt="ลายมือชื่อผู้ตรวจสอบ"
                    className="max-h-12 w-auto object-contain pointer-events-none drop-shadow-xs"
                  />
                ) : (
                  <div className="w-full border-b border-dashed border-slate-400 my-auto"></div>
                )}
              </div>
              <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
              <div>
                <div className="text-slate-900 font-medium text-[11px]">
                  ({signatures.checkedBy || '........................................'})
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">
                  วันที่: {signatures.checkedDate || voucher.date || '..... / ..... / .........'}
                </div>
              </div>
            </div>

            {/* Box 3: ผู้อนุมัติ */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between min-h-[125px] relative overflow-visible group hover:border-blue-400 transition">
              {/* Stamp on Box 3 (Approved By - Standard Practice) */}
              {showCompanyStamp && companyStampUrl && (stampPlacement === 'approved' || stampPlacement === 'all') && (
                <div className="absolute -top-3.5 -right-3.5 z-10 pointer-events-none select-none">
                  <img
                    src={companyStampUrl}
                    alt="ตราประทับนิติบุคคล"
                    className="w-20 h-20 object-contain opacity-90 mix-blend-multiply rotate-[-6deg] drop-shadow-xs"
                  />
                </div>
              )}
              <div className="font-semibold text-slate-800 text-[11px]">ผู้อนุมัติ (Approved By)</div>
              <div className="my-0.5 flex items-center justify-center h-12 relative overflow-hidden">
                {signatures.approvedBySignatureUrl ? (
                  <img
                    src={signatures.approvedBySignatureUrl}
                    alt="ลายมือชื่อผู้อนุมัติ"
                    className="max-h-12 w-auto object-contain pointer-events-none drop-shadow-xs"
                  />
                ) : (
                  <div className="w-full border-b border-dashed border-slate-400 my-auto"></div>
                )}
              </div>
              <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
              <div>
                <div className="text-slate-900 font-medium text-[11px]">
                  ({signatures.approvedBy || '........................................'})
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">
                  วันที่: {signatures.approvedDate || voucher.date || '..... / ..... / .........'}
                </div>
              </div>
            </div>

            {/* Box 4: ผู้รับเงิน / ผู้จ่ายเงิน */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between min-h-[125px] relative overflow-visible group hover:border-blue-400 transition">
              {/* Stamp on Box 4 (Received / Paid By) */}
              {showCompanyStamp && companyStampUrl && (stampPlacement === 'received' || stampPlacement === 'all') && (
                <div className="absolute -top-3.5 -right-3.5 z-10 pointer-events-none select-none">
                  <img
                    src={companyStampUrl}
                    alt="ตราประทับนิติบุคคล"
                    className="w-20 h-20 object-contain opacity-90 mix-blend-multiply rotate-[5deg] drop-shadow-xs"
                  />
                </div>
              )}
              <div className="font-semibold text-slate-800 text-[11px]">
                {isRV ? 'ผู้รับเงิน / การเงิน (Received By)' : 'ผู้รับเงิน / คู่ค้า (Paid To)'}
              </div>
              <div className="my-0.5 flex items-center justify-center h-12 relative overflow-hidden">
                {signatures.receivedOrPaidSignatureUrl ? (
                  <img
                    src={signatures.receivedOrPaidSignatureUrl}
                    alt="ลายมือชื่อผู้รับ/จ่ายเงิน"
                    className="max-h-12 w-auto object-contain pointer-events-none drop-shadow-xs"
                  />
                ) : (
                  <div className="w-full border-b border-dashed border-slate-400 my-auto"></div>
                )}
              </div>
              <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
              <div>
                <div className="text-slate-900 font-medium text-[11px]">
                  ({signatures.receivedOrPaidBy || '........................................'})
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">
                  วันที่: {signatures.receivedOrPaidDate || voucher.date || '..... / ..... / .........'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Audit Notice */}
        <div className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
          <span>ออกโดยระบบ Live Artifacts บัญชี บจก. แอ็คเคาน์ แพลนเน็ท (เลขประจำตัวผู้เสียภาษี: {companySettings.taxId})</span>
          <span>เอกสารสำคัญทางบัญชีใช้ประกอบการลงบัญชีและยื่นภาษีสรรพากร</span>
        </div>
      </div>

      {/* Signature & Stamp Customization Modal (Interactive Configuration Drawer) */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    จัดการลายเซ็นต์ 4 ฝ่าย & ตราประทับนิติบุคคล (A4 Voucher)
                  </h3>
                  <p className="text-xs text-slate-500">
                    อัปโหลดรูปภาพลายมือชื่อ ตราประทับ หรือสลับตำแหน่งประทับตราในเอกสารใบสำคัญนี้
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Part 1: Company Stamp Settings */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-xs text-rose-950">
                      ตราประทับบริษัท / นิติบุคคล (Company Stamp)
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-rose-300 select-none shadow-2xs">
                    <input
                      type="checkbox"
                      checked={showCompanyStamp}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setShowCompanyStamp(val);
                        persistChanges(signatures, companyStampUrl, val, stampPlacement);
                      }}
                      className="w-3.5 h-3.5 text-rose-600 rounded focus:ring-rose-500 border-slate-300"
                    />
                    <span className="font-semibold text-rose-900 text-[11px]">
                      เปิดแสดงตราประทับ
                    </span>
                  </label>
                </div>

                {showCompanyStamp && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl border border-rose-200 bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                        {companyStampUrl ? (
                          <img
                            src={companyStampUrl}
                            alt="ตราประทับ"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-rose-300" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-rose-950">
                          ตราประทับ บจก. แอ็คเคาน์ แพลนเน็ท
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <label className="flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 px-2 py-1 rounded text-[10px] font-medium cursor-pointer transition shadow-2xs">
                            <Upload className="w-3 h-3" />
                            <span>อัปโหลดตราใหม่</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleStampUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setCompanyStampUrl('/stamps/company_stamp.svg');
                              persistChanges(signatures, '/stamps/company_stamp.svg', true, stampPlacement);
                              triggerToast('รีเซ็ตเป็นตราประทับตั้งต้นแล้ว');
                            }}
                            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded cursor-pointer transition shadow-2xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>ตราตั้งต้น</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-rose-200">
                      <label className="block text-[11px] font-semibold text-rose-950">
                        ตำแหน่งประทับตรานิติบุคคล:
                      </label>
                      <select
                        value={stampPlacement}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setStampPlacement(val);
                          persistChanges(signatures, companyStampUrl, showCompanyStamp, val);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-rose-200 rounded-md text-slate-800 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="approved">ช่อง 3: ผู้อนุมัติ (Approved By) - แนะนำตามมาตรฐานสรรพากร</option>
                        <option value="received">ช่อง 4: ผู้รับเงิน / ผู้จ่ายเงิน</option>
                        <option value="center">กึ่งกลาง 4 ช่อง (Center Overlap)</option>
                        <option value="all">ประทับทุกช่อง (All)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Part 2: The 4 Signatures Grid */}
              <div className="space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>ผู้มีอำนาจลงนาม 4 ฝ่าย (4-Party Internal Control Signatures):</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    สามารถแก้ไขชื่อหรืออัปโหลดลายเซ็นต์ใหม่ได้อิสระ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Box 1: ผู้จัดทำ */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px]">1. ผู้จัดทำ (Prepared By)</span>
                      {signatures.preparedBySignatureUrl ? (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">มีลายเซ็นต์</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">ยังไม่มีลายเซ็นต์</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={signatures.preparedBy}
                      onChange={(e) => {
                        const updated = { ...signatures, preparedBy: e.target.value };
                        setSignatures(updated);
                        persistChanges(updated);
                      }}
                      placeholder="ชื่อผู้จัดทำ"
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50/50"
                    />

                    {signatures.preparedBySignatureUrl ? (
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-blue-50/50 border border-blue-200 rounded-lg">
                        <img
                          src={signatures.preparedBySignatureUrl}
                          alt="ลายเซ็นต์ผู้จัดทำ"
                          className="h-7 max-w-[90px] object-contain bg-white rounded px-1.5 py-0.5 border border-blue-200"
                        />
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer underline">
                            เปลี่ยน
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSignatureUpload(e, 'preparedBySignatureUrl')}
                              className="hidden"
                            />
                          </label>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...signatures, preparedBySignatureUrl: '' };
                              setSignatures(updated);
                              persistChanges(updated);
                            }}
                            className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            นำออก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 rounded-lg text-[10px] font-medium text-slate-600 hover:text-blue-600 cursor-pointer transition">
                          <Upload className="w-3 h-3" />
                          <span>อัปโหลดลายเซ็นต์ (PNG/SVG)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload(e, 'preparedBySignatureUrl')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...signatures, preparedBySignatureUrl: '/signatures/sign_napak.svg' };
                            setSignatures(updated);
                            persistChanges(updated);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          <span>ใช้ลายเซ็นต์เริ่มต้น (คุณนภักดิ์)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Box 2: ผู้ตรวจสอบ */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px]">2. ผู้ตรวจสอบ (Checked By)</span>
                      {signatures.checkedBySignatureUrl ? (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">มีลายเซ็นต์</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">ยังไม่มีลายเซ็นต์</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={signatures.checkedBy}
                      onChange={(e) => {
                        const updated = { ...signatures, checkedBy: e.target.value };
                        setSignatures(updated);
                        persistChanges(updated);
                      }}
                      placeholder="ชื่อผู้ตรวจสอบ"
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50/50"
                    />

                    {signatures.checkedBySignatureUrl ? (
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-blue-50/50 border border-blue-200 rounded-lg">
                        <img
                          src={signatures.checkedBySignatureUrl}
                          alt="ลายเซ็นต์ผู้ตรวจสอบ"
                          className="h-7 max-w-[90px] object-contain bg-white rounded px-1.5 py-0.5 border border-blue-200"
                        />
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer underline">
                            เปลี่ยน
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSignatureUpload(e, 'checkedBySignatureUrl')}
                              className="hidden"
                            />
                          </label>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...signatures, checkedBySignatureUrl: '' };
                              setSignatures(updated);
                              persistChanges(updated);
                            }}
                            className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            นำออก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 rounded-lg text-[10px] font-medium text-slate-600 hover:text-blue-600 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>อัปโหลดลายเซ็นต์ (PNG/SVG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSignatureUpload(e, 'checkedBySignatureUrl')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Box 3: ผู้อนุมัติ */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px]">3. ผู้อนุมัติ (Approved By)</span>
                      {signatures.approvedBySignatureUrl ? (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">มีลายเซ็นต์</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">ยังไม่มีลายเซ็นต์</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={signatures.approvedBy}
                      onChange={(e) => {
                        const updated = { ...signatures, approvedBy: e.target.value };
                        setSignatures(updated);
                        persistChanges(updated);
                      }}
                      placeholder="ชื่อผู้อนุมัติ"
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50/50"
                    />

                    {signatures.approvedBySignatureUrl ? (
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-blue-50/50 border border-blue-200 rounded-lg">
                        <img
                          src={signatures.approvedBySignatureUrl}
                          alt="ลายเซ็นต์ผู้อนุมัติ"
                          className="h-7 max-w-[90px] object-contain bg-white rounded px-1.5 py-0.5 border border-blue-200"
                        />
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer underline">
                            เปลี่ยน
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSignatureUpload(e, 'approvedBySignatureUrl')}
                              className="hidden"
                            />
                          </label>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...signatures, approvedBySignatureUrl: '' };
                              setSignatures(updated);
                              persistChanges(updated);
                            }}
                            className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            นำออก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 rounded-lg text-[10px] font-medium text-slate-600 hover:text-blue-600 cursor-pointer transition">
                          <Upload className="w-3 h-3" />
                          <span>อัปโหลดลายเซ็นต์ (PNG/SVG)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload(e, 'approvedBySignatureUrl')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...signatures, approvedBySignatureUrl: '/signatures/sign_aphiwatch.svg' };
                            setSignatures(updated);
                            persistChanges(updated);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          <span>ใช้ลายเซ็นต์เริ่มต้น (คุณอภิวัฒน์)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Box 4: ผู้รับเงิน / ผู้จ่ายเงิน */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px]">
                        4. {isRV ? 'ผู้รับเงิน (Received By)' : 'ผู้รับเงิน / คู่ค้า (Paid To)'}
                      </span>
                      {signatures.receivedOrPaidSignatureUrl ? (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">มีลายเซ็นต์</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">ยังไม่มีลายเซ็นต์</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={signatures.receivedOrPaidBy}
                      onChange={(e) => {
                        const updated = { ...signatures, receivedOrPaidBy: e.target.value };
                        setSignatures(updated);
                        persistChanges(updated);
                      }}
                      placeholder="ชื่อผู้รับเงิน / คู่ค้า"
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50/50"
                    />

                    {signatures.receivedOrPaidSignatureUrl ? (
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-blue-50/50 border border-blue-200 rounded-lg">
                        <img
                          src={signatures.receivedOrPaidSignatureUrl}
                          alt="ลายเซ็นต์ผู้รับเงิน"
                          className="h-7 max-w-[90px] object-contain bg-white rounded px-1.5 py-0.5 border border-blue-200"
                        />
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer underline">
                            เปลี่ยน
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSignatureUpload(e, 'receivedOrPaidSignatureUrl')}
                              className="hidden"
                            />
                          </label>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...signatures, receivedOrPaidSignatureUrl: '' };
                              setSignatures(updated);
                              persistChanges(updated);
                            }}
                            className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            นำออก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 rounded-lg text-[10px] font-medium text-slate-600 hover:text-blue-600 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>อัปโหลดลายเซ็นต์ (PNG/SVG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSignatureUpload(e, 'receivedOrPaidSignatureUrl')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSaveAsCompanyDefault}
                className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>บันทึกเป็นค่าเริ่มต้นของบริษัท</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  persistChanges();
                  setIsConfigModalOpen(false);
                  triggerToast('อัปเดตเอกสาร A4 เรียบร้อยแล้ว');
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer transition"
              >
                <Check className="w-4 h-4" />
                <span>เสร็จสิ้นและดูเอกสาร</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
