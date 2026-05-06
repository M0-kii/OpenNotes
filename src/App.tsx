import { useState, useCallback, useEffect, useRef } from "react";
import { useNotes } from "./hooks/useNotes";
import { useFolders } from "./hooks/useFolders";
import { useSettings } from "./hooks/useSettings";
import FoldersSidebar from "./components/FoldersSidebar";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import TitleBar from "./components/TitleBar";
import ConfirmDialog from "./components/ConfirmDialog";
import SettingsApplier from "./components/settings/SettingsApplier";
import SettingsDialog from "./components/settings/SettingsDialog";
import SplitDivider from "./components/SplitDivider";
import { getNoteCountInFolder, getNoteCountsByFolder, getNoteById } from "./lib/db";
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
    selectNote,
    saveNoteContent,
  } = useNotes({
    folderId: folders.selectedFolderId,
    createInFolderId: folders.selectedFolderId ?? settings.defaultFolderId,
  });

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    count: number;
  } | null>(null);

  const [pendingNoteDelete, setPendingNoteDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

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

  const closeSplit = useCallback(() => {
    setSplitNoteId(null);
    setActivePane("left");
  }, []);

  const openInSplit = useCallback((noteId: string) => {
    setSplitNoteId(noteId);
    setActivePane("right");
  }, []);

  const handleRightContentChange = useCallback(
    (id: string, content: string) => {
      saveNoteContent(id, content);
      setRightNote((n) =>
        n && n.id === id
          ? { ...n, content, updated_at: new Date().toISOString() }
          : n
      );
    },
    [saveNoteContent]
  );

  const handleRightTitleChange = useCallback(
    (id: string, title: string) => {
      renameNote(id, title);
      setRightNote((n) =>
        n && n.id === id
          ? { ...n, title, updated_at: new Date().toISOString() }
          : n
      );
    },
    [renameNote]
  );

  const handleSelectFromSidebar = useCallback(
    (id: string, openInSplitToo?: boolean) => {
      if (openInSplitToo) {
        setSplitNoteId(id);
        setActivePane("right");
        return;
      }
      if (activePane === "right" && splitNoteId !== null) {
        setSplitNoteId(id);
      } else {
        selectNote(id);
      }
    },
    [activePane, splitNoteId, selectNote]
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
          splitNoteId === null && selectedId !== null ? "right" : p
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

  const handleDeleteNoteRequest = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    setPendingNoteDelete({ id, title: note.title || "Untitled" });
  }, [notes]);

  const isLoading = folders.isLoading || notesLoading || !settingsLoaded;
  const error = folders.error || notesError;

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col bg-sidebar-bg">
        <TitleBar style={settings.titlebarStyle} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-black/[0.08] dark:border-white/[0.08] border-t-black/[0.3] dark:border-t-white/[0.25] rounded-full animate-spin" />
            <span className="text-[12px] text-sidebar-textSecondary/50 tracking-[-0.01em]">
              Loading OpenNotes...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col bg-sidebar-bg">
        <TitleBar style={settings.titlebarStyle} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Database Error</p>
            <p className="text-xs text-red-500/70 dark:text-red-400/60 break-all">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedFolder =
    folders.selectedFolderId === null
      ? null
      : folders.folders.find((f) => f.id === folders.selectedFolderId) ?? null;
  const folderName = selectedFolder?.name ?? "All Notes";

  const handleDeleteFolderRequest = async (id: string) => {
    const folder = folders.folders.find((f) => f.id === id);
    if (!folder) return;
    const count = await getNoteCountInFolder(id);
    setPendingDelete({ id, name: folder.name, count });
  };

  const defaultFolder = folders.folders.find(
    (f) => f.id === folders.defaultFolderId
  );
  const defaultFolderName = defaultFolder?.name ?? "Notes";

  return (
    <div className="h-screen w-screen flex flex-col bg-editor-bg overflow-hidden">
      <SettingsApplier settings={settings} />
      <TitleBar style={settings.titlebarStyle} />
      <div className="flex-1 flex overflow-hidden">
        <FoldersSidebar
          folders={folders.folders}
          selectedFolderId={folders.selectedFolderId}
          defaultFolderId={folders.defaultFolderId}
          noteCounts={noteCounts}
          totalNoteCount={totalNoteCount}
          showFolderCounts={settings.showFolderCounts}
          onSelectFolder={folders.selectFolder}
          onCreateFolder={(name) => {
            folders.createFolder(name);
          }}
          onRenameFolder={folders.renameFolder}
          onDeleteFolderRequest={handleDeleteFolderRequest}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <Sidebar
          notes={notes}
          selectedId={
            activePane === "right" && splitNoteId
              ? splitNoteId
              : selectedId
          }
          searchQuery={searchQuery}
          folderName={folderName}
          onSearchChange={setSearchQuery}
          onSelect={handleSelectFromSidebar}
          onCreate={createNote}
          onDeleteRequest={handleDeleteNoteRequest}
          onRename={renameNote}
        />
        <div ref={editorPaneRef} className="flex-1 flex overflow-hidden">
          <div
            className="flex flex-col min-w-0 overflow-hidden"
            style={{ flex: `${splitNoteId ? splitRatio : 1} 1 0` }}
          >
            <Editor
              note={selectedNote}
              onContentChange={saveNoteContent}
              onTitleChange={renameNote}
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
                <Editor
                  note={rightNote}
                  onContentChange={handleRightContentChange}
                  onTitleChange={handleRightTitleChange}
                  isActive={activePane === "right"}
                  onFocus={() => setActivePane("right")}
                  onClose={closeSplit}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={pendingDelete ? `Delete "${pendingDelete.name}"?` : ""}
        description={
          pendingDelete
            ? pendingDelete.count === 0
              ? "This folder is empty and will be removed."
              : pendingDelete.count === 1
              ? `Its 1 note will move to "${defaultFolderName}".`
              : `Its ${pendingDelete.count} notes will move to "${defaultFolderName}".`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) folders.deleteFolder(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      <ConfirmDialog
        open={pendingNoteDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingNoteDelete(null);
        }}
        title={
          pendingNoteDelete
            ? `Delete "${pendingNoteDelete.title}"?`
            : ""
        }
        description="This note will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingNoteDelete) deleteNote(pendingNoteDelete.id);
          setPendingNoteDelete(null);
        }}
      />

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
