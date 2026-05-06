import { useState, useEffect, useCallback, useRef } from "react";
import type { Note } from "../types";
import * as db from "../lib/db";
import { generateId } from "../lib/utils";

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
  // Per-id queue so two editors editing different notes can't clobber
  // each other within the debounce window.
  const pendingSavesRef = useRef<Map<string, string>>(new Map());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        await db.initDb();
        const all = await db.getAllNotes();
        setNotes(all);
        if (all.length > 0) {
          setSelectedId(all[0].id);
        }
        initialLoadDone.current = true;
      } catch (e) {
        console.error("Failed to initialize database:", e);
        setError(String(e));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const refreshNotes = useCallback(async () => {
    try {
      if (searchQuery.trim()) {
        const results = await db.searchNotes(searchQuery.trim(), folderId);
        setNotes(results);
      } else {
        const all = await db.getAllNotes(folderId);
        setNotes(all);
      }
    } catch (e) {
      console.error("Failed to refresh notes:", e);
    }
  }, [searchQuery, folderId]);

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

  const flushSave = useCallback(async () => {
    if (pendingSavesRef.current.size === 0) return;
    const entries = Array.from(pendingSavesRef.current.entries());
    pendingSavesRef.current.clear();
    for (const [id, content] of entries) {
      try {
        await db.updateNoteContent(id, content);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, content, updated_at: new Date().toISOString() }
              : n
          )
        );
      } catch (e) {
        console.error("Failed to save note:", e);
      }
    }
  }, []);

  const saveNoteContent = useCallback(
    (id: string, content: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, content, updated_at: new Date().toISOString() }
            : n
        )
      );
      pendingSavesRef.current.set(id, content);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => flushSave(), 500);
    },
    [flushSave]
  );

  const createNote = useCallback(async () => {
    await flushSave();
    const id = generateId();
    const targetFolderId = folderId ?? createInFolderId ?? null;
    try {
      const note = await db.createNote(id, targetFolderId);
      setNotes((prev) => [note, ...prev]);
      setSelectedId(id);
      setSearchQuery("");
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }, [flushSave, folderId, createInFolderId]);

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await db.deleteNote(id);
      } catch (e) {
        console.error("Failed to delete note:", e);
      }
      setNotes((prev) => {
        const filtered = prev.filter((n) => n.id !== id);
        if (selectedId === id) {
          setSelectedId(filtered.length > 0 ? filtered[0].id : null);
        }
        return filtered;
      });
    },
    [selectedId]
  );

  const renameNote = useCallback(async (id: string, title: string) => {
    try {
      await db.updateNoteTitle(id, title);
    } catch (e) {
      console.error("Failed to rename note:", e);
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, title, updated_at: new Date().toISOString() }
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
    return () => {
      flushSave();
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
    createNote,
    deleteNote,
    renameNote,
    selectNote,
    reorderNotes,
    saveNoteContent,
    flushSave,
    refreshNotes,
  };
}
