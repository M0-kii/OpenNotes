import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pen } from "lucide-react";
import { springGentle, springBouncy, easeSmooth } from "./lib/animations";
import { invoke } from "@tauri-apps/api/core";
import { useEditorWorkspace } from "./hooks/useEditorWorkspace";
import { useSaveLifecycle } from "./hooks/useSaveLifecycle";
import { useNotes } from "./hooks/useNotes";
import { useReminders } from "./hooks/useReminders";
import { useFolders } from "./hooks/useFolders";
import { useSettings } from "./hooks/useSettings";
import FoldersSidebar from "./components/FoldersSidebar";
import Sidebar from "./components/Sidebar";
import PaneView from "./components/PaneView";
import TabBar from "./components/TabBar";
import TitleBar from "./components/TitleBar";
import TrashView from "./components/TrashView";
import BacklinksPanel from "./components/BacklinksPanel";
import SettingsApplier from "./components/settings/SettingsApplier";
import SettingsDialog from "./components/settings/SettingsDialog";
import SplitDivider from "./components/SplitDivider";
import {
  getNoteCountsByFolder,
  moveNoteToFolder,
  emptyTrash,
} from "./lib/db";
import QuickSwitcher from "./components/QuickSwitcher";
import ConfirmDialog from "./components/ConfirmDialog";
import type { Folder } from "./types";

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
    saveError,
    hasPendingSaves,
    flushSave,
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
    setNoteReminder,
    backlinks,
    refreshBacklinks,
  } = useNotes({
    folderId: folders.selectedFolderId,
    createInFolderId: folders.selectedFolderId ?? settings.defaultFolderId,
  });

  useReminders({ notes });
  const requestClose = useSaveLifecycle(flushSave);

  const [showTrash, setShowTrash] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});

  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string;
    type: "note" | "folder";
  } | null>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const {
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
  } = useEditorWorkspace({
    notes, selectedId, selectNote, saveNoteContent, renameNote, setNoteReminder,
  });
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
    refreshBacklinks(selectedId ?? "");
  }, [selectedId, refreshBacklinks]);

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

      // Quick switcher
      if (e.key === "k") {
        e.preventDefault();
        setQuickSwitcherOpen((o) => !o);
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
      setDeleteConfirmTarget({ id, type: "note" });
    },
    [],
  );

  const handleDeleteFolderRequest = useCallback(
    (id: string) => {
      setDeleteConfirmTarget({ id, type: "folder" });
    },
    [],
  );

  const handleConfirmDelete = useCallback(() => {
    const target = deleteConfirmTarget;
    if (!target) return;
    if (target.type === "note") {
      deleteNote(target.id);
    } else {
      folders.deleteFolder(target.id);
    }
    setDeleteConfirmTarget(null);
  }, [deleteConfirmTarget, deleteNote, folders.deleteFolder]);

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
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex h-screen w-screen flex-col bg-sidebar-bg"
        >
          <TitleBar style={settings.titlebarStyle} onClose={requestClose} />

          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-5">
              {/* Pen icon — spring in, then float gently */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springBouncy, delay: 0.2 }}
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.2,
                  }}
                >
                  <Pen
                    className="h-8 w-8 text-sidebar-textSecondary/40"
                    strokeWidth={1.5}
                  />
                </motion.div>
              </motion.div>

              {/* "OpenNotes" title — staggered character reveal */}
              <h1 className="flex text-xl font-semibold tracking-tight text-sidebar-text">
                {"OpenNotes".split("").map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.35 + i * 0.045,
                      ...springGentle,
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </h1>

              {/* "Loading..." — fades in after the title */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 0.8,
                  duration: 0.4,
                  ease: easeSmooth,
                }}
                className="text-xs tracking-[0.02em] text-sidebar-textSecondary/40"
              >
                Loading...
              </motion.p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col bg-sidebar-bg">
        <TitleBar style={settings.titlebarStyle} onClose={requestClose} />
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
      <TitleBar style={settings.titlebarStyle} onClose={requestClose} />
      <div role={saveError ? "alert" : "status"} aria-live={saveError ? "assertive" : "polite"}
        className="flex items-center justify-end gap-3 px-4 py-1 text-xs text-sidebar-textSecondary bg-sidebar-bg border-b border-border">
        <span>{saveError ?? (hasPendingSaves ? "Saving…" : "All changes saved")}</span>
        {saveError && <button className="text-accent underline" onClick={() => { void flushSave(); }}>Retry now</button>}
      </div>
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
        <div
          ref={editorPaneRef}
          className="flex-1 flex overflow-hidden relative"
          data-editor-drop-zone="true"
        >
          <div
            className="flex flex-col min-w-0 overflow-hidden"
            style={{ flex: `${splitNoteId ? splitRatio : 1} 1 0` }}
          >
            <PaneView
              note={selectedNote}
              onContentChange={saveNoteContent}
              onTitleChange={renameNote}
              onReminderChange={setNoteReminder}
              layout={settings.mindmapLayout}
              mindmapV2Enabled={settings.mindmapV2Enabled}
              isActive={activePane === "left" || splitNoteId === null}
              onFocus={() => setActivePane("left")}
              notes={notes}
            />
            <BacklinksPanel
              noteId={selectedId ?? null}
              onSelectNote={selectNote}
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
                  onReminderChange={handleRightReminderChange}
                  layout={settings.mindmapLayout}
                  mindmapV2Enabled={settings.mindmapV2Enabled}
                  isActive={activePane === "right"}
                  onFocus={() => setActivePane("right")}
              onClose={closeSplit}
              notes={notes}
            />
                <BacklinksPanel
                  noteId={splitNoteId ?? null}
                  onSelectNote={selectNote}
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
                           bg-accent/[0.08] flex items-center justify-center"
              >
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
                           bg-accent/[0.08] flex items-center justify-center"
              >
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
                           bg-accent/[0.08] flex items-center justify-center"
              >
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
            if (!await flushSave()) return;
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

      <QuickSwitcher
        open={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        notes={notes}
        folders={folders.folders}
        onSelect={(id) => selectNote(id)}
        onCreate={(title) => createNote("note", title)}
      />

      {deleteConfirmTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmTarget(null);
          }}
          title={
            deleteConfirmTarget.type === "note"
              ? (notes.find((n) => n.id === deleteConfirmTarget.id)?.title ||
                  "Untitled")
              : (folders.folders.find((f) => f.id === deleteConfirmTarget.id)
                  ?.name ?? "Untitled")
          }
          description={
            deleteConfirmTarget.type === "note"
              ? "This note will be moved to trash. You can restore it from there."
              : "This folder and all its notes will be moved to trash."
          }
          confirmLabel="Delete"
          destructive
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
