// src/lib/pwa/offlineStorage.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface ShoppingListDB extends DBSchema {
  shoppingLists: {
    key: string;
    value: {
      id: string;
      title: string;
      description: string | null;
      weekStartDate: Date;
      weekEndDate: Date;
      status: string;
      markdownContent: string;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: { 'by-date': Date };
  };
  lastSync: {
    key: 'timestamp';
    value: number;
  };
}

let dbPromise: Promise<IDBPDatabase<ShoppingListDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ShoppingListDB>('eatrivo-offline', 1, {
      upgrade(db) {
        // Create shopping lists store
        if (!db.objectStoreNames.contains('shoppingLists')) {
          const store = db.createObjectStore('shoppingLists', { keyPath: 'id' });
          store.createIndex('by-date', 'createdAt');
        }
        // Create sync timestamp store
        if (!db.objectStoreNames.contains('lastSync')) {
          db.createObjectStore('lastSync');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveLatestShoppingList(shoppingList: {
  id: string;
  title: string;
  description: string | null;
  weekStartDate: string | Date;
  weekEndDate: string | Date;
  status: string;
  markdownContent: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}) {
  const db = await getDB();
  const tx = db.transaction('shoppingLists', 'readwrite');
  
  // Clear old shopping lists first
  await tx.store.clear();
  
  // Save only the latest one
  await tx.store.put({
    id: shoppingList.id,
    title: shoppingList.title,
    description: shoppingList.description,
    weekStartDate: new Date(shoppingList.weekStartDate),
    weekEndDate: new Date(shoppingList.weekEndDate),
    status: shoppingList.status,
    markdownContent: shoppingList.markdownContent,
    createdAt: new Date(shoppingList.createdAt),
    updatedAt: new Date(shoppingList.updatedAt),
  });
  
  await tx.done;
}

export async function getLatestShoppingList() {
  const db = await getDB();
  const allLists = await db.getAll('shoppingLists');
  return allLists[0] || null;
}

export async function updateLastSync() {
  const db = await getDB();
  await db.put('lastSync', Date.now(), 'timestamp');
}

export async function getLastSync() {
  const db = await getDB();
  return (await db.get('lastSync', 'timestamp')) || 0;
}

export async function clearOfflineData() {
  const db = await getDB();
  const tx = db.transaction(['shoppingLists', 'lastSync'], 'readwrite');
  await Promise.all([
    tx.objectStore('shoppingLists').clear(),
    tx.objectStore('lastSync').clear(),
  ]);
  await tx.done;
}
