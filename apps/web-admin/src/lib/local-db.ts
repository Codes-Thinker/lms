const DB_NAME = "lms_admin_cache";
const DB_VERSION = 1;
const STORE = "kv";

type CacheEntry<T> = {
  savedAt: number;
  data: T;
};

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      resolve(req.result as T | undefined);
    };
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.put(value, key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.delete(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

function lsGet<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export type CacheReadResult<T> = {
  data: T;
  /** True when savedAt is older than ttlMs (still returned for instant UI). */
  stale: boolean;
};

/**
 * Read cached value. Returns stale data immediately when TTL expired so UI can paint first.
 */
export async function cacheGet<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<CacheReadResult<T> | undefined> {
  let entry: CacheEntry<T> | undefined;
  try {
    entry = await idbGet<CacheEntry<T>>(key);
  } catch {
    entry = lsGet<CacheEntry<T>>(key);
  }
  if (!entry) return undefined;
  const stale = Date.now() - entry.savedAt > ttlMs;
  return { data: entry.data, stale };
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  const entry: CacheEntry<T> = { savedAt: Date.now(), data: value };
  try {
    await idbSet(key, entry);
  } catch {
    lsSet(key, entry);
  }
}

export async function cacheRemove(key: string): Promise<void> {
  try {
    await idbRemove(key);
  } catch {
  }
  lsRemove(key);
}

/** Synchronous read from localStorage wrapper only — for first paint before IDB resolves. */
export function cacheGetSync<T>(key: string): T | undefined {
  const entry = lsGet<CacheEntry<T>>(key);
  return entry?.data;
}