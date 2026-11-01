import { CompanySettings, Voucher, GoogleSheetSyncConfig } from '../types';
import { convertToThaiBahtText } from './thaiBahtText';
import { saveBackupToIndexedDb } from './indexedDbBackup';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
  taxId: '0105556026458',
  address: '120/820 หมู่บ้านมณียาวิลล์ ซอย 7D (วชิรธรรมสาธิต 12)',
  subDistrict: 'ซอยสุขุมวิท 101/1 แขวงบางนาเหนือ',
  district: 'เขตบางนา',
  province: 'กรุงเทพฯ',
  postalCode: '10260',
  phone: '086-463-5642',
  email: 'contact@accountplanet.co.th',
  website: 'www.accountplanet.co.th',
  branch: 'สำนักงานใหญ่',
  branchCode: '00000',
  logoUrl: '/account-planet-logo.svg',
  companyStampUrl: '/stamps/company_stamp.svg',
  payerSignatureUrl: '/signatures/sign_aphiwatch.svg',
  payerName: 'นายอภิวัฒน์',
  banks: [
    {
      id: 'scb-main',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      bankCode: '014',
      accountNo: '082-248912-3', // หรือรูปแบบแสดง ***-******-*
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      branch: 'สาขา สุขุมวิท 101/1',
      isDefault: true,
      accountType: 'receiving', // ธนาคารสำหรับรับเงิน
      promptPayId: '0105556026458',
    },
    {
      id: 'kbank-sub',
      bankName: 'ธนาคารกสิกรไทย (KBANK)',
      bankCode: '004',
      accountNo: '738-2-89214-5',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      branch: 'สาขา อุดมสุข',
      isDefault: false,
      accountType: 'disbursing', // ธนาคารสำหรับจ่ายเงิน
    },
  ],
  accountCategories: [
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
  ],
  auditors: [
    'นายสมชาย สุขใจ (ผู้สอบบัญชีรับอนุญาต เลขทะเบียน 10245)',
    'นางสาววิภาดา เจริญศิลป์ (ผู้สอบบัญชีรับอนุญาต เลขทะเบียน 12890)',
    'นายอัครเดช มั่นคง (ผู้สอบบัญชีรับอนุญาต เลขทะเบียน 14562)',
    'ผู้สอบบัญชีอิสระภายนอก',
  ],
  jobClients: [
    'บริษัท บิลเลี่ยน เทรดดิ้ง กรุ๊ป จำกัด',
    'ห้างหุ้นส่วนจำกัด ทรัพย์เพิ่มพูน วิศวกรรม',
    'บริษัท สยาม โลจิสติกส์ อินโนเวชั่น จำกัด',
    'บริษัท ดิจิทัล โซลูชั่นส์ พลัส จำกัด',
    'ห้างหุ้นส่วนจำกัด วรวัฒน์ การช่าง',
  ],
  runningNumberConfig: {
    ivPrefix: 'IV69-',
    rvPrefix: 'RV69-',
    pvPrefix: 'PV69-',
    nextIvSeq: 1,
    nextRvSeq: 8,
    nextPvSeq: 6,
    digitCount: 3,
    includeYearMonth: true,
  },
  googleDriveFolderUrl: 'https://drive.google.com/drive/folders/1mjfvMdvJbU539CvtziYzPF7YjtxiN0oX?usp=drive_link',
  customerSheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  securityConfig: {
    requirePasswordOnStartup: false,
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
      },
      {
        id: 'user-staff-1',
        username: 'accountant',
        displayName: 'พนักงานบัญชี (Staff)',
        pinOrPassword: '8888',
        role: 'staff',
        createdAt: new Date().toISOString(),
      },
    ],
    lockTimeoutMinutes: 0,
  },
  fontSizePreference: 'large', // ค่าเริ่มต้นขนาดตัวอักษร: 'large' (อ่านง่าย สบายตา)
};

export const DEFAULT_SHEET_CONFIG: GoogleSheetSyncConfig = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  autoSync: false,
  status: 'idle',
  statusMessage: 'พร้อมเชื่อมต่อ Google Sheet แบบเรียลไทม์',
};

// Seed realistic sample vouchers based on the user's business categories
export const INITIAL_VOUCHERS: Voucher[] = [
  {
    id: 'VOUCHER-001',
    voucherNo: 'RV-202609-001',
    type: 'RV',
    date: '2026-09-10',
    referenceNo: 'INV-AP-69001',
    jobNo: '70001',
    jobClient: 'บริษัท บิลเลี่ยน เทรดดิ้ง กรุ๊ป จำกัด',
    contact: {
      name: 'บริษัท สยาม ซอฟต์แวร์ อินโนเวชั่น จำกัด',
      taxId: '0105558098124',
      address: '88/19 อาคารเอ็กเชนจ์ ทาวเวอร์ ชั้น 14 ถ.สุขุมวิท คลองเตย กรุงเทพฯ 10110',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-712-9900',
      contactPerson: 'คุณสมชาย มุ่งมั่น',
    },
    items: [
      {
        id: 'item-1',
        description: 'รายได้ค่าบริการตรวจสอบบัญชี ประจำงวดปี 2568 (งวดที่ 1)',
        accountCategory: 'รายได้ค่าบริการตรวจสอบบัญชี',
        baseAmount: 100000,
        vatRate: 7,
        vatAmount: 7000,
        whtRate: 3,
        whtAmount: 3000,
        netAmount: 104000,
      },
    ],
    subtotal: 100000,
    totalVat: 7000,
    totalWht: 3000,
    netPayable: 104000,
    thaiBahtText: convertToThaiBahtText(104000),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-09-10',
      transferRef: 'TRF-SCB-984210',
    },
    notes: 'รับชำระค่างวดค่าสอบบัญชีงวดที่ 1 ได้รับหนังสือรับรองหัก ณ ที่จ่าย 3% เรียบร้อยแล้ว',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-09-10',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-09-10',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-09-10',
      receivedOrPaidBy: 'คุณสมชาย มุ่งมั่น (ผู้แทนลูกค้า)',
      receivedOrPaidDate: '2026-09-10',
    },
    createdAt: '2026-09-10T09:30:00.000Z',
    updatedAt: '2026-09-10T09:30:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-002',
    voucherNo: 'PV-202609-001',
    type: 'PV',
    date: '2026-09-12',
    referenceNo: 'INV-CPA-26091',
    jobNo: '70001',
    auditor: 'นาย ประวิทย์ สุวรรณโชติ (ผู้สอบบัญชีรับอนุญาต ทะเบียนเลขที่ 9845)',
    contact: {
      name: 'นาย ประวิทย์ สุวรรณโชติ (ผู้สอบบัญชีรับอนุญาต ทะเบียนเลขที่ 9845)',
      taxId: '3100600124589',
      address: '45/8 หมู่ 3 แขวงบางจาก เขตพระโขนง กรุงเทพฯ 10260',
      branch: 'สำนักงานใหญ่ / บุคคลธรรมดา',
      branchCode: '00000',
      phone: '081-992-4411',
      contactPerson: 'ประวิทย์ (CPA)',
    },
    items: [
      {
        id: 'item-2',
        description: 'ค่าบริการตรวจสอบบัญชี บจก. สยาม ซอฟต์แวร์ อินโนเวชั่น',
        accountCategory: 'ค่าบริการตรวจสอบบัญชี',
        baseAmount: 40000,
        vatRate: 0,
        vatAmount: 0,
        whtRate: 3,
        whtAmount: 1200,
        netAmount: 38800,
      },
    ],
    subtotal: 40000,
    totalVat: 0,
    totalWht: 1200,
    netPayable: 38800,
    thaiBahtText: convertToThaiBahtText(38800),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-09-12',
      transferRef: 'TRF-SCB-984882',
    },
    notes: 'จ่ายค่าบริการตรวจสอบบัญชีให้แก่ผู้สอบ CPA หักภาษี ณ ที่จ่าย 3% พร้อมออกหนังสือ 50 ทวิ',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-09-12',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-09-12',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-09-12',
      receivedOrPaidBy: 'นาย ประวิทย์ สุวรรณโชติ',
      receivedOrPaidDate: '2026-09-12',
    },
    createdAt: '2026-09-12T14:15:00.000Z',
    updatedAt: '2026-09-12T14:15:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-003',
    voucherNo: 'PV-202609-002',
    type: 'PV',
    date: '2026-09-15',
    referenceNo: 'CMS-260901',
    contact: {
      name: 'นาย อานนท์ โชคดีวิวัฒน์ (ตัวแทนแนะนำลูกค้า)',
      taxId: '1100400569871',
      address: '22 ซอยอุดมสุข 26 ถนนสุขุมวิท 103 บางนา กรุงเทพฯ 10260',
      branch: 'บุคคลธรรมดา',
      phone: '089-555-1234',
    },
    items: [
      {
        id: 'item-3',
        description: 'ค่านายหน้า แนะนำลูกค้ารายการบริการตรวจสอบและจัดทำระบบบัญชี',
        accountCategory: 'ค่านายหน้า',
        baseAmount: 15000,
        vatRate: 0,
        vatAmount: 0,
        whtRate: 3,
        whtAmount: 450,
        netAmount: 14550,
      },
    ],
    subtotal: 15000,
    totalVat: 0,
    totalWht: 450,
    netPayable: 14550,
    thaiBahtText: convertToThaiBahtText(14550),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-09-15',
      transferRef: 'TRF-SCB-991204',
    },
    notes: 'ค่านายหน้าหักภาษี ณ ที่จ่าย 3% ยอดจ่ายสุทธิ 14,550.00 บาท',
    status: 'อนุมัติแล้ว (Approved)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-09-15',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-09-15',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-09-15',
      receivedOrPaidBy: 'นาย อานนท์ โชคดีวิวัฒน์',
      receivedOrPaidDate: '2026-09-15',
    },
    createdAt: '2026-09-15T11:00:00.000Z',
    updatedAt: '2026-09-15T11:00:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-004',
    voucherNo: 'RV-202609-002',
    type: 'RV',
    date: '2026-09-16',
    referenceNo: 'INV-AP-69002',
    contact: {
      name: 'ห้างหุ้นส่วนจำกัด บางนา โลจิสติกส์ เซอร์วิส',
      taxId: '0103554012984',
      address: '500 ถนนบางนา-ตราด กม. 4 แขวงบางนาใต้ เขตบางนา กรุงเทพฯ 10260',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-398-1122',
    },
    items: [
      {
        id: 'item-4',
        description: 'รายได้ค่าบริการอื่นๆ (ค่าที่ปรึกษาวางระบบบัญชีและตรวจเช็คสต็อก)',
        accountCategory: 'รายได้ค่าบริการอื่นๆ',
        baseAmount: 35000,
        vatRate: 7,
        vatAmount: 2450,
        whtRate: 3,
        whtAmount: 1050,
        netAmount: 36400,
      },
    ],
    subtotal: 35000,
    totalVat: 2450,
    totalWht: 1050,
    netPayable: 36400,
    thaiBahtText: convertToThaiBahtText(36400),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-09-16',
    },
    notes: 'รับชำระค่าที่ปรึกษาหัก 3% เงินโอนเข้าบัญชีไทยพาณิชย์',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-09-16',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-09-16',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-09-16',
      receivedOrPaidBy: 'คุณสมจิตต์ (การเงินลูกค้า)',
      receivedOrPaidDate: '2026-09-16',
    },
    createdAt: '2026-09-16T15:20:00.000Z',
    updatedAt: '2026-09-16T15:20:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-005',
    voucherNo: 'PV-202609-003',
    type: 'PV',
    date: '2026-09-18',
    referenceNo: 'INV-TK-26098',
    contact: {
      name: 'บริษัท ที.เค. ดิจิทัล ซิสเต็มส์ แอนด์ คอนซัลติ้ง จำกัด',
      taxId: '0105559012384',
      address: '99/140 อาคารพหลโยธินเพลส ชั้น 18 ถนนพหลโยธิน พญาไท กรุงเทพฯ 10400',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-619-8900',
      contactPerson: 'คุณธวัชชัย (ฝ่ายบัญชีและการเงิน)',
    },
    items: [
      {
        id: 'item-5',
        description: 'ค่าบริการพัฒนาระบบเชื่อมต่อฐานข้อมูลบัญชีและซอฟต์แวร์จัดเก็บเอกสาร',
        accountCategory: 'ค่าบริการวิชาชีพบัญชี',
        baseAmount: 30000,
        vatRate: 7,
        vatAmount: 2100,
        whtRate: 3,
        whtAmount: 900,
        netAmount: 31200,
      },
    ],
    subtotal: 30000,
    totalVat: 2100,
    totalWht: 900,
    netPayable: 31200,
    thaiBahtText: convertToThaiBahtText(31200),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-09-18',
      transferRef: 'TRF-SCB-998812',
    },
    notes: 'จ่ายค่าบริการซอฟต์แวร์ระบบบัญชี หัก ภ.ง.ด. 53 (นิติบุคคล) 3% จำนวน 900.00 บาท',
    status: 'รออนุมัติ (Pending)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-09-18',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-09-18',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-09-18',
      receivedOrPaidBy: 'คุณธวัชชัย (ผู้แทน บจก. ที.เค. ดิจิทัล)',
      receivedOrPaidDate: '2026-09-18',
    },
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-006',
    voucherNo: 'PV-202609-004',
    type: 'PV',
    date: '2026-09-20',
    referenceNo: 'INV-MNY-260901',
    contact: {
      name: 'บริษัท มณียา เรียลเอสเตท โฮลดิ้ง จำกัด',
      taxId: '0105548019281',
      address: '120/820 หมู่บ้านมณียาวิลล์ ซอยสุขุมวิท 101/1 แขวงบางนาเหนือ เขตบางนา กรุงเทพฯ 10260',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-747-8100',
    },
    items: [
      {
        id: 'item-6',
        description: 'ค่าเช่าพื้นที่สำนักงานและสิ่งอำนวยความสะดวก ประจำเดือนกันยายน 2568',
        accountCategory: 'ค่าเช่าและสาธารณูปโภค',
        baseAmount: 25000,
        vatRate: 0,
        vatAmount: 0,
        whtRate: 5,
        whtAmount: 1250,
        netAmount: 23750,
      },
    ],
    subtotal: 25000,
    totalVat: 0,
    totalWht: 1250,
    netPayable: 23750,
    thaiBahtText: convertToThaiBahtText(23750),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-09-20',
      transferRef: 'TRF-SCB-999401',
    },
    notes: 'ค่าเช่าสำนักงาน หักภาษี ณ ที่จ่ายตาม ม.40(5) อัตรา 5% นำส่งแบบ ภ.ง.ด.53 ยอดหัก 1,250.00 บาท',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-09-20',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-09-20',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-09-20',
      receivedOrPaidBy: 'คุณนันทนา (เจ้าหน้าที่การเงิน บจก.มณียา)',
      receivedOrPaidDate: '2026-09-20',
    },
    createdAt: '2026-09-20T11:30:00.000Z',
    updatedAt: '2026-09-20T11:30:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-007',
    voucherNo: 'RV-202601-001',
    type: 'RV',
    date: '2026-01-25',
    referenceNo: 'INV-AP-69010',
    contact: {
      name: 'บริษัท ที.เจ. ทรานสปอร์ต แอนด์ ชิปปิ้ง จำกัด',
      taxId: '0105556019941',
      address: '77/12 ถ.พระราม 3 แขวงบางโพงพาง เขตยานนาวา กรุงเทพฯ 10120',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-682-3400',
      contactPerson: 'คุณทิวาพร (ฝ่ายการเงิน)',
    },
    items: [
      {
        id: 'item-7',
        description: 'รายได้ค่าบริการจัดทำบัญชีรายเดือน มกราคม 2569',
        accountCategory: 'รายได้ค่าบริการทำบัญชี',
        baseAmount: 18000,
        vatRate: 7,
        vatAmount: 1260,
        whtRate: 3,
        whtAmount: 540,
        netAmount: 18720,
      },
    ],
    subtotal: 18000,
    totalVat: 1260,
    totalWht: 540,
    netPayable: 18720,
    thaiBahtText: convertToThaiBahtText(18720),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-01-25',
      transferRef: 'TRF-SCB-690125',
    },
    notes: 'ค่าทำบัญชีรายเดือนมกราคม ได้รับหนังสือรับรองหัก ณ ที่จ่าย 3% เรียบร้อยแล้ว',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-01-25',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-01-25',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-01-25',
      receivedOrPaidBy: 'คุณทิวาพร (ฝ่ายการเงิน)',
      receivedOrPaidDate: '2026-01-25',
    },
    createdAt: '2026-01-25T10:00:00.000Z',
    updatedAt: '2026-01-25T10:00:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-008',
    voucherNo: 'RV-202603-001',
    type: 'RV',
    date: '2026-03-28',
    referenceNo: 'INV-AP-69022',
    contact: {
      name: 'บริษัท เจริญโภคภัณฑ์ฟู๊ดส์ เทรดดิ้ง จำกัด',
      taxId: '0105557088921',
      address: '313 อาคาร ซี.พี. ทาวเวอร์ ชั้น 19 ถ.สีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-766-8000',
      contactPerson: 'คุณวิทวัส (ผู้จัดการฝ่ายบัญชี)',
    },
    items: [
      {
        id: 'item-8',
        description: 'รายได้ค่าบริการตรวจสอบบัญชีงวดประจำปี 2568 (งวดสิ้นสุด 31 ธ.ค. 2568)',
        accountCategory: 'รายได้ค่าบริการตรวจสอบบัญชี',
        baseAmount: 120000,
        vatRate: 7,
        vatAmount: 8400,
        whtRate: 3,
        whtAmount: 3600,
        netAmount: 124800,
      },
    ],
    subtotal: 120000,
    totalVat: 8400,
    totalWht: 3600,
    netPayable: 124800,
    thaiBahtText: convertToThaiBahtText(124800),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-03-28',
      transferRef: 'TRF-SCB-690328',
    },
    notes: 'รับชำระค่าสอบบัญชีปิดงบประจำปี ได้รับหนังสือรับรองหักภาษี 50 ทวิ',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-03-28',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-03-28',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-03-28',
      receivedOrPaidBy: 'คุณวิทวัส',
      receivedOrPaidDate: '2026-03-28',
    },
    createdAt: '2026-03-28T14:30:00.000Z',
    updatedAt: '2026-03-28T14:30:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-009',
    voucherNo: 'RV-202605-001',
    type: 'RV',
    date: '2026-05-18',
    referenceNo: 'INV-AP-69038',
    contact: {
      name: 'บริษัท พัฒนาการ รีเทล เอ็กซ์เพรส จำกัด',
      taxId: '0105559033418',
      address: '422 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ 10250',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-320-1900',
      contactPerson: 'คุณอารีย์ (ฝ่ายการเงิน)',
    },
    items: [
      {
        id: 'item-9',
        description: 'รายได้ค่าบริการตรวจสอบบัญชีงวดปิดงบยื่น ภ.ง.ด.50 ประจำปี 2568',
        accountCategory: 'รายได้ค่าบริการตรวจสอบบัญชี',
        baseAmount: 85000,
        vatRate: 7,
        vatAmount: 5950,
        whtRate: 3,
        whtAmount: 2550,
        netAmount: 88400,
      },
    ],
    subtotal: 85000,
    totalVat: 5950,
    totalWht: 2550,
    netPayable: 88400,
    thaiBahtText: convertToThaiBahtText(88400),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-05-18',
      transferRef: 'TRF-SCB-690518',
    },
    notes: 'ชำระค่าบริการตรวจสอบบัญชีงวดพฤษภาคม 2569 ครบถ้วน (ยกเลิกเพื่อออกฉบับแก้ไข)',
    status: 'ยกเลิก (Cancelled)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-05-18',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-05-18',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-05-18',
      receivedOrPaidBy: 'คุณอารีย์',
      receivedOrPaidDate: '2026-05-18',
    },
    createdAt: '2026-05-18T11:00:00.000Z',
    updatedAt: '2026-05-18T11:00:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-010',
    voucherNo: 'RV-202606-001',
    type: 'RV',
    date: '2026-06-22',
    referenceNo: 'INV-AP-69045',
    contact: {
      name: 'บริษัท เอเชีย โกลบอล อินเตอร์เทรด จำกัด',
      taxId: '0105558023194',
      address: '183 อาคารรีเจ้นท์เฮ้าส์ ชั้น 8 ถนนราชดำริ แขวงลุมพินี เขตปทุมวัน กรุงเทพฯ 10330',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-251-8840',
      contactPerson: 'คุณกิตติศักดิ์',
    },
    items: [
      {
        id: 'item-10',
        description: 'รายได้ค่าบริการที่ปรึกษาวางระบบภาษีอากรและสินค้าคงเหลือ',
        accountCategory: 'รายได้ค่าบริการอื่นๆ',
        baseAmount: 45000,
        vatRate: 7,
        vatAmount: 3150,
        whtRate: 3,
        whtAmount: 1350,
        netAmount: 46800,
      },
    ],
    subtotal: 45000,
    totalVat: 3150,
    totalWht: 1350,
    netPayable: 46800,
    thaiBahtText: convertToThaiBahtText(46800),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-06-22',
      transferRef: 'TRF-SCB-690622',
    },
    notes: 'ค่าที่ปรึกษาภาษีอากรไตรมาส 2 ได้รับหนังสือหักภาษี ณ ที่จ่าย 3%',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-06-22',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-06-22',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-06-22',
      receivedOrPaidBy: 'คุณกิตติศักดิ์',
      receivedOrPaidDate: '2026-06-22',
    },
    createdAt: '2026-06-22T09:15:00.000Z',
    updatedAt: '2026-06-22T09:15:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-011',
    voucherNo: 'RV-202607-001',
    type: 'RV',
    date: '2026-07-15',
    referenceNo: 'INV-AP-69055',
    contact: {
      name: 'ห้างหุ้นส่วนจำกัด อุดมสุข ซัพพลาย แอนด์ เซอร์วิส',
      taxId: '0103557014498',
      address: '142 ถนนอุดมสุข แขวงหนองบอน เขตประเวศ กรุงเทพฯ 10250',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-748-9100',
      contactPerson: 'คุณสมพร (หุ้นส่วนผู้จัดการ)',
    },
    items: [
      {
        id: 'item-11',
        description: 'รายได้ค่าทำบัญชีและยื่นภาษีประจำไตรมาส 2/2569',
        accountCategory: 'รายได้ค่าบริการทำบัญชี',
        baseAmount: 24000,
        vatRate: 7,
        vatAmount: 1680,
        whtRate: 3,
        whtAmount: 720,
        netAmount: 24960,
      },
    ],
    subtotal: 24000,
    totalVat: 1680,
    totalWht: 720,
    netPayable: 24960,
    thaiBahtText: convertToThaiBahtText(24960),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-07-15',
      transferRef: 'TRF-SCB-690715',
    },
    notes: 'รับชำระค่าทำบัญชีไตรมาส 2',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-07-15',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-07-15',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-07-15',
      receivedOrPaidBy: 'คุณสมพร',
      receivedOrPaidDate: '2026-07-15',
    },
    createdAt: '2026-07-15T15:00:00.000Z',
    updatedAt: '2026-07-15T15:00:00.000Z',
    source: 'Manual',
  },
  {
    id: 'VOUCHER-012',
    voucherNo: 'RV-202608-001',
    type: 'RV',
    date: '2026-08-20',
    referenceNo: 'INV-AP-69062',
    contact: {
      name: 'บริษัท ไทย เทคโนโลยี เมดิคอล จำกัด',
      taxId: '0105556094321',
      address: '252 อาคารเอสพีอี ทาวเวอร์ ชั้น 11 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400',
      branch: 'สำนักงานใหญ่',
      branchCode: '00000',
      phone: '02-615-5200',
      contactPerson: 'คุณภาณุพงศ์ (ผู้อำนวยการฝ่ายการเงิน)',
    },
    items: [
      {
        id: 'item-12',
        description: 'รายได้ค่าบริการสอบทานงบการเงินระหว่างกาล ไตรมาส 2/2569',
        accountCategory: 'รายได้ค่าบริการตรวจสอบบัญชี',
        baseAmount: 60000,
        vatRate: 7,
        vatAmount: 4200,
        whtRate: 3,
        whtAmount: 1800,
        netAmount: 62400,
      },
    ],
    subtotal: 60000,
    totalVat: 4200,
    totalWht: 1800,
    netPayable: 62400,
    thaiBahtText: convertToThaiBahtText(62400),
    payment: {
      method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '082-248912-3',
      accountName: 'บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด',
      paymentDate: '2026-08-20',
      transferRef: 'TRF-SCB-690820',
    },
    notes: 'รับเงินโอนค่าสอบทานงบระหว่างกาล หัก 3% ตามระเบียบกรมสรรพากร',
    status: 'ชำระแล้ว (Completed)',
    signatures: {
      preparedBy: 'น.ส. ธนพร บัญชีดี',
      preparedDate: '2026-08-20',
      checkedBy: 'นาย วิศิษฏ์ ตรวจการ',
      checkedDate: '2026-08-20',
      approvedBy: 'นาย เกียรติศักดิ์ บริหารทรัพย์',
      approvedDate: '2026-08-20',
      receivedOrPaidBy: 'คุณภาณุพงศ์',
      receivedOrPaidDate: '2026-08-20',
    },
    createdAt: '2026-08-20T13:40:00.000Z',
    updatedAt: '2026-08-20T13:40:00.000Z',
    source: 'Manual',
  },
];

const STORAGE_KEYS = {
  SETTINGS: 'account_planet_settings',
  VOUCHERS: 'account_planet_vouchers',
  SHEET_CONFIG: 'account_planet_sheet_config',
  SAMPLE_DATA_ENABLED: 'account_planet_sample_data_enabled',
};

export const SAMPLE_VOUCHER_IDS = new Set([
  'VOUCHER-001',
  'VOUCHER-002',
  'VOUCHER-003',
  'VOUCHER-004',
  'VOUCHER-005',
  'VOUCHER-006',
  'VOUCHER-007',
  'VOUCHER-008',
  'VOUCHER-009',
  'VOUCHER-010',
  'VOUCHER-011',
  'VOUCHER-012',
]);

/**
 * Check whether a voucher is sample/mock data.
 */
export function isSampleVoucher(voucher: Voucher): boolean {
  if (voucher.isSample === true) return true;
  if (SAMPLE_VOUCHER_IDS.has(voucher.id)) return true;
  return false;
}

/**
 * Check whether sample data mode is currently enabled in settings.
 */
export function isSampleDataEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEYS.SAMPLE_DATA_ENABLED);
    if (val !== null) {
      return val === 'true';
    }
  } catch (e) {
    console.warn('Error reading sample data preference:', e);
  }
  return true;
}

/**
 * Save preference for sample data enablement.
 */
export function setSampleDataEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SAMPLE_DATA_ENABLED, enabled ? 'true' : 'false');
    }
  } catch (e) {
    console.error('Error saving sample data preference:', e);
  }
}

/**
 * Toggle sample data on or off.
 * When disabled: removes all sample vouchers, leaving only user's real business data (or empty array).
 * When enabled: merges the default sample vouchers into the list without overwriting real vouchers.
 */
export function toggleSampleData(enable: boolean, currentVouchers: Voucher[]): Voucher[] {
  setSampleDataEnabled(enable);
  if (!enable) {
    const realOnly = currentVouchers.filter((v) => !isSampleVoucher(v));
    saveVouchers(realOnly);
    return realOnly;
  } else {
    const existingIds = new Set(currentVouchers.map((v) => v.id));
    const samplesToAdd = INITIAL_VOUCHERS.map((v) => ({ ...v, isSample: true })).filter(
      (v) => !existingIds.has(v.id)
    );
    const combined = [...samplesToAdd, ...currentVouchers];
    saveVouchers(combined);
    return combined;
  }
}

/**
 * Remove all sample vouchers from storage, keeping real business vouchers intact.
 */
export function removeSampleVouchers(currentVouchers: Voucher[]): Voucher[] {
  setSampleDataEnabled(false);
  const realOnly = currentVouchers.filter((v) => !isSampleVoucher(v));
  saveVouchers(realOnly);
  return realOnly;
}

/**
 * Clear all vouchers entirely (both sample and real) to start 100% clean.
 */
export function clearAllVouchers(): Voucher[] {
  setSampleDataEnabled(false);
  saveVouchers([]);
  return [];
}

export function getStoredCompanySettings(): CompanySettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed: CompanySettings = JSON.parse(data);
      let modified = false;
      if (!parsed.logoUrl || parsed.logoUrl.trim() === '') {
        parsed.logoUrl = '/account-planet-logo.svg';
        modified = true;
      }
      if (!parsed.companyStampUrl || parsed.companyStampUrl.trim() === '') {
        parsed.companyStampUrl = '/stamps/company_stamp.svg';
        modified = true;
      }
      if (!parsed.payerSignatureUrl || parsed.payerSignatureUrl.trim() === '') {
        parsed.payerSignatureUrl = '/signatures/sign_aphiwatch.svg';
        modified = true;
      }
      if (!parsed.payerName || parsed.payerName.trim() === '') {
        parsed.payerName = 'นายอภิวัฒน์';
        modified = true;
      }
      if (!parsed.accountCategories || !Array.isArray(parsed.accountCategories) || parsed.accountCategories.length === 0) {
        parsed.accountCategories = [...(DEFAULT_COMPANY_SETTINGS.accountCategories || [])];
        modified = true;
      } else {
        // Clean up old "ส่วนต่างค่าสอบบัญชี" from category list
        const hasOldCat = parsed.accountCategories.some((c) => c.includes('ส่วนต่างค่าสอบบัญชี'));
        if (hasOldCat) {
          parsed.accountCategories = parsed.accountCategories.map((c) =>
            c.includes('ส่วนต่างค่าสอบบัญชี') ? 'ค่าบริการตรวจสอบบัญชี' : c
          );
          modified = true;
        }
      }
      if (!parsed.auditors || !Array.isArray(parsed.auditors) || parsed.auditors.length === 0) {
        parsed.auditors = [...(DEFAULT_COMPANY_SETTINGS.auditors || [])];
        modified = true;
      }
      if (!parsed.jobClients || !Array.isArray(parsed.jobClients) || parsed.jobClients.length === 0) {
        parsed.jobClients = [...(DEFAULT_COMPANY_SETTINGS.jobClients || [])];
        modified = true;
      }
      if (!parsed.runningNumberConfig) {
        parsed.runningNumberConfig = { ...DEFAULT_COMPANY_SETTINGS.runningNumberConfig! };
        modified = true;
      }
      if (!parsed.googleDriveFolderUrl) {
        parsed.googleDriveFolderUrl = DEFAULT_COMPANY_SETTINGS.googleDriveFolderUrl;
        modified = true;
      }
      if (!parsed.securityConfig) {
        parsed.securityConfig = { ...DEFAULT_COMPANY_SETTINGS.securityConfig! };
        modified = true;
      } else {
        // Upgrade legacy default '1234' to new default '820820'
        if (parsed.securityConfig.adminPin === '1234') {
          parsed.securityConfig.adminPin = '820820';
          modified = true;
        }
        if (parsed.securityConfig.userAccounts && Array.isArray(parsed.securityConfig.userAccounts)) {
          parsed.securityConfig.userAccounts = parsed.securityConfig.userAccounts.map((u) => {
            if ((u.id === 'user-admin' || u.username === 'admin' || u.role === 'admin') && u.pinOrPassword === '1234') {
              modified = true;
              return { ...u, pinOrPassword: '820820' };
            }
            return u;
          });
        }
      }
      if (parsed.banks && Array.isArray(parsed.banks)) {
        parsed.banks = parsed.banks.map((b, idx) => ({
          ...b,
          accountType: b.accountType || (idx === 0 ? 'receiving' : 'disbursing'),
          promptPayId: b.promptPayId || (idx === 0 ? parsed.taxId : undefined),
        }));
      }
      if (modified) {
        saveCompanySettings(parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading stored settings:', e);
  }
  return DEFAULT_COMPANY_SETTINGS;
}

export function saveCompanySettings(settings: CompanySettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export function getStoredVouchers(): Voucher[] {
  const sampleEnabled = isSampleDataEnabled();
  try {
    const data = localStorage.getItem(STORAGE_KEYS.VOUCHERS);
    if (data !== null) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        let modified = false;

        // Clean up and mark sample flags
        let updated = parsed.map((v: Voucher) => {
          let vMod = false;
          let newV = { ...v };

          const isSample = isSampleVoucher(newV);
          if (newV.isSample !== isSample) {
            newV.isSample = isSample;
            vMod = true;
          }

          if (v.id === 'VOUCHER-001' && !v.jobNo) {
            newV.jobNo = '70001';
            vMod = true;
          }
          if (v.id === 'VOUCHER-002' && !v.jobNo) {
            newV.jobNo = '70001';
            vMod = true;
          }

          if (newV.notes && newV.notes.includes('ส่วนต่างค่าสอบบัญชี')) {
            newV.notes = newV.notes.replace(/ค่าส่วนต่างค่าสอบบัญชี(\s*\(?40%\)?)?/g, 'ค่าบริการตรวจสอบบัญชี').replace(/ส่วนต่างค่าสอบบัญชี(\s*\(?40%\)?)?/g, 'ค่าบริการตรวจสอบบัญชี');
            vMod = true;
          }

          if (newV.items && Array.isArray(newV.items)) {
            const cleanedItems = newV.items.map((item) => {
              let iMod = false;
              let desc = item.description;
              let cat = item.accountCategory;
              if (desc && desc.includes('ส่วนต่างค่าสอบบัญชี')) {
                desc = desc.replace(/ค่าส่วนต่างค่าสอบบัญชี(\s*\(40%\))?/g, 'ค่าบริการตรวจสอบบัญชี').replace(/ส่วนต่างค่าสอบบัญชี(\s*\(40%\))?/g, 'ค่าบริการตรวจสอบบัญชี');
                iMod = true;
              }
              if (cat && cat.includes('ส่วนต่างค่าสอบบัญชี')) {
                cat = 'ค่าบริการตรวจสอบบัญชี';
                iMod = true;
              }
              if (item.marginAmount || item.marginPercent) {
                iMod = true;
              }
              if (iMod) {
                return {
                  ...item,
                  description: desc,
                  accountCategory: cat,
                  marginAmount: undefined,
                  marginPercent: undefined,
                };
              }
              return item;
            });
            newV.items = cleanedItems;
          }

          if (vMod) {
            modified = true;
          }
          return newV;
        });

        // If sample data is disabled, ensure no sample vouchers are returned
        if (!sampleEnabled) {
          const nonSamples = updated.filter((v) => !isSampleVoucher(v));
          if (nonSamples.length !== updated.length) {
            saveVouchers(nonSamples);
            return nonSamples;
          }
        }

        if (modified) {
          saveVouchers(updated);
        }
        return updated;
      }
    }
  } catch (e) {
    console.warn('Error reading stored vouchers:', e);
  }

  // First time initialization
  if (sampleEnabled) {
    const initialWithFlag = INITIAL_VOUCHERS.map((v) => ({ ...v, isSample: true }));
    saveVouchers(initialWithFlag);
    return initialWithFlag;
  }

  // System configured without sample data: start completely empty
  saveVouchers([]);
  return [];
}

export function saveVouchers(vouchers: Voucher[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(vouchers));
    // Asynchronously back up to IndexedDB for dual persistence
    saveBackupToIndexedDb(vouchers, undefined, 'auto').catch((err) => {
      console.warn('Background IndexedDB backup warning:', err);
    });
  } catch (e) {
    console.error('Error saving vouchers:', e);
  }
}

export function getStoredSheetConfig(): GoogleSheetSyncConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Error reading sheet config:', e);
  }
  return DEFAULT_SHEET_CONFIG;
}

export function saveSheetConfig(config: GoogleSheetSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving sheet config:', e);
  }
}
