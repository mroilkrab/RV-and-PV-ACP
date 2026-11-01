import { Voucher, CompanySettings, VoucherItem } from '../types';
import { BackupSnapshot, saveBackupToIndexedDb } from './indexedDbBackup';
import { convertToThaiBahtText } from './thaiBahtText';

export interface ComputerBackupFile {
  version: '2.6';
  app: 'AccountPlanet';
  fileType: 'account_planet_backup';
  exportedAt: string;
  exportedAtThai: string;
  systemInfo: {
    totalVouchers: number;
    totalRvCount: number;
    totalPvCount: number;
    totalRvAmount: number;
    totalPvAmount: number;
    companyName: string;
    companyTaxId: string;
    appVersion: string;
  };
  vouchers: Voucher[];
  companySettings?: CompanySettings;
}

export interface BackupValidationResult {
  isValid: boolean;
  errorMessage?: string;
  backupData?: ComputerBackupFile;
  vouchers: Voucher[];
  companySettings?: CompanySettings;
  summary: {
    totalCount: number;
    rvCount: number;
    pvCount: number;
    rvAmount: number;
    pvAmount: number;
    exportedAt?: string;
    companyName?: string;
  };
}

/**
 * Format Thai date-time string
 */
function getThaiFormattedNow(): string {
  const d = new Date();
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${day} ${month} ${year} เวลา ${time} น.`;
}

/**
 * Format clean filename with date and time
 */
export function generateBackupFilename(companyName?: string, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  const cleanName = (companyName || 'AccountPlanet')
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9_-]/g, '')
    .substring(0, 20);

  return `${cleanName}-Backup-${y}${m}${d}-${hh}${mm}${ss}.json`;
}

/**
 * Helper to get voucher amount safely
 */
function getVoucherNetAmount(v: Voucher | any): number {
  return Number(v.netPayable) || Number(v.totalAmount) || Number(v.subtotal) || 0;
}

/**
 * Build structured backup object
 */
export function buildBackupPayload(
  vouchers: Voucher[],
  companySettings?: CompanySettings,
  includeSettings = true
): ComputerBackupFile {
  let rvCount = 0;
  let pvCount = 0;
  let rvAmount = 0;
  let pvAmount = 0;

  vouchers.forEach((v) => {
    const amt = getVoucherNetAmount(v);
    if (v.type === 'RV') {
      rvCount += 1;
      rvAmount += amt;
    } else {
      pvCount += 1;
      pvAmount += amt;
    }
  });

  return {
    version: '2.6',
    app: 'AccountPlanet',
    fileType: 'account_planet_backup',
    exportedAt: new Date().toISOString(),
    exportedAtThai: getThaiFormattedNow(),
    systemInfo: {
      totalVouchers: vouchers.length,
      totalRvCount: rvCount,
      totalPvCount: pvCount,
      totalRvAmount: rvAmount,
      totalPvAmount: pvAmount,
      companyName: companySettings?.name || 'บริษัท แอคเคาท์ แพลนเน็ต จำกัด',
      companyTaxId: companySettings?.taxId || '',
      appVersion: 'v2.6',
    },
    vouchers: vouchers.map((v) => ({ ...v })),
    companySettings: includeSettings && companySettings ? { ...companySettings } : undefined,
  };
}

/**
 * Trigger file download onto the user's computer
 */
export async function downloadBackupToComputer(
  vouchers: Voucher[],
  companySettings?: CompanySettings,
  options: {
    filename?: string;
    includeSettings?: boolean;
    usePickerIfAvailable?: boolean;
  } = {}
): Promise<{
  success: boolean;
  filename: string;
  fileSizeBytes: number;
  voucherCount: number;
  cancelled?: boolean;
  error?: string;
}> {
  try {
    const includeSettings = options.includeSettings !== false;
    const payload = buildBackupPayload(vouchers, companySettings, includeSettings);
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const filename = options.filename || generateBackupFilename(companySettings?.name);

    // Try modern File System Access API if supported and allowed
    if (options.usePickerIfAvailable && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Account Planet Database Backup (*.json)',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        // Also record a snapshot into IndexedDB
        saveBackupToIndexedDb(
          vouchers,
          companySettings,
          'manual',
          `ดาวน์โหลดสำรองลงเครื่องคอมพิวเตอร์: ${handle.name || filename}`
        ).catch(() => {});

        return {
          success: true,
          filename: handle.name || filename,
          fileSizeBytes: blob.size,
          voucherCount: vouchers.length,
        };
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') {
          return {
            success: false,
            cancelled: true,
            filename,
            fileSizeBytes: 0,
            voucherCount: 0,
          };
        }
        console.warn('File picker failed, falling back to download link:', pickerErr);
      }
    }

    // Standard cross-browser download trigger
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 2000);

    // Record snapshot into IndexedDB for persistence alignment
    saveBackupToIndexedDb(
      vouchers,
      companySettings,
      'manual',
      `ดาวน์โหลดสำรองลงเครื่องคอมพิวเตอร์: ${filename}`
    ).catch(() => {});

    return {
      success: true,
      filename,
      fileSizeBytes: blob.size,
      voucherCount: vouchers.length,
    };
  } catch (err: any) {
    console.error('Failed to download backup to computer:', err);
    return {
      success: false,
      error: err.message || 'ไม่สามารถดาวน์โหลดไฟล์ได้',
      filename: '',
      fileSizeBytes: 0,
      voucherCount: 0,
    };
  }
}

/**
 * Download a historical snapshot from IndexedDB to computer
 */
export async function downloadSnapshotToComputer(
  snapshot: BackupSnapshot,
  companySettings?: CompanySettings
): Promise<{ success: boolean; filename: string; fileSizeBytes: number }> {
  const filename = generateBackupFilename(
    companySettings?.name || 'Snapshot',
    new Date(snapshot.timestamp)
  );

  const payload: ComputerBackupFile = {
    version: '2.6',
    app: 'AccountPlanet',
    fileType: 'account_planet_backup',
    exportedAt: snapshot.timestamp,
    exportedAtThai: new Date(snapshot.timestamp).toLocaleString('th-TH'),
    systemInfo: {
      totalVouchers: snapshot.voucherCount,
      totalRvCount: snapshot.vouchers.filter((v) => v.type === 'RV').length,
      totalPvCount: snapshot.vouchers.filter((v) => v.type === 'PV').length,
      totalRvAmount: snapshot.vouchers
        .filter((v) => v.type === 'RV')
        .reduce((sum, v) => sum + getVoucherNetAmount(v), 0),
      totalPvAmount: snapshot.vouchers
        .filter((v) => v.type === 'PV')
        .reduce((sum, v) => sum + getVoucherNetAmount(v), 0),
      companyName: snapshot.settings?.name || companySettings?.name || 'บริษัท',
      companyTaxId: snapshot.settings?.taxId || companySettings?.taxId || '',
      appVersion: 'v2.6',
    },
    vouchers: snapshot.vouchers,
    companySettings: snapshot.settings || companySettings,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 2000);

  return {
    success: true,
    filename,
    fileSizeBytes: blob.size,
  };
}

/**
 * Parse and validate a backup file from computer
 */
export function parseAndValidateBackupFile(jsonContent: string): BackupValidationResult {
  try {
    const raw = JSON.parse(jsonContent);

    // Scenario A: Standard AccountPlanet backup file
    if (raw && (raw.app === 'AccountPlanet' || raw.fileType === 'account_planet_backup')) {
      const vouchers: any[] = Array.isArray(raw.vouchers) ? raw.vouchers : [];
      if (vouchers.length === 0 && !raw.companySettings) {
        return {
          isValid: false,
          errorMessage: 'ไฟล์สำรองข้อมูลไม่มีรายการใบสำคัญหรือการตั้งค่าที่ถูกต้อง',
          vouchers: [],
          summary: { totalCount: 0, rvCount: 0, pvCount: 0, rvAmount: 0, pvAmount: 0 },
        };
      }

      // Sanitize vouchers
      const cleanVouchers = sanitizeVoucherList(vouchers);

      let rvCount = 0;
      let pvCount = 0;
      let rvAmount = 0;
      let pvAmount = 0;

      cleanVouchers.forEach((v) => {
        const amt = getVoucherNetAmount(v);
        if (v.type === 'RV') {
          rvCount += 1;
          rvAmount += amt;
        } else {
          pvCount += 1;
          pvAmount += amt;
        }
      });

      return {
        isValid: true,
        backupData: raw as ComputerBackupFile,
        vouchers: cleanVouchers,
        companySettings: raw.companySettings,
        summary: {
          totalCount: cleanVouchers.length,
          rvCount,
          pvCount,
          rvAmount,
          pvAmount,
          exportedAt: raw.exportedAtThai || raw.exportedAt,
          companyName: raw.systemInfo?.companyName || raw.companySettings?.name,
        },
      };
    }

    // Scenario B: Raw array of vouchers
    if (Array.isArray(raw)) {
      const cleanVouchers = sanitizeVoucherList(raw);
      if (cleanVouchers.length === 0) {
        return {
          isValid: false,
          errorMessage: 'ไฟล์ JSON นี้ไม่มีรายการใบสำคัญที่ตรงตามรูปแบบของระบบ',
          vouchers: [],
          summary: { totalCount: 0, rvCount: 0, pvCount: 0, rvAmount: 0, pvAmount: 0 },
        };
      }

      let rvCount = 0;
      let pvCount = 0;
      let rvAmount = 0;
      let pvAmount = 0;

      cleanVouchers.forEach((v) => {
        const amt = getVoucherNetAmount(v);
        if (v.type === 'RV') {
          rvCount += 1;
          rvAmount += amt;
        } else {
          pvCount += 1;
          pvAmount += amt;
        }
      });

      return {
        isValid: true,
        vouchers: cleanVouchers,
        summary: {
          totalCount: cleanVouchers.length,
          rvCount,
          pvCount,
          rvAmount,
          pvAmount,
        },
      };
    }

    // Scenario C: Generic object with vouchers property
    if (raw && typeof raw === 'object' && Array.isArray(raw.vouchers)) {
      const cleanVouchers = sanitizeVoucherList(raw.vouchers);
      return {
        isValid: true,
        vouchers: cleanVouchers,
        companySettings: raw.settings || raw.companySettings,
        summary: {
          totalCount: cleanVouchers.length,
          rvCount: cleanVouchers.filter((v) => v.type === 'RV').length,
          pvCount: cleanVouchers.filter((v) => v.type === 'PV').length,
          rvAmount: cleanVouchers
            .filter((v) => v.type === 'RV')
            .reduce((sum, v) => sum + getVoucherNetAmount(v), 0),
          pvAmount: cleanVouchers
            .filter((v) => v.type === 'PV')
            .reduce((sum, v) => sum + getVoucherNetAmount(v), 0),
          exportedAt: raw.exportedAt,
        },
      };
    }

    return {
      isValid: false,
      errorMessage: 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์สำรองข้อมูล (.json) ที่สร้างจากระบบ',
      vouchers: [],
      summary: { totalCount: 0, rvCount: 0, pvCount: 0, rvAmount: 0, pvAmount: 0 },
    };
  } catch (err: any) {
    return {
      isValid: false,
      errorMessage: `ไม่สามารถอ่านข้อมูลไฟล์ได้ (ไวยากรณ์ JSON ไม่ถูกต้อง): ${err.message}`,
      vouchers: [],
      summary: { totalCount: 0, rvCount: 0, pvCount: 0, rvAmount: 0, pvAmount: 0 },
    };
  }
}

/**
 * Sanitize and validate voucher array
 */
function sanitizeVoucherList(list: any[]): Voucher[] {
  return list
    .filter((item) => item && typeof item === 'object' && (item.voucherNo || item.id))
    .map((item, index) => {
      const id = String(item.id || `VOUCHER-RESTORE-${Date.now()}-${index}`);
      const type = item.type === 'PV' ? 'PV' : 'RV';
      const voucherNo = String(item.voucherNo || `${type}-AUTO-${index + 1}`);
      const date = item.date || new Date().toISOString().split('T')[0];

      const subtotal = Number(item.subtotal) || 0;
      const totalVat = Number(item.totalVat) || Number(item.vatTotal) || 0;
      const totalWht = Number(item.totalWht) || Number(item.whtTotal) || 0;
      const netPayable = Number(item.netPayable) || Number(item.totalAmount) || (subtotal + totalVat - totalWht);

      const items: VoucherItem[] = Array.isArray(item.items)
        ? item.items.map((it: any, itIdx: number) => ({
            id: String(it.id || `item-${itIdx}`),
            description: String(it.description || 'รายการ'),
            accountCategory: String(it.accountCategory || it.accountCode || 'ค่าบริการ'),
            baseAmount: Number(it.baseAmount) || Number(it.amount) || 0,
            vatRate: Number(it.vatRate) || (it.hasVat ? 7 : 0),
            vatAmount: Number(it.vatAmount) || 0,
            whtRate: Number(it.whtRate) || 0,
            whtAmount: Number(it.whtAmount) || 0,
            netAmount: Number(it.netAmount) || Number(it.baseAmount) || Number(it.amount) || 0,
          }))
        : [];

      return {
        id,
        voucherNo,
        type,
        date,
        dueDate: item.dueDate || date,
        referenceNo: item.referenceNo || '',
        jobNo: item.jobNo || '',
        auditor: item.auditor || '',
        jobClient: item.jobClient || '',
        contact: {
          name: item.contact?.name || 'ไม่ระบุผู้ติดต่อ',
          taxId: item.contact?.taxId || '',
          address: item.contact?.address || '',
          branch: item.contact?.branch || 'สำนักงานใหญ่',
          phone: item.contact?.phone || '',
        },
        items,
        subtotal,
        totalVat,
        totalWht,
        netPayable,
        thaiBahtText: item.thaiBahtText || convertToThaiBahtText(netPayable),
        payment: {
          method: item.payment?.method || 'โอนเงินผ่านธนาคาร (Bank Transfer)',
          bankName: item.payment?.bankName || 'ธนาคารกสิกรไทย (KBANK)',
          accountNo: item.payment?.accountNo || '123-4-56789-0',
          accountName: item.payment?.accountName || 'บริษัท',
          paymentDate: item.payment?.paymentDate || date,
          transferRef: item.payment?.transferRef || '',
          recipientBankName: item.payment?.recipientBankName || '',
          recipientAccountNo: item.payment?.recipientAccountNo || '',
        },
        signatures: {
          preparedBy: item.signatures?.preparedBy || 'เจ้าหน้าที่บัญชี',
          preparedDate: item.signatures?.preparedDate || date,
          checkedBy: item.signatures?.checkedBy || 'ผู้ตรวจสอบบัญชี',
          checkedDate: item.signatures?.checkedDate || date,
          approvedBy: item.signatures?.approvedBy || 'กรรมการผู้จัดการ',
          approvedDate: item.signatures?.approvedDate || date,
          receivedOrPaidBy: item.signatures?.receivedOrPaidBy || 'ผู้รับเงิน',
          receivedOrPaidDate: item.signatures?.receivedOrPaidDate || date,
          preparedBySignatureUrl: item.signatures?.preparedBySignatureUrl || '',
          checkedBySignatureUrl: item.signatures?.checkedBySignatureUrl || '',
          approvedBySignatureUrl: item.signatures?.approvedBySignatureUrl || '',
          receivedOrPaidSignatureUrl: item.signatures?.receivedOrPaidSignatureUrl || '',
          companyStampUrl: item.signatures?.companyStampUrl || '',
          showCompanyStamp: item.signatures?.showCompanyStamp ?? true,
          stampPlacement: item.signatures?.stampPlacement || 'all',
        },
        notes: item.notes || '',
        status: item.status || 'ชำระแล้ว (Completed)',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
        source: item.source || 'Import',
        attachments: Array.isArray(item.attachments) ? item.attachments : [],
        promptPayEnabled: Boolean(item.promptPayEnabled),
        isSample: Boolean(item.isSample),
      } as Voucher;
    });
}
