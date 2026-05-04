import { useNotes } from "./hooks/useNotes";
import { useFolders } from "./hooks/useFolders";
import { useTheme } from "./hooks/useTheme";
import FoldersSidebar from "./components/FoldersSidebar";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";

export default function App() {
  const folders = useFolders();
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
  } = useNotes({ folderId: folders.selectedFolderId });

  const { theme, toggleTheme } = useTheme();

  const isLoading = folders.isLoading || notesLoading;
  const error = folders.error || notesError;

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-editor-bg">
        <div className="w-5 h-5 border-2 border-black/10 dark:border-white/10 border-t-black/40 dark:border-t-white/30 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-editor-bg">
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
    );
  }

  const selectedFolder =
    folders.selectedFolderId === null
      ? null
      : folders.folders.find((f) => f.id === folders.selectedFolderId) ?? null;
  const folderName = selectedFolder?.name ?? "All Notes";

  // Placeholder confirm — replaced by a styled dialog in a later commit.
  const handleDeleteFolderRequest = (id: string) => {
    const folder = folders.folders.find((f) => f.id === id);
    if (!folder) return;
    const ok = window.confirm(
      `Delete folder "${folder.name}"? Its notes will be moved to the default folder.`
    );
    if (ok) folders.deleteFolder(id);
  };

  return (
    <div className="h-screen w-screen flex bg-editor-bg overflow-hidden">
      <FoldersSidebar
        folders={folders.folders}
        selectedFolderId={folders.selectedFolderId}
        defaultFolderId={folders.defaultFolderId}
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
        onDelete={deleteNote}
        onRename={renameNote}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <Editor
        note={selectedNote}
        onContentChange={saveNoteContent}
        onTitleChange={renameNote}
      />
    </div>
  );
}
