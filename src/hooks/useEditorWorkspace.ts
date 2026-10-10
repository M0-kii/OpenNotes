import { useState, useCallback, useEffect } from "react";
import { getNoteById } from "../lib/db";
import type { Note } from "../types";

interface Options {
  notes: Note[];
  selectedId: string | null;
  selectNote: (id: string) => Promise<void>;
  saveNoteContent: (id: string, content: string) => void;
  renameNote: (id: string, title: string) => Promise<void>;
  setNoteReminder: (id: string, date: string | null) => Promise<void>;
}

export function useEditorWorkspace({ notes, selectedId, selectNote, saveNoteContent, renameNote, setNoteReminder }: Options) {
  // Split-editor state. splitNoteId === null → single pane (today's UX).
  // When set, two editors render side-by-side. activePane drives where
  // sidebar clicks and new-note creation land.
  const [splitNoteId, setSplitNoteId] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<"left" | "right">("left");
  const [rightNote, setRightNote] = useState<Note | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const raw = parseFloat(localStorage.getItem("opennotes-split-ratio") || "");
    return Number.isFinite(raw) && raw >= 0.2 && raw <= 0.8 ? raw : 0.5;
  });

  // Drag state for snap layout zones
  const [isDraggingNote, setIsDraggingNote] = useState(false);

  // Tab state — arrays of note IDs per pane
  const [leftPaneTabs, setLeftPaneTabs] = useState<string[]>([]);
  const [rightPaneTabs, setRightPaneTabs] = useState<string[]>([]);

  const leftTabInfos = leftPaneTabs.map((id) => {
    const note = notes.find((n) => n.id === id);
    return { id, title: note?.title || "Untitled" };
  });
  const rightTabInfos = rightPaneTabs.map((id) => {
    const note = notes.find((n) => n.id === id);
    return { id, title: note?.title || "Untitled" };
  });

  // Hydrate the right pane note whenever splitNoteId changes.
  useEffect(() => {
    if (!splitNoteId) {
      setRightNote(null);
      return;
    }
    let cancelled = false;
    // Prefer the in-memory copy from the notes list (so updates flow
    // through naturally); fall back to a DB fetch if the note is filtered
    // out of the current view.
    const cached = notes.find((n) => n.id === splitNoteId);
    if (cached) {
      setRightNote(cached);
      return;
    }
    getNoteById(splitNoteId).then((n) => {
      if (!cancelled) setRightNote((current) => {
        // A filtered-out note still has local edits in the right pane. A DB
        // snapshot taken before its save must not replace those newer edits.
        if (current?.id === n?.id && current && n &&
            Date.parse(current.updated_at) > Date.parse(n.updated_at)) return current;
        return n;
      });
    }).catch((error) => console.error("Failed to load split note:", error));
    return () => {
      cancelled = true;
    };
  }, [splitNoteId, notes]);

  // Auto-add to left pane tabs when a note is selected (e.g. via createNote)
  useEffect(() => {
    if (selectedId) {
      setLeftPaneTabs((prev) => prev.includes(selectedId) ? prev : [...prev, selectedId]);
    }
  }, [selectedId]);

  // Auto-add to right pane tabs when split note is set
  useEffect(() => {
    if (splitNoteId) {
      setRightPaneTabs((prev) => prev.includes(splitNoteId) ? prev : [...prev, splitNoteId]);
    }
  }, [splitNoteId]);

  const closeSplit = useCallback(() => {
    setSplitNoteId(null);
    setRightPaneTabs([]);
    setActivePane("left");
  }, []);

  const openInRight = useCallback((noteId: string) => {
    setRightPaneTabs((prev) =>
      prev.includes(noteId) ? prev : [...prev, noteId],
    );
    setSplitNoteId(noteId);
    setActivePane("right");
  }, []);

  const openInSplit = useCallback(
    (noteId: string) => {
      openInRight(noteId);
    },
    [openInRight],
  );

  const openInLeft = useCallback(
    (noteId: string) => {
      setLeftPaneTabs((prev) =>
        prev.includes(noteId) ? prev : [...prev, noteId],
      );
      selectNote(noteId);
    },
    [selectNote],
  );

  const handleDragStart = useCallback(() => setIsDraggingNote(true), []);
  const handleDragEndDrag = useCallback(() => setIsDraggingNote(false), []);

  const handleDropZone = useCallback(
    (noteId: string, zone: string) => {
      if (zone === "tab") {
        openInLeft(noteId);
      } else {
        openInRight(noteId);
      }
    },
    [openInLeft, openInRight],
  );

  const closeLeftTab = useCallback(
    (index: number) => {
      const closedId = leftPaneTabs[index];
      const newTabs = leftPaneTabs.filter((_, i) => i !== index);
      setLeftPaneTabs(newTabs);
      if (selectedId === closedId && newTabs.length > 0) {
        const newIndex = Math.min(index, newTabs.length - 1);
        selectNote(newTabs[newIndex]);
      }
    },
    [leftPaneTabs, selectedId, selectNote],
  );

  const closeRightTab = useCallback(
    (index: number) => {
      const closedId = rightPaneTabs[index];
      const newTabs = rightPaneTabs.filter((_, i) => i !== index);
      setRightPaneTabs(newTabs);
      if (splitNoteId === closedId) {
        if (newTabs.length > 0) {
          const newIndex = Math.min(index, newTabs.length - 1);
          setSplitNoteId(newTabs[newIndex]);
        } else {
          setSplitNoteId(null);
          setActivePane("left");
        }
      }
    },
    [rightPaneTabs, splitNoteId],
  );

  const switchLeftTab = useCallback(
    (index: number) => {
      const noteId = leftPaneTabs[index];
      if (noteId) selectNote(noteId);
    },
    [leftPaneTabs, selectNote],
  );

  const switchRightTab = useCallback(
    (index: number) => {
      const noteId = rightPaneTabs[index];
      if (noteId) {
        setSplitNoteId(noteId);
        setActivePane("right");
      }
    },
    [rightPaneTabs],
  );

  const handleRightContentChange = useCallback(
    (id: string, content: string) => {
      saveNoteContent(id, content);
      setRightNote((n) =>
        n && n.id === id
          ? { ...n, content, updated_at: new Date().toISOString() }
          : n,
      );
    },
    [saveNoteContent],
  );

  const handleRightTitleChange = useCallback(
    (id: string, title: string) => {
      renameNote(id, title);
      setRightNote((n) =>
        n && n.id === id
          ? { ...n, title, updated_at: new Date().toISOString() }
          : n,
      );
    },
    [renameNote],
  );

  const handleRightReminderChange = useCallback(
    (id: string, reminderAt: string | null) => {
      setNoteReminder(id, reminderAt);
      setRightNote((n) =>
        n && n.id === id
          ? { ...n, reminder_at: reminderAt, reminder_notified: 0, updated_at: new Date().toISOString() }
          : n,
      );
    },
    [setNoteReminder],
  );

  const handleSelectFromSidebar = useCallback(
    (id: string, openInSplitToo?: boolean) => {
      if (openInSplitToo) {
        openInRight(id);
        return;
      }
      if (activePane === "right" && splitNoteId !== null) {
        openInRight(id);
      } else {
        openInLeft(id);
      }
    },
    [activePane, splitNoteId, openInLeft, openInRight],
  );

  const handleResize = useCallback((ratio: number) => {
    setSplitRatio(ratio);
  }, []);

  const handleResizeEnd = useCallback((ratio: number) => {
    localStorage.setItem("opennotes-split-ratio", String(ratio));
  }, []);

  return {
    splitNoteId,
    setSplitNoteId,
    activePane,
    setActivePane,
    rightNote,
    splitRatio,
    isDraggingNote,
    leftPaneTabs,
    rightPaneTabs,
    leftTabInfos,
    rightTabInfos,
    closeSplit,
    openInRight,
    openInSplit,
    openInLeft,
    handleDragStart,
    handleDragEndDrag,
    handleDropZone,
    closeLeftTab,
    closeRightTab,
    switchLeftTab,
    switchRightTab,
    handleRightContentChange,
    handleRightTitleChange,
    handleRightReminderChange,
    handleSelectFromSidebar,
    handleResize,
    handleResizeEnd,
  };
}
