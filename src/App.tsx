import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useNotes } from "./hooks/useNotes";
import { useFolders } from "./hooks/useFolders";
import { useSettings } from "./hooks/useSettings";
import FoldersSidebar from "./components/FoldersSidebar";
import Sidebar from "./components/Sidebar";
import PaneView from "./components/PaneView";
import TabBar from "./components/TabBar";
import TitleBar from "./components/TitleBar";
import TrashView from "./components/TrashView";
import SettingsApplier from "./components/settings/SettingsApplier";
import SettingsDialog from "./components/settings/SettingsDialog";
import SplitDivider from "./components/SplitDivider";
import {
  getNoteCountsByFolder,
  getNoteById,
  moveNoteToFolder,
  emptyTrash,
} from "./lib/db";
import type { Note } from "./types";

export default function App() {
  const folders = useFolders();
  const {
    settings,
    isLoaded: settingsLoaded,
    update: updateSetting,
  } = useSettings();

  const {
    notes,
    selectedNote,
    selectedId,
    searchQuery,
    setSearchQuery,
    isLoading: notesLoading,
    error: notesError,
    createNote,
    deleteNote,
    renameNote,
    reorderNotes,
    selectNote,
    saveNoteContent,
    refreshNotes,
    trashedNotes,
    refreshTrashedNotes,
    restoreNote,
    permanentlyDeleteNote,
    toggleFavorite,
  } = useNotes({
    folderId: folders.selectedFolderId,
    createInFolderId: folders.selectedFolderId ?? settings.defaultFolderId,
  });

  const [showTrash, setShowTrash] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});

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
  const editorPaneRef = useRef<HTMLDivElement>(null);

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
      if (!cancelled) setRightNote(n);
    });
    return () => {
      cancelled = true;
    };
  }, [splitNoteId, notes]);

  // Auto-add to left pane tabs when a note is selected (e.g. via createNote)
  useEffect(() => {
    if (selectedId && !leftPaneTabs.includes(selectedId)) {
      setLeftPaneTabs((prev) => [...prev, selectedId]);
    }
  }, [selectedId]);

  // Auto-add to right pane tabs when split note is set
  useEffect(() => {
    if (splitNoteId && !rightPaneTabs.includes(splitNoteId)) {
      setRightPaneTabs((prev) => [...prev, splitNoteId]);
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

  const createNewTab = useCallback(() => {
    createNote("note");
  }, [createNote]);

  const handleMoveToFolder = useCallback(
    async (noteId: string, folderId: string) => {
      try {
        await moveNoteToFolder(noteId, folderId);
        // Refresh notes so the moved note disappears from the current folder
        refreshNotes();
      } catch (e) {
        console.error("Failed to move note to folder:", e);
      }
    },
    [refreshNotes],
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

  // Refresh counts whenever the underlying notes list changes.
  useEffect(() => {
    let cancelled = false;
    getNoteCountsByFolder().then((counts) => {
      if (!cancelled) setNoteCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [notes]);

  const totalNoteCount = Object.values(noteCounts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Settings
      if (e.key === ",") {
        e.preventDefault();
        setSettingsOpen((o) => !o);
        return;
      }

      // Split editor shortcuts
      if (e.key === "\\") {
        e.preventDefault();
        setSplitNoteId((curr) => {
          if (curr !== null) return null;
          // Open the currently-active note in a new split.
          return selectedId;
        });
        setActivePane((p) =>
          splitNoteId === null && selectedId !== null ? "right" : p,
        );
        return;
      }

      if (e.key === "1") {
        e.preventDefault();
        setActivePane("left");
        return;
      }

      if (e.key === "2" && splitNoteId !== null) {
        e.preventDefault();
        setActivePane("right");
        return;
      }

      if (e.key.toLowerCase() === "w") {
        if (splitNoteId === null) return; // single pane → no-op
        e.preventDefault();
        if (activePane === "right") {
          // Close right pane.
          setSplitNoteId(null);
          setActivePane("left");
        } else {
          // Close left → promote right to be the only pane.
          if (splitNoteId) {
            selectNote(splitNoteId);
            setSplitNoteId(null);
            setActivePane("left");
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [splitNoteId, activePane, selectedId, selectNote]);

  const handleDeleteNoteRequest = useCallback(
    (id: string) => {
      deleteNote(id);
    },
    [deleteNote],
  );

  // Discord Rich Presence
  useEffect(() => {
    const enabled = settings.discordRpcEnabled && selectedNote !== null;
    const details =
      selectedNote?.note_type === "mindmap"
        ? "Editing a mind map"
        : selectedNote?.note_type === "todolist"
        ? "Working on a list"
        : "Writing a note";
    const stateText = selectedNote?.title || "Untitled";

    invoke("update_discord_presence", {
      enabled,
      details,
      stateText,
    }).catch(() => {
      // Silently ignore — Discord may not be running.
    });
  }, [
    settings.discordRpcEnabled,
    selectedNote?.id,
    selectedNote?.note_type,
    selectedNote?.title,
  ]);

  const selectedFolder =
    folders.selectedFolderId === null
      ? null
      : (folders.folders.find((f) => f.id === folders.selectedFolderId) ??
        null);
  const folderName = selectedFolder?.name ?? "All Notes";

  const handleDeleteFolderRequest = useCallback(
    (id: string) => {
      folders.deleteFolder(id);
    },
    [folders.deleteFolder],
  );

  const isLoading = folders.isLoading || notesLoading || !settingsLoaded;
  const error = folders.error || notesError;

  if (isLoading) {
    return (
      <AnimatePresence>
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-screen w-screen flex flex-col bg-sidebar-bg"
        >
          <TitleBar style={settings.titlebarStyle} />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-6 h-6 border-2 border-black/[0.08] dark:border-white/[0.08] border-t-black/[0.3] dark:border-t-white/[0.25] rounded-full animate-spin"
                role="progressbar"
                aria-label="Loading application"
              />
              <span className="text-[12px] text-sidebar-textSecondary/50 tracking-[-0.01em]">
                Loading OpenNotes...
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col bg-sidebar-bg">
        <TitleBar style={settings.titlebarStyle} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
              Database Error
            </p>
            <p className="text-xs text-red-500/70 dark:text-red-400/60 break-all">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen flex flex-col bg-editor-bg overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <SettingsApplier settings={settings} />
      <TitleBar style={settings.titlebarStyle} />
      <div className="flex-1 flex overflow-hidden">
        <FoldersSidebar
          folderTree={folders.folderTree}
          folders={folders.folders}
          selectedFolderId={folders.selectedFolderId}
          defaultFolderId={folders.defaultFolderId}
          noteCounts={noteCounts}
          totalNoteCount={totalNoteCount}
          showFolderCounts={settings.showFolderCounts}
          onSelectFolder={folders.selectFolder}
          onCreateFolder={(name, parentId) => {
            folders.createFolder(name, parentId);
          }}
          onRenameFolder={folders.renameFolder}
          onDeleteFolderRequest={handleDeleteFolderRequest}
          onReorderFolders={folders.reorderFolders}
          onMoveFolderToParent={folders.moveFolderToParent}
          onOpenSettings={() => setSettingsOpen(true)}
          onShowTrash={() => setShowTrash((s) => !s)}
        />
        <Sidebar
          notes={notes}
          selectedId={
            activePane === "right" && splitNoteId ? splitNoteId : selectedId
          }
          searchQuery={searchQuery}
          folderName={folderName}
          onSearchChange={setSearchQuery}
          onSelect={handleSelectFromSidebar}
          onCreate={() => createNote("note")}
          onCreateMindmap={() => createNote("mindmap")}
          onCreateTodo={() => createNote("todolist")}
          onDeleteRequest={handleDeleteNoteRequest}
          onRename={renameNote}
          onReorder={reorderNotes}
          onMoveToFolder={handleMoveToFolder}
          onDropInEditor={openInSplit}
          onDragStart={handleDragStart}
          onDragEndDrag={handleDragEndDrag}
          onDropZone={handleDropZone}
          onToggleFavorite={toggleFavorite}
        />
        <div ref={editorPaneRef} className="flex-1 flex overflow-hidden relative" data-editor-drop-zone="true">
          <div
            className="flex flex-col min-w-0 overflow-hidden"
            style={{ flex: `${splitNoteId ? splitRatio : 1} 1 0` }}
          >
            <PaneView
              note={selectedNote}
              onContentChange={saveNoteContent}
              onTitleChange={renameNote}
              layout={settings.mindmapLayout}
              mindmapV2Enabled={settings.mindmapV2Enabled}
              isActive={activePane === "left" || splitNoteId === null}
              onFocus={() => setActivePane("left")}
            />
          </div>
          {splitNoteId && (
            <>
              <SplitDivider
                onResize={handleResize}
                onResizeEnd={handleResizeEnd}
                containerRef={editorPaneRef}
              />
              <div
                className="flex flex-col min-w-0 overflow-hidden"
                style={{ flex: `${1 - splitRatio} 1 0` }}
              >
            <TabBar
              tabs={leftTabInfos}
              activeIndex={leftPaneTabs.indexOf(selectedId ?? "")}
              onSelect={switchLeftTab}
              onClose={closeLeftTab}
            />
            <TabBar
              tabs={rightTabInfos}
              activeIndex={rightPaneTabs.indexOf(splitNoteId ?? "")}
              onSelect={switchRightTab}
              onClose={closeRightTab}
              onCreate={createNewTab}
            />
            <PaneView
                  note={rightNote}
                  onContentChange={handleRightContentChange}
                  onTitleChange={handleRightTitleChange}
                  layout={settings.mindmapLayout}
                  mindmapV2Enabled={settings.mindmapV2Enabled}
                  isActive={activePane === "right"}
                  onFocus={() => setActivePane("right")}
                  onClose={closeSplit}
                />
              </div>
            </>
          )}
          {isDraggingNote && (
            <>
              {/* TOP ZONE — "Open as tab" */}
              <div
                data-drop-zone="tab"
                className="absolute top-0 left-0 right-0 h-[30%] z-50
                           border-2 border-dashed border-accent/60 rounded-xl m-3
                           bg-accent/[0.08] flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 text-accent/80">
                  <span className="text-2xl">⊞</span>
                  <span className="text-xs font-medium">Open as tab</span>
                </div>
              </div>

              {/* LEFT ZONE — "Split left" */}
              <div
                data-drop-zone="split-left"
                className="absolute bottom-0 left-0 top-[30%] w-1/2 z-50
                           border-2 border-dashed border-accent/60 rounded-xl m-3
                           bg-accent/[0.08] flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 text-accent/80">
                  <span className="text-2xl">◧</span>
                  <span className="text-xs font-medium">Split left</span>
                </div>
              </div>

              {/* RIGHT ZONE — "Split right" */}
              <div
                data-drop-zone="split-right"
                className="absolute bottom-0 right-0 top-[30%] w-1/2 z-50
                           border-2 border-dashed border-accent/60 rounded-xl m-3
                           bg-accent/[0.08] flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 text-accent/80">
                  <span className="text-2xl">◨</span>
                  <span className="text-xs font-medium">Split right</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showTrash && (
        <TrashView
          trashedNotes={trashedNotes}
          trashedFolders={folders.trashedFolders}
          onRestoreNote={restoreNote}
          onRestoreFolder={folders.restoreFolder}
          onPermanentlyDeleteNote={permanentlyDeleteNote}
          onPermanentlyDeleteFolder={folders.permanentlyDeleteFolder}
          onEmptyTrash={async () => {
            await emptyTrash();
            refreshTrashedNotes();
            folders.refreshTrashedFolders();
          }}
          onClose={() => setShowTrash(false)}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        folders={folders.folders}
        onChange={updateSetting}
      />
    </div>
  );
}
