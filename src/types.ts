export type VoucherType = 'RV' | 'PV';

export type VoucherStatus = 'ร่าง (Draft)' | 'รออนุมัติ (Pending)' | 'อนุมัติแล้ว (Approved)' | 'ชำระแล้ว (Completed)' | 'ยกเลิก (Cancelled)';

export type PaymentMethod = 'โอนเงินผ่านธนาคาร (Bank Transfer)' | 'เงินสด (Cash)' | 'เช็ค (Cheque)';

export type BankAccountUsage = 'receiving' | 'disbursing' | 'both';

export interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNo: string;
  accountName: string;
  branch: string;
  isDefault: boolean;
  accountType?: BankAccountUsage; // ธนาคารผู้รับเงิน / ธนาคารผู้จ่ายเงิน / ทั้งรับและจ่าย
  promptPayId?: string; // หมายเลขพร้อมเพย์ (เลขผู้เสียภาษี 13 หลัก หรือเบอร์โทร)
}

export interface RunningNumberConfig {
  ivPrefix?: string; // เช่น 'IV69-' หรือ 'IV2569-'
  rvPrefix: string; // เช่น 'RV69-' หรือ 'IV69-'
  pvPrefix: string; // เช่น 'PV69-'
  nextIvSeq?: number; // ลำดับถัดไปของ IV เช่น 1
  nextRvSeq: number; // เช่น 1
  nextPvSeq: number; // เช่น 1
  digitCount: number; // เช่น 3 หรือ 4 (001, 0001)
  includeYearMonth: boolean; // เพิ่ม ปีเดือน เช่น 6909 หรือ 2569
}

export interface AppUserAccount {
  id: string;
  username: string;
  displayName: string;
  pinOrPassword: string; // PIN หรือรหัสผ่านสำหรับเข้าสู่ระบบ
  role: 'admin' | 'staff' | 'viewer'; // สิทธิ์ผู้ดูแลระบบหลัก, พนักงานบัญชี, หรือผู้ดูรายงาน
  createdAt: string;
}

export interface SecurityConfig {
  requirePasswordOnStartup: boolean;
  adminPin: string; // PIN หรือ รหัสผ่านหลักของผู้ดูแลระบบ เช่น 820820
  adminDisplayName?: string;
  userAccounts: AppUserAccount[];
  lockTimeoutMinutes?: number; // ล็อคหน้าจออัตโนมัติเมื่อไม่มีการใช้งาน (นาที, 0 = ไม่ล็อคอัตโนมัติ)
  hideSharedDashboardAdminBtn?: boolean; // ซ่อนปุ่มเข้าสู่ระบบหลักบนหน้าแชร์แดชบอร์ด
}

export type FontSizePreference = 'compact' | 'normal' | 'large' | 'xlarge';

export interface CompanySettings {
  name: string;
  taxId: string;
  address: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  branch: string;
  branchCode: string;
  logoUrl?: string;
  companyStampUrl?: string; // ตราประทับบริษัท
  payerSignatureUrl?: string; // ลายเซ็นต์ผู้จ่ายเงิน/ผู้มีอำนาจลงนามในแบบ 50 ทวิ
  payerName?: string; // ชื่อ-นามสกุล ผู้มีอำนาจลงนาม 50 ทวิ
  defaultPreparedBy?: string;
  defaultPreparedBySignatureUrl?: string;
  defaultCheckedBy?: string;
  defaultCheckedBySignatureUrl?: string;
  defaultApprovedBy?: string;
  defaultApprovedBySignatureUrl?: string;
  defaultReceivedOrPaidBy?: string;
  defaultReceivedOrPaidSignatureUrl?: string;
  defaultShowStampOnVouchers?: boolean;
  banks: BankAccount[];
  accountCategories?: string[]; // หมวดบัญชีที่กำหนดเองได้
  auditors?: string[]; // รายชื่อผู้สอบบัญชีสำหรับตัวเลือกในใบสำคัญจ่าย (PV)
  jobClients?: string[]; // รายชื่อลูกค้าส่งงานสำหรับตัวเลือกในใบสำคัญรับ (RV)
  runningNumberConfig?: RunningNumberConfig; // การตั้งค่าเลขรัน RV/IV และ PV
  googleDriveFolderUrl?: string; // โฟลเดอร์ Google Drive จัดเก็บไฟล์
  customerSheetUrl?: string; // ลิงก์ Google Sheets สำหรับดึงข้อมูลรายชื่อลูกค้า (Customer Directory)
  securityConfig?: SecurityConfig; // ระบบรักษาความปลอดภัยและรหัสผ่านเข้าสู่ระบบ
  fontSizePreference?: FontSizePreference; // การตั้งค่าขนาดตัวหนังสือ (compact, normal, large, xlarge)
}

export interface Customer {
  id: string;
  customerCode?: string; // รหัสลูกค้า เช่น ACP-0001, ACP-0002
  name: string; // ชื่อบริษัท หรือชื่อลูกค้า
  taxId: string; // เลขทะเบียนนิติบุคคล / เลขประจำตัวผู้เสียภาษี 13 หลัก
  address: string; // ที่อยู่สำนักงาน / ที่อยู่ตาม ภ.พ.20
  branch?: string; // สาขา เช่น 'สำนักงานใหญ่'
  branchCode?: string; // รหัสสาขา เช่น '00000'
  assignedStaff?: string; // ผู้ส่งงาน (พนักงานผู้รับผิดชอบ) เช่น ปุ๋ย (PNK), จอย, ซุ่น
  phone?: string; // เบอร์โทรศัพท์
  email?: string; // อีเมล
  contactPerson?: string; // ผู้ติดต่อ
  source?: 'GoogleSheet' | 'ACP-Master' | 'Manual' | 'System';
  updatedAt?: string;
}

export interface CustomerSheetSyncConfig {
  sheetUrl: string;
  sheetId?: string;
  sheetName?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  statusMessage?: string;
}

export interface ContactInfo {
  name: string;
  taxId: string;
  address: string;
  branch: string;
  branchCode?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
}

export interface VoucherItem {
  id: string;
  description: string;
  accountCategory: string;
  baseAmount: number;
  marginPercent?: number; // e.g. 40%
  marginAmount?: number;
  vatRate: number; // e.g. 0, 7
  vatAmount: number;
  whtRate: number; // e.g. 0, 1, 2, 3, 5
  whtAmount: number;
  netAmount: number;
}

export interface VoucherSignatures {
  preparedBy: string;
  preparedDate: string;
  preparedBySignatureUrl?: string; // ลายเซ็นต์อิเล็กทรอนิกส์ผู้จัดทำ (Box 1)
  checkedBy: string;
  checkedDate: string;
  checkedBySignatureUrl?: string; // ลายเซ็นต์อิเล็กทรอนิกส์ผู้ตรวจสอบ (Box 2)
  approvedBy: string;
  approvedDate: string;
  approvedBySignatureUrl?: string; // ลายเซ็นต์อิเล็กทรอนิกส์ผู้อนุมัติ (Box 3)
  receivedOrPaidBy: string;
  receivedOrPaidDate: string;
  receivedOrPaidSignatureUrl?: string; // ลายเซ็นต์อิเล็กทรอนิกส์ผู้รับเงิน/ผู้จ่ายเงิน (Box 4)
  payerSignatureUrl?: string; // ลายเซ็นต์ผู้จ่ายเงินในหนังสือรับรอง 50 ทวิ
  companyStampUrl?: string; // ตราประทับนิติบุคคล (ในใบสำคัญ หรือหนังสือรับรอง 50 ทวิ)
  showCompanyStamp?: boolean; // เปิด/ปิดประทับตรานิติบุคคลในส่วน 4 ฝ่าย
  stampPlacement?: 'approved' | 'received' | 'center' | 'all'; // ตำแหน่งการประทับตรานิติบุคคล
}

export interface VoucherPayment {
  method: PaymentMethod;
  bankName: string;
  accountNo: string;
  accountName: string;
  paymentDate: string;
  chequeNo?: string;
  transferRef?: string;
  recipientBankName?: string; // ธนาคารผู้รับเงิน
  recipientAccountNo?: string; // เลขที่บัญชีผู้รับเงิน
}

export const THAI_COMMERCIAL_BANKS = [
  'ธนาคารกสิกรไทย (KBANK)',
  'ธนาคารไทยพาณิชย์ (SCB)',
  'ธนาคารกรุงเทพ (BBL)',
  'ธนาคารกรุงไทย (KTB)',
  'ธนาคารกรุงศรีอยุธยา (BAY)',
  'ธนาคารทหารไทยธนชาต (TTB)',
  'ธนาคารออมสิน (GSB)',
  'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส. / BAAC)',
  'ธนาคารยูโอบี (UOB)',
  'ธนาคารซีไอเอ็มบี ไทย (CIMB)',
  'ธนาคารทิสโก้ (TISCO)',
  'ธนาคารเกียรตินาคินภัทร (KKP)',
  'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
  'ธนาคารไทยเครดิต (Thai Credit)',
  'ธนาคารอาคารสงเคราะห์ (ธอส. / GHB)',
  'พร้อมเพย์ (PromptPay)',
  'อื่นๆ (ระบุเอง)',
] as const;

export interface VoucherAttachment {
  id: string;
  name: string;
  size: number;
  type: string; // เช่น 'image/jpeg', 'application/pdf'
  dataUrl?: string;
  uploadedAt: string;
  customerName: string;
  category?: 'invoice' | 'receipt' | 'slip' | 'wht_cert' | 'contract' | 'other';
}

export interface Voucher {
  id: string;
  voucherNo: string;
  type: VoucherType;
  date: string;
  dueDate?: string;
  referenceNo?: string;
  jobNo?: string; // รหัสงาน หรือเลขที่ Job No. เช่น 70001
  auditor?: string; // ผู้สอบบัญชี (สำหรับใบสำคัญจ่าย PV)
  jobClient?: string; // ลูกค้าที่ส่งงาน / ลูกค้าส่งงาน (สำหรับใบสำคัญรับ RV)
  contact: ContactInfo;
  items: VoucherItem[];
  subtotal: number;
  totalVat: number;
  totalWht: number;
  netPayable: number;
  thaiBahtText: string;
  payment: VoucherPayment;
  notes?: string;
  status: VoucherStatus;
  signatures: VoucherSignatures;
  createdAt: string;
  updatedAt: string;
  source?: 'Manual' | 'GoogleSheet' | 'Import';
  attachments?: VoucherAttachment[];
  promptPayEnabled?: boolean;
  isSample?: boolean; // ระบุว่าเป็นข้อมูลตัวอย่างสำหรับการทดลองใช้หรือไม่
}

export interface GoogleSheetSyncConfig {
  sheetUrl: string;
  sheetId: string;
  sheetName?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  statusMessage?: string;
}

export const ACCOUNT_CATEGORIES = [
  'รายได้ค่าบริการตรวจสอบบัญชี',
  'รายได้ค่าบริการอื่นๆ',
  'ค่านายหน้า',
  'ค่าบริการตรวจสอบบัญชี',
  'ค่าบริการวิชาชีพบัญชี',
  'ค่าที่ปรึกษาธุรกิจและภาษีอากร',
  'ค่าจ้างเหมาบริการ / ผู้สอบภายนอก',
  'ค่าธรรมเนียมธนาคารและอื่นๆ',
  'ค่าเช่าและสาธารณูปโภค',
  'ค่าเครื่องเขียนและวัสดุสำนักงาน',
] as const;

export type WhtFormType = 'PND3' | 'PND53';

export interface WhtReportEntry {
  sequence: number;
  voucherId: string;
  voucherNo: string;
  paymentDate: string;
  payeeName: string;
  payeeTaxId: string;
  payeeAddress: string;
  branch: string;
  formType: WhtFormType;
  incomeCategory: string;
  incomeSection: string; // e.g. '40(2)', '40(6)', '40(8)', '40(5)'
  description: string;
  baseAmount: number;
  whtRate: number;
  whtAmount: number;
  withholdingCondition: '1' | '2' | '3'; // 1 = หัก ณ ที่จ่าย, 2 = ออกให้ตลอดไป, 3 = ออกให้ครั้งเดียว
}

export interface WhtCategoryGroup {
  incomeSection: string;
  sectionTitle: string;
  whtRate: number;
  totalBaseAmount: number;
  totalWhtAmount: number;
  payeeCount: number;
  transactionCount: number;
}

export interface WhtFormSummary {
  formType: WhtFormType;
  formName: string;
  formTitle: string;
  monthKey: string; // e.g. "2026-09"
  monthThaiName: string; // e.g. "กันยายน 2569"
  taxFilingDeadlineRegular: string; // e.g. 7 ต.ค. 2569
  taxFilingDeadlineOnline: string; // e.g. 15 ต.ค. 2569
  totalBaseAmount: number;
  totalWhtAmount: number;
  totalPayees: number;
  totalTransactions: number;
  categoryGroups: WhtCategoryGroup[];
  entries: WhtReportEntry[];
}
