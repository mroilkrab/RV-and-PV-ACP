import React, { useState, useMemo } from 'react';
import { 
  FolderOpen, 
  ExternalLink, 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Building2, 
  Calendar, 
  Paperclip,
  CheckCircle2,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  FolderArchive
} from 'lucide-react';
import { Voucher, VoucherAttachment } from '../types';

interface CustomerAttachmentsVaultProps {
  vouchers: Voucher[];
  googleDriveUrl?: string;
  onSelectVoucher: (voucher: Voucher) => void;
}

export const CustomerAttachmentsVault: React.FC<CustomerAttachmentsVaultProps> = ({
  vouchers,
  googleDriveUrl = 'https://drive.google.com/drive/folders/1mjfvMdvJbU539CvtziYzPF7YjtxiN0oX?usp=drive_link',
  onSelectVoucher,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewAttachment, setPreviewAttachment] = useState<VoucherAttachment | null>(null);

  // Flatten all attachments with voucher reference
  const allAttachments = useMemo(() => {
    const list: Array<VoucherAttachment & { voucherNo: string; voucherDate: string; voucherType: string; originalVoucher: Voucher }> = [];

    vouchers.forEach((v) => {
      if (v.attachments && v.attachments.length > 0) {
        v.attachments.forEach((att) => {
          list.push({
            ...att,
            voucherNo: v.voucherNo,
            voucherDate: v.date,
            voucherType: v.type,
            originalVoucher: v,
          });
        });
      }
    });

    return list;
  }, [vouchers]);

  // Unique customers list
  const customers = useMemo(() => {
    const map = new Map<string, number>();
    allAttachments.forEach((att) => {
      const name = att.customerName || 'ไม่ระบุลูกค้า';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allAttachments]);

  // Filtered attachments
  const filtered = useMemo(() => {
    return allAttachments.filter((item) => {
      if (selectedCustomer !== 'ALL' && item.customerName !== selectedCustomer) {
        return false;
      }
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCust = (item.customerName || '').toLowerCase().includes(q);
        const matchesVoucher = item.voucherNo.toLowerCase().includes(q);
        if (!matchesName && !matchesCust && !matchesVoucher) return false;
      }
      return true;
    });
  }, [allAttachments, selectedCustomer, selectedCategory, searchQuery]);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'invoice':
        return 'ใบแจ้งหนี้ / ใบวางบิล';
      case 'receipt':
        return 'ใบเสร็จ / ใบกำกับภาษี';
      case 'slip':
        return 'สลิปการโอนเงิน';
      case 'wht_cert':
        return 'หนังสือรับรอง 50 ทวิ';
      case 'contract':
        return 'สัญญา / ข้อตกลงจ้าง';
      default:
        return 'เอกสารประกอบทั่วไป';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner with Google Drive Link */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl shadow-md p-6 text-white mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <FolderArchive className="w-4 h-4" />
              <span>ระบบจัดเก็บไฟล์เอกสารแนบแยกตามลูกค้า</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-prompt mt-1">
              คลังไฟล์แนบใบสำคัญรับ-จ่าย (Customer Attachments Vault)
            </h1>
            <p className="text-xs text-blue-100 mt-1 max-w-2xl">
              จัดเก็บและค้นหาไฟล์ใบเสร็จ ใบกำกับภาษี สลิปโอนเงิน และหนังสือรับรองหัก ณ ที่จ่าย แยกรายชื่อลูกค้า/คู่ค้าอย่างเป็นหมวดหมู่ พร้อมซิงค์เข้าสู่ Google Drive
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={googleDriveUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-white text-blue-900 hover:bg-blue-50 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span>เปิดโฟลเดอร์ Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-blue-100">
          <div className="flex items-center gap-1.5">
            <Paperclip className="w-4 h-4 text-blue-300" />
            <span>จำนวนไฟล์แนบทั้งหมดในระบบ: <strong>{allAttachments.length} ไฟล์</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-300" />
            <span>ลูกค้า/คู่ค้าที่มีเอกสาร: <strong>{customers.length} ราย</strong></span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อไฟล์, เลขที่ใบสำคัญ, หรือชื่อลูกค้า..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Customer filter */}
          <div className="md:col-span-4">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">ทุกลูกค้า / ทุกคู่ค้า ({allAttachments.length})</option>
              {customers.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count} ไฟล์)
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">ทุกหมวดหมู่เอกสาร</option>
              <option value="receipt">ใบเสร็จ / ใบกำกับภาษี</option>
              <option value="slip">สลิปการโอนเงิน</option>
              <option value="invoice">ใบแจ้งหนี้ / ใบวางบิล</option>
              <option value="wht_cert">หนังสือรับรอง 50 ทวิ</option>
              <option value="contract">สัญญา / ข้อตกลงจ้าง</option>
              <option value="other">เอกสารอื่นๆ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Attachments grouped by customer */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-sm font-bold text-slate-700">ไม่พบไฟล์เอกสารแนบ</div>
          <p className="text-xs text-slate-500 mt-1">
            คุณสามารถอัปโหลดไฟล์แนบ (เช่น สลิปโอนเงิน, ใบกำกับภาษี, สัญญา) ในหน้าสร้าง/แก้ไขใบสำคัญรับและใบสำคัญจ่าย
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((att) => (
            <div
              key={att.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-4 shadow-xs transition hover:shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Top Badge: Voucher No & Category */}
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    {att.voucherType === 'RV' ? (
                      <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3 text-rose-600" />
                    )}
                    {att.voucherNo}
                  </span>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {getCategoryLabel(att.category)}
                  </span>
                </div>

                {/* Customer Name */}
                <div className="font-bold text-xs text-slate-900 truncate mb-1" title={att.customerName}>
                  {att.customerName || 'ไม่ระบุลูกค้า'}
                </div>

                {/* File Details */}
                <div className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100 mb-3">
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate" title={att.name}>
                      {att.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{formatFileSize(att.size)}</span>
                      <span>•</span>
                      <span>{new Date(att.uploadedAt).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => onSelectVoucher(att.originalVoucher)}
                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                >
                  เปิดดูใบสำคัญ
                </button>

                <div className="flex items-center gap-1">
                  {att.dataUrl && (
                    <a
                      href={att.dataUrl}
                      download={att.name}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                      title="ดาวน์โหลดไฟล์"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {att.dataUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewAttachment(att)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition cursor-pointer"
                      title="ดูตัวอย่างไฟล์"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewAttachment.name}</h3>
                <p className="text-xs text-slate-500">ลูกค้า: {previewAttachment.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-4">
              {previewAttachment.type.startsWith('image/') ? (
                <img
                  src={previewAttachment.dataUrl}
                  alt={previewAttachment.name}
                  className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-blue-500 mx-auto mb-2" />
                  <div className="text-xs font-medium text-slate-700">{previewAttachment.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1">ไฟล์เอกสาร ({previewAttachment.type})</div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              {previewAttachment.dataUrl && (
                <a
                  href={previewAttachment.dataUrl}
                  download={previewAttachment.name}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  ดาวน์โหลดไฟล์
                </a>
              )}
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-lg transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
