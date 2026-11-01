import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  Save, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw, 
  Image as ImageIcon,
  ShieldCheck,
  Phone,
  MapPin,
  FileCheck,
  Tag,
  Hash,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Sparkles,
  Lock,
  KeyRound,
  User,
  UserPlus,
  Eye,
  EyeOff,
  ShieldAlert,
  Key,
  UserCheck,
  CheckCircle2,
  Award,
  Briefcase,
  Users,
  Type,
  Cloud,
  HardDrive,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { 
  CompanySettings, 
  BankAccount, 
  GoogleSheetSyncConfig, 
  BankAccountUsage, 
  RunningNumberConfig, 
  Voucher,
  SecurityConfig,
  AppUserAccount,
  FontSizePreference
} from '../types';
import { DEFAULT_COMPANY_SETTINGS, isSampleVoucher } from '../utils/storage';
import { AccountPlanetLogo } from './AccountPlanetLogo';
import { IndexedDbBackupManager } from './IndexedDbBackupManager';
import { FontSizeSelector } from './FontSizeSelector';

interface CompanySettingsProps {
  settings: CompanySettings;
  onSave: (newSettings: CompanySettings) => void;
  sheetConfig?: GoogleSheetSyncConfig;
  onUpdateSheetConfig?: (newConfig: GoogleSheetSyncConfig) => void;
  onSyncSheet?: () => void;
  isSyncing?: boolean;
  vouchers?: Voucher[];
  onRestoreData?: (vouchers: Voucher[], settings?: CompanySettings) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onTriggerLock?: () => void;
  fontSize?: FontSizePreference;
  onChangeFontSize?: (size: FontSizePreference) => void;
  isSampleEnabled?: boolean;
  onToggleSampleData?: (enable: boolean) => void;
  onRemoveSampleDataOnly?: () => void;
  onClearAllVouchers?: () => void;
  onRestoreSampleData?: () => void;
  onOpenFirebaseSyncModal?: () => void;
}

export const CompanySettingsView: React.FC<CompanySettingsProps> = ({
  settings,
  onSave,
  sheetConfig,
  onUpdateSheetConfig,
  onSyncSheet,
  isSyncing = false,
  vouchers = [],
  onRestoreData,
  showToast = () => {},
  onTriggerLock,
  fontSize,
  onChangeFontSize,
  isSampleEnabled = true,
  onToggleSampleData,
  onRemoveSampleDataOnly,
  onClearAllVouchers,
  onRestoreSampleData,
  onOpenFirebaseSyncModal,
}) => {
  const [formData, setFormData] = useState<CompanySettings>(() => {
    return {
      ...settings,
      accountCategories: settings.accountCategories || DEFAULT_COMPANY_SETTINGS.accountCategories || [],
      auditors: settings.auditors && settings.auditors.length > 0 ? settings.auditors : (DEFAULT_COMPANY_SETTINGS.auditors || []),
      jobClients: settings.jobClients && settings.jobClients.length > 0 ? settings.jobClients : (DEFAULT_COMPANY_SETTINGS.jobClients || []),
      runningNumberConfig: settings.runningNumberConfig || DEFAULT_COMPANY_SETTINGS.runningNumberConfig || {
        rvPrefix: 'RV69-',
        pvPrefix: 'PV69-',
        nextRvSeq: 1,
        nextPvSeq: 1,
        digitCount: 3,
        includeYearMonth: true,
      },
      googleDriveFolderUrl: settings.googleDriveFolderUrl || DEFAULT_COMPANY_SETTINGS.googleDriveFolderUrl || 'https://drive.google.com/drive/folders/1mjfvMdvJbU539CvtziYzPF7YjtxiN0oX?usp=drive_link',
      securityConfig: settings.securityConfig || DEFAULT_COMPANY_SETTINGS.securityConfig || {
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
          }
        ],
        lockTimeoutMinutes: 0,
      },
      companyStampUrl: settings.companyStampUrl || DEFAULT_COMPANY_SETTINGS.companyStampUrl || '/stamps/company_stamp.svg',
      payerSignatureUrl: settings.payerSignatureUrl || DEFAULT_COMPANY_SETTINGS.payerSignatureUrl || '/signatures/sign_aphiwatch.svg',
      payerName: settings.payerName || DEFAULT_COMPANY_SETTINGS.payerName || 'นายอภิวัฒน์',
      fontSizePreference: settings.fontSizePreference || (fontSize || 'large'),
    };
  });

  // Sync external fontSize change with formData
  React.useEffect(() => {
    if (fontSize && formData.fontSizePreference !== fontSize) {
      setFormData(prev => ({ ...prev, fontSizePreference: fontSize }));
    }
  }, [fontSize]);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>('');

  // Auditors (PV) and Job Clients (RV) local states
  const [newAuditorInput, setNewAuditorInput] = useState('');
  const [editingAuditorIndex, setEditingAuditorIndex] = useState<number | null>(null);
  const [editingAuditorValue, setEditingAuditorValue] = useState<string>('');

  const [newJobClientInput, setNewJobClientInput] = useState('');
  const [editingJobClientIndex, setEditingJobClientIndex] = useState<number | null>(null);
  const [editingJobClientValue, setEditingJobClientValue] = useState<string>('');

  // Security config local states
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff' | 'viewer'>('staff');
  const [showNewPin, setShowNewPin] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserPin, setEditingUserPin] = useState<string>('');

  const handleStartEditCategory = (index: number, cat: string) => {
    setEditingCategoryIndex(index);
    setEditingCategoryValue(cat);
  };

  const handleSaveEditCategory = (index: number) => {
    const trimmed = editingCategoryValue.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      const next = [...(prev.accountCategories || [])];
      next[index] = trimmed;
      return { ...prev, accountCategories: next };
    });
    setEditingCategoryIndex(null);
    setEditingCategoryValue('');
  };

  // Sheet config state
  const [localSheetConfig, setLocalSheetConfig] = useState<GoogleSheetSyncConfig>(() => sheetConfig || {
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    autoSync: false,
    status: 'idle',
    statusMessage: 'พร้อมเชื่อมต่อ Google Sheet แบบเรียลไทม์',
  });

  const handleTextChange = (field: keyof CompanySettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRunningNumberChange = (field: keyof RunningNumberConfig, value: any) => {
    setFormData((prev) => ({
      ...prev,
      runningNumberConfig: {
        ...(prev.runningNumberConfig || {
          rvPrefix: 'RV69-',
          pvPrefix: 'PV69-',
          nextRvSeq: 1,
          nextPvSeq: 1,
          digitCount: 3,
          includeYearMonth: true,
        }),
        [field]: value,
      },
    }));
  };

  const handleBankChange = (index: number, field: keyof BankAccount, value: any) => {
    setFormData((prev) => {
      const nextBanks = [...prev.banks];
      nextBanks[index] = { ...nextBanks[index], [field]: value };
      return { ...prev, banks: nextBanks };
    });
  };

  const handleSetDefaultBank = (index: number) => {
    setFormData((prev) => {
      const nextBanks = prev.banks.map((b, i) => ({
        ...b,
        isDefault: i === index,
      }));
      return { ...prev, banks: nextBanks };
    });
  };

  const handleAddBank = () => {
    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: 'ธนาคารกสิกรไทย (KBANK)',
      bankCode: '004',
      accountNo: '101-2-34567-8',
      accountName: formData.name,
      branch: 'สาขาบางนา',
      isDefault: false,
      accountType: 'receiving',
      promptPayId: formData.taxId,
    };
    setFormData((prev) => ({ ...prev, banks: [...prev.banks, newBank] }));
  };

  const handleRemoveBank = (index: number) => {
    if (formData.banks.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      banks: prev.banks.filter((_, i) => i !== index),
    }));
  };

  // Add custom account category
  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (formData.accountCategories?.includes(trimmed)) {
      alert('หมวดบัญชีนี้มีอยู่ในระบบแล้ว');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      accountCategories: [...(prev.accountCategories || []), trimmed],
    }));
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      accountCategories: (prev.accountCategories || []).filter((c) => c !== catToRemove),
    }));
  };

  const handleResetCategories = () => {
    if (confirm('คุณต้องการรีเซ็ตรายการหมวดบัญชีกลับเป็นค่ามาตรฐานสรรพากรหรือไม่?')) {
      setFormData((prev) => ({
        ...prev,
        accountCategories: [...(DEFAULT_COMPANY_SETTINGS.accountCategories || [])],
      }));
    }
  };

  // Auditors Management (สำหรับใบสำคัญจ่าย PV)
  const handleAddAuditor = () => {
    const trimmed = newAuditorInput.trim();
    if (!trimmed) return;
    if (formData.auditors?.includes(trimmed)) {
      alert('รายชื่อผู้สอบบัญชีนี้มีอยู่ในระบบแล้ว');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      auditors: [...(prev.auditors || []), trimmed],
    }));
    setNewAuditorInput('');
    showToast('เพิ่มผู้สอบบัญชีใหม่เรียบร้อยแล้ว', 'success');
  };

  const handleRemoveAuditor = (auditorToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      auditors: (prev.auditors || []).filter((a) => a !== auditorToRemove),
    }));
    showToast('ลบรายชื่อผู้สอบบัญชีแล้ว', 'info');
  };

  const handleStartEditAuditor = (index: number, auditor: string) => {
    setEditingAuditorIndex(index);
    setEditingAuditorValue(auditor);
  };

  const handleSaveEditAuditor = (index: number) => {
    const trimmed = editingAuditorValue.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      const updated = [...(prev.auditors || [])];
      updated[index] = trimmed;
      return { ...prev, auditors: updated };
    });
    setEditingAuditorIndex(null);
    setEditingAuditorValue('');
    showToast('แก้ไขรายชื่อผู้สอบบัญชีเรียบร้อยแล้ว', 'success');
  };

  const handleResetAuditors = () => {
    if (confirm('คุณต้องการรีเซ็ตรายชื่อผู้สอบบัญชีกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      setFormData((prev) => ({
        ...prev,
        auditors: [...(DEFAULT_COMPANY_SETTINGS.auditors || [])],
      }));
      showToast('รีเซ็ตรายชื่อผู้สอบบัญชีเรียบร้อยแล้ว', 'info');
    }
  };

  // Job Clients Management (สำหรับใบสำคัญรับ RV)
  const handleAddJobClient = () => {
    const trimmed = newJobClientInput.trim();
    if (!trimmed) return;
    if (formData.jobClients?.includes(trimmed)) {
      alert('รายชื่อลูกค้าส่งงานนี้มีอยู่ในระบบแล้ว');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      jobClients: [...(prev.jobClients || []), trimmed],
    }));
    setNewJobClientInput('');
    showToast('เพิ่มลูกค้าส่งงานใหม่เรียบร้อยแล้ว', 'success');
  };

  const handleRemoveJobClient = (clientToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      jobClients: (prev.jobClients || []).filter((c) => c !== clientToRemove),
    }));
    showToast('ลบรายชื่อลูกค้าส่งงานแล้ว', 'info');
  };

  const handleStartEditJobClient = (index: number, client: string) => {
    setEditingJobClientIndex(index);
    setEditingJobClientValue(client);
  };

  const handleSaveEditJobClient = (index: number) => {
    const trimmed = editingJobClientValue.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      const updated = [...(prev.jobClients || [])];
      updated[index] = trimmed;
      return { ...prev, jobClients: updated };
    });
    setEditingJobClientIndex(null);
    setEditingJobClientValue('');
    showToast('แก้ไขรายชื่อลูกค้าส่งงานเรียบร้อยแล้ว', 'success');
  };

  const handleResetJobClients = () => {
    if (confirm('คุณต้องการรีเซ็ตรายชื่อลูกค้าส่งงานกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      setFormData((prev) => ({
        ...prev,
        jobClients: [...(DEFAULT_COMPANY_SETTINGS.jobClients || [])],
      }));
      showToast('รีเซ็ตรายชื่อลูกค้าส่งงานเรียบร้อยแล้ว', 'info');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, companyStampUrl: dataUrl }));
        showToast('อัปโหลดตราประทับบริษัทใหม่เรียบร้อยแล้ว', 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, payerSignatureUrl: dataUrl }));
        showToast('อัปโหลดลายเซ็นต์ผู้มีอำนาจใหม่เรียบร้อยแล้ว', 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePartySignatureUpload = (
    field: 'defaultPreparedBySignatureUrl' | 'defaultCheckedBySignatureUrl' | 'defaultApprovedBySignatureUrl' | 'defaultReceivedOrPaidSignatureUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, [field]: dataUrl }));
        showToast('อัปโหลดลายเซ็นต์ใหม่เรียบร้อยแล้ว', 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลบริษัท ธนาคาร และการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      setFormData(DEFAULT_COMPANY_SETTINGS);
      onSave(DEFAULT_COMPANY_SETTINGS);
    }
  };

  // Security Configuration Handlers
  const handleToggleRequirePassword = (enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      securityConfig: {
        ...(prev.securityConfig || {
          requirePasswordOnStartup: false,
          adminPin: '820820',
          adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
          userAccounts: [],
          lockTimeoutMinutes: 0,
        }),
        requirePasswordOnStartup: enabled,
      },
    }));
  };

  const handleUpdateAdminPin = (newPin: string) => {
    setFormData((prev) => ({
      ...prev,
      securityConfig: {
        ...(prev.securityConfig || {
          requirePasswordOnStartup: false,
          adminPin: '820820',
          adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
          userAccounts: [],
          lockTimeoutMinutes: 0,
        }),
        adminPin: newPin,
      },
    }));
  };

  const handleUpdateAdminDisplayName = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      securityConfig: {
        ...(prev.securityConfig || {
          requirePasswordOnStartup: false,
          adminPin: '820820',
          adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
          userAccounts: [],
          lockTimeoutMinutes: 0,
        }),
        adminDisplayName: name,
      },
    }));
  };

  const handleUpdateLockTimeout = (minutes: number) => {
    setFormData((prev) => ({
      ...prev,
      securityConfig: {
        ...(prev.securityConfig || {
          requirePasswordOnStartup: false,
          adminPin: '820820',
          adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
          userAccounts: [],
          lockTimeoutMinutes: 0,
        }),
        lockTimeoutMinutes: minutes,
      },
    }));
  };

  const handleToggleHideSharedAdminBtn = (hide: boolean) => {
    setFormData((prev) => ({
      ...prev,
      securityConfig: {
        ...(prev.securityConfig || {
          requirePasswordOnStartup: false,
          adminPin: '820820',
          adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
          userAccounts: [],
          lockTimeoutMinutes: 0,
        }),
        hideSharedDashboardAdminBtn: hide,
      },
    }));
  };

  const handleAddUserAccount = () => {
    if (!newUsername.trim() || !newPin.trim()) {
      alert('กรุณาระบุ Username และ PIN / รหัสผ่าน');
      return;
    }

    const currentUsers = formData.securityConfig?.userAccounts || [];
    if (currentUsers.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      alert('มีชื่อผู้ใช้งาน (Username) นี้อยู่ในระบบแล้ว');
      return;
    }

    const newUser: AppUserAccount = {
      id: `user-${Date.now()}`,
      username: newUsername.trim(),
      displayName: newDisplayName.trim() || newUsername.trim(),
      pinOrPassword: newPin.trim(),
      role: newRole,
      createdAt: new Date().toISOString(),
    };

    setFormData((prev) => ({
      ...prev,
      securityConfig: {
        ...(prev.securityConfig || {
          requirePasswordOnStartup: false,
          adminPin: '820820',
          adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
          userAccounts: [],
          lockTimeoutMinutes: 0,
        }),
        userAccounts: [...(prev.securityConfig?.userAccounts || []), newUser],
      },
    }));

    setNewUsername('');
    setNewDisplayName('');
    setNewPin('');
    setNewRole('staff');
    setShowAddUserForm(false);
    showToast('เพิ่มผู้ใช้งานระบบเรียบร้อยแล้ว', 'success');
  };

  const handleDeleteUserAccount = (id: string) => {
    if (confirm('คุณต้องการลบผู้ใช้งานนี้ใช่หรือไม่?')) {
      setFormData((prev) => ({
        ...prev,
        securityConfig: {
          ...(prev.securityConfig || {
            requirePasswordOnStartup: false,
            adminPin: '820820',
            adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
            userAccounts: [],
            lockTimeoutMinutes: 0,
          }),
          userAccounts: (prev.securityConfig?.userAccounts || []).filter(u => u.id !== id),
        },
      }));
      showToast('ลบผู้ใช้งานเรียบร้อยแล้ว', 'info');
    }
  };

  const handleSaveUserPin = (id: string) => {
    if (!editingUserPin.trim()) return;
    setFormData((prev) => ({
      ...prev,
      securityConfig: {
        ...(prev.securityConfig || {
          requirePasswordOnStartup: false,
          adminPin: '820820',
          adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
          userAccounts: [],
          lockTimeoutMinutes: 0,
        }),
        userAccounts: (prev.securityConfig?.userAccounts || []).map(u => 
          u.id === id ? { ...u, pinOrPassword: editingUserPin.trim() } : u
        ),
      },
    }));
    setEditingUserId(null);
    setEditingUserPin('');
    showToast('อัปเดตรหัสผ่านผู้ใช้งานเรียบร้อยแล้ว', 'success');
  };

  const handleUpdateUserRole = (id: string, role: 'admin' | 'staff' | 'viewer') => {
    setFormData((prev) => ({
      ...prev,
      securityConfig: {
        ...(prev.securityConfig || {
          requirePasswordOnStartup: false,
          adminPin: '820820',
          adminDisplayName: 'ผู้ดูแลระบบหลัก (Admin)',
          userAccounts: [],
          lockTimeoutMinutes: 0,
        }),
        userAccounts: (prev.securityConfig?.userAccounts || []).map(u => 
          u.id === id ? { ...u, role } : u
        ),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    if (onUpdateSheetConfig) {
      onUpdateSheetConfig(localSheetConfig);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Running numbers state helper
  const runningConfig: RunningNumberConfig = formData.runningNumberConfig || {
    ivPrefix: 'IV69-',
    rvPrefix: 'RV69-',
    pvPrefix: 'PV69-',
    nextIvSeq: 1,
    nextRvSeq: 8,
    nextPvSeq: 6,
    digitCount: 3,
    includeYearMonth: true,
  };

  const handleApplyYear69Preset = () => {
    setFormData((prev) => ({
      ...prev,
      runningNumberConfig: {
        ...(prev.runningNumberConfig || {
          rvPrefix: 'RV69-',
          pvPrefix: 'PV69-',
          nextRvSeq: 1,
          nextPvSeq: 1,
          digitCount: 3,
          includeYearMonth: true,
        }),
        ivPrefix: 'IV69-',
        rvPrefix: 'RV69-',
        pvPrefix: 'PV69-',
      },
    }));
  };

  const handleAddBankOfType = (type: BankAccountUsage) => {
    const isRec = type === 'receiving';
    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: isRec ? 'ธนาคารไทยพาณิชย์ (SCB)' : 'ธนาคารกสิกรไทย (KBANK)',
      bankCode: isRec ? '014' : '004',
      accountNo: '',
      accountName: formData.name,
      branch: 'สำนักงานใหญ่',
      isDefault: false,
      accountType: type,
      promptPayId: isRec ? formData.taxId : undefined,
    };
    setFormData((prev) => ({ ...prev, banks: [...prev.banks, newBank] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>การตั้งค่าระบบและองค์กร</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1 font-prompt">
              ข้อมูลบริษัท ธนาคารรับ/จ่าย หมวดบัญชี และ Google Sheet Sync
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              กำหนดข้อมูลมาตรฐานขององค์กร แยกธนาคารรับ-จ่ายเงิน ตั้งค่าเลขรัน IV/RV/PV และจัดการการเชื่อมต่อ Google Sheet แบบ Live Artifacts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตค่าเริ่มต้น</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>บันทึกการตั้งค่าเรียบร้อยแล้ว ทุกฟังก์ชันในระบบอัปเดตข้อมูลชุดนี้ทันที</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Profile */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-3 mb-4">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>1. ข้อมูลนิติบุคคลและที่ตั้งสำนักงาน (หัวกระดาษเอกสารทางการ)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ชื่อบริษัทภาษาไทย <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleTextChange('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เลขประจำตัวผู้เสียภาษีอากร 13 หลัก <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => handleTextChange('taxId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ที่ตั้งสำนักงาน (เลขที่, อาคาร, ซอย, ถนน) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleTextChange('address', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">แขวง / ตำบล</label>
              <input
                type="text"
                value={formData.subDistrict}
                onChange={(e) => handleTextChange('subDistrict', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">เขต / อำเภอ</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleTextChange('district', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">จังหวัด</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => handleTextChange('province', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">รหัสไปรษณีย์</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleTextChange('postalCode', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleTextChange('phone', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">สาขา</label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => handleTextChange('branch', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">รหัสสาขา 5 หลัก</label>
              <input
                type="text"
                value={formData.branchCode}
                onChange={(e) => handleTextChange('branchCode', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bank Accounts with Distinct Receiving & Disbursing Separation */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>2. บัญชีธนาคาร แยกประเภท &quot;ธนาคารผู้รับเงิน&quot; และ &quot;ธนาคารผู้จ่ายเงิน&quot;</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                แยกบัญชีสำหรับใบสำคัญรับ (RV / เงินเข้าลูกค้าโอน) และใบสำคัญจ่าย (PV / เงินออกจ่ายผู้สอบ-คู่ค้า) อย่างชัดเจน
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddBankOfType('receiving')}
                className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มธนาคารผู้รับเงิน (RV)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddBankOfType('disbursing')}
                className="flex items-center gap-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มธนาคารผู้จ่ายเงิน (PV)</span>
              </button>
            </div>
          </div>

          {/* 2.1 Receiving Banks Sub-section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-emerald-950 font-prompt">
                  ธนาคารผู้รับเงิน (Receiving Banks) — สำหรับใบสำคัญรับ (RV) & PromptPay รับโอน
                </span>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                เงินเข้า (RV)
              </span>
            </div>

            <div className="space-y-3">
              {formData.banks
                .map((bank, originalIdx) => ({ bank, originalIdx }))
                .filter(({ bank }) => bank.accountType === 'receiving' || bank.accountType === 'both' || !bank.accountType)
                .map(({ bank, originalIdx }) => (
                  <div
                    key={bank.id}
                    className={`p-4 rounded-xl border transition ${
                      bank.isDefault ? 'border-emerald-400 bg-emerald-50/20 shadow-xs' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {bank.bankName}
                        </span>
                        {bank.isDefault ? (
                          <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                            บัญชีหลักรับเงิน
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultBank(originalIdx)}
                            className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
                          >
                            ตั้งเป็นบัญชีหลักรับเงิน
                          </button>
                        )}
                        {bank.accountType === 'both' && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            ใช้ทั้งรับและจ่าย
                          </span>
                        )}
                      </div>

                      {/* Change usage */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">ประเภท:</span>
                        <select
                          value={bank.accountType || 'receiving'}
                          onChange={(e) => handleBankChange(originalIdx, 'accountType', e.target.value)}
                          className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white font-medium text-slate-700"
                        >
                          <option value="receiving">ธนาคารผู้รับเงิน (RV)</option>
                          <option value="disbursing">ธนาคารผู้จ่ายเงิน (PV)</option>
                          <option value="both">ทั้งรับและจ่าย</option>
                        </select>

                        {formData.banks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBank(originalIdx)}
                            className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition cursor-pointer ml-1"
                            title="ลบบัญชีนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 mb-1">ชื่อธนาคาร</label>
                        <input
                          type="text"
                          value={bank.bankName}
                          onChange={(e) => handleBankChange(originalIdx, 'bankName', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">เลขที่บัญชี</label>
                        <input
                          type="text"
                          value={bank.accountNo}
                          onChange={(e) => handleBankChange(originalIdx, 'accountNo', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-emerald-900"
                          placeholder="เช่น 082-248912-3"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">ชื่อเจ้าของบัญชี</label>
                        <input
                          type="text"
                          value={bank.accountName}
                          onChange={(e) => handleBankChange(originalIdx, 'accountName', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">สาขาธนาคาร</label>
                        <input
                          type="text"
                          value={bank.branch}
                          onChange={(e) => handleBankChange(originalIdx, 'branch', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">PromptPay ID (รับโอนเงิน)</label>
                        <input
                          type="text"
                          value={bank.promptPayId || ''}
                          onChange={(e) => handleBankChange(originalIdx, 'promptPayId', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white font-mono text-emerald-800 font-bold"
                          placeholder={formData.taxId || 'เลข 13 หลัก'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 2.2 Disbursing Banks Sub-section */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between bg-rose-50/70 p-3 rounded-xl border border-rose-200">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-rose-950 font-prompt">
                  ธนาคารผู้จ่ายเงิน (Paying / Disbursing Banks) — สำหรับใบสำคัญจ่าย (PV) จ่ายค่าบริการ/ผู้สอบ/คู่ค้า
                </span>
              </div>
              <span className="text-[11px] text-rose-800 font-medium bg-white px-2 py-0.5 rounded-full border border-rose-200">
                เงินออก (PV)
              </span>
            </div>

            <div className="space-y-3">
              {formData.banks
                .map((bank, originalIdx) => ({ bank, originalIdx }))
                .filter(({ bank }) => bank.accountType === 'disbursing' || bank.accountType === 'both')
                .map(({ bank, originalIdx }) => (
                  <div
                    key={bank.id}
                    className={`p-4 rounded-xl border transition ${
                      bank.isDefault ? 'border-rose-400 bg-rose-50/20 shadow-xs' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {bank.bankName}
                        </span>
                        {bank.isDefault ? (
                          <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                            บัญชีหลักจ่ายเงิน
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultBank(originalIdx)}
                            className="text-[11px] text-rose-700 hover:underline cursor-pointer"
                          >
                            ตั้งเป็นบัญชีหลักจ่ายเงิน
                          </button>
                        )}
                        {bank.accountType === 'both' && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            ใช้ทั้งรับและจ่าย
                          </span>
                        )}
                      </div>

                      {/* Change usage */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">ประเภท:</span>
                        <select
                          value={bank.accountType || 'disbursing'}
                          onChange={(e) => handleBankChange(originalIdx, 'accountType', e.target.value)}
                          className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white font-medium text-slate-700"
                        >
                          <option value="disbursing">ธนาคารผู้จ่ายเงิน (PV)</option>
                          <option value="receiving">ธนาคารผู้รับเงิน (RV)</option>
                          <option value="both">ทั้งรับและจ่าย</option>
                        </select>

                        {formData.banks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBank(originalIdx)}
                            className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition cursor-pointer ml-1"
                            title="ลบบัญชีนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 mb-1">ชื่อธนาคาร</label>
                        <input
                          type="text"
                          value={bank.bankName}
                          onChange={(e) => handleBankChange(originalIdx, 'bankName', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">เลขที่บัญชี</label>
                        <input
                          type="text"
                          value={bank.accountNo}
                          onChange={(e) => handleBankChange(originalIdx, 'accountNo', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-rose-900"
                          placeholder="เช่น 738-2-89214-5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">ชื่อเจ้าของบัญชี</label>
                        <input
                          type="text"
                          value={bank.accountName}
                          onChange={(e) => handleBankChange(originalIdx, 'accountName', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">สาขาธนาคาร</label>
                        <input
                          type="text"
                          value={bank.branch}
                          onChange={(e) => handleBankChange(originalIdx, 'branch', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Section 3: Document Running Number Config (IV / RV / PV เช่น IV69, RV69, PV69) */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <Hash className="w-4 h-4 text-blue-600" />
                <span>3. ตั้งค่าเลขรันเอกสาร (IV, RV และ PV เช่น ปี 2569 กำหนดเป็น IV69, RV69, PV69)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดคำนำหน้า (Prefix) และลำดับเริ่มต้นแยกตามประเภทเอกสาร สามารถแก้ไขและเพิ่มเติมได้อิสระ
              </p>
            </div>

            <button
              type="button"
              onClick={handleApplyYear69Preset}
              className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 transition cursor-pointer"
              title="ตั้งคำนำหน้าปี 2569 เป็น IV69-, RV69-, PV69-"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>⚡ ตั้งค่าตามปี 2569 (IV69-, RV69-, PV69-)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* IV Prefix (Invoice / ใบแจ้งหนี้ / ใบกำกับภาษี) */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  คำนำหน้าใบแจ้งหนี้ (IV)
                </span>
                <span className="text-[11px] bg-blue-200/80 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                  Invoice
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  คำนำหน้า (Prefix) เช่น IV69-, INV-
                </label>
                <input
                  type="text"
                  value={runningConfig.ivPrefix || 'IV69-'}
                  onChange={(e) => handleRunningNumberChange('ivPrefix', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg font-mono font-bold bg-white text-blue-950"
                  placeholder="IV69-"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  ลำดับถัดไป (Next Sequence)
                </label>
                <input
                  type="number"
                  min="1"
                  value={runningConfig.nextIvSeq || 1}
                  onChange={(e) => handleRunningNumberChange('nextIvSeq', parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-200 text-xs">
                <span className="text-slate-500 block text-[11px]">ตัวอย่างเลขถัดไป:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {runningConfig.ivPrefix || 'IV69-'}
                  {String(runningConfig.nextIvSeq || 1).padStart(runningConfig.digitCount || 3, '0')}
                </span>
              </div>
            </div>

            {/* RV Prefix (Receipt Voucher / ใบสำคัญรับ) */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  คำนำหน้าใบสำคัญรับ (RV / IV)
                </span>
                <span className="text-[11px] bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  รับเงิน
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  คำนำหน้า (Prefix) เช่น RV69-, IV69-
                </label>
                <input
                  type="text"
                  value={runningConfig.rvPrefix}
                  onChange={(e) => handleRunningNumberChange('rvPrefix', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg font-mono font-bold bg-white text-emerald-950"
                  placeholder="RV69- หรือ IV69-"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  ลำดับถัดไป (Next Sequence)
                </label>
                <input
                  type="number"
                  min="1"
                  value={runningConfig.nextRvSeq}
                  onChange={(e) => handleRunningNumberChange('nextRvSeq', parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs">
                <span className="text-slate-500 block text-[11px]">ตัวอย่างเลขถัดไป:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {runningConfig.rvPrefix}
                  {String(runningConfig.nextRvSeq).padStart(runningConfig.digitCount || 3, '0')}
                </span>
              </div>
            </div>

            {/* PV Prefix (Payment Voucher / ใบสำคัญจ่าย) */}
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  คำนำหน้าใบสำคัญจ่าย (PV)
                </span>
                <span className="text-[11px] bg-rose-200/80 text-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                  จ่ายเงิน
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  คำนำหน้า (Prefix) เช่น PV69-, PV-
                </label>
                <input
                  type="text"
                  value={runningConfig.pvPrefix}
                  onChange={(e) => handleRunningNumberChange('pvPrefix', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-rose-300 rounded-lg font-mono font-bold bg-white text-rose-950"
                  placeholder="PV69-"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  ลำดับถัดไป (Next Sequence)
                </label>
                <input
                  type="number"
                  min="1"
                  value={runningConfig.nextPvSeq}
                  onChange={(e) => handleRunningNumberChange('nextPvSeq', parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-sm border border-rose-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-rose-200 text-xs">
                <span className="text-slate-500 block text-[11px]">ตัวอย่างเลขถัดไป:</span>
                <span className="font-mono font-bold text-rose-700 text-sm">
                  {runningConfig.pvPrefix}
                  {String(runningConfig.nextPvSeq).padStart(runningConfig.digitCount || 3, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Digit Count Row */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">จำนวนหลักของตัวเลขรัน (Digit Count):</span>
              <select
                value={runningConfig.digitCount || 3}
                onChange={(e) => handleRunningNumberChange('digitCount', parseInt(e.target.value, 10))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value={3}>3 หลัก (เช่น 001, 002, 003)</option>
                <option value={4}>4 หลัก (เช่น 0001, 0002, 0003)</option>
                <option value={5}>5 หลัก (เช่น 00001, 00002)</option>
              </select>
            </div>
            <div className="text-slate-500 text-[11px]">
              * เมื่อสร้างใบสำคัญระบบจะคำนวณเลขรันถัดไปตามการตั้งค่านี้โดยอัตโนมัติ
            </div>
          </div>
        </div>

        {/* Section 4: Account Categories Management */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>4. จัดการหมวดบัญชี (Account Categories) สามารถเพิ่ม-แก้ไขได้อิสระ</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                หมวดบัญชีเหล่านี้จะแสดงในรายการตัวเลือกของใบสำคัญรับและใบสำคัญจ่ายทั้งหมดในระบบ ({formData.accountCategories?.length || 0} หมวด)
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetCategories}
              className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              คืนค่าหมวดมาตรฐาน
            </button>
          </div>

          {/* Add Category Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="พิมพ์ชื่อหมวดบัญชีใหม่ เช่น ค่าจ้างตรวจสต๊อกสินค้า, ค่าบริการสอบบัญชีพิเศษ..."
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มหมวดบัญชี</span>
            </button>
          </div>

          {/* Category Badges with Inline Edit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
            {(formData.accountCategories || []).map((cat, idx) => {
              const isEditing = editingCategoryIndex === idx;

              return (
                <div
                  key={`${cat}-${idx}`}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs transition hover:border-slate-300"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingCategoryValue}
                        onChange={(e) => setEditingCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEditCategory(idx);
                          } else if (e.key === 'Escape') {
                            setEditingCategoryIndex(null);
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-blue-400 rounded bg-white focus:outline-none font-medium"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditCategory(idx)}
                        className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
                        title="บันทึกชื่อหมวด"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-800 truncate" title={cat}>
                        {cat}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(idx, cat)}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-200 transition cursor-pointer"
                          title="แก้ไขชื่อหมวดนี้"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="ลบหมวดนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Master Data for Vouchers - Auditors (PV) & Job Clients (RV) */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>5. ตัวเลือกใบสำคัญ: ผู้สอบบัญชี (สำหรับ PV) & ลูกค้าส่งงาน (สำหรับ RV)</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                Dropdown Lists สำหรับการออกเอกสาร
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ผู้ดูแลระบบสามารถตั้งค่ารายชื่อผู้สอบบัญชีเพื่อเลือกในใบสำคัญจ่าย (PV) และรายชื่อลูกค้าส่งงานเพื่อเลือกในใบสำคัญรับ (RV) ซึ่งจะแสดงผลลงในเอกสารใบสำคัญ A4 โดยอัตโนมัติ
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: รายชื่อผู้สอบบัญชี (Auditors) for PV */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>รายชื่อผู้สอบบัญชี (Auditors / CPAs)</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                        PV ({formData.auditors?.length || 0})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      แสดงเป็นตัวเลือก Dropdown ในหน้าออกใบสำคัญจ่าย (PV)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetAuditors}
                    className="text-[11px] text-indigo-700 hover:text-indigo-900 border border-indigo-200 hover:bg-white px-2 py-1 rounded transition cursor-pointer"
                  >
                    คืนค่าตั้งต้น
                  </button>
                </div>

                {/* Add Auditor Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAuditorInput}
                    onChange={(e) => setNewAuditorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAuditor();
                      }
                    }}
                    placeholder="พิมพ์ชื่อผู้สอบบัญชี เช่น นายอนุชิต (CPA 11234)..."
                    className="flex-1 px-3 py-1.5 text-xs border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddAuditor}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มผู้สอบ</span>
                  </button>
                </div>

                {/* List of Auditors */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {(formData.auditors || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 bg-white/70 rounded-lg border border-dashed border-indigo-200">
                      ยังไม่มีรายชื่อผู้สอบบัญชี (คลิกคืนค่าตั้งต้นเพื่อเพิ่ม)
                    </div>
                  ) : (
                    (formData.auditors || []).map((auditor, idx) => {
                      const isEditing = editingAuditorIndex === idx;

                      return (
                        <div
                          key={`auditor-${idx}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg border border-indigo-100 bg-white text-xs transition hover:border-indigo-300 shadow-2xs"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={editingAuditorValue}
                                onChange={(e) => setEditingAuditorValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEditAuditor(idx);
                                  } else if (e.key === 'Escape') {
                                    setEditingAuditorIndex(null);
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs border border-indigo-400 rounded bg-indigo-50/30 focus:outline-none font-medium"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditAuditor(idx)}
                                className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
                                title="บันทึก"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingAuditorIndex(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                title="ยกเลิก"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-slate-800 truncate" title={auditor}>
                                  {auditor}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditAuditor(idx, auditor)}
                                  className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer text-xs"
                                  title="แก้ไขชื่อผู้สอบบัญชี"
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAuditor(auditor)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                                  title="ลบรายชื่อนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-100 text-[11px] text-indigo-900 bg-indigo-100/40 p-2 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>เมื่อเลือกผู้สอบบัญชีในใบสำคัญจ่าย ระบบจะระบุชื่อและตำแหน่งในใบสำคัญจ่าย PV ให้โดยอัตโนมัติ</span>
              </div>
            </div>

            {/* Right Card: รายชื่อลูกค้าส่งงาน (Job Clients) for RV */}
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/20 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-teal-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-teal-950">
                      <Briefcase className="w-4 h-4 text-teal-600" />
                      <span>รายชื่อลูกค้าส่งงาน (Job Clients / Delivery)</span>
                      <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                        RV ({formData.jobClients?.length || 0})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      แสดงเป็นตัวเลือก Dropdown ในหน้าออกใบสำคัญรับ (RV)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetJobClients}
                    className="text-[11px] text-teal-700 hover:text-teal-900 border border-teal-200 hover:bg-white px-2 py-1 rounded transition cursor-pointer"
                  >
                    คืนค่าตั้งต้น
                  </button>
                </div>

                {/* Add Job Client Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newJobClientInput}
                    onChange={(e) => setNewJobClientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddJobClient();
                      }
                    }}
                    placeholder="พิมพ์ชื่อลูกค้าส่งงาน เช่น บริษัท สยามเทค อินดัสทรี..."
                    className="flex-1 px-3 py-1.5 text-xs border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddJobClient}
                    className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มลูกค้า</span>
                  </button>
                </div>

                {/* List of Job Clients */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {(formData.jobClients || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 bg-white/70 rounded-lg border border-dashed border-teal-200">
                      ยังไม่มีรายชื่อลูกค้าส่งงาน (คลิกคืนค่าตั้งต้นเพื่อเพิ่ม)
                    </div>
                  ) : (
                    (formData.jobClients || []).map((client, idx) => {
                      const isEditing = editingJobClientIndex === idx;

                      return (
                        <div
                          key={`client-${idx}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg border border-teal-100 bg-white text-xs transition hover:border-teal-300 shadow-2xs"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={editingJobClientValue}
                                onChange={(e) => setEditingJobClientValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEditJobClient(idx);
                                  } else if (e.key === 'Escape') {
                                    setEditingJobClientIndex(null);
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs border border-teal-400 rounded bg-teal-50/30 focus:outline-none font-medium"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditJobClient(idx)}
                                className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
                                title="บันทึก"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingJobClientIndex(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                title="ยกเลิก"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-slate-800 truncate" title={client}>
                                  {client}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditJobClient(idx, client)}
                                  className="text-slate-400 hover:text-teal-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer text-xs"
                                  title="แก้ไขชื่อลูกค้าส่งงาน"
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveJobClient(client)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                                  title="ลบรายชื่อนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-teal-100 text-[11px] text-teal-900 bg-teal-100/40 p-2 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>เมื่อเลือกลูกค้าส่งงานในใบสำคัญรับ ระบบจะระบุในใบสำคัญรับ RV และสามารถเชื่อมโยงเป็นชื่อลูกค้าได้ทันที</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Display & Font Size Scale (การแสดงผลและปรับขนาดตัวหนังสือในระบบ) */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <FontSizeSelector
            fontSize={formData.fontSizePreference || fontSize || 'large'}
            onChangeFontSize={(newSize) => {
              setFormData(prev => ({ ...prev, fontSizePreference: newSize }));
              if (onChangeFontSize) {
                onChangeFontSize(newSize);
              }
            }}
            variant="settings-card"
          />
        </div>

        {/* Section 7: Google Sheet Live Artifacts Sync & Google Drive Folder (Moved here as requested!) */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>7. Google Sheet Live Artifacts Sync & โฟลเดอร์ Google Drive</span>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Live Cloud Storage
            </span>
          </div>

          <div className="space-y-4">
            {/* Google Drive Folder Link Prominent Box */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-950">
                    โฟลเดอร์ Google Drive สำหรับจัดเก็บไฟล์เอกสารและชีตของระบบ
                  </div>
                  <div className="text-[11px] text-blue-700 font-mono break-all">
                    {formData.googleDriveFolderUrl}
                  </div>
                </div>
              </div>

              <a
                href={formData.googleDriveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition"
              >
                <span>เปิดโฟลเดอร์ Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Google Sheet URL */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-8">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Google Sheet URL (สำหรับ Live Artifacts)
                </label>
                <input
                  type="url"
                  value={localSheetConfig.sheetUrl}
                  onChange={(e) => setLocalSheetConfig(prev => ({ ...prev, sheetUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </div>

              <div className="md:col-span-4 flex items-end">
                {onSyncSheet && (
                  <button
                    type="button"
                    onClick={onSyncSheet}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'กำลังซิงค์ข้อมูล...' : 'ดึงข้อมูลสดจาก Google Sheet ทันที'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status note */}
            {localSheetConfig.lastSyncedAt && (
              <div className="text-[11px] text-slate-500 font-mono">
                ซิงค์ข้อมูลล่าสุด: {new Date(localSheetConfig.lastSyncedAt).toLocaleString('th-TH')} • สถานะ: {localSheetConfig.statusMessage || 'พร้อมใช้งาน'}
              </div>
            )}

            {/* Customer Directory Google Sheet URL */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>ลิงก์ Google Sheets สำหรับรายชื่อลูกค้าทั้งหมด (Customer Directory Sync)</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                ระบุลิงก์ชีต Google Sheets ที่มีข้อมูลรายชื่อลูกค้า เพื่อให้ระบบดึงชื่อบริษัท, เลขทะเบียนนิติบุคคล 13 หลัก และที่อยู่สำนักงานไปใช้งานในใบสำคัญอัตโนมัติ
              </p>
              <input
                type="url"
                value={formData.customerSheetUrl || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, customerSheetUrl: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Logo Management */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-3 mb-4">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            <span>6. ตราสัญลักษณ์โลโก้บริษัท (Account Planet)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 mb-3 font-medium">ตัวอย่างโลโก้ในเอกสาร:</span>
              <AccountPlanetLogo customLogoUrl={formData.logoUrl} size="lg" showText={true} />
            </div>

            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  อัปโหลดไฟล์รูปภาพโลโก้ใหม่ (PNG, JPG, SVG)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer border border-slate-300 transition">
                    <Upload className="w-4 h-4" />
                    <span>เลือกไฟล์จากเครื่อง...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.logoUrl && formData.logoUrl !== '/account-planet-logo.svg' && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logoUrl: '/account-planet-logo.svg' }))}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      คืนค่าเป็นโลโก้มาตรฐาน (Account Planet)
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  หรือระบุ URL รูปภาพโลโก้ภายนอก
                </label>
                <input
                  type="url"
                  value={formData.logoUrl || ''}
                  onChange={(e) => handleTextChange('logoUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  placeholder="/account-planet-logo.svg หรือ https://example.com/logo.png"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Company Stamp & Authorized Signatures for Tax 50 Tawi */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>7. ตราประทับบริษัท &amp; ลายเซ็นต์ผู้มีอำนาจในแบบหนังสือรับรองภาษี 50 ทวิ (ภ.ง.ด.3 / ภ.ง.ด.53)</span>
            </div>
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>e-Filing Certified</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-6">
            กำหนดตราประทับนิติบุคคลและลายเซ็นต์ของผู้จ่ายเงินสำหรับประทับลงในหนังสือรับรองการหักภาษี ณ ที่จ่าย (มาตรา 50 ทวิ) โดยอัตโนมัติ สามารถอัปโหลดไฟล์รูปภาพใหม่เพื่อปรับเปลี่ยนได้ตลอดเวลา
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. ตราประทับบริษัท (Company Stamp) */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">ตราประทับบริษัท (Company Stamp)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    PNG / SVG / JPG โปร่งใส
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-24 h-24 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs">
                    {formData.companyStampUrl ? (
                      <img
                        src={formData.companyStampUrl}
                        alt="ตราประทับบริษัท"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center">ไม่มีตราประทับ</span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 text-xs">
                    <div className="font-semibold text-slate-800">
                      ตราประทับ "บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด"
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      จะถูกประทับลงในช่องลายมือชื่อผู้มีหน้าที่หักภาษี ณ ที่จ่าย ฉบับที่ 1 และฉบับที่ 2
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดตราประทับใหม่</span>
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
                    setFormData((prev) => ({ ...prev, companyStampUrl: '/stamps/company_stamp.svg' }));
                    showToast('รีเซ็ตเป็นตราประทับทางการเรียบร้อยแล้ว', 'info');
                  }}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ใช้ตราประทับตั้งต้น</span>
                </button>
              </div>
            </div>

            {/* 2. ลายเซ็นต์ผู้จ่ายเงิน (Authorized Payer Signature) */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">ลายเซ็นต์ผู้จ่ายเงิน (Sign Aphiwatch)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    หมึกสีน้ำเงิน / สีดำ
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-28 h-24 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs">
                    {formData.payerSignatureUrl ? (
                      <img
                        src={formData.payerSignatureUrl}
                        alt="ลายเซ็นต์ผู้จ่ายเงิน"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center">ไม่มีลายเซ็นต์</span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 text-xs">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      ชื่อ-นามสกุล ผู้มีอำนาจลงนาม / ผู้จ่ายเงิน:
                    </label>
                    <input
                      type="text"
                      value={formData.payerName || ''}
                      onChange={(e) => handleTextChange('payerName', e.target.value)}
                      placeholder="เช่น นายอภิวัฒน์"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400">
                      จะแสดงชื่อใต้เส้นประ "ลงชื่อ ................... ผู้จ่ายเงิน"
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดลายเซ็นต์ใหม่</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ 
                      ...prev, 
                      payerSignatureUrl: '/signatures/sign_aphiwatch.svg',
                      payerName: 'นายอภิวัฒน์'
                    }));
                    showToast('รีเซ็ตเป็นลายเซ็นต์ทางการเรียบร้อยแล้ว', 'info');
                  }}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ใช้ลายเซ็นต์ตั้งต้น</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Block on 50 Tawi */}
          <div className="mt-6 p-4 rounded-xl border border-blue-200 bg-blue-50/30">
            <div className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>ตัวอย่างการแสดงผลจริงบนแบบหนังสือรับรอง 50 ทวิ (Preview on Certificate):</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-300 max-w-md mx-auto text-center relative shadow-xs">
              <div className="text-[11px] font-semibold text-slate-700 mb-1">
                ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงกับความจริงทุกประการ
              </div>

              <div className="relative min-h-[110px] flex items-center justify-center my-1">
                {formData.companyStampUrl && (
                  <div className="absolute right-6 top-1 pointer-events-none select-none z-10">
                    <img 
                      src={formData.companyStampUrl} 
                      alt="ตราประทับตัวอย่าง" 
                      className="w-28 h-auto object-contain opacity-95"
                      style={{ mixBlendMode: 'multiply' }}
                    />
                  </div>
                )}
                {formData.payerSignatureUrl && (
                  <div className="absolute left-10 top-3 pointer-events-none select-none z-20">
                    <img 
                      src={formData.payerSignatureUrl} 
                      alt="ลายเซ็นต์ตัวอย่าง" 
                      className="w-36 h-auto object-contain"
                      style={{ mixBlendMode: 'multiply' }}
                    />
                  </div>
                )}
                <div className="w-full pt-16">
                  <div className="border-b border-dotted border-slate-800 w-48 mx-auto mb-1"></div>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-900">
                ({formData.payerName || 'นายอภิวัฒน์'})
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                ผู้จ่ายเงิน • วันที่ ...
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                ประทับตรานิติบุคคล {formData.name}
              </div>
            </div>
          </div>

          {/* Sub-section: 4-Party Internal Control Signatures & Stamp for Vouchers */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>ลายเซ็นต์ผู้มีอำนาจลงนาม 4 ฝ่าย ในใบสำคัญรับ/จ่าย (Internal Control 4 Parties)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ตั้งค่าชื่อและรูปภาพลายมือชื่อตั้งต้นสำหรับ 4 ฝ่าย พร้อมตัวเลือกแสดงตราประทับนิติบุคคลในใบสำคัญ RV/PV ทุกฉบับ
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs">
                <input
                  type="checkbox"
                  checked={formData.defaultShowStampOnVouchers ?? true}
                  onChange={(e) => setFormData((prev) => ({ ...prev, defaultShowStampOnVouchers: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-800">
                  ประทับตรานิติบุคคลลงในใบสำคัญ RV/PV อัตโนมัติ
                </span>
              </label>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. ผู้จัดทำ */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">1. ผู้จัดทำ (Prepared By)</span>
                    {formData.defaultPreparedBySignatureUrl && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">มีลายเซ็นต์</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.defaultPreparedBy || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultPreparedBy: e.target.value }))}
                    placeholder="เช่น ผู้จัดทำบัญชี / นภักดิ์"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-slate-50/50"
                  />
                  <div className="h-12 border border-slate-200 rounded bg-slate-50/30 flex items-center justify-center p-1">
                    {formData.defaultPreparedBySignatureUrl ? (
                      <img
                        src={formData.defaultPreparedBySignatureUrl}
                        alt="ลายเซ็นต์ผู้จัดทำ"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">ยังไม่มีลายเซ็นต์</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <label className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1 rounded text-[10px] font-medium cursor-pointer transition">
                    <Upload className="w-3 h-3" />
                    <span>อัปโหลด</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePartySignatureUpload('defaultPreparedBySignatureUrl', e)}
                      className="hidden"
                    />
                  </label>
                  {formData.defaultPreparedBySignatureUrl ? (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, defaultPreparedBySignatureUrl: '' }))}
                      className="text-[10px] text-slate-400 hover:text-red-500 px-1"
                    >
                      ลบ
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, defaultPreparedBySignatureUrl: '/signatures/sign_napak.svg' }))}
                      className="text-[10px] text-blue-600 hover:text-blue-800 px-1"
                    >
                      คืนค่า
                    </button>
                  )}
                </div>
              </div>

              {/* 2. ผู้ตรวจสอบ */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">2. ผู้ตรวจสอบ (Checked By)</span>
                    {formData.defaultCheckedBySignatureUrl && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">มีลายเซ็นต์</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.defaultCheckedBy || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultCheckedBy: e.target.value }))}
                    placeholder="เช่น ผู้จัดการบัญชี"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-slate-50/50"
                  />
                  <div className="h-12 border border-slate-200 rounded bg-slate-50/30 flex items-center justify-center p-1">
                    {formData.defaultCheckedBySignatureUrl ? (
                      <img
                        src={formData.defaultCheckedBySignatureUrl}
                        alt="ลายเซ็นต์ผู้ตรวจสอบ"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">ยังไม่มีลายเซ็นต์</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <label className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1 rounded text-[10px] font-medium cursor-pointer transition">
                    <Upload className="w-3 h-3" />
                    <span>อัปโหลด</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePartySignatureUpload('defaultCheckedBySignatureUrl', e)}
                      className="hidden"
                    />
                  </label>
                  {formData.defaultCheckedBySignatureUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, defaultCheckedBySignatureUrl: '' }))}
                      className="text-[10px] text-slate-400 hover:text-red-500 px-1"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              </div>

              {/* 3. ผู้อนุมัติ */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">3. ผู้อนุมัติ (Approved By)</span>
                    {formData.defaultApprovedBySignatureUrl && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">มีลายเซ็นต์</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.defaultApprovedBy || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultApprovedBy: e.target.value }))}
                    placeholder="เช่น กรรมการผู้จัดการ / อภิวัฒน์"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-slate-50/50"
                  />
                  <div className="h-12 border border-slate-200 rounded bg-slate-50/30 flex items-center justify-center p-1">
                    {formData.defaultApprovedBySignatureUrl ? (
                      <img
                        src={formData.defaultApprovedBySignatureUrl}
                        alt="ลายเซ็นต์ผู้อนุมัติ"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">ยังไม่มีลายเซ็นต์</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <label className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1 rounded text-[10px] font-medium cursor-pointer transition">
                    <Upload className="w-3 h-3" />
                    <span>อัปโหลด</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePartySignatureUpload('defaultApprovedBySignatureUrl', e)}
                      className="hidden"
                    />
                  </label>
                  {formData.defaultApprovedBySignatureUrl ? (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, defaultApprovedBySignatureUrl: '' }))}
                      className="text-[10px] text-slate-400 hover:text-red-500 px-1"
                    >
                      ลบ
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, defaultApprovedBySignatureUrl: '/signatures/sign_aphiwatch.svg' }))}
                      className="text-[10px] text-blue-600 hover:text-blue-800 px-1"
                    >
                      คืนค่า
                    </button>
                  )}
                </div>
              </div>

              {/* 4. ผู้รับเงิน / คู่ค้า */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">4. ผู้รับเงิน / คู่ค้า</span>
                    {formData.defaultReceivedOrPaidSignatureUrl && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">มีลายเซ็นต์</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.defaultReceivedOrPaidBy || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultReceivedOrPaidBy: e.target.value }))}
                    placeholder="เช่น ผู้รับเงิน / การเงิน"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-slate-50/50"
                  />
                  <div className="h-12 border border-slate-200 rounded bg-slate-50/30 flex items-center justify-center p-1">
                    {formData.defaultReceivedOrPaidSignatureUrl ? (
                      <img
                        src={formData.defaultReceivedOrPaidSignatureUrl}
                        alt="ลายเซ็นต์ผู้รับเงิน"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">ยังไม่มีลายเซ็นต์</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <label className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1 rounded text-[10px] font-medium cursor-pointer transition">
                    <Upload className="w-3 h-3" />
                    <span>อัปโหลด</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePartySignatureUpload('defaultReceivedOrPaidSignatureUrl', e)}
                      className="hidden"
                    />
                  </label>
                  {formData.defaultReceivedOrPaidSignatureUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, defaultReceivedOrPaidSignatureUrl: '' }))}
                      className="text-[10px] text-slate-400 hover:text-red-500 px-1"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 8: Security & Admin Passwords Protection */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>8. ระบบรักษาความปลอดภัย &amp; รหัสผ่านเข้าสู่ระบบหลัก (Security &amp; PIN Protection)</span>
            </div>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-700" />
              <span>IndexedDB &amp; Financial Shield</span>
            </span>
          </div>

          <div className="space-y-6">
            {/* 1. Main Startup Password Toggle */}
            <div className="p-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>เปิดใช้งานการถามรหัสผ่าน/PIN เมื่อเปิดเข้าโปรแกรม (Require Password on Startup)</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  เมื่อเปิดใช้งาน ทุกครั้งที่เปิดเว็บหรือรีเฟรชหน้าจอ ระบบจะแสดงหน้าจอใส่รหัสผ่าน เพื่อป้องกันบุคคลอื่นเข้าถึงข้อมูลใบสำคัญ ข้อมูลสรรพากร และฐานข้อมูล IndexedDB ในเครื่อง
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.securityConfig?.requirePasswordOnStartup || false}
                    onChange={(e) => handleToggleRequirePassword(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
                <span className={`text-xs font-bold ${formData.securityConfig?.requirePasswordOnStartup ? 'text-amber-800' : 'text-slate-400'}`}>
                  {formData.securityConfig?.requirePasswordOnStartup ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>
            </div>

            {/* 1.1 Shared Dashboard Admin Button Control */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>ซ่อนปุ่ม "เข้าสู่ระบบหลัก" บนหน้าแชร์แดชบอร์ดเป็นค่าเริ่มต้น</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  เมื่อเปิดใช้งาน ผู้ที่ได้รับลิงก์ดูแดชบอร์ดสรุปจะไม่เห็นปุ่มเข้าสู่ระบบหลักเลย เพื่อป้องกันบุคคลภายนอกไม่ให้เห็นหรือพยายามกดเข้าสู่ระบบหลัก และหากไม่ได้ซ่อน ระบบจะบังคับให้ใส่รหัสผ่าน Admin PIN เสมอ
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.securityConfig?.hideSharedDashboardAdminBtn || false}
                    onChange={(e) => handleToggleHideSharedAdminBtn(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className={`text-xs font-bold ${formData.securityConfig?.hideSharedDashboardAdminBtn ? 'text-indigo-800' : 'text-slate-500'}`}>
                  {formData.securityConfig?.hideSharedDashboardAdminBtn ? 'ซ่อนปุ่มอัตโนมัติ' : 'แสดงปุ่ม (มีรหัสผ่านล็อค)'}
                </span>
              </div>
            </div>

            {/* 2. Admin Master Password & Display Name */}
            <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>รหัสผ่านและข้อมูลผู้ดูแลระบบหลัก (Master Administrator PIN / Password)</span>
                </div>
                <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-medium">
                  สิทธิ์ผู้ดูแลระบบสูงสุด (Super Admin)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อแสดงผู้ดูแลระบบหลัก (Admin Display Name)
                  </label>
                  <input
                    type="text"
                    value={formData.securityConfig?.adminDisplayName || 'ผู้ดูแลระบบหลัก (Admin)'}
                    onChange={(e) => handleUpdateAdminDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="เช่น ผู้จัดการฝ่ายบัญชี หรือ Admin"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      รหัสผ่าน / Master PIN ของ Admin <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAdminPin(!showAdminPin)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showAdminPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showAdminPin ? 'ซ่อนรหัส' : 'ดูรหัส'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPin ? 'text' : 'password'}
                      value={formData.securityConfig?.adminPin || ''}
                      onChange={(e) => handleUpdateAdminPin(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="เช่น 820820 หรือรหัสผ่านตัวเลข/ตัวอักษร"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    * รหัสนี้สามารถใช้ปลดล็อคระบบหลักได้ทุกกรณี (ค่าเริ่มต้น: 820820)
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Additional User Accounts Management (สามารถเพิ่มได้) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>รายชื่อผู้ใช้งานระบบ และสิทธิ์เข้าถึง (User Accounts &amp; Passwords)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    สามารถเพิ่มผู้ใช้งานเพิ่มเติม (เช่น พนักงานบัญชี หรือผู้ตรวจสอบ) โดยกำหนดรหัสผ่านแยกได้
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddUserForm ? 'ปิดฟอร์มเพิ่มผู้ใช้' : '+ เพิ่มผู้ใช้งานใหม่'}</span>
                </button>
              </div>

              {/* Add New User Collapsible Form */}
              {showAddUserForm && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>แบบฟอร์มเพิ่มบัญชีผู้ใช้งานใหม่</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        ชื่อบัญชี (Username) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="เช่น accountant1"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        ชื่อแสดง (Display Name)
                      </label>
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        placeholder="เช่น คุณสมศรี (บัญชี)"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          รหัสผ่าน / PIN <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowNewPin(!showNewPin)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          {showNewPin ? 'ซ่อน' : 'แสดง'}
                        </button>
                      </div>
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="เช่น 8888"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        สิทธิ์การใช้งาน (Role)
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                        <option value="staff">พนักงานบัญชี (Staff)</option>
                        <option value="viewer">ผู้ตรวจสอบ (Viewer)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleAddUserAccount}
                      className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>บันทึกเพิ่มผู้ใช้</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Users List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">ชื่อแสดง (Display Name)</th>
                        <th className="py-2.5 px-3">Username</th>
                        <th className="py-2.5 px-3">สิทธิ์ (Role)</th>
                        <th className="py-2.5 px-3">รหัสผ่าน / PIN</th>
                        <th className="py-2.5 px-3 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Master Admin Row */}
                      <tr className="bg-blue-50/40 hover:bg-blue-50/70 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                            A
                          </span>
                          <span>{formData.securityConfig?.adminDisplayName || 'ผู้ดูแลระบบหลัก (Admin)'}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                            หลัก
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">admin</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            Super Admin
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                          {showAdminPin ? (formData.securityConfig?.adminPin || '820820') : '••••••'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                          (แก้ไขด้านบน)
                        </td>
                      </tr>

                      {/* Configured User Accounts */}
                      {(formData.securityConfig?.userAccounts || [])
                        .filter(u => u.username !== 'admin')
                        .map((u) => {
                          const isEditing = editingUserId === u.id;
                          return (
                            <tr key={u.id} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                                  {u.displayName.charAt(0).toUpperCase()}
                                </span>
                                <span>{u.displayName}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{u.username}</td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                                  className="text-[11px] py-0.5 px-1.5 border border-slate-300 rounded bg-white"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="staff">Staff (บัญชี)</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editingUserPin}
                                      onChange={(e) => setEditingUserPin(e.target.value)}
                                      placeholder="PIN ใหม่"
                                      className="w-24 px-1.5 py-0.5 text-xs border border-blue-400 rounded font-mono"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveUserPin(u.id)}
                                      className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                      title="บันทึก PIN"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-slate-700">••••</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUserId(u.id);
                                        setEditingUserPin(u.pinOrPassword);
                                      }}
                                      className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                    >
                                      เปลี่ยนรหัส
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserAccount(u.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                                  title="ลบผู้ใช้งานนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. Auto-Lock and Immediate Test Lock Controls */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">ล็อคหน้าจออัตโนมัติเมื่อไม่ใช้งาน:</span>
                <select
                  value={formData.securityConfig?.lockTimeoutMinutes || 0}
                  onChange={(e) => handleUpdateLockTimeout(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value={0}>ไม่ล็อคอัตโนมัติ (ล็อคเมื่อปิดแท็บหรือกดปุ่ม)</option>
                  <option value={5}>5 นาที</option>
                  <option value={15}>15 นาที</option>
                  <option value={30}>30 นาที</option>
                  <option value={60}>1 ชั่วโมง</option>
                </select>
              </div>

              {onTriggerLock && (
                <button
                  type="button"
                  onClick={onTriggerLock}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                  title="ทดสอบล็อคหน้าจอทันทีเพื่อดูหน้าต่างกรอก PIN"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>ทดสอบล็อคหน้าจอทันที (Lock Screen Now)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 8: IndexedDB Auto-Backup & Storage Recovery */}
        {onRestoreData && (
          <IndexedDbBackupManager
            vouchers={vouchers}
            settings={formData}
            onRestoreData={onRestoreData}
            showToast={showToast}
          />
        )}

        {/* Section 8.5: ระบบฐานข้อมูลคู่ขนาน (เครื่อง + Firebase Firestore Cloud) */}
        <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-xl shadow-xs border border-amber-200/80 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    ระบบฐานข้อมูลคู่ขนาน (Hybrid Storage: ภายในเครื่อง + Firebase Cloud)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> เชื่อมต่อแล้ว
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  รองรับการจัดเก็บบนเครื่อง (LocalStorage & IndexedDB) ควบคู่กับฐานข้อมูล Cloud Firestore ช่วยให้ออฟไลน์ได้และซิงค์ข้ามอุปกรณ์
                </p>
              </div>
            </div>

            {onOpenFirebaseSyncModal && (
              <button
                type="button"
                onClick={onOpenFirebaseSyncModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>เปิดหน้าต่างควบคุม Firebase</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="text-slate-500 text-[11px]">Firebase Cloud Project ID</div>
              <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">woven-incentive-l2ts5</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">✓ Cloud Firestore พร้อมใช้งาน</div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="text-slate-500 text-[11px]">โหมดการจัดเก็บข้อมูลปัจจุบัน</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">โหมดไฮบริด (Hybrid Dual Storage)</div>
              <div className="text-[11px] text-slate-500 mt-1">บันทึกทั้งในเครื่องและคลาวด์อัตโนมัติ</div>
            </div>
          </div>
        </div>

        {/* Section 9: Sample Data & Clean Slate Management */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  จัดการข้อมูลตัวอย่างและการเริ่มต้นระบบจริง (Sample Data & Clean Slate Mode)
                </h3>
                <p className="text-xs text-slate-500">
                  เปิด/ปิด ข้อมูลตัวอย่าง ลบเฉพาะตัวอย่าง หรือล้างข้อมูลทั้งหมดเพื่อเริ่มใช้งานจริง
                </p>
              </div>
            </div>

            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              isSampleEnabled
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              {isSampleEnabled ? 'โหมดตัวอย่าง (Demo)' : 'โหมดข้อมูลจริง (Clean)'}
            </span>
          </div>

          {/* Data Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-500 font-medium">ใบสำคัญทั้งหมดในฐานข้อมูล</div>
              <div className="text-xl font-bold font-mono text-slate-900">{vouchers.length} ฉบับ</div>
            </div>
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-amber-700 font-medium">รายการข้อมูลตัวอย่าง</div>
              <div className="text-xl font-bold font-mono text-amber-900">
                {vouchers.filter(isSampleVoucher).length} ฉบับ
              </div>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-emerald-700 font-medium">ข้อมูลจริงของกิจการ</div>
              <div className="text-xl font-bold font-mono text-emerald-900">
                {vouchers.filter((v) => !isSampleVoucher(v)).length} ฉบับ
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-0.5">
              <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <span>เปิดใช้งานข้อมูลตัวอย่าง (Sample Data Enabled)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                เมื่อปิด: ข้อมูลตัวอย่างจะถูกนำออก เหลือเฉพาะข้อมูลจริงที่ท่านสร้างไว้ พร้อมใช้งานจริง 100%
              </p>
            </div>

            {onToggleSampleData && (
              <button
                type="button"
                onClick={() => onToggleSampleData(!isSampleEnabled)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                  isSampleEnabled
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isSampleEnabled ? 'คลิกเพื่อปิดข้อมูลตัวอย่าง' : 'คลิกเพื่อเปิดข้อมูลตัวอย่าง'}
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            {onRemoveSampleDataOnly && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('คุณต้องการลบเฉพาะข้อมูลตัวอย่างทั้งหมด 12 รายการออกใช่หรือไม่? (ข้อมูลจริงที่ท่านสร้างจะไม่ถูกลบ)')) {
                    onRemoveSampleDataOnly();
                  }
                }}
                disabled={vouchers.filter(isSampleVoucher).length === 0}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบเฉพาะข้อมูลตัวอย่าง (12 รายการ)</span>
              </button>
            )}

            {onRestoreSampleData && (
              <button
                type="button"
                onClick={() => {
                  onRestoreSampleData();
                }}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>โหลดข้อมูลตัวอย่าง 12 รายการกลับมา</span>
              </button>
            )}

            {onClearAllVouchers && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('คำเตือน: คุณต้องการลบใบสำคัญทั้งหมด (ทั้งตัวอย่างและข้อมูลจริง) เพื่อให้ระบบเริ่มต้นใหม่ 0 รายการใช่หรือไม่?')) {
                    onClearAllVouchers();
                  }
                }}
                disabled={vouchers.length === 0}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>ล้างข้อมูลใบสำคัญทั้งหมด (เริ่มระบบใหม่ 0 ฉบับ)</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการตั้งค่าทั้งหมด</span>
          </button>
        </div>
      </form>
    </div>
  );
};
