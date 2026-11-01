import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, FIREBASE_PROJECT_ID } from '../firebase';
import { Voucher, CompanySettings } from '../types';

export type SyncMode = 'hybrid' | 'local_only';

const SYNC_STORAGE_KEYS = {
  MODE: 'account_planet_sync_mode',
  LAST_SYNC: 'account_planet_last_cloud_sync',
};

/**
 * Remove undefined values to comply with Firestore schema requirements
 */
function sanitizeForFirestore<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Get current sync mode (default is 'hybrid' for dual-sync)
 */
export function getSyncMode(): SyncMode {
  try {
    const saved = localStorage.getItem(SYNC_STORAGE_KEYS.MODE);
    if (saved === 'local_only' || saved === 'hybrid') {
      return saved;
    }
  } catch (e) {
    console.warn('[Sync] Failed to read sync mode:', e);
  }
  return 'hybrid'; // Default: Hybrid (Both Local and Cloud)
}

/**
 * Set sync mode
 */
export function setSyncMode(mode: SyncMode): void {
  try {
    localStorage.setItem(SYNC_STORAGE_KEYS.MODE, mode);
  } catch (e) {
    console.warn('[Sync] Failed to save sync mode:', e);
  }
}

/**
 * Get timestamp of last cloud sync
 */
export function getLastCloudSyncTime(): string | null {
  try {
    return localStorage.getItem(SYNC_STORAGE_KEYS.LAST_SYNC);
  } catch {
    return null;
  }
}

/**
 * Update timestamp of last cloud sync
 */
export function setLastCloudSyncTime(): void {
  try {
    const now = new Date().toISOString();
    localStorage.setItem(SYNC_STORAGE_KEYS.LAST_SYNC, now);
  } catch (e) {
    console.warn('[Sync] Failed to save last sync time:', e);
  }
}

/**
 * Save a single voucher to Firestore
 */
export async function saveVoucherToFirebase(voucher: Voucher): Promise<boolean> {
  try {
    const cleanData = sanitizeForFirestore({
      ...voucher,
      updatedAt: new Date().toISOString(),
    });
    const voucherRef = doc(db, 'vouchers', voucher.id);
    await setDoc(voucherRef, cleanData, { merge: true });
    setLastCloudSyncTime();
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to save voucher:', error);
    return false;
  }
}

/**
 * Delete a single voucher from Firestore
 */
export async function deleteVoucherFromFirebase(voucherId: string): Promise<boolean> {
  try {
    const voucherRef = doc(db, 'vouchers', voucherId);
    await deleteDoc(voucherRef);
    setLastCloudSyncTime();
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to delete voucher:', error);
    return false;
  }
}

/**
 * Batch upload all local vouchers to Firebase (Push all)
 */
export async function pushAllVouchersToFirebase(vouchers: Voucher[]): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Firestore batch supports up to 500 writes per batch
    const BATCH_SIZE = 400;
    let savedCount = 0;

    for (let i = 0; i < vouchers.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = vouchers.slice(i, i + BATCH_SIZE);

      for (const v of chunk) {
        const clean = sanitizeForFirestore({
          ...v,
          updatedAt: new Date().toISOString(),
        });
        const ref = doc(db, 'vouchers', v.id);
        batch.set(ref, clean, { merge: true });
        savedCount++;
      }

      await batch.commit();
    }

    setLastCloudSyncTime();
    return { success: true, count: savedCount };
  } catch (error: any) {
    console.error('[Firebase] Push all vouchers failed:', error);
    return { success: false, count: 0, error: error?.message || 'Upload failed' };
  }
}

/**
 * Fetch all vouchers from Firebase Firestore (Pull from cloud)
 */
export async function fetchAllVouchersFromFirebase(): Promise<Voucher[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'vouchers'));
    const items: Voucher[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.id && (data.voucherNo || data.voucherNumber)) {
        const item: Voucher = {
          ...data,
          voucherNo: data.voucherNo || data.voucherNumber,
        } as Voucher;
        items.push(item);
      }
    });
    // Sort descending by date / voucherNo
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (error) {
    console.error('[Firebase] Failed to fetch vouchers from cloud:', error);
    throw error;
  }
}

/**
 * Save Company Settings to Firestore
 */
export async function saveSettingsToFirebase(settings: CompanySettings): Promise<boolean> {
  try {
    const cleanSettings = sanitizeForFirestore({
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    const settingsRef = doc(db, 'settings', 'company_profile');
    await setDoc(settingsRef, cleanSettings, { merge: true });
    setLastCloudSyncTime();
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to save settings to cloud:', error);
    return false;
  }
}

/**
 * Fetch Company Settings from Firestore
 */
export async function fetchSettingsFromFirebase(): Promise<CompanySettings | null> {
  try {
    const settingsRef = doc(db, 'settings', 'company_profile');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data() as CompanySettings;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Failed to fetch settings from cloud:', error);
    return null;
  }
}

/**
 * Listen for real-time changes to the vouchers collection
 */
export function subscribeToFirebaseVouchers(
  onChange: (vouchers: Voucher[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const vouchersCol = collection(db, 'vouchers');
  return onSnapshot(
    vouchersCol,
    (snapshot) => {
      const items: Voucher[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && d.id && (d.voucherNo || d.voucherNumber)) {
          const item: Voucher = {
            ...d,
            voucherNo: d.voucherNo || d.voucherNumber,
          } as Voucher;
          items.push(item);
        }
      });
      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onChange(items);
    },
    (error) => {
      console.warn('[Firebase] Snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Listen for real-time changes to company settings
 */
export function subscribeToFirebaseSettings(
  onChange: (settings: CompanySettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const settingsRef = doc(db, 'settings', 'company_profile');
  return onSnapshot(
    settingsRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CompanySettings;
        onChange(data);
      }
    },
    (error) => {
      console.warn('[Firebase] Settings snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Get cloud statistics & metadata
 */
export async function getFirebaseStats(): Promise<{
  connected: boolean;
  projectId: string;
  voucherCount: number;
  hasSettings: boolean;
  lastSync: string | null;
}> {
  try {
    const [voucherSnaps, settingsSnap] = await Promise.all([
      getDocs(collection(db, 'vouchers')),
      getDoc(doc(db, 'settings', 'company_profile')),
    ]);

    return {
      connected: true,
      projectId: FIREBASE_PROJECT_ID,
      voucherCount: voucherSnaps.size,
      hasSettings: settingsSnap.exists(),
      lastSync: getLastCloudSyncTime(),
    };
  } catch (error) {
    return {
      connected: false,
      projectId: FIREBASE_PROJECT_ID,
      voucherCount: 0,
      hasSettings: false,
      lastSync: getLastCloudSyncTime(),
    };
  }
}
