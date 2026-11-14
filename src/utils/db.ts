import { ProjectData, VideoSourceType } from '../types';

const DB_NAME = 'Bai12A_Multimedia_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_VIDEOS = 'exported_videos';

export interface StorageQuotaInfo {
  supported: boolean;
  quotaBytes: number;
  usageBytes: number;
  availableBytes: number;
  canStore: boolean;
}

export interface SaveBlobResult {
  saved: boolean;
  reason?: 'quota_exceeded' | 'unavailable' | 'error';
  message?: string;
  quotaInfo?: StorageQuotaInfo;
}

export interface SavedVideoSourceMeta {
  id: string;
  sourceType: VideoSourceType;
  originalUrl?: string;
  externalId?: string;
  embedUrl?: string;
  filename: string;
  duration: number;
  sizeBytes: number;
  timestamp: number;
  accessible?: boolean;
  accessMessage?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
        db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function checkStorageQuota(requiredBytes: number): Promise<StorageQuotaInfo> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
      const estimate = await navigator.storage.estimate();
      const quotaBytes = estimate.quota ?? 0;
      const usageBytes = estimate.usage ?? 0;
      const availableBytes = Math.max(0, quotaBytes - usageBytes);
      // Leave at least 5% safety buffer so IndexedDB transaction commit does not fail
      const canStore = quotaBytes > 0 ? requiredBytes < availableBytes * 0.95 : true;
      return {
        supported: true,
        quotaBytes,
        usageBytes,
        availableBytes,
        canStore,
      };
    }
  } catch {
    // StorageManager estimate unavailable
  }

  return {
    supported: false,
    quotaBytes: 0,
    usageBytes: 0,
    availableBytes: 0,
    canStore: true,
  };
}

export async function saveProject(project: ProjectData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.put(project);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadProjects(): Promise<ProjectData[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function loadProjectById(id: string): Promise<ProjectData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a local video File/Blob directly in IndexedDB after checking browser storage quota.
 * Never converts to Base64 and never uses localStorage.
 */
export async function saveExportedVideoBlob(
  id: string,
  blob: Blob,
  meta: { filename: string; duration: number }
): Promise<SaveBlobResult> {
  const quotaInfo = await checkStorageQuota(blob.size);
  if (quotaInfo.supported && !quotaInfo.canStore) {
    const availMB = (quotaInfo.availableBytes / (1024 * 1024)).toFixed(1);
    const fileMB = (blob.size / (1024 * 1024)).toFixed(1);
    return {
      saved: false,
      reason: 'quota_exceeded',
      quotaInfo,
      message: `Dung lượng video (${fileMB} MB) vượt quá hạn mức bộ nhớ trống hiện có của trình duyệt (${availMB} MB). Video vẫn phát trực tiếp bình thường trong phiên làm việc này.`,
    };
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const request = store.put({
        id,
        blob,
        filename: meta.filename,
        duration: meta.duration,
        sizeBytes: blob.size,
        savedAt: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });

    return { saved: true, quotaInfo };
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      String(err?.message || '').toLowerCase().includes('quota');
    return {
      saved: false,
      reason: isQuota ? 'quota_exceeded' : 'error',
      quotaInfo,
      message: isQuota
        ? 'Trình duyệt không đủ hạn mức bộ nhớ để lưu trữ ngoại tuyến tệp video này. Video vẫn đang phát trực tiếp từ máy tính trong phiên làm việc hiện tại.'
        : `Không thể lưu bộ nhớ đệm trình duyệt (${err?.message || 'lỗi không xác định'}). Video vẫn phát trực tiếp từ tệp đã chọn.`,
    };
  }
}

export async function loadExportedVideoBlob(
  id: string
): Promise<{ blob: Blob; filename: string; duration: number; sizeBytes?: number; savedAt?: number } | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readonly');
      const store = tx.objectStore(STORE_VIDEOS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function deleteExportedVideoBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore cleanup errors
  }
}

export async function saveActiveVideoSourceMeta(meta: Omit<SavedVideoSourceMeta, 'id'>): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const request = store.put({
        ...meta,
        id: 'active-source-meta',
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Non-fatal
  }
}

export async function loadActiveVideoSourceMeta(): Promise<SavedVideoSourceMeta | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readonly');
      const store = tx.objectStore(STORE_VIDEOS);
      const request = store.get('active-source-meta');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearActiveVideoSourceMeta(): Promise<void> {
  await deleteExportedVideoBlob('active-source-meta');
}
