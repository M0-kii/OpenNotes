import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { Note } from "../types";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import { formatDate, getNotePreview } from "../lib/utils";
import type { Theme } from "../types";

interface SidebarProps {
  notes: Note[];
  selectedId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Sidebar({
  notes,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  theme,
  onToggleTheme,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleStartRename = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(note.id);
    setRenameValue(note.title);
  };

  const handleConfirmRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <div
      className="w-[260px] min-w-[260px] h-full flex flex-col
                 bg-sidebar-bg border-r border-black/5 dark:border-white/5
                 select-none"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h1 className="text-sm font-semibold text-sidebar-text tracking-tight">
          OpenNotes
        </h1>
        <div className="flex items-center gap-0.5">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button
            onClick={onCreate}
            className="p-1.5 rounded-md text-sidebar-textSecondary
                       hover:bg-black/5 dark:hover:bg-white/10
                       transition-colors"
            title="New note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <SearchBar value={searchQuery} onChange={onSearchChange} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-1 space-y-0.5">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelect(note.id)}
              className={`group relative px-2.5 py-2 rounded-note cursor-pointer
                          transition-all duration-150
                          ${
                            note.id === selectedId
                              ? "bg-black/5 dark:bg-white/8"
                              : "hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                          }`}
            >
              <div className="flex items-center justify-between min-w-0">
                {renamingId === note.id ? (
                  <form
                    onSubmit={handleConfirmRename}
                    className="flex-1 flex items-center gap-1"
                  >
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleCancelRename}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") handleCancelRename();
                      }}
                      className="flex-1 bg-transparent text-xs font-medium
                                 text-sidebar-text outline-none border-b
                                 border-blue-400 dark:border-blue-500
                                 pb-px"
                      spellCheck={false}
                    />
                    <button
                      type="submit"
                      onMouseDown={(e) => e.preventDefault()}
                      className="p-0.5 text-green-500 hover:text-green-600"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleCancelRename}
                      className="p-0.5 text-sidebar-textSecondary"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 mr-1">
                      <div className="text-xs font-medium text-sidebar-text truncate">
                        {note.title || "Untitled"}
                      </div>
                      <div className="text-[10px] text-sidebar-textSecondary/70 truncate mt-0.5">
                        {getNotePreview(note.content, 60)}
                      </div>
                      <div className="text-[9px] text-sidebar-textSecondary/50 mt-0.5">
                        {formatDate(note.updated_at)}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100
                                  transition-opacity"
                    >
                      <button
                        onClick={(e) => handleStartRename(note, e)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10
                                   text-sidebar-textSecondary"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(note.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/10
                                   text-sidebar-textSecondary hover:text-red-500
                                   transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {notes.length === 0 && (
            <div className="text-xs text-sidebar-textSecondary/50 text-center py-8">
              No notes yet. Click + to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
