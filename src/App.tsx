import React, { useState, useEffect, useRef } from 'react';
import { 
  Voucher, 
  VoucherStatus,
  CompanySettings, 
  GoogleSheetSyncConfig,
  AppUserAccount,
  FontSizePreference,
  Customer,
  CustomerSheetSyncConfig
} from './types';
import { 
  getStoredCompanySettings, 
  saveCompanySettings, 
  getStoredVouchers, 
  saveVouchers, 
  getStoredSheetConfig, 
  saveSheetConfig, 
  INITIAL_VOUCHERS,
  DEFAULT_COMPANY_SETTINGS,
  isSampleDataEnabled,
  toggleSampleData,
  removeSampleVouchers,
  clearAllVouchers,
  isSampleVoucher
} from './utils/storage';
import {
  getStoredCustomers,
  saveCustomers,
  getStoredCustomerSheetConfig,
  saveCustomerSheetConfig,
  subscribeToFirebaseCustomers,
  saveCustomerToFirebase,
  pushAllCustomersToFirebase,
} from './utils/customerSync';
import { CustomerDirectoryModal } from './components/CustomerDirectoryModal';
import { CustomerDirectoryView } from './components/CustomerDirectoryView';
import { 
  saveBackupToIndexedDb, 
  getLatestBackupFromIndexedDb 
} from './utils/indexedDbBackup';
import { fetchLiveGoogleSheet } from './utils/googleSheetSync';
import { Navbar, ActiveTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { VouchersListView } from './components/VouchersListView';
import { VoucherWizardForm } from './components/VoucherWizardForm';
import { PrintA4Voucher } from './components/PrintA4Voucher';
import { Print50TawiCertificate } from './components/Print50TawiCertificate';
import { CustomerAttachmentsVault } from './components/CustomerAttachmentsVault';
import { CompanySettingsView } from './components/CompanySettings';
import { TaxComplianceAnalysis } from './components/TaxComplianceAnalysis';
import { WithholdingTaxReport } from './components/WithholdingTaxReport';
import { AnnualSummary } from './components/AnnualSummary';
import { ImportDataModal } from './components/ImportDataModal';
import { ComputerBackupModal } from './components/ComputerBackupModal';
import { SampleDataManagerModal } from './components/SampleDataManagerModal';
import { FirebaseSyncModal } from './components/FirebaseSyncModal';
import { AccountingSoftwareExportModal } from './components/AccountingSoftwareExportModal';
import { testConnection } from './firebase';
import { 
  saveVoucherToFirebase, 
  deleteVoucherFromFirebase, 
  saveSettingsToFirebase, 
  getSyncMode,
  subscribeToFirebaseVouchers,
  subscribeToFirebaseSettings,
  pushAllVouchersToFirebase,
} from './utils/firebaseSync';
import { StartupLockScreen } from './components/StartupLockScreen';
import { AdminUnlockModal } from './components/AdminUnlockModal';
import { FontSizeSelector } from './components/FontSizeSelector';
import { CheckCircle2, AlertCircle, X, Shield, ArrowLeft, Lock, Sparkles, Building2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getStoredCompanySettings());
  const [vouchers, setVouchers] = useState<Voucher[]>(getStoredVouchers());
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetSyncConfig>(getStoredSheetConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [isSampleDataModalOpen, setIsSampleDataModalOpen] = useState(false);
  const [isSampleEnabled, setIsSampleEnabled] = useState<boolean>(() => isSampleDataEnabled());
  const [isFirebaseSyncModalOpen, setIsFirebaseSyncModalOpen] = useState(false);

  // Customer Directory Master State (Google Sheets & Multi-device Sync)
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredCustomers());
  const [customerSheetConfig, setCustomerSheetConfig] = useState<CustomerSheetSyncConfig>(
    () => getStoredCustomerSheetConfig()
  );
  const [isCustomerDirectoryOpen, setIsCustomerDirectoryOpen] = useState(false);

  // Cloud Connection and Real-time Multi-device Sync State
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const isFirstCloudSyncRef = useRef<boolean>(true);

  // Initialize and maintain Real-time Cloud Synchronization with Firebase Firestore
  // Ensures PC, Mobile, and Tablet always have the exact same live data
  useEffect(() => {
    if (getSyncMode() !== 'hybrid') return;

    let unsubVouchers: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let unsubCustomers: (() => void) | undefined;
    let isMounted = true;

    testConnection()
      .then((ok) => {
        if (!ok || !isMounted) return;
        setIsCloudConnected(true);

        // 1. Subscribe to real-time vouchers from Firestore
        unsubVouchers = subscribeToFirebaseVouchers(
          (cloudVouchers) => {
            if (!isMounted) return;
            if (cloudVouchers && cloudVouchers.length > 0) {
              setVouchers(cloudVouchers);
              saveVouchers(cloudVouchers);
              if (isFirstCloudSyncRef.current) {
                isFirstCloudSyncRef.current = false;
                showToast(`☁️ เชื่อมต่อคลาวด์สด: ข้อมูลตรงกันทุกอุปกรณ์ (${cloudVouchers.length} ใบสำคัญ)`, 'info');
              }
            } else if (isFirstCloudSyncRef.current) {
              // If Cloud is currently empty, but this device already has vouchers:
              // Automatically seed Firestore with this device's vouchers so mobile/tablet will immediately receive them!
              isFirstCloudSyncRef.current = false;
              const currentV = getStoredVouchers();
              if (currentV && currentV.length > 0) {
                pushAllVouchersToFirebase(currentV).then((res) => {
                  if (res.success) {
                    saveSettingsToFirebase(getStoredCompanySettings());
                    console.log(`[Firebase] Auto-seeded cloud with ${res.count} vouchers for multi-device sync`);
                  }
                });
              }
            }
          },
          (err) => {
            console.warn('[Firebase] Voucher subscription warning:', err);
            if (isMounted) setIsCloudConnected(false);
          }
        );

        // 2. Subscribe to real-time company settings from Firestore
        unsubSettings = subscribeToFirebaseSettings(
          (cloudSettings) => {
            if (!isMounted) return;
            if (cloudSettings && cloudSettings.name) {
              setCompanySettings(cloudSettings);
              saveCompanySettings(cloudSettings);
            }
          },
          (err) => {
            console.warn('[Firebase] Settings subscription warning:', err);
          }
        );

        // 3. Subscribe to real-time customers from Firestore (synced across all mobile/tablet/PC devices)
        unsubCustomers = subscribeToFirebaseCustomers(
          (cloudCustomers) => {
            if (!isMounted) return;
            if (cloudCustomers && cloudCustomers.length > 0) {
              setCustomers(cloudCustomers);
              saveCustomers(cloudCustomers);
            } else {
              // Seed cloud with local default customers if cloud is empty
              const localCusts = getStoredCustomers();
              if (localCusts && localCusts.length > 0) {
                pushAllCustomersToFirebase(localCusts).catch(() => {});
              }
            }
          },
          (err) => {
            console.warn('[Firebase] Customer subscription warning:', err);
          }
        );
      })
      .catch((err) => {
        console.warn('[Firebase] Connection test init error:', err);
        if (isMounted) setIsCloudConnected(false);
      });

    return () => {
      isMounted = false;
      if (unsubVouchers) unsubVouchers();
      if (unsubSettings) unsubSettings();
      if (unsubCustomers) unsubCustomers();
    };
  }, []);

  // Font Size Scale State (Compact 15px, Normal 16px, Large 17.5px, XLarge 19.5px)
  const [fontSize, setFontSize] = useState<FontSizePreference>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('account_planet_font_size') as FontSizePreference;
      if (saved && ['compact', 'normal', 'large', 'xlarge'].includes(saved)) {
        return saved;
      }
    }
    const settings = getStoredCompanySettings();
    return settings.fontSizePreference || 'large';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', fontSize);
      localStorage.setItem('account_planet_font_size', fontSize);
    }
  }, [fontSize]);

  const handleFontSizeChange = (newSize: FontSizePreference) => {
    setFontSize(newSize);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', newSize);
      localStorage.setItem('account_planet_font_size', newSize);
    }
    const updatedSettings: CompanySettings = {
      ...companySettings,
      fontSizePreference: newSize,
    };
    setCompanySettings(updatedSettings);
    saveCompanySettings(updatedSettings);
    
    const sizeName = 
      newSize === 'compact' ? 'กะทัดรัด (15px)' :
      newSize === 'normal' ? 'มาตรฐาน (16px)' :
      newSize === 'large' ? 'ใหญ่ สบายตา (17.5px)' : 'ใหญ่พิเศษ (19.5px)';
    showToast(`ปรับขนาดตัวหนังสือในระบบเป็น "${sizeName}" เรียบร้อยแล้ว`, 'info');
  };

  // Security & App Lock State (Requires PIN/password on startup if configured)
  const [currentUser, setCurrentUser] = useState<AppUserAccount | null>(null);
  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(() => {
    const settings = getStoredCompanySettings();
    if (!settings.securityConfig?.requirePasswordOnStartup) {
      return true; // No password required
    }
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('account_planet_unlocked') === 'true';
    }
    return false;
  });

  const handleLockApp = () => {
    setIsAppUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('account_planet_unlocked');
    }
    showToast('ระบบถูกล็อคหน้าจอเรียบร้อยแล้ว กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน', 'info');
  };

  const handleUnlockApp = (user?: AppUserAccount) => {
    setIsAppUnlocked(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('account_planet_unlocked', 'true');
    }
    if (user) {
      setCurrentUser(user);
      showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${user.displayName}`, 'success');
    } else {
      showToast('ปลดล็อคเข้าสู่ระบบเรียบร้อยแล้ว', 'success');
    }
  };

  const handleGlobalSearch = (query: string) => {
    setGlobalSearchQuery(query);
    if (activeTab !== 'vouchers') {
      setActiveTab('vouchers');
    }
  };

  // Shared Dashboard URL detection (Read-only isolated view for sharing)
  const [isSharedMode, setIsSharedMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'shared-dashboard';
    }
    return false;
  });

  const [hideAdminInSharedMode, setHideAdminInSharedMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('hide_admin') === 'true') return true;
    }
    const settings = getStoredCompanySettings();
    return settings.securityConfig?.hideSharedDashboardAdminBtn || false;
  });

  const [isAdminUnlockModalOpen, setIsAdminUnlockModalOpen] = useState(false);

  // Print view state
  const [printingVoucher, setPrintingVoucher] = useState<Voucher | null>(null);

  // 50 Tawi WHT Certificate print view state
  const [printing50TawiVoucher, setPrinting50TawiVoucher] = useState<Voucher | null>(null);

  // Edit view state
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Computer Backup & Restore Modal state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Accounting Software Export Modal state (Express / PEAK)
  const [isAccountingExportModalOpen, setIsAccountingExportModalOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Periodic auto-backup to IndexedDB (every 45 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      if (vouchers && vouchers.length > 0) {
        saveBackupToIndexedDb(vouchers, companySettings, 'auto');
      }
    }, 45000);
    return () => clearInterval(timer);
  }, [vouchers, companySettings]);

  // Flush backup before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (vouchers && vouchers.length > 0) {
        saveBackupToIndexedDb(vouchers, companySettings, 'auto');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [vouchers, companySettings]);

  // Idle auto-lock timer (if enabled in securityConfig)
  useEffect(() => {
    const timeoutMin = companySettings.securityConfig?.lockTimeoutMinutes || 0;
    if (timeoutMin <= 0 || !isAppUnlocked) return;

    let timeoutId: any;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLockApp();
      }, timeoutMin * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [isAppUnlocked, companySettings.securityConfig?.lockTimeoutMinutes]);

  // Self-healing recovery: Check if localStorage was cleared, and restore from IndexedDB if backup exists
  useEffect(() => {
    let isMounted = true;
    async function checkIndexedDbPersistence() {
      try {
        const rawLocal = localStorage.getItem('account_planet_vouchers');
        const latestBackup = await getLatestBackupFromIndexedDb();

        if (latestBackup && latestBackup.vouchers && latestBackup.vouchers.length > 0) {
          // If localStorage was cleared (rawLocal is missing)
          if (!rawLocal) {
            console.log('Restoring from IndexedDB backup (LocalStorage was cleared)...');
            if (isMounted) {
              setVouchers(latestBackup.vouchers);
              saveVouchers(latestBackup.vouchers);
              if (latestBackup.settings) {
                setCompanySettings(latestBackup.settings);
                saveCompanySettings(latestBackup.settings);
              }
              showToast(
                `ระบบตรวจพบข้อมูลสำรองใน IndexedDB กู้คืนฐานข้อมูลใบสำคัญ ${latestBackup.vouchers.length} ฉบับให้อัตโนมัติ`,
                'success'
              );
            }
          }
        } else if (vouchers.length > 0) {
          // First time initialization in IndexedDB
          saveBackupToIndexedDb(vouchers, companySettings, 'auto');
        }
      } catch (err) {
        console.warn('IndexedDB persistence check failed:', err);
      }
    }

    checkIndexedDbPersistence();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle restoring data from an IndexedDB backup snapshot
  const handleRestoreFromBackup = (restoredVouchers: Voucher[], restoredSettings?: CompanySettings) => {
    setVouchers(restoredVouchers);
    saveVouchers(restoredVouchers);
    if (restoredSettings) {
      setCompanySettings(restoredSettings);
      saveCompanySettings(restoredSettings);
    }
    saveBackupToIndexedDb(
      restoredVouchers,
      restoredSettings || companySettings,
      'manual',
      'กู้คืนจากจุดสำรองข้อมูล'
    );
  };

  // Handle Real Data Import
  const handleImportVouchers = (newVouchers: Voucher[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setVouchers(newVouchers);
      saveVouchers(newVouchers);
      showToast(`นำเข้าข้อมูลจริงสำเร็จ แทนที่ด้วยข้อมูลชุดใหม่ ${newVouchers.length} รายการ`, 'success');
    } else {
      const map = new Map<string, Voucher>();
      vouchers.forEach((v) => map.set(v.voucherNo, v));
      newVouchers.forEach((v) => map.set(v.voucherNo, v));
      const combined = Array.from(map.values());
      setVouchers(combined);
      saveVouchers(combined);
      showToast(`นำเข้าข้อมูลจริงเพิ่มสำเร็จ รวมทั้งหมด ${combined.length} รายการ`, 'success');
    }
  };

  // Sync with Google Sheet
  const handleSyncSheet = async () => {
    setIsSyncing(true);
    showToast('กำลังเชื่อมต่อและดึงข้อมูลสดจาก Google Sheet...', 'info');

    try {
      const result = await fetchLiveGoogleSheet(sheetConfig);

      if (result.success && result.vouchers && result.vouchers.length > 0) {
        // Merge with existing vouchers by voucherNo
        const newMap = new Map<string, Voucher>();
        vouchers.forEach((v) => newMap.set(v.voucherNo, v));
        result.vouchers.forEach((v) => newMap.set(v.voucherNo, v));

        const updatedList = Array.from(newMap.values());
        setVouchers(updatedList);
        saveVouchers(updatedList);

        const rowCount = result.rowCount || result.vouchers.length;
        const newConfig: GoogleSheetSyncConfig = {
          ...sheetConfig,
          status: 'success',
          lastSyncedAt: new Date().toISOString(),
          statusMessage: `ซิงค์สำเร็จ (${rowCount} รายการ)`,
        };
        setSheetConfig(newConfig);
        saveSheetConfig(newConfig);

        showToast(`ดึงข้อมูลสดสำเร็จ ${rowCount} รายการ จาก Google Sheet`, 'success');
      } else {
        const newConfig: GoogleSheetSyncConfig = {
          ...sheetConfig,
          status: 'error',
          statusMessage: result.error || 'ดึงข้อมูลไม่สำเร็จ',
        };
        setSheetConfig(newConfig);
        saveSheetConfig(newConfig);
        showToast(result.error || 'ไม่พบข้อมูลในชีต หรือชีตยังไม่ได้แชร์เป็นสาธารณะ', 'error');
      }
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save new / edited voucher
  const handleSaveVoucher = (savedVoucher: Voucher, printImmediately = false) => {
    let updated: Voucher[];
    const exists = vouchers.some((v) => v.id === savedVoucher.id);
    if (exists) {
      updated = vouchers.map((v) => (v.id === savedVoucher.id ? savedVoucher : v));
      showToast(`บันทึกการแก้ไขใบสำคัญ ${savedVoucher.voucherNo} เรียบร้อยแล้ว`, 'success');
    } else {
      updated = [savedVoucher, ...vouchers];
      showToast(`ออกใบสำคัญ ${savedVoucher.voucherNo} ใหม่เรียบร้อยแล้ว`, 'success');
    }

    setVouchers(updated);
    saveVouchers(updated);
    setEditingVoucher(null);

    // Hybrid Cloud Sync to Firebase Firestore in background
    if (getSyncMode() === 'hybrid') {
      saveVoucherToFirebase(savedVoucher).catch((err) =>
        console.warn('[Firebase] Background sync failed:', err)
      );
    }

    if (printImmediately) {
      setPrintingVoucher(savedVoucher);
    } else {
      setActiveTab('vouchers');
    }
  };

  // Customer Directory handlers
  const handleUpdateCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    saveCustomers(newCustomers);
    if (getSyncMode() === 'hybrid') {
      pushAllCustomersToFirebase(newCustomers).catch((err) =>
        console.warn('[Firebase] Customer push failed:', err)
      );
    }
  };

  const handleUpdateCustomerSheetConfig = (newCfg: CustomerSheetSyncConfig) => {
    setCustomerSheetConfig(newCfg);
    saveCustomerSheetConfig(newCfg);
  };

  const handleCreateRVWithCustomer = (cust: Customer) => {
    setEditingVoucher({
      id: `VOUCHER-${Date.now()}`,
      voucherNo: '',
      type: 'RV',
      date: new Date().toISOString().split('T')[0],
      contact: {
        name: cust.name,
        taxId: cust.taxId,
        address: cust.address,
        branch: cust.branch || 'สำนักงานใหญ่',
        branchCode: cust.branchCode || '00000',
        phone: cust.phone || '',
        contactPerson: cust.contactPerson || '',
      },
      items: [
        {
          id: 'item-1',
          description: `รายได้ค่าบริการตรวจสอบบัญชี ${cust.name}`,
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
      thaiBahtText: 'หนึ่งแสนสี่พันบาทถ้วน',
      payment: {
        method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
        bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
        accountNo: '082-248912-3',
        accountName: companySettings.name,
        paymentDate: new Date().toISOString().split('T')[0],
      },
      status: 'ชำระแล้ว (Completed)',
      signatures: {
        preparedBy: companySettings.defaultPreparedBy || 'ผู้จัดทำบัญชี',
        preparedDate: new Date().toISOString().split('T')[0],
        checkedBy: companySettings.defaultCheckedBy || 'ผู้จัดการแผนกบัญชี',
        checkedDate: new Date().toISOString().split('T')[0],
        approvedBy: companySettings.defaultApprovedBy || 'กรรมการผู้จัดการ',
        approvedDate: new Date().toISOString().split('T')[0],
        receivedOrPaidBy: cust.name,
        receivedOrPaidDate: new Date().toISOString().split('T')[0],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'Manual',
    });
    setActiveTab('create_rv');
  };

  const handleCreatePVWithCustomer = (cust: Customer) => {
    setEditingVoucher({
      id: `VOUCHER-${Date.now()}`,
      voucherNo: '',
      type: 'PV',
      date: new Date().toISOString().split('T')[0],
      contact: {
        name: cust.name,
        taxId: cust.taxId,
        address: cust.address,
        branch: cust.branch || 'สำนักงานใหญ่',
        branchCode: cust.branchCode || '00000',
        phone: cust.phone || '',
        contactPerson: cust.contactPerson || '',
      },
      items: [
        {
          id: 'item-1',
          description: `ค่าบริการตรวจสอบบัญชี ${cust.name}`,
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
      thaiBahtText: 'สามหมื่นแปดพันแปดร้อยบาทถ้วน',
      payment: {
        method: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
        bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
        accountNo: '082-248912-3',
        accountName: companySettings.name,
        paymentDate: new Date().toISOString().split('T')[0],
      },
      status: 'ชำระแล้ว (Completed)',
      signatures: {
        preparedBy: companySettings.defaultPreparedBy || 'ผู้จัดทำบัญชี',
        preparedDate: new Date().toISOString().split('T')[0],
        checkedBy: companySettings.defaultCheckedBy || 'ผู้จัดการแผนกบัญชี',
        checkedDate: new Date().toISOString().split('T')[0],
        approvedBy: companySettings.defaultApprovedBy || 'กรรมการผู้จัดการ',
        approvedDate: new Date().toISOString().split('T')[0],
        receivedOrPaidBy: cust.name,
        receivedOrPaidDate: new Date().toISOString().split('T')[0],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'Manual',
    });
    setActiveTab('create_pv');
  };

  // Delete Voucher
  const handleDeleteVoucher = (id: string) => {
    const target = vouchers.find((v) => v.id === id);
    if (!target) return;
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบสำคัญ ${target.voucherNo} (${target.contact.name})?`)) {
      const updated = vouchers.filter((v) => v.id !== id);
      setVouchers(updated);
      saveVouchers(updated);

      // Hybrid Cloud Sync delete in background
      if (getSyncMode() === 'hybrid') {
        deleteVoucherFromFirebase(id).catch((err) =>
          console.warn('[Firebase] Background delete failed:', err)
        );
      }

      showToast(`ลบใบสำคัญ ${target.voucherNo} เรียบร้อยแล้ว`, 'info');
    }
  };

  // Update Voucher Status
  const handleUpdateVoucherStatus = (voucherId: string, newStatus: VoucherStatus) => {
    const updated = vouchers.map((v) =>
      v.id === voucherId ? { ...v, status: newStatus, updatedAt: new Date().toISOString() } : v
    );
    setVouchers(updated);
    saveVouchers(updated);

    const changed = updated.find((v) => v.id === voucherId);
    if (changed && getSyncMode() === 'hybrid') {
      saveVoucherToFirebase(changed).catch((err) =>
        console.warn('[Firebase] Background status sync failed:', err)
      );
    }

    showToast(`อัปเดตสถานะเอกสารเป็น "${newStatus}" เรียบร้อยแล้ว`, 'success');
  };

  // Duplicate Voucher
  const handleDuplicateVoucher = (source: Voucher) => {
    const isRV = source.type === 'RV';
    const prefix = isRV
      ? companySettings.runningNumberConfig?.rvPrefix || 'RV'
      : companySettings.runningNumberConfig?.pvPrefix || 'PV';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newVoucherNo = `${prefix}69-${randomSuffix}`;

    const cloned: Voucher = {
      ...source,
      id: `v-${Date.now()}`,
      voucherNo: newVoucherNo,
      date: new Date().toISOString().slice(0, 10),
      status: 'ชำระแล้ว (Completed)',
      notes: source.notes ? `(คัดลอก) ${source.notes}` : '',
      attachments: [],
    };

    setEditingVoucher(cloned);
    setActiveTab(isRV ? 'create_rv' : 'create_pv');
    showToast(`คัดลอกใบสำคัญสำเร็จ สร้างเป็นฉบับใหม่เลขที่ ${newVoucherNo}`, 'info');
  };

  // Save Company Settings
  const handleSaveCompanySettings = (newSettings: CompanySettings) => {
    setCompanySettings(newSettings);
    saveCompanySettings(newSettings);

    if (getSyncMode() === 'hybrid') {
      saveSettingsToFirebase(newSettings).catch((err) =>
        console.warn('[Firebase] Background settings sync failed:', err)
      );
    }

    showToast('บันทึกการตั้งค่าระบบและบัญชีธนาคารเรียบร้อยแล้ว', 'success');
  };

  // Update Sheet Config
  const handleUpdateSheetConfig = (newConfig: GoogleSheetSyncConfig) => {
    setSheetConfig(newConfig);
    saveSheetConfig(newConfig);
    showToast('อัปเดตการตั้งค่า Google Sheet เรียบร้อยแล้ว', 'success');
  };

  // Sample Data Handlers
  const handleToggleSampleData = (enable: boolean) => {
    const updated = toggleSampleData(enable, vouchers);
    setVouchers(updated);
    setIsSampleEnabled(enable);
    if (enable) {
      showToast('เปิดใช้งานข้อมูลตัวอย่างเรียบร้อยแล้ว (โหลดตัวอย่าง 12 รายการ)', 'success');
    } else {
      showToast('ปิดข้อมูลตัวอย่างเรียบร้อยแล้ว (ระบบทำงานในโหมดจริง)', 'info');
    }
  };

  const handleRemoveSampleDataOnly = () => {
    const remaining = removeSampleVouchers(vouchers);
    setVouchers(remaining);
    setIsSampleEnabled(false);
    showToast(`นำข้อมูลตัวอย่างออกเรียบร้อยแล้ว (เหลือข้อมูลจริง ${remaining.length} รายการ)`, 'success');
  };

  const handleClearAllVouchers = () => {
    const empty = clearAllVouchers();
    setVouchers(empty);
    setIsSampleEnabled(false);
    showToast('ล้างรายการใบสำคัญทั้งหมดเรียบร้อยแล้ว ระบบเริ่มต้นใหม่ 0 รายการ', 'info');
  };

  const handleRestoreSampleData = () => {
    const restored = toggleSampleData(true, vouchers);
    setVouchers(restored);
    setIsSampleEnabled(true);
    showToast('โหลดข้อมูลตัวอย่าง 12 รายการกลับมาเรียบร้อยแล้ว', 'success');
  };

  // Reset or load default sample data
  const handleLoadSampleData = () => {
    handleRestoreSampleData();
  };

  const handleRequestExitSharedMode = () => {
    setIsAdminUnlockModalOpen(true);
  };

  const handleAdminUnlockSuccess = (adminUser?: AppUserAccount) => {
    setIsAdminUnlockModalOpen(false);
    setIsSharedMode(false);
    setIsAppUnlocked(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('account_planet_unlocked', 'true');
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      url.searchParams.delete('hide_admin');
      window.history.replaceState({}, '', url.pathname);
    }
    if (adminUser) {
      setCurrentUser(adminUser);
      showToast(`ยืนยันสิทธิ์สำเร็จ ยินดีต้อนรับ ${adminUser.displayName}`, 'success');
    } else {
      showToast('ยืนยันสิทธิ์ผู้ดูแลระบบสำเร็จ เข้าสู่ระบบหลักเรียบร้อย', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans w-full overflow-x-hidden">
      {/* Shared Read-Only Header (Only in shared mode) */}
      {isSharedMode ? (
        <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-wide flex items-center gap-2">
                  <span>{companySettings.name}</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Shared Dashboard (Read-Only)
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  ระบบรายงานสรุปข้อมูลการเงิน (เฉพาะมุมมองนี้เท่านั้น ระบบหลักถูกล็อคความปลอดภัย)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FontSizeSelector
                fontSize={fontSize}
                onChangeFontSize={handleFontSizeChange}
                variant="topbar"
              />
              {!hideAdminInSharedMode && (
                <button
                  onClick={handleRequestExitSharedMode}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs px-3.5 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer font-medium shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบหลัก (เฉพาะ Admin ใส่รหัสผ่าน)</span>
                </button>
              )}
            </div>
          </div>
        </header>
      ) : (
        /* Standard Admin Navbar (Hidden during A4 printing) */
        <div className="no-print">
          <Navbar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setPrintingVoucher(null);
              setPrinting50TawiVoucher(null);
              setEditingVoucher(null);
              setActiveTab(tab);
            }}
            companySettings={companySettings}
            sheetConfig={sheetConfig}
            onSyncSheet={handleSyncSheet}
            isSyncing={isSyncing}
            totalVouchersCount={vouchers.length}
            onGlobalSearch={handleGlobalSearch}
            globalSearchQuery={globalSearchQuery}
            onLockApp={companySettings.securityConfig?.requirePasswordOnStartup ? handleLockApp : undefined}
            currentUserRole={currentUser?.role}
            fontSize={fontSize}
            onChangeFontSize={handleFontSizeChange}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            isSampleEnabled={isSampleEnabled}
            onOpenSampleDataModal={() => setIsSampleDataModalOpen(true)}
            onOpenFirebaseSyncModal={() => setIsFirebaseSyncModalOpen(true)}
            onOpenAccountingExportModal={() => setIsAccountingExportModalOpen(true)}
            isCloudConnected={isCloudConnected}
            onOpenCustomerDirectory={() => setActiveTab('customers')}
            customerCount={customers.length}
          />
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium animate-in fade-in slide-in-from-bottom-2 no-print bg-slate-900 text-white border-slate-800">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-x-hidden">
        {/* If user clicked to Print 50 Tawi WHT Certificate */}
        {printing50TawiVoucher ? (
          <Print50TawiCertificate
            voucher={printing50TawiVoucher}
            companySettings={companySettings}
            onBack={() => setPrinting50TawiVoucher(null)}
            onUpdateCompanySettings={handleSaveCompanySettings}
            onUpdateVoucher={handleSaveVoucher}
          />
        ) : printingVoucher ? (
          /* If user clicked to Print a Voucher A4 */
          <PrintA4Voucher
            voucher={printingVoucher}
            companySettings={companySettings}
            onBack={() => setPrintingVoucher(null)}
            onPrint50Tawi={(v) => {
              setPrintingVoucher(null);
              setPrinting50TawiVoucher(v);
            }}
            onUpdateVoucher={(v) => {
              handleSaveVoucher(v);
              setPrintingVoucher(v);
            }}
            onUpdateCompanySettings={handleSaveCompanySettings}
          />
        ) : isSharedMode ? (
          /* Shared Mode: ONLY render the Dashboard in read-only view */
          <Dashboard
            vouchers={vouchers}
            sheetConfig={sheetConfig}
            companySettings={companySettings}
            onUpdateSheetConfig={() => {}}
            onSyncSheet={handleSyncSheet}
            isSyncing={isSyncing}
            onSelectVoucherToPrint={(v) => setPrintingVoucher(v)}
            onEditVoucher={() => {}}
            onDeleteVoucher={() => {}}
            onDuplicateVoucher={() => {}}
            onCreatePV={() => {}}
            onCreateRV={() => {}}
            onLoadSampleData={() => {}}
            isReadOnly={true}
            onExitReadOnly={handleRequestExitSharedMode}
            hideAdminButton={hideAdminInSharedMode}
          />
        ) : (
          /* Standard Multi-tab Navigation */
          <>
            {/* 1. Dashboard View */}
            {activeTab === 'dashboard' && (
              <Dashboard
                vouchers={vouchers}
                sheetConfig={sheetConfig}
                companySettings={companySettings}
                onUpdateSheetConfig={handleUpdateSheetConfig}
                onSyncSheet={handleSyncSheet}
                isSyncing={isSyncing}
                onSelectVoucherToPrint={(v) => setPrintingVoucher(v)}
                onEditVoucher={(v) => {
                  setEditingVoucher(v);
                  setActiveTab(v.type === 'RV' ? 'create_rv' : 'create_pv');
                }}
                onDeleteVoucher={handleDeleteVoucher}
                onDuplicateVoucher={handleDuplicateVoucher}
                onCreatePV={() => {
                  setEditingVoucher(null);
                  setActiveTab('create_pv');
                }}
                onCreateRV={() => {
                  setEditingVoucher(null);
                  setActiveTab('create_rv');
                }}
                onLoadSampleData={handleLoadSampleData}
                onOpenWhtReport={() => setActiveTab('wht_report')}
                onOpenAnnualSummary={() => setActiveTab('annual_summary')}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                onOpenBackupModal={() => setIsBackupModalOpen(true)}
                onNavigateToVouchers={() => setActiveTab('vouchers')}
                isSampleEnabled={isSampleEnabled}
                onOpenSampleDataModal={() => setIsSampleDataModalOpen(true)}
                onToggleSampleData={handleToggleSampleData}
                onRemoveSampleDataOnly={handleRemoveSampleDataOnly}
                onOpenFirebaseSyncModal={() => setIsFirebaseSyncModalOpen(true)}
                onOpenAccountingExportModal={() => setIsAccountingExportModalOpen(true)}
                onOpenCustomerDirectory={() => setActiveTab('customers')}
                customerCount={customers.length}
              />
            )}

            {/* 2. All Vouchers List View */}
            {activeTab === 'vouchers' && (
              <VouchersListView
                vouchers={vouchers}
                onSelectVoucherToPrint={(v) => setPrintingVoucher(v)}
                onPrint50Tawi={(v) => setPrinting50TawiVoucher(v)}
                onEditVoucher={(v) => {
                  setEditingVoucher(v);
                  setActiveTab(v.type === 'RV' ? 'create_rv' : 'create_pv');
                }}
                onDeleteVoucher={handleDeleteVoucher}
                onDuplicateVoucher={handleDuplicateVoucher}
                onCreatePV={() => {
                  setEditingVoucher(null);
                  setActiveTab('create_pv');
                }}
                onCreateRV={() => {
                  setEditingVoucher(null);
                  setActiveTab('create_rv');
                }}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                onOpenBackupModal={() => setIsBackupModalOpen(true)}
                initialSearchQuery={globalSearchQuery}
                onSearchQueryChange={setGlobalSearchQuery}
                onUpdateVoucherStatus={handleUpdateVoucherStatus}
                isSampleEnabled={isSampleEnabled}
                onOpenSampleDataModal={() => setIsSampleDataModalOpen(true)}
                onToggleSampleData={handleToggleSampleData}
                onRemoveSampleDataOnly={handleRemoveSampleDataOnly}
                onOpenAccountingExportModal={() => setIsAccountingExportModalOpen(true)}
              />
            )}

            {/* 3. Customer Attachments Vault (จัดเก็บไฟล์แนบแยกตามลูกค้าและเชื่อม Google Drive) */}
            {activeTab === 'vault' && (
              <CustomerAttachmentsVault
                vouchers={vouchers}
                googleDriveUrl={companySettings.googleDriveFolderUrl}
                onSelectVoucher={(v) => setPrintingVoucher(v)}
              />
            )}

            {/* 4. Create/Edit Receipt Voucher (RV) */}
            {activeTab === 'create_rv' && (
              <VoucherWizardForm
                initialType="RV"
                editingVoucher={editingVoucher?.type === 'RV' ? editingVoucher : null}
                companySettings={companySettings}
                onSave={handleSaveVoucher}
                onCancel={() => {
                  setEditingVoucher(null);
                  setActiveTab('dashboard');
                }}
                customers={customers}
                onUpdateCustomers={handleUpdateCustomers}
                customerSheetConfig={customerSheetConfig}
                onUpdateCustomerSheetConfig={handleUpdateCustomerSheetConfig}
              />
            )}

            {/* 5. Create/Edit Payment Voucher (PV) */}
            {activeTab === 'create_pv' && (
              <VoucherWizardForm
                initialType="PV"
                editingVoucher={editingVoucher?.type === 'PV' ? editingVoucher : null}
                companySettings={companySettings}
                onSave={handleSaveVoucher}
                onCancel={() => {
                  setEditingVoucher(null);
                  setActiveTab('dashboard');
                }}
                customers={customers}
                onUpdateCustomers={handleUpdateCustomers}
                customerSheetConfig={customerSheetConfig}
                onUpdateCustomerSheetConfig={handleUpdateCustomerSheetConfig}
              />
            )}

            {/* 6. Company & Bank Settings */}
            {activeTab === 'settings' && (
              <CompanySettingsView
                settings={companySettings}
                onSave={handleSaveCompanySettings}
                vouchers={vouchers}
                onRestoreData={handleRestoreFromBackup}
                showToast={showToast}
                onTriggerLock={handleLockApp}
                fontSize={fontSize}
                onChangeFontSize={handleFontSizeChange}
                isSampleEnabled={isSampleEnabled}
                onToggleSampleData={handleToggleSampleData}
                onRemoveSampleDataOnly={handleRemoveSampleDataOnly}
                onClearAllVouchers={handleClearAllVouchers}
                onRestoreSampleData={handleRestoreSampleData}
                onOpenFirebaseSyncModal={() => setIsFirebaseSyncModalOpen(true)}
              />
            )}

            {/* 7. Tax Compliance & Legal Analysis */}
            {activeTab === 'tax_guide' && (
              <TaxComplianceAnalysis
                companySettings={companySettings}
                vouchers={vouchers}
              />
            )}

            {/* 8. Withholding Tax (ภ.ง.ด. 3 & ภ.ง.ด. 53) Monthly e-Filing Report */}
            {activeTab === 'wht_report' && (
              <WithholdingTaxReport
                vouchers={vouchers}
                companySettings={companySettings}
                onSelectVoucherToPrint={(v) => setPrintingVoucher(v)}
                onPrint50Tawi={(v) => setPrinting50TawiVoucher(v)}
                onEditVoucher={(v) => {
                  setEditingVoucher(v);
                  setActiveTab(v.type === 'RV' ? 'create_rv' : 'create_pv');
                }}
              />
            )}

            {/* 9. Annual Summary & Financial Review (สรุปงบการเงินและผลประกอบการประจำปี) */}
            {activeTab === 'annual_summary' && (
              <AnnualSummary
                vouchers={vouchers}
                companySettings={companySettings}
                onSelectVoucherToPrint={(v) => setPrintingVoucher(v)}
                onEditVoucher={(v) => {
                  setEditingVoucher(v);
                  setActiveTab(v.type === 'RV' ? 'create_rv' : 'create_pv');
                }}
                onCreateRV={() => {
                  setEditingVoucher(null);
                  setActiveTab('create_rv');
                }}
                onCreatePV={() => {
                  setEditingVoucher(null);
                  setActiveTab('create_pv');
                }}
              />
            )}

            {/* 10. Customer Directory Master Tab (ฐานข้อมูลรายชื่อลูกค้าและนิติบุคคล) */}
            {activeTab === 'customers' && (
              <CustomerDirectoryView
                customers={customers}
                onUpdateCustomers={handleUpdateCustomers}
                customerSheetConfig={customerSheetConfig}
                onUpdateSheetConfig={handleUpdateCustomerSheetConfig}
                onCreateRVWithCustomer={handleCreateRVWithCustomer}
                onCreatePVWithCustomer={handleCreatePVWithCustomer}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>{companySettings.name}</strong> • เลขประจำตัวผู้เสียภาษี {companySettings.taxId} • โทร. {companySettings.phone}
          </div>
          <div className="text-slate-400">
            ระบบจัดเก็บข้อมูล Live Artifacts เอกสารบัญชีมาตรฐานประมวลรัษฎากร
          </div>
        </div>
      </footer>

      {/* Real Data Import Modal */}
      <ImportDataModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportVouchers}
        currentCount={vouchers.length}
      />

      {/* Computer Backup & Restore Modal */}
      <ComputerBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        vouchers={vouchers}
        companySettings={companySettings}
        onRestoreData={handleRestoreFromBackup}
        showToast={showToast}
      />

      {/* Sample Data Manager Modal (เปิด/ปิด/ลบข้อมูลตัวอย่าง) */}
      <SampleDataManagerModal
        isOpen={isSampleDataModalOpen}
        onClose={() => setIsSampleDataModalOpen(false)}
        vouchers={vouchers}
        isSampleEnabled={isSampleEnabled}
        onToggleSampleData={handleToggleSampleData}
        onRemoveSampleDataOnly={handleRemoveSampleDataOnly}
        onClearAllVouchers={handleClearAllVouchers}
        onRestoreSampleData={handleRestoreSampleData}
        showToast={showToast}
      />

      {/* Financial Security Startup & Idle Lock Screen */}
      {!isAppUnlocked && (
        <StartupLockScreen
          companySettings={companySettings}
          onUnlock={handleUnlockApp}
        />
      )}

      {/* Admin Unlock Modal to securely verify Admin PIN before exiting Shared Mode */}
      <AdminUnlockModal
        isOpen={isAdminUnlockModalOpen}
        onClose={() => setIsAdminUnlockModalOpen(false)}
        onSuccess={handleAdminUnlockSuccess}
        companySettings={companySettings}
      />

      {/* Firebase Cloud Sync Modal (ระบบฐานข้อมูลคู่ขนานในเครื่อง + Cloud) */}
      <FirebaseSyncModal
        isOpen={isFirebaseSyncModalOpen}
        onClose={() => setIsFirebaseSyncModalOpen(false)}
        vouchers={vouchers}
        settings={companySettings}
        onVouchersUpdate={(newVouchers) => {
          setVouchers(newVouchers);
          saveVouchers(newVouchers);
        }}
        onSettingsUpdate={(newSettings) => {
          setCompanySettings(newSettings);
          saveCompanySettings(newSettings);
        }}
        showToast={showToast}
      />

      {/* Accounting Software CSV Export Modal (Express / PEAK) */}
      <AccountingSoftwareExportModal
        isOpen={isAccountingExportModalOpen}
        onClose={() => setIsAccountingExportModalOpen(false)}
        vouchers={vouchers}
        onSuccessToast={(msg) => showToast(msg, 'success')}
      />

      {/* Customer Directory Master Modal (Google Sheets Sync & Search) */}
      <CustomerDirectoryModal
        isOpen={isCustomerDirectoryOpen}
        onClose={() => setIsCustomerDirectoryOpen(false)}
        customers={customers}
        onUpdateCustomers={handleUpdateCustomers}
        customerSheetConfig={customerSheetConfig}
        onUpdateSheetConfig={handleUpdateCustomerSheetConfig}
        onCreateRVWithCustomer={handleCreateRVWithCustomer}
        onCreatePVWithCustomer={handleCreatePVWithCustomer}
      />
    </div>
  );
}
