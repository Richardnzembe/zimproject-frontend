import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  initDB,
  getAllProjects,
  addProject,
  getNotesByUser,
  replaceUserNotes,
  upsertNotes,
  deleteLocalNote,
  getNoteByServerId,
  getNoteByClientId,
  getHistoryByUser,
  getTasksByUser,
  replaceUserTasks,
  upsertTasks,
  deleteLocalTask,
  replaceUserHistory,
  upsertHistoryItems,
  deleteHistoryItems,
} from "./db";

describe("db (IndexedDB via idb)", () => {
  beforeEach(async () => {
    const db = await initDB();
    const stores = ["projects", "notes", "tasks", "ai_history"];
    for (const store of stores) {
      const tx = db.transaction(store, "readwrite");
      await tx.store.clear();
      await tx.done;
    }
  });

  describe("initDB", () => {
    it("returns a database instance", async () => {
      const db = await initDB();
      expect(db).toBeDefined();
      expect(db.name).toBe("smart-notes-db");
    });

    it("creates expected object stores", async () => {
      const db = await initDB();
      expect(db.objectStoreNames.contains("projects")).toBe(true);
      expect(db.objectStoreNames.contains("notes")).toBe(true);
      expect(db.objectStoreNames.contains("tasks")).toBe(true);
      expect(db.objectStoreNames.contains("ai_history")).toBe(true);
    });
  });

  describe("projects CRUD", () => {
    it("adds and retrieves all projects", async () => {
      await addProject({ id: "p1", name: "Project One" });
      await addProject({ id: "p2", name: "Project Two" });

      const projects = await getAllProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.name)).toContain("Project One");
      expect(projects.map((p) => p.name)).toContain("Project Two");
    });

    it("returns empty array when no projects exist", async () => {
      const projects = await getAllProjects();
      expect(projects).toEqual([]);
    });
  });

  describe("notes CRUD", () => {
    it("gets notes by user ID", async () => {
      await upsertNotes([
        { local_id: "n1", user_id: 1, title: "Note A", sync_status: "synced" },
        { local_id: "n2", user_id: 2, title: "Note B", sync_status: "synced" },
        { local_id: "n3", user_id: 1, title: "Note C", sync_status: "pending" },
      ]);

      const userNotes = await getNotesByUser(1);
      expect(userNotes).toHaveLength(2);
      expect(userNotes.map((n) => n.title)).toContain("Note A");
      expect(userNotes.map((n) => n.title)).toContain("Note C");
    });

    it("replaces all notes for a user", async () => {
      await upsertNotes([
        { local_id: "n1", user_id: 1, title: "Old", sync_status: "synced" },
      ]);

      await replaceUserNotes(1, [
        { local_id: "n2", user_id: 1, title: "New One", sync_status: "synced" },
        { local_id: "n3", user_id: 1, title: "New Two", sync_status: "synced" },
      ]);

      const notes = await getNotesByUser(1);
      expect(notes).toHaveLength(2);
      expect(notes.map((n) => n.title)).not.toContain("Old");
    });

    it("deletes a local note by ID", async () => {
      await upsertNotes([
        { local_id: "n1", user_id: 1, title: "Delete Me", sync_status: "synced" },
      ]);
      await deleteLocalNote("n1");
      const notes = await getNotesByUser(1);
      expect(notes).toHaveLength(0);
    });

    it("gets a note by server_id index", async () => {
      await upsertNotes([
        { local_id: "n1", user_id: 1, server_id: 100, title: "Server Note", sync_status: "synced" },
      ]);
      const note = await getNoteByServerId(100);
      expect(note).toBeDefined();
      expect(note.title).toBe("Server Note");
    });

    it("gets a note by client_id index", async () => {
      await upsertNotes([
        { local_id: "n1", user_id: 1, client_id: "abc-123", title: "Client Note", sync_status: "synced" },
      ]);
      const note = await getNoteByClientId("abc-123");
      expect(note).toBeDefined();
      expect(note.title).toBe("Client Note");
    });
  });

  describe("tasks CRUD", () => {
    it("gets tasks by user ID", async () => {
      await upsertTasks([
        { local_id: "t1", user_id: 1, title: "Task A", sync_status: "synced" },
        { local_id: "t2", user_id: 2, title: "Task B", sync_status: "synced" },
      ]);

      const tasks = await getTasksByUser(1);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Task A");
    });

    it("replaces all tasks for a user", async () => {
      await upsertTasks([
        { local_id: "t1", user_id: 1, title: "Old Task", sync_status: "synced" },
      ]);

      await replaceUserTasks(1, [
        { local_id: "t2", user_id: 1, title: "New Task", sync_status: "synced" },
      ]);

      const tasks = await getTasksByUser(1);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("New Task");
    });

    it("deletes a local task by ID", async () => {
      await upsertTasks([
        { local_id: "t1", user_id: 1, title: "Remove", sync_status: "synced" },
      ]);
      await deleteLocalTask("t1");
      const tasks = await getTasksByUser(1);
      expect(tasks).toHaveLength(0);
    });
  });

  describe("ai_history CRUD", () => {
    it("gets history by user ID", async () => {
      await upsertHistoryItems([
        { local_id: "h1", user_id: 1, created_at: "2024-01-01", content: "Q1" },
        { local_id: "h2", user_id: 2, created_at: "2024-01-02", content: "Q2" },
      ]);

      const history = await getHistoryByUser(1);
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe("Q1");
    });

    it("replaces all history for a user", async () => {
      await upsertHistoryItems([
        { local_id: "h1", user_id: 1, created_at: "2024-01-01", content: "Old" },
      ]);

      await replaceUserHistory(1, [
        { local_id: "h2", user_id: 1, created_at: "2024-01-02", content: "New" },
      ]);

      const history = await getHistoryByUser(1);
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe("New");
    });

    it("deletes history items by local IDs", async () => {
      await upsertHistoryItems([
        { local_id: "h1", user_id: 1, created_at: "2024-01-01", content: "A" },
        { local_id: "h2", user_id: 1, created_at: "2024-01-02", content: "B" },
      ]);

      await deleteHistoryItems(["h1"]);
      const history = await getHistoryByUser(1);
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe("B");
    });

    it("handles empty or null arrays in deleteHistoryItems", async () => {
      await expect(deleteHistoryItems([])).resolves.toBeUndefined();
      await expect(deleteHistoryItems(null)).resolves.toBeUndefined();
    });
  });
});
