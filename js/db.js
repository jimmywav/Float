// db.js — IndexedDB wrapper
// Stores: settings, categories, transactions

const DB_NAME = 'float';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      // settings: simple key-value
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // categories
      if (!db.objectStoreNames.contains('categories')) {
        const cs = db.createObjectStore('categories', { keyPath: 'id' });
        cs.createIndex('type', 'type', { unique: false });
        cs.createIndex('order', 'order', { unique: false });
      }

      // transactions (expenses + gig runs)
      if (!db.objectStoreNames.contains('transactions')) {
        const ts = db.createObjectStore('transactions', { keyPath: 'id' });
        ts.createIndex('periodKey', 'periodKey', { unique: false });
        ts.createIndex('date', 'date', { unique: false });
        ts.createIndex('type', 'type', { unique: false });
        ts.createIndex('categoryId', 'categoryId', { unique: false });
      }
    };

    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return store;
  });
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const db = {
  async get(store, key) {
    const s = await tx(store);
    return request(s.get(key));
  },

  async getAll(store) {
    const s = await tx(store);
    return request(s.getAll());
  },

  async getAllByIndex(store, indexName, value) {
    const s = await tx(store);
    const idx = s.index(indexName);
    return request(idx.getAll(value));
  },

  async put(store, record) {
    const s = await tx(store, 'readwrite');
    return request(s.put(record));
  },

  async delete(store, key) {
    const s = await tx(store, 'readwrite');
    return request(s.delete(key));
  },

  async getUniqueIndexValues(store, indexName) {
    const s = await tx(store);
    const idx = s.index(indexName);
    return new Promise((resolve, reject) => {
      const values = new Set();
      const cursor = idx.openKeyCursor(null, 'nextunique');
      cursor.onsuccess = e => {
        const c = e.target.result;
        if (c) { values.add(c.key); c.continue(); }
        else resolve([...values]);
      };
      cursor.onerror = () => reject(cursor.error);
    });
  }
};

export default db;
