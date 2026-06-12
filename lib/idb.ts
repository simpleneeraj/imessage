// Minimal promise wrapper over IndexedDB for the offline cache.
// Stores: conversations (by id), messages (by id, indexed by conversation),
// outbox (messages composed offline), kv (own profile, misc).

const DB_NAME = "imessage-clone";
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (event.oldVersion < 1) {
        db.createObjectStore("conversations", { keyPath: "id" });
        const messages = db.createObjectStore("messages", { keyPath: "id" });
        messages.createIndex("by_conv", "conversation_id");
        db.createObjectStore("outbox", { keyPath: "client_id" });
        db.createObjectStore("kv");
      }
      if (event.oldVersion < 2) {
        // v2 = E2EE cutover: anonymous-era plaintext caches are disposable.
        db.createObjectStore("convkeys", { keyPath: "conversation_id" });
        const tx = req.transaction!;
        for (const store of ["conversations", "messages", "outbox", "kv"]) {
          tx.objectStore(store).clear();
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** Close and permanently delete the local database (logout). */
export async function destroyDb(): Promise<void> {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      // already closed
    }
    dbPromise = null;
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

type StoreName = "conversations" | "messages" | "outbox" | "kv" | "convkeys";

async function withStore<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(name, mode);
  const result = await fn(tx.objectStore(name));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const idb = {
  async getAll<T>(store: StoreName): Promise<T[]> {
    return withStore(store, "readonly", (s) => promisify(s.getAll() as IDBRequest<T[]>));
  },

  async getAllByIndex<T>(store: StoreName, index: string, key: IDBValidKey): Promise<T[]> {
    return withStore(store, "readonly", (s) =>
      promisify(s.index(index).getAll(key) as IDBRequest<T[]>)
    );
  },

  async putAll<T>(store: StoreName, values: T[]): Promise<void> {
    if (values.length === 0) return;
    await withStore(store, "readwrite", async (s) => {
      for (const value of values) s.put(value);
    });
  },

  async delete(store: StoreName, key: IDBValidKey): Promise<void> {
    await withStore(store, "readwrite", (s) => promisify(s.delete(key)));
  },

  async kvGet<T>(key: string): Promise<T | undefined> {
    return withStore("kv", "readonly", (s) => promisify(s.get(key) as IDBRequest<T | undefined>));
  },

  async kvSet(key: string, value: unknown): Promise<void> {
    await withStore("kv", "readwrite", (s) => promisify(s.put(value, key)));
  },
};
