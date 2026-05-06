import { useState, useCallback, useEffect } from "react";
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
import { getNoteCountInFolder, getNoteCountsByFolder } from "./lib/db";

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

  const theme = settings.theme;
  const toggleTheme = useCallback(() => {
    const next: typeof theme =
      theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    updateSetting("theme", next);
  }, [theme, updateSetting]);

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
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
        <TitleBar />
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
        <TitleBar />
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
      <TitleBar />
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
        />
        <Sidebar
          notes={notes}
          selectedId={selectedId}
          searchQuery={searchQuery}
          folderName={folderName}
          onSearchChange={setSearchQuery}
          onSelect={selectNote}
          onCreate={createNote}
          onDeleteRequest={handleDeleteNoteRequest}
          onRename={renameNote}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <Editor
          note={selectedNote}
          onContentChange={saveNoteContent}
          onTitleChange={renameNote}
        />
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
