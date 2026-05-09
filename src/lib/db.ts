import Database from "@tauri-apps/plugin-sql";
import type { Folder, Note } from "../types";
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
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await database.execute(
    `CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      note_type TEXT NOT NULL DEFAULT 'note',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await database.execute(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  );

  // Add folder_id column to notes if missing (idempotent — sqlite has no
  // ALTER ... IF NOT EXISTS, so we swallow the duplicate-column error).
  try {
    await database.execute("ALTER TABLE notes ADD COLUMN folder_id TEXT");
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) {
      throw e;
    }
  }

  // Add position columns if missing (for drag-to-reorder).
  try {
    await database.execute("ALTER TABLE folders ADD COLUMN position INTEGER NOT NULL DEFAULT 0");
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) {
      throw e;
    }
  }
  try {
    await database.execute("ALTER TABLE notes ADD COLUMN position INTEGER NOT NULL DEFAULT 0");
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) {
      throw e;
    }
  }
  try {
    await database.execute("ALTER TABLE notes ADD COLUMN note_type TEXT NOT NULL DEFAULT 'note'");
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) {
      throw e;
    }
  }

  // Soft delete support — deleted_at marks when a note was trashed (NULL = active).
  try {
    await database.execute("ALTER TABLE notes ADD COLUMN deleted_at TEXT");
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) {
      throw e;
    }
  }
  try {
    await database.execute("ALTER TABLE folders ADD COLUMN deleted_at TEXT");
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) {
      throw e;
    }
  }

  // Favorites / pinned notes.
  try {
    await database.execute("ALTER TABLE notes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0");
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) {
      throw e;
    }
  }

  // Nested folders.
  try {
    await database.execute("ALTER TABLE folders ADD COLUMN parent_id TEXT");
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) {
      throw e;
    }
  }

  await database.execute(
    `CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC)`
  );
  await database.execute(
    `CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id)`
  );

  // Note link graph — tracks [[wikilinks]] between notes.
  try {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS note_links (
        source_id TEXT NOT NULL,
        target_text TEXT NOT NULL,
        target_id TEXT,
        PRIMARY KEY (source_id, target_text)
      )
    `);
  } catch {
    // Table already exists
  }

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

export async function getAllFolders(): Promise<Folder[]> {
  const database = await getDb();
  return await database.select<Folder[]>(
    "SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY position ASC, name COLLATE NOCASE ASC"
  );
}

export async function createFolder(name: string, parentId?: string | null): Promise<Folder> {
  const database = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  // Place at end of the target level: position = max position within same parent + 1
  let position: number;
  if (parentId) {
    const rows = await database.select<{ m: number | null }[]>(
      "SELECT MAX(position) as m FROM folders WHERE parent_id = $1 AND deleted_at IS NULL",
      [parentId]
    );
    position = (rows[0]?.m ?? -1) + 1;
  } else {
    const rows = await database.select<{ m: number | null }[]>(
      "SELECT MAX(position) as m FROM folders WHERE parent_id IS NULL AND deleted_at IS NULL"
    );
    position = (rows[0]?.m ?? -1) + 1;
  }
  await database.execute(
    "INSERT INTO folders (id, name, is_default, parent_id, position, created_at, updated_at) VALUES ($1, $2, 0, $3, $4, $5, $6)",
    [id, name, parentId ?? null, position, now, now]
  );
  return {
    id,
    name,
    is_default: 0,
    parent_id: parentId ?? null,
    position,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  await database.execute(
    "UPDATE folders SET name = $1, updated_at = $2 WHERE id = $3",
    [name, now, id]
  );
}

// Reassigns the folder's notes to `reassignTo`, then deletes the folder.
// Refuses to delete the default folder.
export async function deleteFolder(
  id: string,
  reassignTo: string
): Promise<void> {
  if (id === reassignTo) {
    throw new Error("Cannot reassign notes to the folder being deleted");
  }
  const database = await getDb();
  await database.execute("BEGIN");
  try {
    await database.execute(
      "UPDATE notes SET folder_id = $1 WHERE folder_id = $2",
      [reassignTo, id]
    );
    await database.execute(
      "DELETE FROM folders WHERE id = $1 AND is_default = 0",
      [id]
    );
    await database.execute("COMMIT");
  } catch (e) {
    await database.execute("ROLLBACK");
    throw e;
  }
}

export async function getAllNotes(folderId?: string | null): Promise<Note[]> {
  const database = await getDb();
  if (folderId) {
    return await database.select<Note[]>(
      "SELECT * FROM notes WHERE folder_id = $1 AND deleted_at IS NULL ORDER BY is_favorite DESC, position ASC, updated_at DESC",
      [folderId]
    );
  }
  return await database.select<Note[]>(
    "SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY is_favorite DESC, position ASC, updated_at DESC"
  );
}

export async function toggleFavorite(id: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE notes SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END WHERE id = $1",
    [id]
  );
}

export async function getNoteById(id: string): Promise<Note | null> {
  const database = await getDb();
  const rows = await database.select<Note[]>(
    "SELECT * FROM notes WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createNote(
  id: string,
  folderId?: string | null,
  noteType: Note["note_type"] = "note"
): Promise<Note> {
  const database = await getDb();
  const now = new Date().toISOString();
  const targetFolderId = folderId ?? (await getDefaultFolderId());
  // Place at start: position = 0, shift existing notes down
  await database.execute(
    "UPDATE notes SET position = position + 1 WHERE folder_id = $1",
    [targetFolderId]
  );
  await database.execute(
    "INSERT INTO notes (id, title, content, position, note_type, folder_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [id, "", "", 0, noteType, targetFolderId, now, now]
  );
  return {
    id,
    title: "",
    content: "",
    position: 0,
    note_type: noteType,
    folder_id: targetFolderId,
    is_favorite: 0,
    deleted_at: null,
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

// --- Trash / soft-delete ---

export async function softDeleteNote(id: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE notes SET deleted_at = datetime('now') WHERE id = $1",
    [id]
  );
}

export async function restoreNote(id: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE notes SET deleted_at = NULL WHERE id = $1",
    [id]
  );
}

export async function permanentlyDeleteNote(id: string): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM notes WHERE id = $1", [id]);
}

export async function softDeleteFolder(
  id: string,
  defaultFolderId: string
): Promise<void> {
  const database = await getDb();
  // Reassign active notes in this folder and all descendant folders to default folder
  const descendantIds = await collectDescendantFolderIds(id);
  const allFolderIds = [id, ...descendantIds];
  for (const fid of allFolderIds) {
    await database.execute(
      "UPDATE notes SET folder_id = $1 WHERE folder_id = $2 AND deleted_at IS NULL",
      [defaultFolderId, fid]
    );
  }
  // Soft-delete the folder itself
  await database.execute(
    "UPDATE folders SET deleted_at = datetime('now') WHERE id = $1 AND is_default = 0",
    [id]
  );
  // Soft-delete all descendant folders
  if (descendantIds.length > 0) {
    const placeholders = descendantIds.map((_, i) => `$${i + 1}`).join(", ");
    await database.execute(
      `UPDATE folders SET deleted_at = datetime('now') WHERE id IN (${placeholders}) AND is_default = 0`,
      descendantIds
    );
  }
}

export async function restoreFolder(id: string): Promise<void> {
  const database = await getDb();
  // Restore the folder itself
  await database.execute(
    "UPDATE folders SET deleted_at = NULL WHERE id = $1",
    [id]
  );
  // Restore all descendant folders that were soft-deleted as part of this tree
  const descendantIds = await collectDescendantFolderIdsForRestore(id);
  if (descendantIds.length > 0) {
    const placeholders = descendantIds.map((_, i) => `$${i + 1}`).join(", ");
    await database.execute(
      `UPDATE folders SET deleted_at = NULL WHERE id IN (${placeholders}) AND is_default = 0`,
      descendantIds
    );
  }
}

export async function permanentlyDeleteFolder(id: string): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM folders WHERE id = $1", [id]);
}

export async function getTrashedNotes(): Promise<Note[]> {
  const database = await getDb();
  return await database.select<Note[]>(
    "SELECT * FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
  );
}

export async function getTrashedFolders(): Promise<Folder[]> {
  const database = await getDb();
  return await database.select<Folder[]>(
    "SELECT * FROM folders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
  );
}

// Collects all descendant folder IDs recursively.
// Set includeSoftDeleted to true when restoring (to find all children),
// false when soft-deleting (to only find active children).
async function collectDescendantFolderIds(
  parentId: string,
  includeSoftDeleted = false
): Promise<string[]> {
  const database = await getDb();
  const whereClause = includeSoftDeleted
    ? "parent_id = $1"
    : "parent_id = $1 AND deleted_at IS NULL";
  const children = await database.select<{ id: string }[]>(
    `SELECT id FROM folders WHERE ${whereClause}`,
    [parentId]
  );
  const result: string[] = [];
  for (const child of children) {
    result.push(child.id);
    const grandKids = await collectDescendantFolderIds(child.id, includeSoftDeleted);
    result.push(...grandKids);
  }
  return result;
}

async function collectDescendantFolderIdsForRestore(parentId: string): Promise<string[]> {
  return collectDescendantFolderIds(parentId, true);
}

export async function emptyTrash(): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM notes WHERE deleted_at IS NOT NULL");
  await database.execute(
    "DELETE FROM folders WHERE deleted_at IS NOT NULL AND is_default = 0"
  );
}

export async function getNoteCountInFolder(
  folderId: string
): Promise<number> {
  const database = await getDb();
  const rows = await database.select<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM notes WHERE folder_id = $1 AND deleted_at IS NULL",
    [folderId]
  );
  return rows[0].c;
}

export async function getNoteCountsByFolder(): Promise<Record<string, number>> {
  const database = await getDb();
  const rows = await database.select<{ folder_id: string; c: number }[]>(
    "SELECT folder_id, COUNT(*) as c FROM notes WHERE folder_id IS NOT NULL AND deleted_at IS NULL GROUP BY folder_id"
  );
  const out: Record<string, number> = {};
  for (const row of rows) out[row.folder_id] = row.c;
  return out;
}

export async function searchNotes(
  query: string,
  folderId?: string | null
): Promise<Note[]> {
  const database = await getDb();
  const searchTerm = `%${query}%`;
  if (folderId) {
    return await database.select<Note[]>(
      "SELECT * FROM notes WHERE folder_id = $1 AND deleted_at IS NULL AND (title LIKE $2 OR content LIKE $3) ORDER BY is_favorite DESC, position ASC, updated_at DESC",
      [folderId, searchTerm, searchTerm]
    );
  }
  return await database.select<Note[]>(
    "SELECT * FROM notes WHERE deleted_at IS NULL AND (title LIKE $1 OR content LIKE $2) ORDER BY is_favorite DESC, position ASC, updated_at DESC",
    [searchTerm, searchTerm]
  );
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const database = await getDb();
  const rows = await database.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings"
  );
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      // Corrupted row — skip; coerceSetting will apply default.
    }
  }
  return out;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const database = await getDb();
  const json = JSON.stringify(value);
  const now = Date.now();
  await database.execute(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, json, now]
  );
}

export async function reorderFolders(orderedIds: string[]): Promise<void> {
  const database = await getDb();
  await database.execute("BEGIN");
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await database.execute(
        "UPDATE folders SET position = $1 WHERE id = $2",
        [i, orderedIds[i]]
      );
    }
    await database.execute("COMMIT");
  } catch (e) {
    await database.execute("ROLLBACK");
    throw e;
  }
}

export async function moveFolderToParent(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  const database = await getDb();
  // Get max position at target level
  let position: number;
  if (newParentId) {
    const rows = await database.select<{ m: number | null }[]>(
      "SELECT MAX(position) as m FROM folders WHERE parent_id = $1 AND deleted_at IS NULL AND id != $2",
      [newParentId, folderId]
    );
    position = (rows[0]?.m ?? -1) + 1;
  } else {
    const rows = await database.select<{ m: number | null }[]>(
      "SELECT MAX(position) as m FROM folders WHERE parent_id IS NULL AND deleted_at IS NULL AND id != $1",
      [folderId]
    );
    position = (rows[0]?.m ?? -1) + 1;
  }
  await database.execute(
    "UPDATE folders SET parent_id = $1, position = $2, updated_at = datetime('now') WHERE id = $3",
    [newParentId, position, folderId]
  );
}

export async function moveNoteToFolder(noteId: string, folderId: string | null): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  await database.execute(
    "UPDATE notes SET folder_id = $1, updated_at = $2 WHERE id = $3",
    [folderId, now, noteId]
  );
}

export async function reorderNotes(orderedIds: string[]): Promise<void> {
  const database = await getDb();
  await database.execute("BEGIN");
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await database.execute(
        "UPDATE notes SET position = $1 WHERE id = $2",
        [i, orderedIds[i]]
      );
    }
    await database.execute("COMMIT");
  } catch (e) {
    await database.execute("ROLLBACK");
    throw e;
  }
}

// --- Link graph ([[wikilinks]]) ---

// Resolve a link target: try exact ID match, then exact title match,
// then case-insensitive LIKE fallback.
export async function resolveLinkTarget(titleOrId: string): Promise<Note | null> {
  const database = await getDb();

  // Exact ID match
  const byId = await database.select<Note[]>(
    "SELECT * FROM notes WHERE id = $1 AND deleted_at IS NULL",
    [titleOrId]
  );
  if (byId.length > 0) return byId[0];

  // Exact title match
  const byTitle = await database.select<Note[]>(
    "SELECT * FROM notes WHERE title = $1 AND deleted_at IS NULL LIMIT 1",
    [titleOrId]
  );
  if (byTitle.length > 0) return byTitle[0];

  // Case-insensitive LIKE fallback
  const byLike = await database.select<Note[]>(
    "SELECT * FROM notes WHERE LOWER(title) LIKE LOWER($1) AND deleted_at IS NULL LIMIT 1",
    [`%${titleOrId}%`]
  );
  return byLike.length > 0 ? byLike[0] : null;
}

// Replace all links for a note (called when note content changes).
// Each target string is resolved to an ID immediately; unresolvable
// targets store NULL for target_id and will be re-resolved later.
export async function setNoteLinks(
  sourceId: string,
  targets: string[]
): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM note_links WHERE source_id = $1", [sourceId]);
  for (const target of targets) {
    const resolved = await resolveLinkTarget(target);
    await database.execute(
      "INSERT OR IGNORE INTO note_links (source_id, target_text, target_id) VALUES ($1, $2, $3)",
      [sourceId, target, resolved?.id ?? null]
    );
  }
}

// Get all notes that the given note links TO.
export async function getNoteLinks(noteId: string): Promise<Note[]> {
  const database = await getDb();
  return database.select<Note[]>(
    `SELECT n.* FROM notes n
     INNER JOIN note_links nl ON nl.target_id = n.id
     WHERE nl.source_id = $1 AND n.deleted_at IS NULL
     ORDER BY n.title`,
    [noteId]
  );
}

// Get all notes that LINK TO the given note (backlinks).
export async function getNoteBacklinks(noteId: string): Promise<Note[]> {
  const database = await getDb();
  return database.select<Note[]>(
    `SELECT n.* FROM notes n
     INNER JOIN note_links nl ON nl.source_id = n.id
     WHERE nl.target_id = $1 AND n.deleted_at IS NULL
     ORDER BY n.title`,
    [noteId]
  );
}
