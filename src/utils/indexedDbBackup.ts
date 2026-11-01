import { Voucher, CompanySettings } from '../types';

export interface BackupSnapshot {
  id: string; // 'latest' | 'snapshot_TIMESTAMP'
  timestamp: string; // ISO string
  voucherCount: number;
  totalAmount: number;
  backupType: 'auto' | 'manual';
  note?: string;
  vouchers: Voucher[];
  settings?: CompanySettings;
}

export interface BackupMetadata {
  lastBackupAt: string | null;
  lastBackupCount: number;
  totalSnapshots: number;
  autoBackupEnabled: boolean;
}

const DB_NAME = 'AccountPlanet_Storage_DB';
const DB_VERSION = 1;
const STORE_BACKUPS = 'voucher_backups';
const STORE_META = 'backup_metadata';
const MAX_SNAPSHOTS = 20;

/**
 * Initialize native browser IndexedDB for Account Planet
 */
export function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        const store = db.createObjectStore(STORE_BACKUPS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Save current vouchers and settings to IndexedDB as 'latest' and a dated snapshot
 */
export async function saveBackupToIndexedDb(
  vouchers: Voucher[],
  settings?: CompanySettings,
  backupType: 'auto' | 'manual' = 'auto',
  note?: string
): Promise<{ success: boolean; timestamp: string; count: number }> {
  try {
    const db = await openIndexedDb();
    const timestamp = new Date().toISOString();
    const totalAmount = vouchers.reduce((sum, v) => sum + (v.netPayable || 0), 0);

    const snapshotData: BackupSnapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp,
      voucherCount: vouchers.length,
      totalAmount,
      backupType,
      note: note || (backupType === 'auto' ? 'สำรองข้อมูลอัตโนมัติ (Auto-Backup)' : 'สำรองข้อมูลด้วยตนเอง (Manual)'),
      vouchers,
      settings,
    };

    const latestData: BackupSnapshot = {
      ...snapshotData,
      id: 'latest',
    };

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_BACKUPS, STORE_META], 'readwrite');
      const backupStore = transaction.objectStore(STORE_BACKUPS);
      const metaStore = transaction.objectStore(STORE_META);

      // Save 'latest' pointer
      backupStore.put(latestData);

      // Save dated snapshot
      backupStore.put(snapshotData);

      // Update metadata
      metaStore.put({
        key: 'meta',
        lastBackupAt: timestamp,
        lastBackupCount: vouchers.length,
        totalAmount,
        backupType,
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Prune old snapshots beyond MAX_SNAPSHOTS
    pruneOldSnapshots(db).catch((err) => console.warn('Pruning snapshots warning:', err));

    return { success: true, timestamp, count: vouchers.length };
  } catch (error) {
    console.error('Error saving backup to IndexedDB:', error);
    return { success: false, timestamp: new Date().toISOString(), count: vouchers.length };
  }
}

/**
 * Prune old snapshots so IndexedDB doesn't grow indefinitely
 */
async function pruneOldSnapshots(db: IDBDatabase): Promise<void> {
  try {
    const transaction = db.transaction(STORE_BACKUPS, 'readwrite');
    const store = transaction.objectStore(STORE_BACKUPS);
    const request = store.getAll();

    request.onsuccess = () => {
      const records: BackupSnapshot[] = request.result || [];
      const snapshots = records
        .filter((r) => r.id !== 'latest')
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

      if (snapshots.length > MAX_SNAPSHOTS) {
        const toDelete = snapshots.slice(MAX_SNAPSHOTS);
        const delTx = db.transaction(STORE_BACKUPS, 'readwrite');
        const delStore = delTx.objectStore(STORE_BACKUPS);
        toDelete.forEach((s) => delStore.delete(s.id));
      }
    };
  } catch (err) {
    console.warn('Could not prune snapshots:', err);
  }
}

/**
 * Retrieve the latest backup from IndexedDB
 */
export async function getLatestBackupFromIndexedDb(): Promise<BackupSnapshot | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readonly');
      const store = transaction.objectStore(STORE_BACKUPS);
      const request = store.get('latest');

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Error reading latest backup from IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieve all historical backup snapshots
 */
export async function getAllBackupSnapshots(): Promise<BackupSnapshot[]> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readonly');
      const store = transaction.objectStore(STORE_BACKUPS);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: BackupSnapshot[] = request.result || [];
        // Filter out the 'latest' alias and sort newest first
        const snapshots = list
          .filter((s) => s.id !== 'latest')
          .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
        resolve(snapshots);
      };
      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('Error reading backup snapshots:', err);
    return [];
  }
}

/**
 * Delete a specific backup snapshot
 */
export async function deleteBackupSnapshot(id: string): Promise<boolean> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readwrite');
      const store = transaction.objectStore(STORE_BACKUPS);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Get metadata about backups
 */
export async function getBackupMetadata(): Promise<BackupMetadata> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_BACKUPS, STORE_META], 'readonly');
      const metaStore = transaction.objectStore(STORE_META);
      const backupStore = transaction.objectStore(STORE_BACKUPS);

      const metaReq = metaStore.get('meta');
      const countReq = backupStore.count();

      transaction.oncomplete = () => {
        const meta = metaReq.result;
        const count = countReq.result || 0;
        resolve({
          lastBackupAt: meta?.lastBackupAt || null,
          lastBackupCount: meta?.lastBackupCount || 0,
          totalSnapshots: Math.max(0, count - 1), // exclude 'latest'
          autoBackupEnabled: true,
        });
      };

      transaction.onerror = () => {
        resolve({
          lastBackupAt: null,
          lastBackupCount: 0,
          totalSnapshots: 0,
          autoBackupEnabled: true,
        });
      };
    });
  } catch {
    return {
      lastBackupAt: null,
      lastBackupCount: 0,
      totalSnapshots: 0,
      autoBackupEnabled: true,
    };
  }
}

/**
 * Clear all backups in IndexedDB (Reset)
 */
export async function clearIndexedDbBackups(): Promise<boolean> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_BACKUPS, STORE_META], 'readwrite');
      transaction.objectStore(STORE_BACKUPS).clear();
      transaction.objectStore(STORE_META).clear();

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
