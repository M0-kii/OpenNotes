import { useState, useEffect, useCallback, useRef } from "react";
import type { Note } from "../types";
import * as db from "../lib/db";
import { generateId } from "../lib/utils";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ id: string; content: string } | null>(null);
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
        const results = await db.searchNotes(searchQuery.trim());
        setNotes(results);
      } else {
        const all = await db.getAllNotes();
        setNotes(all);
      }
    } catch (e) {
      console.error("Failed to refresh notes:", e);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    const timer = setTimeout(() => refreshNotes(), 200);
    return () => clearTimeout(timer);
  }, [searchQuery, refreshNotes]);

  const flushSave = useCallback(async () => {
    if (pendingSaveRef.current) {
      const { id, content } = pendingSaveRef.current;
      pendingSaveRef.current = null;
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
      pendingSaveRef.current = { id, content };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => flushSave(), 500);
    },
    [flushSave]
  );

  const createNote = useCallback(async () => {
    await flushSave();
    const id = generateId();
    try {
      const note = await db.createNote(id);
      setNotes((prev) => [note, ...prev]);
      setSelectedId(id);
      setSearchQuery("");
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }, [flushSave]);

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
    saveNoteContent,
    flushSave,
  };
}
