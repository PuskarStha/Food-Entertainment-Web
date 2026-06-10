/**
 * storage.ts — File System Access API utilities
 *
 * Allows the user to pick a real folder on their device. Data is stored as
 * JSON files (cozy-watchlist.json, cozy-restaurants.json) inside that folder.
 * The folder handle is persisted in a dedicated IndexedDB store so it can be
 * restored on subsequent visits without re-picking.
 */

const HANDLE_DB_NAME = 'CozyFolderHandleDB';
const HANDLE_STORE = 'handles';
const HANDLE_KEY = 'main-folder';

/** Returns true if the browser supports the File System Access API */
export function isFileSystemSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window &&
    typeof (window as any).showDirectoryPicker === 'function'
  );
}

/** Open (or create) the tiny IDB database used to persist the folder handle */
function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

/** Persist a FileSystemDirectoryHandle into IDB */
export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE);
    const req = store.put(handle, HANDLE_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Retrieve the stored FileSystemDirectoryHandle from IDB, or null */
export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readonly');
      const store = tx.objectStore(HANDLE_STORE);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Remove the stored folder handle (user forgets / changes folder) */
export async function clearStoredDirectoryHandle(): Promise<void> {
  try {
    const db = await openHandleDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite');
      const store = tx.objectStore(HANDLE_STORE);
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

/** Ask the user to pick a folder via the native OS dialog */
export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    await saveDirectoryHandle(handle);
    return handle as FileSystemDirectoryHandle;
  } catch (err: any) {
    if (err?.name === 'AbortError') return null; // user cancelled — not an error
    throw err;
  }
}

/**
 * Check current permission state WITHOUT prompting.
 * Returns true only if permission is already granted.
 */
export async function checkPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
    return perm === 'granted';
  } catch {
    return false;
  }
}

/**
 * Request read-write permission. MUST be called inside a user gesture (click).
 * Returns true when permission is granted.
 */
export async function requestPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
    return perm === 'granted';
  } catch {
    return false;
  }
}

/** Read a JSON array from a file inside the folder, returns [] if missing */
export async function readJsonFile<T>(
  handle: FileSystemDirectoryHandle,
  filename: string
): Promise<T[]> {
  try {
    const fileHandle = await handle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // File doesn't exist yet — that's fine
  }
}

/** Write a JSON array to a file inside the folder (creates if missing) */
export async function writeJsonFile<T>(
  handle: FileSystemDirectoryHandle,
  filename: string,
  data: T[]
): Promise<void> {
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}
