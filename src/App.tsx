import { useNotes } from "./hooks/useNotes";
import { useTheme } from "./hooks/useTheme";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";

export default function App() {
  const {
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
  } = useNotes();

  const { theme, toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-[#1c1c1e]">
        <div className="w-5 h-5 border-2 border-black/10 dark:border-white/10 border-t-black/40 dark:border-t-white/30 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-[#1c1c1e] overflow-hidden">
      <Sidebar
        notes={notes}
        selectedId={selectedId}
        searchQuery={searchQuery}
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
