import Database from "@tauri-apps/plugin-sql";
import type { Note } from "../types";
import { generateId } from "./utils";

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:opennotes.db");
  }
  return db;
}

export async function initDb(): Promise<void> {
  const database = await getDb();

  await database.execute(
    `CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await database.execute(
    `CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  // Add folder_id column to notes if missing (migration for pre-folders DBs).
  const cols = await database.select<{ name: string }[]>(
    "PRAGMA table_info(notes)"
  );
  if (!cols.some((c) => c.name === "folder_id")) {
    await database.execute("ALTER TABLE notes ADD COLUMN folder_id TEXT");
  }

  await database.execute(
    `CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC)`
  );
  await database.execute(
    `CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id)`
  );

  // Seed default folder if none exist.
  const folderCount = await database.select<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM folders"
  );
  if (folderCount[0].c === 0) {
    const id = generateId();
    const now = new Date().toISOString();
    await database.execute(
      "INSERT INTO folders (id, name, is_default, created_at, updated_at) VALUES ($1, $2, 1, $3, $4)",
      [id, "Notes", now, now]
    );
  }

  // Backfill any notes missing a folder to the default folder.
  await database.execute(
    `UPDATE notes
     SET folder_id = (SELECT id FROM folders WHERE is_default = 1 LIMIT 1)
     WHERE folder_id IS NULL`
  );
}

export async function getDefaultFolderId(): Promise<string> {
  const database = await getDb();
  const rows = await database.select<{ id: string }[]>(
    "SELECT id FROM folders WHERE is_default = 1 LIMIT 1"
  );
  if (rows.length === 0) {
    throw new Error("Default folder missing — initDb did not run");
  }
  return rows[0].id;
}

export async function getAllNotes(): Promise<Note[]> {
  const database = await getDb();
  return await database.select<Note[]>(
    "SELECT * FROM notes ORDER BY updated_at DESC"
  );
}

export async function getNoteById(id: string): Promise<Note | null> {
  const database = await getDb();
  const rows = await database.select<Note[]>(
    "SELECT * FROM notes WHERE id = $1",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createNote(id: string): Promise<Note> {
  const database = await getDb();
  const now = new Date().toISOString();
  const folderId = await getDefaultFolderId();
  await database.execute(
    "INSERT INTO notes (id, title, content, folder_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, "", "", folderId, now, now]
  );
  return {
    id,
    title: "",
    content: "",
    folder_id: folderId,
    created_at: now,
    updated_at: now,
  };
}

export async function updateNoteContent(
  id: string,
  content: string
): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  await database.execute(
    "UPDATE notes SET content = $1, updated_at = $2 WHERE id = $3",
    [content, now, id]
  );
}

export async function updateNoteTitle(
  id: string,
  title: string
): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  await database.execute(
    "UPDATE notes SET title = $1, updated_at = $2 WHERE id = $3",
    [title, now, id]
  );
}

export async function deleteNote(id: string): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM notes WHERE id = $1", [id]);
}

export async function searchNotes(query: string): Promise<Note[]> {
  const database = await getDb();
  const searchTerm = `%${query}%`;
  return await database.select<Note[]>(
    "SELECT * FROM notes WHERE title LIKE $1 OR content LIKE $2 ORDER BY updated_at DESC",
    [searchTerm, searchTerm]
  );
}
