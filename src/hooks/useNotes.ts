import { useState, useEffect, useCallback, useRef } from "react";
import type { Note } from "../types";
import * as db from "../lib/db";
import { generateId } from "../lib/utils";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ id: string; content: string } | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const load = async () => {
      await db.initDb();
      const all = await db.getAllNotes();
      setNotes(all);
      if (all.length > 0) {
        setSelectedId(all[0].id);
      }
      setIsLoading(false);
      initialLoadDone.current = true;
    };
    load();
  }, []);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const refreshNotes = useCallback(async () => {
    if (searchQuery.trim()) {
      const results = await db.searchNotes(searchQuery.trim());
      setNotes(results);
    } else {
      const all = await db.getAllNotes();
      setNotes(all);
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
      await db.updateNoteContent(id, content);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, content, updated_at: new Date().toISOString() }
            : n
        )
      );
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
    const note = await db.createNote(id);
    setNotes((prev) => [note, ...prev]);
    setSelectedId(id);
    setSearchQuery("");
  }, [flushSave]);

  const deleteNote = useCallback(
    async (id: string) => {
      await db.deleteNote(id);
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
    await db.updateNoteTitle(id, title);
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
    createNote,
    deleteNote,
    renameNote,
    selectNote,
    saveNoteContent,
    flushSave,
  };
}
