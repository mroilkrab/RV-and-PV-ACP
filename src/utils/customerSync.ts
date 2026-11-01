import { Customer, CustomerSheetSyncConfig } from '../types';
import { parseCSV } from './googleSheetSync';
import { ACP_CUSTOMERS_MASTER_LIST, RAW_ACP_CUSTOMERS_CSV } from '../data/acpCustomerData';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

export const CUSTOMER_STORAGE_KEY = 'account_planet_customers';
export const CUSTOMER_SHEET_CONFIG_KEY = 'account_planet_customer_sheet_config';

// 208 Authentic ACP Master Clients from ACP-0001 to ACP-0208
export const DEFAULT_CUSTOMERS: Customer[] = ACP_CUSTOMERS_MASTER_LIST;

export const DEFAULT_CUSTOMER_SHEET_CONFIG: CustomerSheetSyncConfig = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  autoSync: false,
  status: 'idle',
  statusMessage: 'พร้อมดึงข้อมูลรายชื่อลูกค้าจาก Google Sheets (208 บริษัทในฐานข้อมูลหลัก)',
};

/**
 * Get stored customers from LocalStorage
 * Automatically merges/upgrades to the full 208 ACP Master list if local storage only has legacy placeholder data
 */
export function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If stored data has fewer than 100 entries, merge with the full 208 ACP master list
        if (parsed.length < 100) {
          const merged = mergeCustomers(ACP_CUSTOMERS_MASTER_LIST, parsed);
          saveCustomers(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[CustomerSync] Failed to read stored customers:', e);
  }
  // Default to the full 208 ACP Master list
  saveCustomers(DEFAULT_CUSTOMERS);
  return DEFAULT_CUSTOMERS;
}

/**
 * Save customers to LocalStorage
 */
export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
  } catch (e) {
    console.warn('[CustomerSync] Failed to save customers to localStorage:', e);
  }
}

/**
 * Reset/Reload the full original 208 ACP Master customer list
 */
export function reloadAcpMasterCustomers(): Customer[] {
  const list = [...ACP_CUSTOMERS_MASTER_LIST];
  saveCustomers(list);
  return list;
}

/**
 * Get customer sheet sync configuration
 */
export function getStoredCustomerSheetConfig(): CustomerSheetSyncConfig {
  try {
    const raw = localStorage.getItem(CUSTOMER_SHEET_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_CUSTOMER_SHEET_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('[CustomerSync] Failed to read sheet config:', e);
  }
  return DEFAULT_CUSTOMER_SHEET_CONFIG;
}

/**
 * Save customer sheet sync configuration
 */
export function saveCustomerSheetConfig(config: CustomerSheetSyncConfig): void {
  try {
    localStorage.setItem(CUSTOMER_SHEET_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[CustomerSync] Failed to save sheet config:', e);
  }
}

/**
 * Cleans string tax ID into standard 13-digit format
 */
export function cleanTaxId(str: string | undefined | null): string {
  if (!str) return '';
  const digitsOnly = String(str).replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 13) {
    return digitsOnly.slice(0, 13);
  }
  return digitsOnly || String(str).trim();
}

/**
 * Format 13-digit tax ID with hyphens: x-xxxx-xxxxx-xx-x
 */
export function formatTaxIdWithHyphens(taxId: string): string {
  const digits = cleanTaxId(taxId);
  if (digits.length === 13) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12, 13)}`;
  }
  return taxId || '-';
}

/**
 * Parse raw CSV or 2D string array into Customer[]
 * Handles multiple Thai and English header variations including customerCode and assignedStaff
 */
export function parseCSVToCustomers(csvTextOrRows: string | string[][]): Customer[] {
  let rows: string[][] = [];
  if (typeof csvTextOrRows === 'string') {
    rows = parseCSV(csvTextOrRows);
  } else {
    rows = csvTextOrRows;
  }

  if (!rows || rows.length === 0) return [];

  // 1. Detect header row by scanning first 10 rows
  let headerRowIndex = -1;
  let headers: string[] = [];

  const nameKeywords = ['ชื่อบริษัท', 'ชื่อลูกค้า', 'บริษัท', 'ลูกค้า', 'companyname', 'customername', 'company', 'customer'];
  const taxKeywords = ['เลขทะเบียนนิติบุคคล', 'เลขนิติบุคคล', 'เลขผู้เสียภาษี', 'เลขประจำตัวผู้เสียภาษี', 'ทะเบียนนิติบุคคล', 'taxid', 'regno', 'taxno', 'registrationnumber'];
  const addressKeywords = ['ที่อยู่ตามภพ20', 'ที่อยู่สำนักงาน', 'ที่อยู่บริษัท', 'ที่อยู่', 'address', 'location'];
  const codeKeywords = ['รหัสลูกค้า', 'รหัส', 'code', 'customercode', 'custcode'];

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const candidate = (rows[i] || []).map((h) => String(h || '').toLowerCase().trim().replace(/[\s\-_.]+/g, ''));
    let matches = 0;
    if (candidate.some((c) => nameKeywords.some((k) => c.includes(k.replace(/[\s\-_.]+/g, ''))))) matches++;
    if (candidate.some((c) => taxKeywords.some((k) => c.includes(k.replace(/[\s\-_.]+/g, ''))))) matches++;
    if (candidate.some((c) => addressKeywords.some((k) => c.includes(k.replace(/[\s\-_.]+/g, ''))))) matches++;
    if (candidate.some((c) => codeKeywords.some((k) => c.includes(k.replace(/[\s\-_.]+/g, ''))))) matches++;
    if (matches >= 2) {
      headerRowIndex = i;
      headers = candidate;
      break;
    }
  }

  // If no header row was detected by keywords, default to row 0
  if (headerRowIndex === -1 && rows.length > 0) {
    headerRowIndex = 0;
    headers = (rows[0] || []).map((h) => String(h || '').toLowerCase().trim().replace(/[\s\-_.]+/g, ''));
  }

  const findCol = (keywords: string[]): number => {
    return headers.findIndex((h) => 
      keywords.some((k) => h.includes(k.toLowerCase().replace(/[\s\-_.]+/g, '')))
    );
  };

  let idxCode = findCol(['รหัสลูกค้า', 'รหัส', 'code', 'customercode', 'custcode', 'id']);
  let idxName = findCol(['ชื่อบริษัท', 'ชื่อลูกค้า', 'บริษัท', 'ลูกค้า', 'ชื่อ', 'customername', 'companyname', 'company', 'customer', 'name']);
  let idxTaxId = findCol(['เลขทะเบียนนิติบุคคล', 'เลขนิติบุคคล', 'เลขผู้เสียภาษี', 'เลขประจำตัวผู้เสียภาษี', 'ทะเบียนนิติบุคคล', 'taxid', 'regno', 'taxno', 'registrationnumber', 'tax']);
  let idxAddress = findCol(['ที่อยู่ตามภพ20', 'ที่อยู่สำนักงาน', 'ที่อยู่บริษัท', 'ที่อยู่', 'address', 'officeaddress', 'location']);
  let idxStaff = findCol(['ผู้ส่งงาน', 'พนักงานผู้รับผิดชอบ', 'ผู้รับผิดชอบ', 'ผู้ส่ง', 'staff', 'assignedstaff', 'pic']);
  let idxBranch = findCol(['สาขา', 'branch', 'สำนักงาน']);
  let idxBranchCode = findCol(['รหัสสาขา', 'branchcode']);
  let idxPhone = findCol(['เบอร์โทร', 'เบอร์โทรศัพท์', 'โทรศัพท์', 'โทร', 'phone', 'tel', 'mobile', 'telephone']);
  let idxEmail = findCol(['อีเมล', 'email', 'e-mail', 'mail']);
  let idxContactPerson = findCol(['ผู้ติดต่อ', 'ชื่อผู้ติดต่อ', 'ติดต่อ', 'contactperson', 'contact', 'attn']);

  // If idxName wasn't found by header text, intelligently deduce columns from data rows!
  if (idxName === -1 && rows.length > headerRowIndex + 1) {
    const sampleRows = rows.slice(headerRowIndex + 1, headerRowIndex + 6);
    const colCount = rows[headerRowIndex]?.length || 0;
    for (let c = 0; c < colCount; c++) {
      const colValues = sampleRows.map((r) => String(r[c] || '').trim());
      if (idxName === -1 && colValues.some((v) => v.includes('บริษัท') || v.includes('บจก') || v.includes('หจก') || v.includes('บมจ') || v.includes('ห้างหุ้นส่วน'))) {
        idxName = c;
      }
      if (idxTaxId === -1 && colValues.some((v) => cleanTaxId(v).length === 13)) {
        idxTaxId = c;
      }
      if (idxAddress === -1 && colValues.some((v) => v.includes('ตำบล') || v.includes('อำเภอ') || v.includes('จังหวัด') || v.includes('แขวง') || v.includes('เขต') || v.includes('ถนน') || v.includes('ซอย') || v.includes('หมู่'))) {
        idxAddress = c;
      }
      if (idxCode === -1 && colValues.some((v) => /^ACP-\d+/i.test(v))) {
        idxCode = c;
      }
    }
    if (idxName === -1) idxName = colCount > 1 ? 1 : 0;
  }

  const customers: Customer[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => !c || String(c).trim() === '')) continue;

    const rawCode = idxCode !== -1 && row[idxCode] ? String(row[idxCode]).trim() : '';
    const rawName = idxName !== -1 && row[idxName] ? String(row[idxName]).trim() : '';
    const rawTaxId = idxTaxId !== -1 && row[idxTaxId] ? cleanTaxId(row[idxTaxId]) : '';
    const rawAddress = idxAddress !== -1 && row[idxAddress] ? String(row[idxAddress]).trim() : '';
    const rawStaff = idxStaff !== -1 && row[idxStaff] ? String(row[idxStaff]).trim() : '';

    // Must have at least a company name or tax ID or customer code
    if (!rawName && !rawTaxId && !rawCode) continue;
    if (!rawName) continue;

    const codeVal = rawCode || `ACP-${String(r).padStart(4, '0')}`;
    const branchVal = idxBranch !== -1 && row[idxBranch] ? String(row[idxBranch]).trim() : 'สำนักงานใหญ่';
    const branchCodeVal = idxBranchCode !== -1 && row[idxBranchCode] ? String(row[idxBranchCode]).trim() : '00000';
    const phoneVal = idxPhone !== -1 && row[idxPhone] ? String(row[idxPhone]).trim() : '';
    const emailVal = idxEmail !== -1 && row[idxEmail] ? String(row[idxEmail]).trim() : '';
    const contactPersonVal = idxContactPerson !== -1 && row[idxContactPerson] ? String(row[idxContactPerson]).trim() : '';

    const customer: Customer = {
      id: codeVal || `CUST-SHEET-${Date.now()}-${r}`,
      customerCode: codeVal,
      name: rawName,
      taxId: rawTaxId || '',
      address: rawAddress || 'กรุงเทพมหานคร',
      branch: branchVal,
      branchCode: branchCodeVal,
      assignedStaff: rawStaff || undefined,
      phone: phoneVal || undefined,
      email: emailVal || undefined,
      contactPerson: contactPersonVal || undefined,
      source: 'GoogleSheet',
      updatedAt: new Date().toISOString(),
    };

    customers.push(customer);
  }

  return customers;
}

/**
 * Fetch Live Google Sheet Customers via server-side proxy
 */
export async function fetchLiveGoogleSheetCustomers(sheetUrl: string, sheetName?: string): Promise<{
  success: boolean;
  customers?: Customer[];
  error?: string;
  count?: number;
}> {
  try {
    if (!sheetUrl || !sheetUrl.trim()) {
      return { success: false, error: 'กรุณาระบุลิงก์ Google Sheets' };
    }

    const params = new URLSearchParams();
    params.append('url', sheetUrl.trim());
    if (sheetName) params.append('sheetName', sheetName.trim());

    // 1. Fetch via Express server proxy to prevent CORS issues
    const proxyUrl = `/api/sheets/fetch?${params.toString()}`;
    let response = await fetch(proxyUrl);

    // 2. Client-side fallback if server returns non-ok
    if (!response.ok && sheetUrl.includes('/spreadsheets/d/')) {
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        let directUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
        if (sheetName) directUrl += `&sheet=${encodeURIComponent(sheetName)}`;
        const directResp = await fetch(directUrl);
        if (directResp.ok) {
          response = directResp;
        }
      }
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `ไม่สามารถดึงข้อมูล Google Sheet ได้ (HTTP ${response.status}) กรุณาตรวจสอบการแชร์ชีต (ต้องตั้งเป็น Anyone with link can view)`);
    }

    const csvText = await response.text();
    const customers = parseCSVToCustomers(csvText);

    if (customers.length === 0) {
      return {
        success: false,
        error: 'ไม่พบข้อมูลลูกค้าในชีต กรุณาตรวจสอบว่าชีตมีแถวหัวตาราง (ชื่อบริษัท, เลขประจำตัวผู้เสียภาษี, ที่อยู่) และมีข้อมูลอย่างน้อย 1 รายการ',
      };
    }

    return {
      success: true,
      customers,
      count: customers.length,
    };
  } catch (err: any) {
    console.error('[CustomerSync] Fetch error:', err);
    return {
      success: false,
      error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets',
    };
  }
}

/**
 * Search customers in memory by query
 * Supports matching Customer Code (e.g. ACP-0001, 0001), Company Name, Tax ID, Address, Assigned Staff
 */
export function searchCustomers(customers: Customer[], query: string): Customer[] {
  if (!query || !query.trim()) return customers;
  const qClean = query.trim().toLowerCase();
  const qDigits = qClean.replace(/[^0-9]/g, '');

  return customers.filter((c) => {
    // 1. Customer Code (e.g. ACP-0001, 0001)
    const matchCode = c.customerCode ? c.customerCode.toLowerCase().includes(qClean) : false;
    
    // 2. Company Name
    const matchName = c.name.toLowerCase().includes(qClean);

    // 3. Tax ID (supports with and without hyphens)
    let matchTax = false;
    if (c.taxId) {
      const taxDigits = c.taxId.replace(/[^0-9]/g, '');
      if (qDigits && taxDigits.includes(qDigits)) {
        matchTax = true;
      } else if (c.taxId.toLowerCase().includes(qClean)) {
        matchTax = true;
      }
    }

    // 4. Address
    const matchAddress = c.address.toLowerCase().includes(qClean);

    // 5. Assigned Staff (e.g. ปุ๋ย, ซุ่น, จอย, เครือบ้านขนิษฐา)
    const matchStaff = c.assignedStaff ? c.assignedStaff.toLowerCase().includes(qClean) : false;

    // 6. Contact person or Phone
    const matchContact = c.contactPerson ? c.contactPerson.toLowerCase().includes(qClean) : false;
    const matchPhone = c.phone ? c.phone.includes(qClean) : false;

    return matchCode || matchName || matchTax || matchAddress || matchStaff || matchContact || matchPhone;
  });
}

/**
 * Merge newly synced customers with existing ones (avoiding duplicates based on code, taxId or name)
 */
export function mergeCustomers(existing: Customer[], incoming: Customer[]): Customer[] {
  const map = new Map<string, Customer>();

  const makeKey = (c: Customer) => {
    if (c.customerCode && c.customerCode.startsWith('ACP-')) {
      return `code_${c.customerCode.trim().toUpperCase()}`;
    }
    const tax = cleanTaxId(c.taxId);
    if (tax && tax.length >= 10 && tax !== '0105500000000') {
      return `tax_${tax}`;
    }
    return `name_${c.name.trim().toLowerCase().replace(/\s+/g, '')}`;
  };

  // Add existing
  for (const c of existing) {
    map.set(makeKey(c), c);
  }

  // Merge incoming (incoming overrides existing fields)
  for (const inc of incoming) {
    const key = makeKey(inc);
    if (map.has(key)) {
      const prev = map.get(key)!;
      map.set(key, {
        ...prev,
        ...inc,
        id: prev.id || inc.id,
        customerCode: inc.customerCode || prev.customerCode,
        assignedStaff: inc.assignedStaff || prev.assignedStaff,
        updatedAt: new Date().toISOString(),
      });
    } else {
      map.set(key, inc);
    }
  }

  // Sort by customerCode if present, otherwise by name
  return Array.from(map.values()).sort((a, b) => {
    if (a.customerCode && b.customerCode) {
      return a.customerCode.localeCompare(b.customerCode);
    }
    return a.name.localeCompare(b.name, 'th');
  });
}

/**
 * Download Customer List as formatted Excel file (.xlsx)
 */
export function downloadCustomersAsExcel(customers: Customer[]): void {
  const exportData = customers.map((c, i) => ({
    'ลำดับ': i + 1,
    'รหัสลูกค้า': c.customerCode || `ACP-${String(i + 1).padStart(4, '0')}`,
    'ชื่อบริษัท/ชื่อลูกค้า': c.name,
    'เลขทะเบียนนิติบุคคล (13 หลัก)': c.taxId ? formatTaxIdWithHyphens(c.taxId) : '-',
    'ที่อยู่สำนักงาน/ภ.พ.20': c.address,
    'ผู้ส่งงาน (พนักงานผู้รับผิดชอบ)': c.assignedStaff || '-',
    'สาขา': c.branch || 'สำนักงานใหญ่',
    'เบอร์โทรศัพท์': c.phone || '-',
    'อีเมล': c.email || '-',
    'ผู้ติดต่อ': c.contactPerson || '-',
    'แหล่งที่มา': c.source || 'ระบบ',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  // Auto-width columns
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 38 },
    { wch: 22 },
    { wch: 60 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อลูกค้า ACP');
  XLSX.writeFile(wb, `ACP_Customer_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Download Customer List as clean CSV with UTF-8 BOM for Microsoft Excel Thai compatibility
 */
export function downloadCustomersAsCsv(customers: Customer[]): void {
  const headers = ['รหัสลูกค้า', 'ชื่อบริษัท', 'เลขทะเบียนนิติบุคคล/เลขผู้เสียภาษี', 'ที่อยู่', 'ผู้ส่งงาน (พนักงานผู้รับผิดชอบ)', 'เบอร์โทร', 'อีเมล', 'สาขา'];
  
  const escapeCell = (val: string | undefined | null) => {
    if (!val) return '';
    const str = String(val).replace(/"/g, '""');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str}"`;
    }
    return str;
  };

  const rows = customers.map((c) => [
    escapeCell(c.customerCode),
    escapeCell(c.name),
    escapeCell(c.taxId),
    escapeCell(c.address),
    escapeCell(c.assignedStaff),
    escapeCell(c.phone),
    escapeCell(c.email),
    escapeCell(c.branch || 'สำนักงานใหญ่'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  
  // Prepend UTF-8 BOM \uFEFF so Excel opens Thai characters without encoding errors
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ACP_Customer_Directory_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download Customer List as JSON backup file
 */
export function downloadCustomersAsJson(customers: Customer[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customers, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `ACP_Customer_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Firebase Firestore customer real-time synchronization
 */
export function subscribeToFirebaseCustomers(
  onData: (customers: Customer[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const colRef = collection(db, 'customers');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Customer[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.name) {
            list.push({
              id: docSnap.id,
              customerCode: data.customerCode || undefined,
              name: data.name,
              taxId: data.taxId || '',
              address: data.address || '',
              branch: data.branch || 'สำนักงานใหญ่',
              branchCode: data.branchCode || '00000',
              assignedStaff: data.assignedStaff || undefined,
              phone: data.phone || '',
              email: data.email || '',
              contactPerson: data.contactPerson || '',
              source: data.source || 'ACP-Master',
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          }
        });
        
        // Sort by customerCode if present, otherwise by name
        list.sort((a, b) => {
          if (a.customerCode && b.customerCode) {
            return a.customerCode.localeCompare(b.customerCode);
          }
          return a.name.localeCompare(b.name, 'th');
        });

        onData(list);
      },
      (error) => {
        console.warn('[Firebase] Customers snapshot listener error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('[Firebase] Failed to init customer subscription:', err);
    return () => {};
  }
}

/**
 * Save single customer to Firebase Firestore
 */
export async function saveCustomerToFirebase(customer: Customer): Promise<boolean> {
  try {
    const docId = customer.customerCode || customer.id;
    const customerRef = doc(db, 'customers', docId);
    await setDoc(
      customerRef,
      {
        ...customer,
        id: docId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to save customer:', error);
    return false;
  }
}

/**
 * Delete single customer from Firebase Firestore
 */
export async function deleteCustomerFromFirebase(customerId: string): Promise<boolean> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    await deleteDoc(customerRef);
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to delete customer:', error);
    return false;
  }
}

/**
 * Push all local customers to Firebase Firestore in chunks of 400
 */
export async function pushAllCustomersToFirebase(customers: Customer[]): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const BATCH_SIZE = 400;
    let count = 0;

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = customers.slice(i, i + BATCH_SIZE);

      for (const c of chunk) {
        const docId = c.customerCode || c.id;
        const ref = doc(db, 'customers', docId);
        batch.set(
          ref,
          {
            ...c,
            id: docId,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        count++;
      }

      await batch.commit();
    }

    return { success: true, count };
  } catch (error: any) {
    console.error('[Firebase] Push all customers failed:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Fetch all customers from Firebase Firestore
 */
export async function fetchAllCustomersFromFirebase(): Promise<Customer[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'customers'));
    const items: Customer[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.name) {
        items.push({
          id: docSnap.id,
          customerCode: data.customerCode || undefined,
          name: data.name,
          taxId: data.taxId || '',
          address: data.address || '',
          branch: data.branch || 'สำนักงานใหญ่',
          branchCode: data.branchCode || '00000',
          assignedStaff: data.assignedStaff || undefined,
          phone: data.phone || '',
          email: data.email || '',
          contactPerson: data.contactPerson || '',
          source: data.source || 'ACP-Master',
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    });

    return items.sort((a, b) => {
      if (a.customerCode && b.customerCode) {
        return a.customerCode.localeCompare(b.customerCode);
      }
      return a.name.localeCompare(b.name, 'th');
    });
  } catch (error) {
    console.error('[Firebase] Failed to fetch customers from cloud:', error);
    throw error;
  }
}
