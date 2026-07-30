// База импортированных раздач в IndexedDB.
//
// localStorage не годится: там лимит ~5 МБ, а одна раздача в JSON весит около
// килобайта — потолок наступил бы на пяти тысячах рук. IndexedDB хранит
// объекты структурированным клонированием, поэтому Hand кладётся как есть,
// без сериализации в строку.
//
// Ключ — id раздачи с сайта, поэтому повторный импорт того же файла ничего не
// портит: дубликаты просто не добавляются. Это важно, потому что выгрузки GG
// пересекаются — каждая новая содержит и старые раздачи.

import { Hand } from "./types";

const DB_NAME = "pokercalc-hh";
const DB_VERSION = 1;
const STORE = "hands";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" }).createIndex("time", "time");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export interface ImportResult {
  added: number;
  duplicates: number;
}

/** Сохранить раздачи, пропустив уже известные. */
export async function putHands(hands: Hand[]): Promise<ImportResult> {
  if (hands.length === 0) return { added: 0, duplicates: 0 };
  const known = new Set(await allIds());
  const fresh = hands.filter((h) => !known.has(h.id));
  // Внутри выгрузки один и тот же id тоже может встретиться дважды.
  const unique = new Map(fresh.map((h) => [h.id, h]));

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const h of unique.values()) store.put(h);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return { added: unique.size, duplicates: hands.length - unique.size };
}

export function allIds(): Promise<string[]> {
  return run<IDBValidKey[]>("readonly", (s) => s.getAllKeys()).then((ks) => ks as string[]);
}

/** Все раздачи, по возрастанию времени. */
export async function allHands(): Promise<Hand[]> {
  const hands = await run<Hand[]>("readonly", (s) => s.getAll());
  return hands.sort((a, b) => a.time - b.time);
}

export function countHands(): Promise<number> {
  return run<number>("readonly", (s) => s.count());
}

export function clearHands(): Promise<void> {
  return run<undefined>("readwrite", (s) => s.clear()).then(() => undefined);
}
