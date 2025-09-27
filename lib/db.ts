import { openDB } from "idb";

const DB_NAME = "expiry-tracker";
const STORE_NAME = "documents";

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function saveDocument(name: string, text: string, expiryDate: string | null) {
  const db = await getDB();
  await db.add(STORE_NAME, {
    name,
    text,
    expiryDate,
    createdAt: new Date().toISOString(),
  });
}

export async function getAllDocuments() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function clearDocuments() {
  const db = await getDB();
  return db.clear(STORE_NAME);
}
