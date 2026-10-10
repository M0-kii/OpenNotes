import { useState, useEffect, useCallback, useRef } from "react";
import type { Note, NoteType } from "../types";
import * as db from "../lib/db";
import { generateId } from "../lib/utils";
import { parseWikilinks } from "../lib/linkUtils";
import { NoteSaveQueue, type NoteDraft } from "../lib/noteSaveQueue";
import { readDrafts, writeDrafts } from "../lib/draftRecovery";

interface UseNotesOptions {
  // null = All Notes (no folder filter)
  folderId: string | null;
  // Where to put new notes when folderId is null. If null too, lib/db.ts
  // falls back to the default folder.
  createInFolderId?: string | null;
}

export function useNotes({ folderId, createInFolderId }: UseNotesOptions) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasPendingSaves, setHasPendingSaves] = useState(false);
  const retryDelayRef = useRef(1000);
  const journalErrorRef = useRef(false);
  const recoveryErrorRef = useRef(false);
  const refreshRequestRef = useRef(0);
  const editVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const queueRef = useRef<NoteSaveQueue | null>(null);
  if (!queueRef.current) {
    queueRef.current = new NoteSaveQueue(async (id, draft) => {
      if (draft.title !== undefined) await db.updateNoteTitle(id, draft.title);
      if (draft.content !== undefined) {
        await db.updateNoteContent(id, draft.content);
        await db.setNoteLinks(id, parseWikilinks(draft.content).map((link) => link.target));
      }
    }, (entries) => {
      if (mountedRef.current) setHasPendingSaves(entries.length > 0);
      try {
        writeDrafts(localStorage, entries);
        journalErrorRef.current = false;
      } catch {
        journalErrorRef.current = true;
        if (mountedRef.current) setSaveError("Recovery copy could not be stored. Keep this window open until notes are saved.");
      }
    });
  }
  const queue = queueRef.current;
  const initialLoadDone = useRef(false);
  const [backlinks, setBacklinks] = useState<Note[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await db.initDb();
        const all = await db.getAllNotes();
        if (cancelled) return;
        // Recover only existing notes, including drafts of notes moved to Trash.
        // Never recreate a permanently deleted note from an old journal.
        try {
          const drafts = readDrafts(localStorage);
          const recovered: Array<[string, NoteDraft]> = [];
          for (const [id, draft] of drafts) {
            if (await db.getNoteById(id, true)) recovered.push([id, draft]);
          }
          if (cancelled) return;
          for (const [id, draft] of recovered) queue.enqueue(id, draft);
          if (!recovered.length) writeDrafts(localStorage, []);
        } catch {
          recoveryErrorRef.current = true;
          setSaveError("The recovery copy could not be read. It has been kept for recovery.");
        }
        setNotes(queue.overlay(all));
        if (all.length > 0) {
          setSelectedId(all[0].id);
        }
        initialLoadDone.current = true;
        if (queue.size) void flushSave();
      } catch (e) {
        console.error("Failed to initialize database:", e);
        setError(String(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const refreshNotes = useCallback(async () => {
    const request = ++refreshRequestRef.current;
    const version = editVersionRef.current;
    try {
      if (searchQuery.trim()) {
        const results = await db.searchNotes(searchQuery.trim(), folderId);
        if (request === refreshRequestRef.current && version === editVersionRef.current) setNotes(queue.overlay(results));
      } else {
        const all = await db.getAllNotes(folderId);
        if (request === refreshRequestRef.current && version === editVersionRef.current) setNotes(queue.overlay(all));
      }
    } catch (e) {
      console.error("Failed to refresh notes:", e);
    }
  }, [searchQuery, folderId, queue]);

  // Debounced for search (200ms), immediate for folder switch.
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const delay = searchQuery.trim() ? 200 : 0;
    const timer = setTimeout(async () => {
      await flushSave();
      refreshNotes();
    }, delay);
    return () => { clearTimeout(timer); };
  }, [searchQuery, folderId, refreshNotes]);

  // Keep selection coherent with the current notes list.
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (selectedId && !notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0]?.id ?? null);
    } else if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId]);

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      await queue.flush();
      retryDelayRef.current = 1000;
      if (mountedRef.current && !journalErrorRef.current && !recoveryErrorRef.current) setSaveError(null);
      return true;
    } catch (e) {
      console.error("Failed to save notes:", e);
      if (!mountedRef.current) return false;
      setSaveError("Changes could not be saved. Your edits are kept here; retrying automatically.");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => { void flushSave(); }, retryDelayRef.current);
      retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30000);
      return false;
    }
  }, [queue]);

  const saveDraft = useCallback((id: string, draft: NoteDraft) => {
    editVersionRef.current++;
    queue.enqueue(id, draft);
    setNotes((prev) => prev.map((n) => n.id === id
      ? { ...n, ...draft, updated_at: new Date().toISOString() } : n));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushSave(); }, 400);
  }, [queue, flushSave]);

  const saveNoteContent = useCallback(
    (id: string, content: string) => {
      saveDraft(id, { content });
    },
    [saveDraft]
  );

  const createNote = useCallback(async (noteType: NoteType = "note", title: string = "") => {
    await flushSave();
    const id = generateId();
    const targetFolderId = folderId ?? createInFolderId ?? null;
    try {
      const note = await db.createNote(id, targetFolderId, noteType, title);
      setNotes((prev) => [note, ...prev]);
      setSelectedId(id);
      setSearchQuery("");
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }, [flushSave, folderId, createInFolderId]);

  // Trashed notes state (loaded once on mount, refreshed on-demand).
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);

  const refreshTrashedNotes = useCallback(async () => {
    try {
      const trashed = await db.getTrashedNotes();
      setTrashedNotes(trashed);
    } catch (e) {
      console.error("Failed to load trashed notes:", e);
    }
  }, []);

  // Load trashed notes on mount.
  useEffect(() => {
    refreshTrashedNotes();
  }, [refreshTrashedNotes]);

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await db.softDeleteNote(id);
      } catch (e) {
        console.error("Failed to delete note:", e);
        return;
      }
      setNotes((prev) => {
        const filtered = prev.filter((n) => n.id !== id);
        if (selectedId === id) {
          setSelectedId(filtered.length > 0 ? filtered[0].id : null);
        }
        return filtered;
      });
      // Refresh trashed notes so TrashView has current data.
      refreshTrashedNotes();
    },
    [selectedId, refreshTrashedNotes]
  );

  const restoreNote = useCallback(async (id: string) => {
    try {
      await db.restoreNote(id);
      setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
      await refreshNotes();
    } catch (e) {
      console.error("Failed to restore note:", e);
    }
  }, [refreshNotes]);

  const permanentlyDeleteNote = useCallback(async (id: string) => {
    try {
      if (!await flushSave()) return;
      await db.permanentlyDeleteNote(id);
      setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("Failed to permanently delete note:", e);
    }
  }, [flushSave]);

  const refreshBacklinks = useCallback(async (noteId: string) => {
    if (!noteId) {
      setBacklinks([]);
      return;
    }
    const results = await db.getNoteBacklinks(noteId);
    setBacklinks(results);
  }, []);

  const renameNote = useCallback(async (id: string, title: string) => {
    saveDraft(id, { title });
  }, [saveDraft]);

  const toggleFavorite = useCallback(async (id: string) => {
    try {
      await db.toggleFavorite(id);
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
      return;
    }
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, is_favorite: n.is_favorite ? 0 : 1 } as Note : n
      );
      return updated.sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return b.is_favorite - a.is_favorite;
        return a.position - b.position;
      });
    });
  }, []);

  const setNoteReminder = useCallback(async (id: string, reminderAt: string | null) => {
    try {
      await db.updateNoteReminder(id, reminderAt);
    } catch (e) {
      console.error("Failed to update reminder:", e);
      return;
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, reminder_at: reminderAt, reminder_notified: 0, updated_at: new Date().toISOString() }
          : n
      )
    );
  }, []);

  const selectNote = useCallback(
    async (id: string) => {
      if (id === selectedId) return;
      await flushSave();
      setSelectedId(id);
    },
    [selectedId, flushSave]
  );

  const reorderNotes = useCallback(async (orderedIds: string[]) => {
    setNotes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return orderedIds
        .map((id, i) => {
          const n = byId.get(id);
          return n ? { ...n, position: i } : null;
        })
        .filter(Boolean) as Note[];
    });
    try {
      await db.reorderNotes(orderedIds);
    } catch (e) {
      console.error("Failed to reorder notes:", e);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void flushSave();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [flushSave]);

  return {
    notes,
    selectedNote,
    selectedId,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    saveError,
    hasPendingSaves,
    createNote,
    deleteNote,
    renameNote,
    selectNote,
    reorderNotes,
    saveNoteContent,
    flushSave,
    refreshNotes,
    trashedNotes,
    refreshTrashedNotes,
    restoreNote,
    permanentlyDeleteNote,
    toggleFavorite,
    setNoteReminder,
    backlinks,
    refreshBacklinks,
  };
}
