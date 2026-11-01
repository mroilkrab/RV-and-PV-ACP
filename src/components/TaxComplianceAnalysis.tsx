import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  BookOpen, 
  FileSpreadsheet, 
  Scale, 
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCheck
} from 'lucide-react';
import { CompanySettings, Voucher } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';

interface TaxComplianceProps {
  companySettings: CompanySettings;
  vouchers: Voucher[];
}

export const TaxComplianceAnalysis: React.FC<TaxComplianceProps> = ({
  companySettings,
  vouchers,
}) => {
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>(vouchers[0]?.id || '');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);

  const currentVoucher = vouchers.find((v) => v.id === selectedVoucherId) || vouchers[0];

  // Pre-flight compliance validator
  const checkVoucherCompliance = (voucher?: Voucher) => {
    if (!voucher) return { passed: false, checks: [] };

    const checks = [
      {
        title: 'คำว่า "ใบกำกับภาษี" หรือ "ใบเสร็จรับเงิน"',
        passed: voucher.type === 'RV',
        detail: voucher.type === 'RV' ? 'เป็นเอกสารฝั่งรับเงิน สามารถแปลงเป็นใบเสร็จรับเงิน/ใบกำกับภาษีได้' : 'เอกสาร PV เป็นใบสำคัญจ่ายภายใน ต้องมีใบกำกับภาษีจากคู่ค้ามาแนบ',
        severity: 'high' as const,
      },
      {
        title: 'ชื่อ-ที่อยู่-เลขประจำตัวผู้เสียภาษี 13 หลักของผู้ขาย (ผู้ออก)',
        passed: Boolean(companySettings.taxId && companySettings.taxId.length === 13),
        detail: `บจก. แอ็คเคาน์ แพลนเน็ท (เลข 13 หลัก: ${companySettings.taxId}) สาขา: ${companySettings.branch}`,
        severity: 'high' as const,
      },
      {
        title: 'ชื่อ-ที่อยู่-เลขประจำตัวผู้เสียภาษี 13 หลักของผู้ซื้อ/คู่ค้า',
        passed: Boolean(voucher.contact.taxId && voucher.contact.taxId.length === 13 && voucher.contact.name),
        detail: voucher.contact.taxId
          ? `${voucher.contact.name} (Tax ID: ${voucher.contact.taxId})`
          : 'ยังขาดเลข 13 หลักของผู้ซื้อ/ผู้รับเงิน (จำเป็นต้องมีตามมาตรา 86/4)',
        severity: 'high' as const,
      },
      {
        title: 'การระบุสาขาของผู้ซื้อ (สำนักงานใหญ่ หรือ สาขาที่...)',
        passed: Boolean(voucher.contact.branch),
        detail: voucher.contact.branch ? `ระบุแล้ว: ${voucher.contact.branch}` : 'ควรระบุ "สำนักงานใหญ่" หรือ "สาขาที่..." ให้ชัดเจน',
        severity: 'medium' as const,
      },
      {
        title: 'แยกภาษีมูลค่าเพิ่ม (VAT 7%) ออกจากมูลค่าสินค้า/บริการ',
        passed: voucher.totalVat >= 0,
        detail: `ยอดก่อนภาษี ${formatCurrency(voucher.subtotal)} บาท, VAT ${formatCurrency(voucher.totalVat)} บาท`,
        severity: 'high' as const,
      },
      {
        title: 'การหักภาษี ณ ที่จ่าย 3% และการออกหนังสือ 50 ทวิ',
        passed: voucher.totalWht > 0,
        detail: voucher.totalWht > 0
          ? `มีรายการหัก ณ ที่จ่าย ${formatCurrency(voucher.totalWht)} บาท (ต้องออก/รับใบ 50 ทวิ)`
          : 'ไม่มีภาษีหัก ณ ที่จ่าย',
        severity: 'medium' as const,
      },
      {
        title: 'หมายเลขลำดับเอกสารและวันเดือนปีที่ออก',
        passed: Boolean(voucher.voucherNo && voucher.date),
        detail: `เลขที่: ${voucher.voucherNo}, วันที่: ${voucher.date}`,
        severity: 'high' as const,
      },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    return {
      passed: passedCount === checks.length,
      passedCount,
      totalCount: checks.length,
      checks,
    };
  };

  const validationResult = checkVoucherCompliance(currentVoucher);

  const handleAskGemini = async (presetPrompt?: string) => {
    const promptToSend = presetPrompt || aiQuestion;
    if (!promptToSend.trim()) return;

    setIsLoadingAi(true);
    setAiResponse(null);

    try {
      const resp = await fetch('/api/gemini/tax-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          voucherContext: currentVoucher
            ? {
                voucherNo: currentVoucher.voucherNo,
                type: currentVoucher.type,
                subtotal: currentVoucher.subtotal,
                wht: currentVoucher.totalWht,
                vat: currentVoucher.totalVat,
                contact: currentVoucher.contact,
                category: currentVoucher.items[0]?.accountCategory,
              }
            : {},
        }),
      });

      const data = await resp.json();
      if (data.advice) {
        setAiResponse(data.advice);
      } else {
        setAiResponse('ระบบตอบคำถามเรียบร้อยแล้ว: กรุณาตรวจสอบเอกสารแนบตามประมวลรัษฎากร');
      }
    } catch (err: any) {
      setAiResponse('ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
              <Scale className="w-3.5 h-3.5" />
              <span>การวิเคราะห์ข้อมูลตามประมวลรัษฎากร (Revenue Code Compliance)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-prompt text-white leading-tight">
              แนวทางปฏิบัติและวิเคราะห์ความถูกต้องในการออกใบกำกับภาษี & ใบเสร็จรับเงิน
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
              สำหรับ บจก. แอ็คเคาน์ แพลนเน็ท เพื่อให้เอกสารทั้งฝั่งรับ (RV) และจ่าย (PV) มีความสมบูรณ์ตามกฎหมาย ไม่เกิดความเสี่ยงถูกเบี้ยปรับเงินเพิ่ม หรือถูกประเมินเป็นรายจ่ายต้องห้ามตามมาตรา 65 ตรี
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-center">
            <div className="text-2xl font-bold text-amber-300 font-mono">มาตรา 86/4</div>
            <div className="text-[11px] text-slate-300 mt-0.5">เกณฑ์ 7 องค์ประกอบหลัก</div>
            <div className="text-[11px] text-emerald-400 mt-1 font-semibold">หัก ณ ที่จ่าย 3% ท.ป. 4/2528</div>
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Pre-flight Validator) & Right Column (Legal Guides) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Pre-flight Checker */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 font-prompt">
                  เครื่องมือตรวจเช็คความพร้อมก่อนออกใบกำกับฯ
                </h3>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                {validationResult.passedCount}/{validationResult.totalCount} ผ่าน
              </span>
            </div>

            {/* Voucher Selector */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เลือกใบสำคัญที่ต้องการตรวจสอบ:
              </label>
              <select
                value={selectedVoucherId}
                onChange={(e) => setSelectedVoucherId(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              >
                {vouchers.map((v) => (
                  <option key={v.id} value={v.id}>
                    [{v.type}] {v.voucherNo} - {v.contact.name} ({formatCurrency(v.netPayable)} บ.)
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist Results */}
            <div className="space-y-3">
              {validationResult.checks.map((c, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-xs transition ${
                    c.passed
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                      : 'bg-rose-50/50 border-rose-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {c.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">{c.title}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{c.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status Conclusion */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  handleAskGemini(
                    `ช่วยตรวจสอบเอกสารใบสำคัญ ${currentVoucher?.voucherNo} สำหรับ ${currentVoucher?.contact.name} หมวด ${currentVoucher?.items[0]?.accountCategory} ยอด ${currentVoucher?.netPayable} บาท ว่าต้องเตรียมเอกสารภาษีใดเพิ่มเพื่อให้ถูกต้องครบถ้วนตามสรรพากร`
                  )
                }
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-lg transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>ขอคำแนะนำทางภาษีเฉพาะเคสนี้จาก AI Advisor</span>
              </button>
            </div>
          </div>

          {/* AI Advisor Response Card */}
          {(isLoadingAi || aiResponse) && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs mb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>คำแนะนำจากที่ปรึกษาภาษีอากร AI (บจก. แอ็คเคาน์ แพลนเน็ท):</span>
              </div>
              {isLoadingAi ? (
                <div className="flex items-center gap-2 text-xs text-blue-800 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>กำลังวิเคราะห์ข้อกฎหมายสรรพากรและมาตรฐานการสอบบัญชี...</span>
                </div>
              ) : (
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                  {aiResponse}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Comprehensive Knowledge Base & Instructions */}
        <div className="lg:col-span-7 space-y-5">
          {/* Box 1: Voucher vs Tax Invoice */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 font-prompt flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>1. ทำความเข้าใจความแตกต่าง: ใบสำคัญ (Voucher) vs ใบกำกับภาษี/ใบเสร็จรับเงิน</span>
            </h3>
            <div className="text-xs text-slate-700 leading-relaxed space-y-2">
              <p>
                <strong>ใบสำคัญรับ (RV) และ ใบสำคัญจ่าย (PV):</strong> เป็นเอกสารจัดระเบียบทางการเงินและบัญชีภายในกิจการ (Internal Accounting Control) ใช้เป็นหลักฐานการอนุมัติรับ-จ่ายเงินและการลงบันทึกในสมุดรายวัน
              </p>
              <p className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900">
                <strong>สำคัญมาก:</strong> ใบสำคัญรับ/จ่าย ไม่สามารถใช้แทนใบกำกับภาษีตามประมวลรัษฎากรได้ หากต้องการให้ลูกค้าเคลมภาษีซื้อ (Input Tax) หรือบันทึกเป็นรายจ่ายสรรพากรได้ถูกต้อง บริษัทต้องออก <strong>"ใบเสร็จรับเงิน/ใบกำกับภาษีเต็มรูป"</strong> แนบประกบด้วยเสมอ
              </p>
            </div>
          </div>

          {/* Box 2: 7 Elements Checklist */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 font-prompt flex items-center gap-2 mb-3">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>2. รายการที่ต้องมีเพิ่มเติมเพื่อให้เป็น "ใบกำกับภาษีเต็มรูป" ถูกต้องตามกฎหมาย (มาตรา 86/4)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">1. หัวเอกสารเด่นชัด</div>
                <div className="text-slate-600 text-[11px] mt-1">ต้องมีคำว่า "ใบกำกับภาษี" ในจุดที่เห็นได้ชัดเจน</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">2. ข้อมูลบริษัทผู้ออก</div>
                <div className="text-slate-600 text-[11px] mt-1">
                  ชื่อ: บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด<br/>
                  เลข 13 หลัก: 0105556026458<br/>
                  ระบุ "สำนักงานใหญ่"
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">3. ข้อมูลลูกค้าครบถ้วน</div>
                <div className="text-slate-600 text-[11px] mt-1">ชื่อ, ที่อยู่ตาม ภ.พ.20, เลข 13 หลัก และระบุสำนักงานใหญ่/สาขา</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">4. แยกภาษีมูลค่าเพิ่ม 7%</div>
                <div className="text-slate-600 text-[11px] mt-1">แสดงมูลค่าบริการ และแยกจำนวน VAT 7% ให้เห็นชัดเจน</div>
              </div>
            </div>
          </div>

          {/* Box 3: Specific Audit & Commission Rules */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 font-prompt flex items-center gap-2 mb-3">
              <Scale className="w-5 h-5 text-indigo-600" />
              <span>3. กฎเกณฑ์เฉพาะสำหรับ "ค่าบริการตรวจสอบบัญชี" และ "ค่านายหน้า"</span>
            </h3>
            <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
              <div className="border-l-4 border-blue-500 pl-3">
                <strong className="text-slate-900">การจ่ายค่าบริการตรวจสอบบัญชีให้แก่ผู้สอบ CPA:</strong>
                <p className="mt-1">
                  ต้องมี <strong>สัญญาจ้างตรวจสอบบัญชี (Engagement Contract)</strong> หรือหนังสือยินยอมรับงานจากผู้สอบ CPA ระบุชื่อและเลขทะเบียนผู้สอบชัดเจน และผู้สอบต้องลงนามในใบสำคัญจ่าย พร้อมแนบสำเนาบัตรประชาชน/สภาวิชาชีพบัญชี เพื่อป้องกันการเป็นรายจ่ายต้องห้ามตาม <strong>มาตรา 65 ตรี (9)</strong>
                </p>
              </div>

              <div className="border-l-4 border-amber-500 pl-3">
                <strong className="text-slate-900">การหักภาษี ณ ที่จ่าย 3% (คำสั่ง ท.ป. 4/2528):</strong>
                <p className="mt-1">
                  ทั้งค่าบริการตรวจสอบบัญชีและค่านายหน้า ต้องหัก ณ ที่จ่ายในอัตรา 3% และออก <strong>หนังสือรับรองการหักภาษี ณ ที่จ่าย (ตามมาตรา 50 ทวิ)</strong> ส่งมอบให้ผู้รับเงินในวันที่มีการจ่ายเงิน พร้อมนำส่งแบบ ภ.ง.ด.3 (บุคคล) หรือ ภ.ง.ด.53 (นิติบุคคล)
                </p>
              </div>

              <div className="border-l-4 border-emerald-500 pl-3">
                <strong className="text-slate-900">จุดรับรู้ภาษี (Tax Point) ของธุรกิจบริการ:</strong>
                <p className="mt-1">
                  เกิดขึ้นเมื่อ "ได้รับชำระเงิน" หรือ "ได้ออกใบกำกับภาษี" หรือ "ได้ใช้บริการ" ดังนั้นเมื่อได้รับเงินตามใบสำคัญรับ (RV) ต้องออกใบเสร็จรับเงิน/ใบกำกับภาษีส่งมอบให้ลูกค้าทันที
                </p>
              </div>
            </div>
          </div>

          {/* Box 4: Quick AI Question Input */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <h4 className="font-bold text-xs text-slate-900 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>สอบถามข้อสงสัยทางภาษีและเอกสารเพิ่มเติม (ถาม AI ได้ทันที):</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskGemini()}
                placeholder="เช่น ถ้าผู้สอบบัญชีไม่ออกใบเสร็จ เราใช้ใบโอนเงินกับ 50 ทวิได้ไหม? หรือ ค่านายหน้าต้องคิด VAT ไหม?"
                className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAskGemini()}
                disabled={isLoadingAi}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ถาม</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() =>
                  handleAskGemini('ค่านายหน้า 3% ต้องออกเอกสาร 50 ทวิอย่างไร และต้องส่ง ภ.ง.ด. อะไร?')
                }
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded"
              >
                ถาม: ค่านายหน้า 50 ทวิ ยื่นแบบไหน?
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAskGemini('ค่าส่วนต่างค่าสอบ 40% ถ้าผู้สอบไม่จด VAT บริษัทลงเป็นค่าใช้จ่ายเต็มจำนวนได้ไหม?')
                }
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded"
              >
                ถาม: ค่าส่วนต่าง 40% ผู้สอบไม่จด VAT?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
