// Simple IndexedDB store for offline PDF caching.
// Each entry: { id, title, blob, savedAt }

const DB_NAME = "bitkmc-offline";
const STORE = "pdfs";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface OfflinePdf {
  id: string;
  title: string;
  blob: Blob;
  savedAt: number;
  meta?: { subject?: string; semester?: number; year?: number; exam_type?: string };
}

export async function savePdfOffline(entry: OfflinePdf) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflinePdf(id: string): Promise<OfflinePdf | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as OfflinePdf) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listOfflinePdfs(): Promise<OfflinePdf[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as OfflinePdf[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflinePdf(id: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function isPdfOffline(id: string): Promise<boolean> {
  const p = await getOfflinePdf(id);
  return !!p;
}