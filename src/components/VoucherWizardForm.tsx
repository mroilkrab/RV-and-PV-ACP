import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Printer, 
  Plus, 
  Trash2, 
  Building2, 
  Calculator, 
  CreditCard, 
  UserCheck, 
  FileText,
  AlertCircle,
  Layers,
  Paperclip,
  Upload,
  FolderOpen,
  ExternalLink,
  FileCheck,
  Tag,
  Sparkles,
  StickyNote,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Image as ImageIcon,
  Award,
  Briefcase,
  CheckCircle2,
  Search,
  FileSpreadsheet,
  RefreshCw,
  X,
  ExternalLink as ExternalLinkIcon,
  Copy
} from 'lucide-react';
import { fileToOptimizedDataUrl } from '../utils/imageUtils';
import { 
  Voucher, 
  VoucherType, 
  VoucherItem, 
  CompanySettings, 
  ACCOUNT_CATEGORIES, 
  PaymentMethod,
  VoucherAttachment,
  THAI_COMMERCIAL_BANKS,
  Customer,
  CustomerSheetSyncConfig
} from '../types';
import { convertToThaiBahtText, formatCurrency } from '../utils/thaiBahtText';
import {
  getStoredCustomers,
  saveCustomers,
  getStoredCustomerSheetConfig,
  fetchLiveGoogleSheetCustomers,
  formatTaxIdWithHyphens,
  mergeCustomers,
} from '../utils/customerSync';
import { CustomerDirectoryModal } from './CustomerDirectoryModal';

interface VoucherWizardFormProps {
  initialType?: VoucherType;
  editingVoucher?: Voucher | null;
  companySettings: CompanySettings;
  onSave: (voucher: Voucher, printImmediately?: boolean) => void;
  onCancel: () => void;
  customers?: Customer[];
  onUpdateCustomers?: (customers: Customer[]) => void;
  customerSheetConfig?: CustomerSheetSyncConfig;
  onUpdateCustomerSheetConfig?: (cfg: CustomerSheetSyncConfig) => void;
}

export const VoucherWizardForm: React.FC<VoucherWizardFormProps> = ({
  initialType = 'PV',
  editingVoucher,
  companySettings,
  onSave,
  onCancel,
  customers,
  onUpdateCustomers,
  customerSheetConfig,
  onUpdateCustomerSheetConfig,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [voucherType, setVoucherType] = useState<VoucherType>(editingVoucher?.type || initialType);

  // Running number generation helper
  const generateRunningNo = (type: VoucherType) => {
    const config = companySettings.runningNumberConfig;
    const prefix = type === 'RV' ? (config?.rvPrefix || 'RV69-') : (config?.pvPrefix || 'PV69-');
    const seq = type === 'RV' ? (config?.nextRvSeq || 1) : (config?.nextPvSeq || 1);
    const digits = config?.digitCount || 3;
    return `${prefix}${String(seq).padStart(digits, '0')}`;
  };

  const generateIvRunningNo = () => {
    const config = companySettings.runningNumberConfig;
    const prefix = config?.ivPrefix || 'IV69-';
    const seq = config?.nextIvSeq || 1;
    const digits = config?.digitCount || 3;
    return `${prefix}${String(seq).padStart(digits, '0')}`;
  };

  // Step 1: General & Contact State
  const [voucherNo, setVoucherNo] = useState(
    editingVoucher?.voucherNo || generateRunningNo(editingVoucher?.type || initialType)
  );
  const [date, setDate] = useState(editingVoucher?.date || new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState(editingVoucher?.referenceNo || '');
  const [jobNo, setJobNo] = useState(editingVoucher?.jobNo || '');
  const [auditor, setAuditor] = useState(editingVoucher?.auditor || '');
  const [jobClient, setJobClient] = useState(editingVoucher?.jobClient || '');
  const [dueDate, setDueDate] = useState(editingVoucher?.dueDate || '');
  const [status, setStatus] = useState(editingVoucher?.status || 'ชำระแล้ว (Completed)');

  // Contact Info
  const [contactName, setContactName] = useState(editingVoucher?.contact.name || '');
  const [taxId, setTaxId] = useState(editingVoucher?.contact.taxId || '');
  const [address, setAddress] = useState(editingVoucher?.contact.address || '');
  const [branch, setBranch] = useState(editingVoucher?.contact.branch || 'สำนักงานใหญ่');
  const [branchCode, setBranchCode] = useState(editingVoucher?.contact.branchCode || '00000');
  const [phone, setPhone] = useState(editingVoucher?.contact.phone || '');
  const [contactPerson, setContactPerson] = useState(editingVoucher?.contact.contactPerson || '');

  // Google Sheets Customer Directory & Search State
  const [customerList, setCustomerList] = useState<Customer[]>(() => customers || getStoredCustomers());
  const [customerQuery, setCustomerQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSyncingCustomers, setIsSyncingCustomers] = useState(false);
  const [customerSyncNotice, setCustomerSyncNotice] = useState<string | null>(null);
  const [selectedCustomerSource, setSelectedCustomerSource] = useState<string | null>(null);
  const [sheetConfigState, setSheetConfigState] = useState<CustomerSheetSyncConfig>(
    () => customerSheetConfig || getStoredCustomerSheetConfig()
  );

  useEffect(() => {
    if (customers && customers.length > 0) {
      setCustomerList(customers);
    }
  }, [customers]);

  // Filter customers matching query for inline autocomplete, or provide top 15 recommendations when query is empty
  const filteredCustomers = useMemo(() => {
    if (!customerQuery.trim()) {
      return customerList.slice(0, 15);
    }
    const q = customerQuery.trim().toLowerCase();
    const qDigits = q.replace(/[^0-9]/g, '');
    return customerList.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchAddress = c.address ? c.address.toLowerCase().includes(q) : false;
      const matchContact = c.contactPerson ? c.contactPerson.toLowerCase().includes(q) : false;
      const matchCode = c.customerCode ? c.customerCode.toLowerCase().includes(q) : false;
      let matchTax = false;
      if (c.taxId) {
        const taxDigits = c.taxId.replace(/[^0-9]/g, '');
        if (qDigits && taxDigits.includes(qDigits)) matchTax = true;
        else if (c.taxId.toLowerCase().includes(q)) matchTax = true;
      }
      return matchName || matchTax || matchAddress || matchContact || matchCode;
    });
  }, [customerList, customerQuery]);

  const handleSelectCustomer = (cust: Customer) => {
    setContactName(cust.name);
    setTaxId(cust.taxId || '');
    setAddress(cust.address || '');
    if (cust.branch) setBranch(cust.branch);
    if (cust.branchCode) setBranchCode(cust.branchCode);
    if (cust.phone) setPhone(cust.phone);
    if (cust.contactPerson) setContactPerson(cust.contactPerson);
    if (voucherType === 'RV') {
      setJobClient(cust.name);
    }
    setReceivedOrPaidBy(cust.name);
    setCustomerQuery(cust.name);
    setSelectedCustomerSource(cust.source || 'GoogleSheet');
    setIsCustomerDropdownOpen(false);
    setCustomerSyncNotice(`✓ ดึงข้อมูล "${cust.name}" (เลขนิติบุคคล: ${cust.taxId || 'ไม่ระบุ'}) ลงในฟอร์มเรียบร้อยแล้ว`);
    setTimeout(() => setCustomerSyncNotice(null), 4000);
  };

  const handleQuickSyncCustomerSheet = async () => {
    const targetUrl = companySettings.customerSheetUrl || sheetConfigState.sheetUrl;
    if (!targetUrl) {
      setIsCustomerModalOpen(true);
      return;
    }
    setIsSyncingCustomers(true);
    setCustomerSyncNotice('กำลังดึงข้อมูลรายชื่อลูกค้าจาก Google Sheets...');
    try {
      const res = await fetchLiveGoogleSheetCustomers(targetUrl);
      if (res.success && res.customers) {
        const merged = mergeCustomers(customerList, res.customers);
        setCustomerList(merged);
        saveCustomers(merged);
        if (onUpdateCustomers) onUpdateCustomers(merged);
        setCustomerSyncNotice(`✓ ดึงข้อมูลสำเร็จ! อัปเดต ${res.count} บริษัท`);
        setTimeout(() => setCustomerSyncNotice(null), 4000);
      } else {
        setCustomerSyncNotice(`❌ ${res.error || 'ไม่สามารถดึงข้อมูลได้'}`);
        setTimeout(() => setCustomerSyncNotice(null), 5000);
      }
    } catch (e: any) {
      setCustomerSyncNotice(`❌ เกิดข้อผิดพลาด: ${e.message}`);
      setTimeout(() => setCustomerSyncNotice(null), 5000);
    } finally {
      setIsSyncingCustomers(false);
    }
  };

  // Step 2: Line items State
  const [items, setItems] = useState<VoucherItem[]>(
    editingVoucher?.items || [
      {
        id: 'item-1',
        description:
          voucherType === 'RV'
            ? 'รายได้ค่าบริการตรวจสอบบัญชี ประจำงวดปี 2568 ตามสัญญาบริการวิชาชีพ'
            : 'ค่าบริการตรวจสอบบัญชี ประจำงวดการตรวจสอบงบการเงิน',
        accountCategory:
          voucherType === 'RV' ? 'รายได้ค่าบริการตรวจสอบบัญชี' : 'ค่าบริการตรวจสอบบัญชี',
        baseAmount: voucherType === 'RV' ? 100000 : 40000,
        vatRate: voucherType === 'RV' ? 7 : 0,
        vatAmount: voucherType === 'RV' ? 7000 : 0,
        whtRate: 3,
        whtAmount: voucherType === 'RV' ? 3000 : 1200,
        netAmount: voucherType === 'RV' ? 104000 : 38800,
      },
    ]
  );

  // Notes state
  const [notes, setNotes] = useState(editingVoucher?.notes || '');

  // Attachments state
  const [attachments, setAttachments] = useState<VoucherAttachment[]>(editingVoucher?.attachments || []);
  const [attachmentCategory, setAttachmentCategory] = useState<'invoice' | 'receipt' | 'slip' | 'wht_cert' | 'contract' | 'other'>('receipt');

  // Step 3: Payment & Signatures
  // Filter banks by accountType
  const relevantBanks = companySettings.banks.filter((b) => {
    if (!b.accountType || b.accountType === 'both') return true;
    if (voucherType === 'RV' && b.accountType === 'receiving') return true;
    if (voucherType === 'PV' && b.accountType === 'disbursing') return true;
    return false;
  });
  const defaultBank = relevantBanks.find((b) => b.isDefault) || relevantBanks[0] || companySettings.banks[0];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editingVoucher?.payment.method || 'โอนเงินผ่านธนาคาร (Bank Transfer)'
  );
  const [selectedBankName, setSelectedBankName] = useState(
    editingVoucher?.payment.bankName || (defaultBank ? defaultBank.bankName : 'ธนาคารไทยพาณิชย์ (SCB)')
  );
  const [accountNo, setAccountNo] = useState(
    editingVoucher?.payment.accountNo || (defaultBank ? defaultBank.accountNo : '082-248912-3')
  );
  const [accountName, setAccountName] = useState(
    editingVoucher?.payment.accountName || companySettings.name
  );
  const [paymentDate, setPaymentDate] = useState(editingVoucher?.payment.paymentDate || date);
  const [transferRef, setTransferRef] = useState(editingVoucher?.payment.transferRef || '');
  const [recipientBankName, setRecipientBankName] = useState(
    editingVoucher?.payment.recipientBankName || ''
  );
  const [recipientAccountNo, setRecipientAccountNo] = useState(
    editingVoucher?.payment.recipientAccountNo || ''
  );

  // Signatures for 4-party internal controls
  const [preparedBy, setPreparedBy] = useState(
    editingVoucher?.signatures.preparedBy ?? companySettings.defaultPreparedBy ?? 'ผู้จัดทำบัญชี'
  );
  const [preparedBySignatureUrl, setPreparedBySignatureUrl] = useState<string>(
    editingVoucher?.signatures.preparedBySignatureUrl ?? companySettings.defaultPreparedBySignatureUrl ?? '/signatures/sign_napak.svg'
  );

  const [checkedBy, setCheckedBy] = useState(
    editingVoucher?.signatures.checkedBy ?? companySettings.defaultCheckedBy ?? 'ผู้จัดการแผนกบัญชี'
  );
  const [checkedBySignatureUrl, setCheckedBySignatureUrl] = useState<string>(
    editingVoucher?.signatures.checkedBySignatureUrl ?? companySettings.defaultCheckedBySignatureUrl ?? ''
  );

  const [approvedBy, setApprovedBy] = useState(
    editingVoucher?.signatures.approvedBy ?? companySettings.defaultApprovedBy ?? 'กรรมการผู้จัดการ'
  );
  const [approvedBySignatureUrl, setApprovedBySignatureUrl] = useState<string>(
    editingVoucher?.signatures.approvedBySignatureUrl ?? companySettings.defaultApprovedBySignatureUrl ?? '/signatures/sign_aphiwatch.svg'
  );

  const [receivedOrPaidBy, setReceivedOrPaidBy] = useState(
    editingVoucher?.signatures.receivedOrPaidBy || (contactName || (voucherType === 'PV' ? 'ผู้รับเงิน / คู่ค้า' : 'ผู้จ่ายเงิน / ลูกค้า'))
  );
  const [receivedOrPaidSignatureUrl, setReceivedOrPaidSignatureUrl] = useState<string>(
    editingVoucher?.signatures.receivedOrPaidSignatureUrl ?? companySettings.defaultReceivedOrPaidSignatureUrl ?? ''
  );

  // Company Stamp in 4-Party Section
  const [showCompanyStamp, setShowCompanyStamp] = useState<boolean>(
    editingVoucher?.signatures.showCompanyStamp ?? companySettings.defaultShowStampOnVouchers ?? true
  );
  const [companyStampUrl, setCompanyStampUrl] = useState<string>(
    editingVoucher?.signatures.companyStampUrl || companySettings.companyStampUrl || '/stamps/company_stamp.svg'
  );
  const [stampPlacement, setStampPlacement] = useState<'approved' | 'received' | 'center' | 'all'>(
    editingVoucher?.signatures.stampPlacement || 'approved'
  );

  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      setter(dataUrl);
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถอัปโหลดไฟล์รูปภาพได้');
    }
    e.target.value = '';
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      setCompanyStampUrl(dataUrl);
      setShowCompanyStamp(true);
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถอัปโหลดไฟล์ตราประทับได้');
    }
    e.target.value = '';
  };

  // Update contact name sync into signature if not manually set
  useEffect(() => {
    if (!editingVoucher?.signatures.receivedOrPaidBy && contactName) {
      setReceivedOrPaidBy(contactName);
    }
  }, [contactName, editingVoucher]);

  // Helper to get intelligent defaults (description & WHT rate) when an Account Category is chosen
  const getCategoryDefaults = (category: string, type: VoucherType, contact?: string) => {
    const cName = contact?.trim() ? ` ${contact.trim()}` : '';
    switch (category) {
      case 'ค่าบริการตรวจสอบบัญชี':
        return {
          whtRate: 3,
          description:
            type === 'RV'
              ? `รายได้ค่าบริการตรวจสอบบัญชี${cName} ประจำงวดปี 2568 ตามสัญญาบริการวิชาชีพ`
              : `ค่าบริการตรวจสอบบัญชี${cName} ประจำงวดการตรวจสอบงบการเงิน`,
        };
      case 'รายได้ค่าบริการตรวจสอบบัญชี':
        return {
          whtRate: 3,
          description: `รายได้ค่าบริการตรวจสอบบัญชี${cName} ตามสัญญาบริการวิชาชีพ`,
        };
      case 'ค่าบริการวิชาชีพบัญชี':
        return {
          whtRate: 3,
          description: `ค่าบริการวิชาชีพบัญชีและจัดทำบัญชีรายเดือน${cName}`,
        };
      case 'ค่าที่ปรึกษาธุรกิจและภาษีอากร':
        return {
          whtRate: 3,
          description: `ค่าบริการที่ปรึกษาธุรกิจและวางแผนภาษีอากร${cName}`,
        };
      case 'ค่าจ้างเหมาบริการ / ผู้สอบภายนอก':
        return {
          whtRate: 3,
          description: `ค่าจ้างเหมาบริการตรวจสอบบัญชี / ผู้สอบภายนอก${cName}`,
        };
      case 'ค่านายหน้า':
        return {
          whtRate: 3,
          description: `ค่านายหน้าและค่าบริการส่งต่องานวิชาชีพ${cName}`,
        };
      case 'รายได้ค่าบริการอื่นๆ':
        return {
          whtRate: 3,
          description: `รายได้ค่าบริการวิชาชีพอื่นๆ${cName}`,
        };
      case 'ค่าเช่าและสาธารณูปโภค':
        return {
          whtRate: 5,
          description: 'ค่าเช่าอาคารสำนักงานและพื้นที่ประกอบการ',
        };
      case 'ค่าธรรมเนียมธนาคารและอื่นๆ':
        return {
          whtRate: 0,
          description: 'ค่าธรรมเนียมการโอนเงินและบริการทางการเงิน',
        };
      case 'ค่าเครื่องเขียนและวัสดุสำนักงาน':
        return {
          whtRate: 0,
          description: 'ค่าเครื่องเขียน แบบพิมพ์ และวัสดุสิ้นเปลืองสำนักงาน',
        };
      default:
        if (
          category.includes('บริการ') ||
          category.includes('สอบบัญชี') ||
          category.includes('วิชาชีพ') ||
          category.includes('จ้าง') ||
          category.includes('ที่ปรึกษา')
        ) {
          return {
            whtRate: 3,
            description: `${category}${cName}`,
          };
        }
        return null;
    }
  };

  // Recalculate item totals
  const updateItemCalculation = (index: number, updates: Partial<VoucherItem>) => {
    setItems((prevItems) => {
      const next = [...prevItems];
      const cur = { ...next[index], ...updates };

      const base = Number(cur.baseAmount) || 0;

      // VAT
      const vRate = Number(cur.vatRate) || 0;
      cur.vatAmount = Math.round(base * (vRate / 100) * 100) / 100;

      // Withholding Tax
      const wRate = Number(cur.whtRate) || 0;
      cur.whtAmount = Math.round(base * (wRate / 100) * 100) / 100;

      // Net
      cur.netAmount = base + cur.vatAmount - cur.whtAmount;

      next[index] = cur;
      return next;
    });
  };

  // Automatically update 3% WHT amount and populate description when user selects common account categories
  const handleAccountCategoryChange = (index: number, newCategory: string) => {
    const cur = items[index];
    const base = Number(cur.baseAmount) || 0;
    const defaults = getCategoryDefaults(newCategory, voucherType, contactName || jobClient);

    const whtRate = defaults !== null ? defaults.whtRate : cur.whtRate;
    const whtAmount = Math.round(base * (whtRate / 100) * 100) / 100;
    const vRate = Number(cur.vatRate) || 0;
    const vatAmount = Math.round(base * (vRate / 100) * 100) / 100;
    const netAmount = base + vatAmount - whtAmount;

    const updates: Partial<VoucherItem> = {
      accountCategory: newCategory,
      whtRate,
      whtAmount,
      netAmount,
    };

    // Auto populate description if current is empty or matches standard default/previous category
    if (defaults && defaults.description) {
      const isDefaultOrEmpty =
        !cur.description ||
        cur.description.trim() === '' ||
        cur.description.startsWith('ค่าบริการ') ||
        cur.description.startsWith('รายได้') ||
        cur.description.startsWith('ค่าจ้าง') ||
        cur.description.startsWith('ค่าที่ปรึกษา') ||
        cur.description.startsWith('ค่านายหน้า') ||
        cur.description.startsWith('ค่าเช่า');
      if (isDefaultOrEmpty) {
        updates.description = defaults.description;
      }
    }

    updateItemCalculation(index, updates);
  };

  const addItem = () => {
    const defaultCat = voucherType === 'RV' ? 'รายได้ค่าบริการตรวจสอบบัญชี' : 'ค่าบริการตรวจสอบบัญชี';
    const defaults = getCategoryDefaults(defaultCat, voucherType, contactName || jobClient);
    const base = 10000;
    const whtRate = defaults ? defaults.whtRate : 3;
    const whtAmount = Math.round(base * (whtRate / 100) * 100) / 100;
    const vatRate = voucherType === 'RV' ? 7 : 0;
    const vatAmount = Math.round(base * (vatRate / 100) * 100) / 100;

    const newItem: VoucherItem = {
      id: `item-${Date.now()}`,
      description: defaults?.description || (voucherType === 'RV' ? 'รายได้ค่าบริการตรวจสอบบัญชี' : 'ค่าบริการตรวจสอบบัญชี'),
      accountCategory: defaultCat,
      baseAmount: base,
      vatRate,
      vatAmount,
      whtRate,
      whtAmount,
      netAmount: base + vatAmount - whtAmount,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  // Aggregate totals
  const subtotal = items.reduce((sum, item) => sum + (Number(item.baseAmount) || 0), 0);
  const totalVat = items.reduce((sum, item) => sum + (Number(item.vatAmount) || 0), 0);
  const totalWht = items.reduce((sum, item) => sum + (Number(item.whtAmount) || 0), 0);
  const netPayable = items.reduce((sum, item) => sum + (Number(item.netAmount) || 0), 0);
  const thaiBahtText = convertToThaiBahtText(netPayable);

  // Handle bank selection
  const handleBankSelect = (bankId: string) => {
    const bank = companySettings.banks.find((b) => b.id === bankId);
    if (bank) {
      setSelectedBankName(bank.bankName);
      setAccountNo(bank.accountNo);
      setAccountName(bank.accountName);
    }
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: VoucherAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
          customerName: contactName || 'ไม่ระบุลูกค้า',
          category: attachmentCategory,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Preset notes suggestions
  const presetNotes = [
    'ชำระค่าบริการวิชาชีพตรวจสอบบัญชีงวดที่ 1 ตามสัญญาจ้าง',
    'หักภาษี ณ ที่จ่าย 3% ตามมาตรา 50 ทวิ เรียบร้อยแล้ว',
    'ได้รับต้นฉบับใบเสร็จรับเงิน / ใบกำกับภาษีเรียบร้อยแล้ว',
    'โอนเงินผ่านระบบ K-Cyber / SCB Business Anywhere',
    'ออกหนังสือรับรองหัก ณ ที่จ่าย (ภ.ง.ด.53) เรียบร้อย',
  ];

  const handleAddPresetNote = (preset: string) => {
    if (!notes) {
      setNotes(preset);
    } else if (!notes.includes(preset)) {
      setNotes(`${notes}\n• ${preset}`);
    }
  };

  // Handle Voucher Type switch
  const handleSwitchVoucherType = (newType: VoucherType) => {
    setVoucherType(newType);
    if (!editingVoucher) {
      setVoucherNo(generateRunningNo(newType));
    }
  };

  // Validation and Save
  const handleSave = (printImmediately: boolean = false) => {
    if (!contactName.trim()) {
      alert('กรุณากรอกชื่อลูกค้าหรือผู้รับเงินในขั้นตอนที่ 1');
      setCurrentStep(1);
      return;
    }

    const newVoucher: Voucher = {
      id: editingVoucher?.id || `VOUCHER-${Date.now()}`,
      voucherNo,
      type: voucherType,
      date,
      dueDate,
      referenceNo,
      jobNo: jobNo.trim() ? jobNo.trim() : undefined,
      auditor: voucherType === 'PV' && auditor.trim() ? auditor.trim() : undefined,
      jobClient: voucherType === 'RV' && jobClient.trim() ? jobClient.trim() : undefined,
      contact: {
        name: contactName,
        taxId,
        address,
        branch,
        branchCode,
        phone,
        contactPerson,
      },
      items,
      subtotal,
      totalVat,
      totalWht,
      netPayable,
      thaiBahtText,
      payment: {
        method: paymentMethod,
        bankName: selectedBankName,
        accountNo,
        accountName,
        paymentDate,
        transferRef,
        recipientBankName,
        recipientAccountNo,
      },
      notes,
      status: status as any,
      signatures: {
        preparedBy,
        preparedDate: date,
        preparedBySignatureUrl,
        checkedBy,
        checkedDate: date,
        checkedBySignatureUrl,
        approvedBy,
        approvedDate: date,
        approvedBySignatureUrl,
        receivedOrPaidBy,
        receivedOrPaidDate: paymentDate || date,
        receivedOrPaidSignatureUrl,
        companyStampUrl,
        showCompanyStamp,
        stampPlacement,
        payerSignatureUrl: editingVoucher?.signatures?.payerSignatureUrl || approvedBySignatureUrl,
      },
      createdAt: editingVoucher?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: editingVoucher?.source || 'Manual',
      attachments,
      promptPayEnabled: false,
    };

    onSave(newVoucher, printImmediately);
  };

  const categoriesToUse = companySettings.accountCategories && companySettings.accountCategories.length > 0 
    ? companySettings.accountCategories 
    : ACCOUNT_CATEGORIES;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
              <Calculator className="w-4 h-4" />
              <span>ระบบบันทึกบัญชีมาตรฐานสรรพากร</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1 font-prompt">
              {editingVoucher ? `แก้ไขใบสำคัญ: ${editingVoucher.voucherNo}` : `สร้างใบสำคัญใหม่ (Step ${currentStep}/3)`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              หนังสือรับรองหัก ณ ที่จ่าย 50 ทวิ, และคลังไฟล์แนบแยกตามลูกค้า
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกแบบร่าง</span>
            </button>
          </div>
        </div>

        {/* Step Progress Pills */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
              currentStep === 1
                ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              1
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800">ขั้นตอนที่ 1</div>
              <div className="text-[11px] text-slate-500">ข้อมูลทั่วไป & ผู้ติดต่อ</div>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
              currentStep === 2
                ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              2
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800">ขั้นตอนที่ 2</div>
              <div className="text-[11px] text-slate-500">รายการ, คำนวณภาษี & บันทึกย่อ</div>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
              currentStep === 3
                ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              3
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800">ขั้นตอนที่ 3</div>
              <div className="text-[11px] text-slate-500">ชำระเงิน, PromptPay & ลายเซ็น</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 sm:p-8">
        {/* ================= STEP 1 ================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>ขั้นตอนที่ 1: กำหนดประเภทใบสำคัญ เลขที่เอกสาร และคู่ค้า</span>
              </h3>
            </div>

            {/* Voucher Type Selector */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ประเภทใบสำคัญ (Voucher Type) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSwitchVoucherType('RV')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                    voucherType === 'RV'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>ใบสำคัญรับ (RV - Receipt Voucher)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchVoucherType('PV')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                    voucherType === 'PV'
                      ? 'border-rose-600 bg-rose-50 text-rose-800 shadow-xs'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>ใบสำคัญจ่าย (PV - Payment Voucher)</span>
                </button>
              </div>
            </div>

            {/* Voucher General Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เลขที่ใบสำคัญ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold text-blue-900 bg-white"
                  placeholder="เช่น RV69-001 หรือ PV69-001"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  วันที่เอกสาร <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (!paymentDate) setPaymentDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  สถานะเอกสาร (Status)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
                >
                  <option value="ชำระแล้ว (Completed)">ชำระแล้ว (Completed)</option>
                  <option value="รออนุมัติ (Pending)">รออนุมัติ / รอชำระ (Pending)</option>
                  <option value="อนุมัติแล้ว (Approved)">อนุมัติแล้ว (Approved)</option>
                  <option value="ร่าง (Draft)">ฉบับร่าง (Draft)</option>
                  <option value="ยกเลิก (Cancelled)">ยกเลิก (Cancelled)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    เลขที่งาน (Job No.)
                  </label>
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-1 rounded border border-amber-200 font-medium">
                    ค้นหาได้
                  </span>
                </div>
                <input
                  type="text"
                  value={jobNo}
                  onChange={(e) => setJobNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/40 font-mono font-bold text-slate-900"
                  placeholder="เช่น 70001 หรือ JOB-6901"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    เลขอ้างอิง / ใบแจ้งหนี้ (Ref No.)
                  </label>
                  {!referenceNo && (
                    <button
                      type="button"
                      onClick={() => setReferenceNo(generateIvRunningNo())}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                      title="คลิกเพื่อนำเลขรัน IV ตามที่ตั้งค่ามาใส่ในช่องนี้อัตโนมัติ"
                    >
                      + IV ({generateIvRunningNo()})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                  placeholder="เช่น IV69-001 หรือ INV-2026-001"
                />
              </div>
            </div>

            {/* Auditor Selection for Payment Voucher (PV) */}
            {voucherType === 'PV' && (
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>ผู้สอบบัญชี (Auditor / CPA)</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 font-medium">
                      ตัวเลือกสำหรับใบสำคัญจ่าย
                    </span>
                  </label>
                  <span className="text-[11px] text-indigo-700">
                    ตั้งค่ารายชื่อผู้สอบบัญชีได้ที่เมนู <strong>ตั้งค่าระบบ (ข้อ 5)</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="md:col-span-8">
                    <select
                      value={auditor}
                      onChange={(e) => setAuditor(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800 cursor-pointer shadow-2xs"
                    >
                      <option value="">-- เลือกผู้สอบบัญชีจากระบบ ({companySettings.auditors?.length || 0} ท่าน) --</option>
                      {(companySettings.auditors || []).map((aud, idx) => (
                        <option key={`aud-opt-${idx}`} value={aud}>
                          {aud}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={auditor}
                      onChange={(e) => setAuditor(e.target.value)}
                      placeholder="หรือพิมพ์ชื่อผู้สอบบัญชีเอง..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                    />
                    {auditor && (
                      <button
                        type="button"
                        onClick={() => setAuditor('')}
                        className="text-slate-400 hover:text-rose-600 px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg cursor-pointer shrink-0"
                        title="ล้างค่าที่เลือก"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                </div>
                {auditor && (
                  <div className="flex items-center justify-between text-[11px] text-indigo-900 bg-white/90 px-2.5 py-1 rounded-lg border border-indigo-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>ผู้สอบบัญชีที่เลือก: <strong className="text-indigo-950">{auditor}</strong></span>
                    </div>
                    <span className="text-[10px] text-indigo-500">แสดงในใบสำคัญจ่าย PV และเอกสาร A4</span>
                  </div>
                )}
              </div>
            )}

            {/* Job Client Selection for Receipt Voucher (RV) */}
            {voucherType === 'RV' && (
              <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-teal-600" />
                    <span>ลูกค้าที่ส่งงาน (Job Client / ผู้รับมอบงาน)</span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 font-medium">
                      ตัวเลือกสำหรับใบสำคัญรับ
                    </span>
                  </label>
                  <span className="text-[11px] text-teal-700">
                    ตั้งค่ารายชื่อลูกค้าส่งงานได้ที่เมนู <strong>ตั้งค่าระบบ (ข้อ 5)</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="md:col-span-8">
                    <select
                      value={jobClient}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJobClient(val);
                        if (val && !contactName) {
                          setContactName(val);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-800 cursor-pointer shadow-2xs"
                    >
                      <option value="">-- เลือกลูกค้าที่ส่งงานจากระบบ ({companySettings.jobClients?.length || 0} รายการ) --</option>
                      {(companySettings.jobClients || []).map((client, idx) => (
                        <option key={`client-opt-${idx}`} value={client}>
                          {client}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={jobClient}
                      onChange={(e) => setJobClient(e.target.value)}
                      placeholder="หรือพิมพ์ชื่อลูกค้าส่งงานเอง..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-slate-800"
                    />
                    {jobClient && (
                      <button
                        type="button"
                        onClick={() => setJobClient('')}
                        className="text-slate-400 hover:text-rose-600 px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg cursor-pointer shrink-0"
                        title="ล้างค่าที่เลือก"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                </div>
                {jobClient && (
                  <div className="flex items-center justify-between text-[11px] text-teal-900 bg-white/90 px-2.5 py-1 rounded-lg border border-teal-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>ลูกค้าส่งงานที่เลือก: <strong className="text-teal-950">{jobClient}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      {contactName !== jobClient && (
                        <button
                          type="button"
                          onClick={() => setContactName(jobClient)}
                          className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                        >
                          คัดลอกลงชื่อผู้ติดต่อ/ลูกค้า
                        </button>
                      )}
                      <span className="text-[10px] text-teal-600">แสดงในใบสำคัญรับ RV และเอกสาร A4</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Google Sheets Customer Selector Box */}
            <div className="p-4 bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-white rounded-xl border border-blue-200 space-y-3 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-950 font-prompt flex items-center gap-1.5">
                      <span>ดึงข้อมูลรายชื่อลูกค้าจาก Google Sheets</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                        {customerList.length} บริษัทในระบบ
                      </span>
                    </h4>
                    <p className="text-[11px] text-blue-700/80">
                      พิมพ์ค้นหาชื่อบริษัท หรือเลขนิติบุคคล 13 หลัก เพื่อเติมข้อมูลลงฟอร์มอัตโนมัติ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickSyncCustomerSheet}
                    disabled={isSyncingCustomers}
                    className="flex items-center gap-1 text-[11px] bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 px-2.5 py-1.5 rounded-lg shadow-2xs font-medium transition cursor-pointer"
                    title="ซิงค์ดึงรายชื่อลูกค้าล่าสุดจาก Google Sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCustomers ? 'animate-spin text-blue-600' : ''}`} />
                    <span>{isSyncingCustomers ? 'กำลังดึง...' : 'ซิงค์ Google Sheets'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="flex items-center gap-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg shadow-2xs font-medium transition cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>ดูรายชื่อลูกค้าทั้งหมด</span>
                  </button>
                </div>
              </div>

              {customerSyncNotice && (
                <div className="text-[11px] font-medium text-blue-900 bg-white/90 px-3 py-1.5 rounded-lg border border-blue-200">
                  {customerSyncNotice}
                </div>
              )}

              {/* Direct Quick Dropdown Selector */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="text-[11px] font-semibold text-blue-900 shrink-0">
                  เลือกทันทีจากรายการ:
                </div>
                <div className="relative flex-1">
                  <select
                    value=""
                    onChange={(e) => {
                      const found = customerList.find((c) => c.id === e.target.value);
                      if (found) handleSelectCustomer(found);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-800 font-medium cursor-pointer shadow-2xs hover:border-blue-400 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- หรือคลิกเลือกจากรายชื่อลูกค้าทั้งหมด ({customerList.length} บริษัท) --</option>
                    {customerList.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.customerCode ? `[${cust.customerCode}] ` : ''}{cust.name} {cust.taxId ? `(เลขนิติบุคคล: ${cust.taxId})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Autocomplete Search Input */}
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsCustomerDropdownOpen(true);
                    }}
                    placeholder="🔍 หรือพิมพ์ค้นหา: ชื่อบริษัท (เช่น บางกอก, สยาม), เลขนิติบุคคล 13 หลัก, หรือที่อยู่..."
                    className="w-full pl-9 pr-24 py-2.5 text-xs bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                  {customerQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerQuery('');
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="absolute right-2 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      ล้าง
                    </button>
                  ) : (
                    <span className="absolute right-3 text-[10px] text-slate-400 pointer-events-none">
                      คลิกเพื่อดูรายการ
                    </span>
                  )}
                </div>

                {/* Dropdown list of matching customers */}
                {isCustomerDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setIsCustomerDropdownOpen(false)} 
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-xl shadow-xl border border-blue-200 max-h-80 overflow-y-auto divide-y divide-slate-100">
                      <div className="p-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-900 font-semibold sticky top-0 z-10">
                        <span>
                          {customerQuery.trim()
                            ? `ผลการค้นหาสำหรับ "${customerQuery}" (พบ ${filteredCustomers.length} บริษัท)`
                            : `รายชื่อลูกค้าแนะนำ (${customerList.length} บริษัทในระบบ) — คลิกเพื่อดึงข้อมูล`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCustomerDropdownOpen(false)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.slice(0, 15).map((cust) => (
                          <div
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            className="p-3 hover:bg-blue-50 cursor-pointer transition text-left group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {cust.customerCode && (
                                  <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-bold shrink-0">
                                    {cust.customerCode}
                                  </span>
                                )}
                                <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700 truncate">
                                  {cust.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold shrink-0">
                                {cust.taxId ? `เลขนิติบุคคล: ${cust.taxId}` : 'ไม่มีเลขนิติบุคคล'}
                              </span>
                            </div>
                            {cust.address && (
                              <div className="text-[11px] text-slate-500 truncate mt-1">
                                {cust.address}
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                              {cust.branch && <span>สาขา: {cust.branch}</span>}
                              {cust.phone && <span>โทร: {cust.phone}</span>}
                              {cust.assignedStaff && <span>ผู้รับผิดชอบ: {cust.assignedStaff}</span>}
                              <span className="text-blue-600 font-medium group-hover:underline ml-auto flex items-center gap-0.5">
                                คลิกดึงข้อมูลลงฟอร์ม →
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          <span>ไม่พบข้อมูลลูกค้าที่ตรงกับ &quot;{customerQuery}&quot;</span>
                          <div className="mt-2 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setContactName(customerQuery);
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="text-xs text-blue-600 font-medium hover:underline cursor-pointer"
                            >
                              ใช้ &quot;{customerQuery}&quot; เป็นชื่อลูกค้าโดยตรง
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center sticky bottom-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomerDropdownOpen(false);
                            setIsCustomerModalOpen(true);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>เปิดดูรายชื่อลูกค้าและนิติบุคคลทั้งหมด ({customerList.length} บริษัท)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Active Selected Customer Confirmation Banner */}
              {contactName && (
                <div className="p-2.5 bg-emerald-50/90 rounded-lg border border-emerald-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-emerald-950">
                        ดึงข้อมูลลูกค้าแล้ว: {contactName}
                      </span>
                      {taxId && (
                        <span className="text-emerald-800 ml-2 font-mono text-[11px]">
                          (เลขนิติบุคคล: {taxId})
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setContactName('');
                      setTaxId('');
                      setAddress('');
                      setCustomerQuery('');
                    }}
                    className="text-[11px] text-emerald-700 hover:text-rose-700 hover:underline shrink-0 cursor-pointer"
                  >
                    ล้างค่า / เลือกใหม่
                  </button>
                </div>
              )}
            </div>

            {/* Contact / Vendor / Customer Info */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  {voucherType === 'RV' ? 'ข้อมูลลูกค้า / ผู้ชำระเงิน' : 'ข้อมูลผู้รับเงิน / คู่ค้า'}
                </span>
                <span className="text-[11px] text-slate-500">
                  ระบุข้อมูลเพื่อใช้ออกหนังสือรับรองหัก ณ ที่จ่าย 50 ทวิ และใบสำคัญ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่อลูกค้า / บริษัท / ผู้รับเงิน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    placeholder="เช่น บริษัท สยาม สอบบัญชี จำกัด หรือ นายสมชาย ใจดี"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลขประจำตัวผู้เสียภาษี 13 หลัก
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                    placeholder="เช่น 0105556026458 (13 หลัก)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ที่อยู่สำนักงาน / ที่อยู่ตามภ.พ.20
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  placeholder="เช่น 123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">สาขา</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    placeholder="สำนักงานใหญ่ หรือ สาขาที่ 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                    placeholder="02-xxx-xxxx"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ผู้ติดต่อ (Contact Person)</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    placeholder="คุณสมเกียรติ (ฝ่ายการเงิน)"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2 ================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <span>ขั้นตอนที่ 2: ตารางรายการ คำนวณภาษีมูลค่าเพิ่ม และระบบบันทึกย่อ (Notes)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  คอลัมน์คำอธิบายรายการกว้าง รองรับรายละเอียดวิชาชีพบัญชี พร้อมระบบบันทึกย่อและจัดเก็บไฟล์แยกตามลูกค้า
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มแถวรายการ</span>
              </button>
            </div>

            {/* Items Table / Cards */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4 transition hover:border-slate-300"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[11px] flex items-center justify-center font-mono">
                        {index + 1}
                      </span>
                      รายการที่ #{index + 1}
                    </span>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบรายการ</span>
                      </button>
                    )}
                  </div>

                  {/* Widened Description Column Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Description - Extra wide as requested! */}
                    <div className="md:col-span-8">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        รายละเอียดรายการสินค้า / บริการวิชาชีพบัญชี (คอลัมน์กว้าง) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItemCalculation(index, { description: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                        placeholder="เช่น ค่าบริการตรวจสอบบัญชีงวดที่ 1 ประจำปี 2568 ตามสัญญาบริการวิชาชีพ หรือ ค่าจ้างทำของ"
                        required
                      />
                    </div>

                    {/* Account Category Selector */}
                    <div className="md:col-span-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-slate-700">
                          หมวดบัญชี <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-blue-700 font-medium">
                          คำนวณหัก 3% &amp; ใส่คำอธิบายอัตโนมัติ
                        </span>
                      </div>
                      <select
                        value={item.accountCategory}
                        onChange={(e) => handleAccountCategoryChange(index, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-blue-300 bg-blue-50/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900 cursor-pointer"
                      >
                        {categoriesToUse.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Amount Before Tax & Taxes row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-200 text-xs">
                    {/* Amount Before Tax */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        จำนวนเงินก่อนภาษี (บาท) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.baseAmount}
                        onChange={(e) =>
                          updateItemCalculation(index, { baseAmount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono font-bold text-right"
                        required
                      />
                    </div>

                    {/* VAT 7% Selector */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-slate-600 mb-1">VAT 7%</label>
                      <select
                        value={item.vatRate}
                        onChange={(e) =>
                          updateItemCalculation(index, { vatRate: parseInt(e.target.value, 10) })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        <option value={7}>มี VAT 7%</option>
                        <option value={0}>ไม่มี VAT (0%)</option>
                      </select>
                      <div className="text-right font-mono text-[11px] text-slate-600 mt-1">
                        +{formatCurrency(item.vatAmount)} บาท
                      </div>
                    </div>

                    {/* Withholding Tax WHT */}
                    <div className="sm:col-span-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-amber-900">
                          ภาษีหัก ณ ที่จ่าย (WHT)
                        </label>
                        {item.whtRate === 3 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                            3% อัตโนมัติ
                          </span>
                        )}
                      </div>
                      <select
                        value={item.whtRate}
                        onChange={(e) =>
                          updateItemCalculation(index, { whtRate: parseFloat(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-amber-300 rounded-lg bg-amber-50 text-amber-900 font-medium"
                      >
                        <option value={3}>หัก 3% (บริการ/สอบบัญชี/วิชาชีพ)</option>
                        <option value={1}>หัก 1% (ค่าขนส่ง)</option>
                        <option value={2}>หัก 2% (ค่าโฆษณา)</option>
                        <option value={5}>หัก 5% (ค่าเช่า)</option>
                        <option value={0}>ไม่หักภาษี (0%)</option>
                      </select>
                      <div className="text-right font-mono text-[11px] text-amber-800 font-bold mt-1">
                        -{formatCurrency(item.whtAmount)} บาท ({item.whtRate}%)
                      </div>
                    </div>

                    {/* Net Amount */}
                    <div className="sm:col-span-3 flex flex-col justify-end text-right">
                      <span className="text-[11px] text-slate-500 font-medium">ยอดสุทธิรายการนี้:</span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {formatCurrency(item.netAmount)} บาท
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Real-time Summary Box */}
            <div className="p-4 bg-slate-900 text-white rounded-xl shadow-sm border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-slate-800 pb-3">
                <div>
                  <span className="text-slate-400 block">ยอดรวมก่อนภาษี:</span>
                  <span className="font-mono text-sm font-bold text-white">{formatCurrency(subtotal)} บาท</span>
                </div>
                <div>
                  <span className="text-slate-400 block">VAT 7%:</span>
                  <span className="font-mono text-sm font-bold text-sky-400">+{formatCurrency(totalVat)} บาท</span>
                </div>
                <div>
                  <span className="text-amber-300 block">หัก ณ ที่จ่าย 3%:</span>
                  <span className="font-mono text-sm font-bold text-amber-300">-{formatCurrency(totalWht)} บาท</span>
                </div>
                <div>
                  <span className="text-emerald-400 block font-semibold">
                    {voucherType === 'PV' ? 'ยอดจ่ายสุทธิ (Net Payable):' : 'ยอดรับสุทธิ (Net Receivable):'}
                  </span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    {formatCurrency(netPayable)} บาท
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 whitespace-nowrap">จำนวนเงินตัวอักษรไทย:</span>
                <span className="bg-slate-800 px-3 py-1.5 rounded text-slate-100 font-semibold font-sarabun w-full">
                  ( {thaiBahtText} )
                </span>
              </div>
            </div>

            {/* ================= NEW FEATURE: Dedicated Notes System Under Table ================= */}
            <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-xs text-amber-950 uppercase tracking-wider">
                    ระบบบันทึกย่อ (Notes / หมายเหตุเพิ่มเติมสำหรับใบสำคัญนี้)
                  </span>
                </div>
                <span className="text-[11px] text-amber-800">
                  {notes.length} ตัวอักษร
                </span>
              </div>

              {/* Quick Preset Suggestion Tags */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-600 block">
                  คลิกเพื่อเลือกบันทึกย่อสำเร็จรูป:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presetNotes.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddPresetNote(preset)}
                      className="text-[11px] bg-white hover:bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-300 transition cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Textarea */}
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุหมายเหตุ เงื่อนไขสัญญา อ้างอิงเลขที่เช็ค หรือข้อความกำกับสำหรับใบสำคัญฉบับนี้..."
                className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white leading-relaxed"
              />
            </div>

            {/* ================= NEW FEATURE: File Attachments Vault Categorized by Customer ================= */}
            <div className="p-5 bg-blue-50/40 border border-blue-200 rounded-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-700" />
                  <div>
                    <span className="font-bold text-xs text-blue-950 uppercase tracking-wider">
                      ระบบแนบไฟล์เอกสารใบสำคัญ (จัดเก็บแยกตามลูกค้า)
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      แนบสลิปโอนเงิน, ใบกำกับภาษี, ใบแจ้งหนี้, สัญญา สำหรับ <strong>{contactName || 'ลูกค้ารายนี้'}</strong>
                    </span>
                  </div>
                </div>

                {companySettings.googleDriveFolderUrl && (
                  <a
                    href={companySettings.googleDriveFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 bg-white border border-blue-300 px-2.5 py-1 rounded-md hover:bg-blue-50 transition cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>โฟลเดอร์ Google Drive</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-48">
                  <select
                    value={attachmentCategory}
                    onChange={(e) => setAttachmentCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="receipt">ใบเสร็จ / ใบกำกับภาษี</option>
                    <option value="slip">สลิปการโอนเงิน</option>
                    <option value="invoice">ใบแจ้งหนี้ / ใบวางบิล</option>
                    <option value="wht_cert">หนังสือรับรอง 50 ทวิ</option>
                    <option value="contract">สัญญา / ข้อตกลงจ้าง</option>
                    <option value="other">เอกสารอื่นๆ</option>
                  </select>
                </div>

                <label className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-1.5 rounded-lg transition font-medium cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>เลือกไฟล์แนบ...</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <span className="text-[11px] text-slate-500">
                  รองรับไฟล์รูปภาพ PNG, JPG, PDF, Excel (จัดเก็บเข้าคลังเอกสารอัตโนมัติ)
                </span>
              </div>

              {/* Uploaded Attachments List */}
              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-800 truncate" title={att.name}>
                            {att.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {(att.size / 1024).toFixed(1)} KB • ลูกค้า: {att.customerName}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                        title="ลบไฟล์"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  ยังไม่มีไฟล์แนบในใบสำคัญฉบับนี้
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 3 ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>ขั้นตอนที่ 3: วิธีการชำระเงิน ธนาคารรับ/จ่าย และผู้ลงนามอนุมัติ</span>
              </h3>
            </div>

            {/* Payment Method & Bank */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  รายละเอียดการชำระเงิน & ธนาคาร
                </div>
                <span className="text-[11px] text-blue-700 font-medium">
                  {voucherType === 'RV' ? 'เลือกธนาคารผู้รับเงิน' : 'เลือกธนาคารผู้จ่ายเงิน'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    วิธีการชำระเงิน
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="โอนเงินผ่านธนาคาร (Bank Transfer)">โอนเงินผ่านธนาคาร (Bank Transfer)</option>
                    <option value="เงินสด (Cash)">เงินสด (Cash)</option>
                    <option value="เช็ค (Cheque)">เช็ค (Cheque)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลือกบัญชีธนาคาร {voucherType === 'RV' ? '(สำหรับรับเงิน)' : '(สำหรับจ่ายเงิน)'}
                  </label>
                  <select
                    onChange={(e) => handleBankSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                    defaultValue={defaultBank?.id}
                  >
                    {companySettings.banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNo} ({b.accountType === 'receiving' ? 'รับ' : b.accountType === 'disbursing' ? 'จ่าย' : 'รับ/จ่าย'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    วันที่ทำรายการชำระ
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่อธนาคาร
                  </label>
                  <input
                    type="text"
                    value={selectedBankName}
                    onChange={(e) => setSelectedBankName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลขที่บัญชี (เช่น ***-******-*)
                  </label>
                  <input
                    type="text"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                    placeholder="082-248912-3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลขอ้างอิงสลิปโอน / เลขที่เช็ค
                  </label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                    placeholder="TRF-SCB-xxxxxx"
                  />
                </div>
              </div>

              {/* Recipient Bank Details (ธนาคารผู้รับเงิน) */}
              <div className="pt-4 border-t border-slate-200 mt-2">
                <div className="text-xs font-semibold text-slate-800 mb-2.5 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>ข้อมูลบัญชีธนาคารผู้รับเงิน (Recipient Bank Details)</span>
                  <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {voucherType === 'PV' ? 'ระบุธนาคารและเลขบัญชีของผู้รับเงิน / คู่ค้า' : 'ระบุธนาคารของลูกค้า (ถ้ามี)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ธนาคารผู้รับเงิน (Recipient Bank)
                    </label>
                    <select
                      value={THAI_COMMERCIAL_BANKS.includes(recipientBankName as any) ? recipientBankName : (recipientBankName ? 'อื่นๆ (ระบุเอง)' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'อื่นๆ (ระบุเอง)') {
                          setRecipientBankName('');
                        } else {
                          setRecipientBankName(val);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      <option value="">-- เลือกธนาคารผู้รับเงิน --</option>
                      {THAI_COMMERCIAL_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {(!THAI_COMMERCIAL_BANKS.includes(recipientBankName as any) || recipientBankName === 'อื่นๆ (ระบุเอง)') && (
                      <input
                        type="text"
                        value={recipientBankName === 'อื่นๆ (ระบุเอง)' ? '' : recipientBankName}
                        onChange={(e) => setRecipientBankName(e.target.value)}
                        placeholder="พิมพ์ระบุชื่อธนาคารผู้รับเงินเอง..."
                        className="mt-2 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      เลขที่บัญชีผู้รับเงิน / พร้อมเพย์ (Recipient Account No.)
                    </label>
                    <input
                      type="text"
                      value={recipientAccountNo}
                      onChange={(e) => setRecipientAccountNo(e.target.value)}
                      placeholder="เช่น 123-4-56789-0 หรือเบอร์โทร/เลขบัตรพร้อมเพย์"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      ข้อมูลนี้จะถูกบันทึกและแสดงในรายละเอียดการจ่ายเงินและเอกสาร A4
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Internal Control Signatures & Company Stamp */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    ผู้มีอำนาจลงนาม 4 ฝ่าย (Internal Control & Revenue Standard)
                  </span>
                  <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-medium">
                    สรรพากร & ควบคุมภายใน
                  </span>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 select-none">
                  <input
                    type="checkbox"
                    checked={showCompanyStamp}
                    onChange={(e) => setShowCompanyStamp(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                  />
                  <span className="font-medium text-[11px] text-slate-800">
                    ประทับตรานิติบุคคล (Company Stamp)
                  </span>
                </label>
              </div>

              {/* 4 Boxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. ผู้จัดทำ */}
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">1. ผู้จัดทำ (Prepared By)</label>
                  </div>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    placeholder="ชื่อผู้จัดทำ"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  {preparedBySignatureUrl ? (
                    <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img 
                          src={preparedBySignatureUrl} 
                          alt="ลายเซ็นต์ผู้จัดทำ" 
                          className="h-7 max-w-[80px] object-contain bg-white rounded px-1.5 py-0.5 border border-blue-200 shrink-0" 
                        />
                        <span className="text-[10px] text-blue-900 font-medium truncate">
                          แนบลายเซ็นต์แล้ว
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer underline">
                          เปลี่ยน
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload(e, setPreparedBySignatureUrl)}
                            className="hidden"
                          />
                        </label>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setPreparedBySignatureUrl('')}
                          className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                          title="ลบลายเซ็นต์ออก"
                        >
                          นำออก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1">
                      <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 rounded-lg text-[10px] font-medium text-slate-600 hover:text-blue-600 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>อัปโหลดรูปลายเซ็นต์</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSignatureUpload(e, setPreparedBySignatureUrl)}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setPreparedBySignatureUrl('/signatures/sign_napak.svg')}
                        className="text-[10px] text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        <span>ใช้ลายเซ็นต์เริ่มต้น (คุณนภักดิ์)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. ผู้ตรวจสอบ */}
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">2. ผู้ตรวจสอบ (Checked By)</label>
                  </div>
                  <input
                    type="text"
                    value={checkedBy}
                    onChange={(e) => setCheckedBy(e.target.value)}
                    placeholder="ชื่อผู้ตรวจสอบ"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  {checkedBySignatureUrl ? (
                    <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img 
                          src={checkedBySignatureUrl} 
                          alt="ลายเซ็นต์ผู้ตรวจสอบ" 
                          className="h-7 max-w-[80px] object-contain bg-white rounded px-1.5 py-0.5 border border-blue-200 shrink-0" 
                        />
                        <span className="text-[10px] text-blue-900 font-medium truncate">
                          แนบลายเซ็นต์แล้ว
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer underline">
                          เปลี่ยน
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload(e, setCheckedBySignatureUrl)}
                            className="hidden"
                          />
                        </label>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setCheckedBySignatureUrl('')}
                          className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                          title="ลบลายเซ็นต์ออก"
                        >
                          นำออก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 rounded-lg text-[10px] font-medium text-slate-600 hover:text-blue-600 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>อัปโหลดรูปลายเซ็นต์</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSignatureUpload(e, setCheckedBySignatureUrl)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* 3. ผู้อนุมัติ */}
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">3. ผู้อนุมัติ (Approved By)</label>
                  </div>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="ชื่อผู้อนุมัติ"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  {approvedBySignatureUrl ? (
                    <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img 
                          src={approvedBySignatureUrl} 
                          alt="ลายเซ็นต์ผู้อนุมัติ" 
                          className="h-7 max-w-[80px] object-contain bg-white rounded px-1.5 py-0.5 border border-blue-200 shrink-0" 
                        />
                        <span className="text-[10px] text-blue-900 font-medium truncate">
                          แนบลายเซ็นต์แล้ว
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer underline">
                          เปลี่ยน
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload(e, setApprovedBySignatureUrl)}
                            className="hidden"
                          />
                        </label>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setApprovedBySignatureUrl('')}
                          className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                          title="ลบลายเซ็นต์ออก"
                        >
                          นำออก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1">
                      <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 rounded-lg text-[10px] font-medium text-slate-600 hover:text-blue-600 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>อัปโหลดรูปลายเซ็นต์</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSignatureUpload(e, setApprovedBySignatureUrl)}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setApprovedBySignatureUrl('/signatures/sign_aphiwatch.svg')}
                        className="text-[10px] text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        <span>ใช้ลายเซ็นต์เริ่มต้น (คุณอภิวัฒน์)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. ผู้รับเงิน / ผู้จ่ายเงิน */}
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      4. {voucherType === 'PV' ? 'ผู้รับเงิน (Received By)' : 'ผู้จ่ายเงิน (Payer)'}
                    </label>
                  </div>
                  <input
                    type="text"
                    value={receivedOrPaidBy}
                    onChange={(e) => setReceivedOrPaidBy(e.target.value)}
                    placeholder="ชื่อผู้รับ/ผู้จ่ายเงิน"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  {receivedOrPaidSignatureUrl ? (
                    <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img 
                          src={receivedOrPaidSignatureUrl} 
                          alt="ลายเซ็นต์ผู้รับ/จ่ายเงิน" 
                          className="h-7 max-w-[80px] object-contain bg-white rounded px-1.5 py-0.5 border border-blue-200 shrink-0" 
                        />
                        <span className="text-[10px] text-blue-900 font-medium truncate">
                          แนบลายเซ็นต์แล้ว
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer underline">
                          เปลี่ยน
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload(e, setReceivedOrPaidSignatureUrl)}
                            className="hidden"
                          />
                        </label>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setReceivedOrPaidSignatureUrl('')}
                          className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                          title="ลบลายเซ็นต์ออก"
                        >
                          นำออก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 rounded-lg text-[10px] font-medium text-slate-600 hover:text-blue-600 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>อัปโหลดรูปลายเซ็นต์</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSignatureUpload(e, setReceivedOrPaidSignatureUrl)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Stamp Sub-Panel (When Enabled) */}
              {showCompanyStamp && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg border border-rose-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      {companyStampUrl ? (
                        <img
                          src={companyStampUrl}
                          alt="ตราประทับนิติบุคคล"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-rose-300" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                        <span>ตราประทับบริษัท / นิติบุคคล</span>
                        <span className="text-[10px] bg-rose-200/70 text-rose-800 px-1.5 py-0.2 rounded font-normal">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        ตราประทับจะแสดงลงในเอกสารใบสำคัญ A4 ร่วมกับลายมือชื่อผู้มีอำนาจ
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-rose-200 text-xs">
                      <span className="text-[11px] text-slate-600 font-medium">ตำแหน่งประทับ:</span>
                      <select
                        value={stampPlacement}
                        onChange={(e) => setStampPlacement(e.target.value as any)}
                        className="text-[11px] bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="approved">ช่องผู้อนุมัติ (Box 3 - มาตรฐาน)</option>
                        <option value="received">ช่องผู้รับ/จ่ายเงิน (Box 4)</option>
                        <option value="center">กึ่งกลาง 4 ช่อง (Center)</option>
                        <option value="all">ประทับทุกช่อง (All)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition">
                      <Upload className="w-3 h-3" />
                      <span>อัปโหลดตราประทับ</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleStampUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setCompanyStampUrl('/stamps/company_stamp.svg')}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded cursor-pointer transition"
                      title="รีเซ็ตเป็นตราประทับตั้งต้น"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>ตราประทับตั้งต้น</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Final Live Artifact Preview summary */}
            <div className="p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" />
                  <span className="font-bold text-slate-900 text-sm">
                    {voucherNo} ({voucherType === 'PV' ? 'ใบสำคัญจ่าย' : 'ใบสำคัญรับ'})
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                    ยอดสุทธิ {formatCurrency(netPayable)} บาท
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  ผู้รับเงิน/ลูกค้า: <strong>{contactName || '(ยังไม่ระบุ)'}</strong> | บัญชี: {selectedBankName} ({accountNo})
                </div>
                {voucherType === 'PV' && auditor && (
                  <div className="text-xs text-indigo-700 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ผู้สอบบัญชี: <strong>{auditor}</strong></span>
                  </div>
                )}
                {voucherType === 'RV' && jobClient && (
                  <div className="text-xs text-teal-700 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                    <span>ลูกค้าส่งงาน: <strong>{jobClient}</strong></span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">ตัวอักษรไทย:</span>
                <span className="text-xs font-bold text-blue-900 font-sarabun">
                  {thaiBahtText}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Wizard Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับขั้นตอนก่อนหน้า</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                ยกเลิก
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <span>ถัดไป: ขั้นตอนที่ {currentStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกจัดเก็บในระบบ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>บันทึกและพิมพ์ A4 ทันที</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Customer Directory Modal (Google Sheets Sync & Search) */}
      <CustomerDirectoryModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={customerList}
        onUpdateCustomers={(newCusts) => {
          setCustomerList(newCusts);
          saveCustomers(newCusts);
          if (onUpdateCustomers) onUpdateCustomers(newCusts);
        }}
        customerSheetConfig={sheetConfigState}
        onUpdateSheetConfig={(newCfg) => {
          setSheetConfigState(newCfg);
          if (onUpdateCustomerSheetConfig) onUpdateCustomerSheetConfig(newCfg);
        }}
        onSelectCustomer={(cust) => handleSelectCustomer(cust)}
        isSelectionMode={true}
      />
    </div>
  );
};
