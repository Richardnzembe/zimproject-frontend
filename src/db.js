import { openDB } from "idb";

const DB_NAME = "zimproject-db";
const DB_VERSION = 2;

export const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("notes")) {
        const store = db.createObjectStore("notes", { keyPath: "local_id" });
        store.createIndex("user_id", "user_id");
        store.createIndex("server_id", "server_id");
        store.createIndex("client_id", "client_id");
        store.createIndex("sync_status", "sync_status");
      }

      if (!db.objectStoreNames.contains("ai_history")) {
        const store = db.createObjectStore("ai_history", { keyPath: "local_id" });
        store.createIndex("user_id", "user_id");
        store.createIndex("created_at", "created_at");
      }
    },
  });
  return db;
};

export const getAllProjects = async () => {
  const db = await initDB();
  return await db.getAll("projects");
};

export const addProject = async (project) => {
  const db = await initDB();
  return await db.add("projects", project);
};

export const getNotesByUser = async (userId) => {
  const db = await initDB();
  return await db.getAllFromIndex("notes", "user_id", userId);
};

export const replaceUserNotes = async (userId, notes) => {
  const db = await initDB();
  const tx = db.transaction("notes", "readwrite");
  const index = tx.store.index("user_id");
  let cursor = await index.openCursor(userId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  for (const note of notes) {
    await tx.store.put(note);
  }
  await tx.done;
};

export const upsertNotes = async (notes) => {
  const db = await initDB();
  const tx = db.transaction("notes", "readwrite");
  for (const note of notes) {
    await tx.store.put(note);
  }
  await tx.done;
};

export const deleteLocalNote = async (localId) => {
  const db = await initDB();
  await db.delete("notes", localId);
};

export const getNoteByServerId = async (serverId) => {
  const db = await initDB();
  return await db.getFromIndex("notes", "server_id", serverId);
};

export const getNoteByClientId = async (clientId) => {
  const db = await initDB();
  return await db.getFromIndex("notes", "client_id", clientId);
};

export const getHistoryByUser = async (userId) => {
  const db = await initDB();
  return await db.getAllFromIndex("ai_history", "user_id", userId);
};

export const replaceUserHistory = async (userId, items) => {
  const db = await initDB();
  const tx = db.transaction("ai_history", "readwrite");
  const index = tx.store.index("user_id");
  let cursor = await index.openCursor(userId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
};

export const upsertHistoryItems = async (items) => {
  const db = await initDB();
  const tx = db.transaction("ai_history", "readwrite");
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
};

export const deleteHistoryItems = async (localIds) => {
  if (!Array.isArray(localIds) || localIds.length === 0) return;
  const db = await initDB();
  const tx = db.transaction("ai_history", "readwrite");
  for (const localId of localIds) {
    if (localId) {
      await tx.store.delete(localId);
    }
  }
  await tx.done;
};
