/**
 * db.ts — Unified Storage Abstraction
 *
 * Three storage engines, one clean API:
 *   1. FileStorageTable   — real JSON files in the user's chosen OS folder
 *   2. IndexedDBTable     — Dexie-backed IndexedDB (browser fallback)
 *   3. LocalStorageTable  — JSON-in-localStorage (last-resort fallback)
 *
 * CozyDBWrapper routes automatically:
 *   - Folder handle set → FileStorageTable
 *   - No folder         → IndexedDBTable (named per workspace slug)
 */

import Dexie, { type Table } from 'dexie';
import { WatchlistItem, RestaurantItem } from './types';
import { readJsonFile, writeJsonFile } from './storage';

// ─────────────────────────────────────────────────────────────────────────────
// Active folder handle (module-level singleton, set by App on startup/login)
// ─────────────────────────────────────────────────────────────────────────────

let activeFolderHandle: FileSystemDirectoryHandle | null = null;

export function setActiveFolderHandle(handle: FileSystemDirectoryHandle | null) {
  activeFolderHandle = handle;
}

export function getActiveFolderHandle(): FileSystemDirectoryHandle | null {
  return activeFolderHandle;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FileStorageTable — reads/writes a real JSON file on the user's device
// ─────────────────────────────────────────────────────────────────────────────

class FileStorageTable<T extends { id?: number; createdAt: number }> {
  constructor(private filename: string) {}

  private async getItems(): Promise<T[]> {
    if (!activeFolderHandle) return [];
    return readJsonFile<T>(activeFolderHandle, this.filename);
  }

  private async saveItems(items: T[]): Promise<void> {
    if (!activeFolderHandle) throw new Error('No folder selected.');
    await writeJsonFile(activeFolderHandle, this.filename, items);
  }

  async clear() {
    await this.saveItems([]);
  }

  async count(): Promise<number> {
    return (await this.getItems()).length;
  }

  async add(item: T): Promise<number> {
    const items = await this.getItems();
    const maxId = items.reduce((max, x) => (x.id && x.id > max ? x.id : max), 0);
    const newId = maxId + 1;
    items.push({ ...item, id: newId });
    await this.saveItems(items);
    return newId;
  }

  async put(item: T): Promise<number> {
    if (item.id === undefined) return this.add(item);
    const items = await this.getItems();
    const idx = items.findIndex((x) => x.id === item.id);
    if (idx !== -1) items[idx] = item;
    else items.push(item);
    await this.saveItems(items);
    return item.id;
  }

  async delete(id: any) {
    const items = await this.getItems();
    await this.saveItems(items.filter((x) => x.id !== Number(id)));
  }

  orderBy(field: string) {
    return {
      reverse: () => ({
        toArray: async (): Promise<T[]> => {
          const items = await this.getItems();
          return items.sort(
            (a, b) => ((b as any)[field] ?? 0) - ((a as any)[field] ?? 0)
          );
        },
      }),
      toArray: async (): Promise<T[]> => {
        const items = await this.getItems();
        return items.sort(
          (a, b) => ((a as any)[field] ?? 0) - ((b as any)[field] ?? 0)
        );
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Dexie / IndexedDB
// ─────────────────────────────────────────────────────────────────────────────

export class CozyDexieDB extends Dexie {
  watchlist!: Table<WatchlistItem>;
  restaurants!: Table<RestaurantItem>;

  constructor(dbName: string) {
    super(dbName);
    this.version(1).stores({
      watchlist: '++id, title, type, status, genre, releaseYear, createdAt',
      restaurants: '++id, name, cuisine, type, visited, createdAt',
    });
  }
}

const dexieInstances: Record<string, CozyDexieDB> = {};

function getDexieInstance(workspace: string) {
  const dbName = `CozyTrackerDB_${workspace}`;
  if (!dexieInstances[dbName]) {
    dexieInstances[dbName] = new CozyDexieDB(dbName);
  }
  return dexieInstances[dbName];
}

class IndexedDBTable<T> {
  constructor(private getDexieTable: () => Table<T>) {}

  async clear() {
    await this.getDexieTable().clear();
  }

  async count() {
    return this.getDexieTable().count();
  }

  async add(item: T): Promise<number> {
    return (await this.getDexieTable().add(item)) as number;
  }

  async put(item: T): Promise<number> {
    return (await this.getDexieTable().put(item)) as number;
  }

  async delete(id: any) {
    await this.getDexieTable().delete(id);
  }

  orderBy(field: string) {
    return {
      reverse: () => ({
        toArray: async () => this.getDexieTable().orderBy(field).reverse().toArray(),
      }),
      toArray: async () => this.getDexieTable().orderBy(field).toArray(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LocalStorage fallback (last resort)
// ─────────────────────────────────────────────────────────────────────────────

class LocalStorageTable<T extends { id?: number; createdAt: number }> {
  constructor(private storageKey: string) {}

  private getItems(): T[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveItems(items: T[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  async clear() {
    this.saveItems([]);
  }

  async count(): Promise<number> {
    return this.getItems().length;
  }

  async add(item: T): Promise<number> {
    const items = this.getItems();
    const maxId = items.reduce((max, x) => (x.id && x.id > max ? x.id : max), 0);
    const newId = maxId + 1;
    items.push({ ...item, id: newId });
    this.saveItems(items);
    return newId;
  }

  async put(item: T): Promise<number> {
    if (item.id === undefined) return this.add(item);
    const items = this.getItems();
    const idx = items.findIndex((x) => x.id === item.id);
    if (idx !== -1) items[idx] = item;
    else items.push(item);
    this.saveItems(items);
    return item.id;
  }

  async delete(id: any) {
    const items = this.getItems();
    this.saveItems(items.filter((x) => x.id !== Number(id)));
  }

  orderBy(field: string) {
    return {
      reverse: () => ({
        toArray: async (): Promise<T[]> => {
          return this.getItems().sort(
            (a, b) => ((b as any)[field] ?? 0) - ((a as any)[field] ?? 0)
          );
        },
      }),
      toArray: async (): Promise<T[]> => {
        return this.getItems().sort(
          (a, b) => ((a as any)[field] ?? 0) - ((b as any)[field] ?? 0)
        );
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CozyDBWrapper — auto-routes to the right engine
// ─────────────────────────────────────────────────────────────────────────────

export class CozyDBWrapper {
  private getTable<T extends { id?: number; createdAt: number }>(
    filename: string,
    dexieGetter: (db: CozyDexieDB) => Table<T>,
    lsKey: string
  ) {
    if (activeFolderHandle) {
      return new FileStorageTable<T>(filename);
    }
    // Try IndexedDB (available in modern browsers)
    try {
      const workspace = localStorage.getItem('cozy-storage-workspace') || 'default';
      const dexie = getDexieInstance(workspace);
      return new IndexedDBTable<T>(() => dexieGetter(dexie));
    } catch {
      // Final fallback
      return new LocalStorageTable<T>(lsKey);
    }
  }

  get watchlist() {
    return this.getTable<WatchlistItem>(
      'cozy-watchlist.json',
      (db) => db.watchlist,
      'cozy_fallback_watchlist'
    );
  }

  get restaurants() {
    return this.getTable<RestaurantItem>(
      'cozy-restaurants.json',
      (db) => db.restaurants,
      'cozy_fallback_restaurants'
    );
  }
}

export const db = new CozyDBWrapper();

/** Seed helper — no-op, kept for API compatibility */
export async function seedDatabase(force = false) {
  if (force) {
    try {
      await db.watchlist.clear();
      await db.restaurants.clear();
    } catch {
      // ignore on fresh installs
    }
  }
}
