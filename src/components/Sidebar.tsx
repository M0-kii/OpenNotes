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
  folderName: string;
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
  folderName,
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
      className="w-[270px] min-w-[270px] h-full flex flex-col
                 glass border-r border-border select-none"
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h1 className="text-[13px] font-semibold text-sidebar-text tracking-[-0.01em] truncate">
          {folderName}
        </h1>
        <div className="flex items-center gap-1">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button
            onClick={onCreate}
            className="p-1.5 rounded-btn text-sidebar-textSecondary
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                       active:scale-95 transition-all duration-150"
            title="New note"
          >
            <Plus className="w-[15px] h-[15px]" />
          </button>
        </div>
      </div>

      <SearchBar value={searchQuery} onChange={onSearchChange} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-2.5 py-1 space-y-px">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelect(note.id)}
              className={`group relative px-3 py-2.5 mx-0.5 rounded-note cursor-pointer
                          transition-all duration-200
                          ${
                            note.id === selectedId
                              ? "bg-black/[0.05] dark:bg-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                              : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                          }`}
            >
              <div className="flex items-center justify-between min-w-0">
                {renamingId === note.id ? (
                  <form
                    onSubmit={handleConfirmRename}
                    className="flex-1 flex items-center gap-1.5"
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
                      className="flex-1 bg-transparent text-[12px] font-medium
                                 text-sidebar-text outline-none border-b
                                 border-[#0071e3]/40 dark:border-[#339af0]/50
                                 pb-px tracking-[-0.01em]"
                      spellCheck={false}
                    />
                    <button
                      type="submit"
                      onMouseDown={(e) => e.preventDefault()}
                      className="p-0.5 text-green-500 hover:text-green-600 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleCancelRename}
                      className="p-0.5 text-sidebar-textSecondary/60 hover:text-sidebar-textSecondary transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 mr-1.5">
                      <div className="text-[12px] font-medium text-sidebar-text truncate tracking-[-0.01em] leading-snug">
                        {note.title || "Untitled"}
                      </div>
                      <div className="text-[11px] text-sidebar-textSecondary/60 truncate mt-0.5 leading-relaxed">
                        {getNotePreview(note.content, 60)}
                      </div>
                      <div className="text-[10px] text-sidebar-textSecondary/40 mt-1 tracking-[-0.01em]">
                        {formatDate(note.updated_at)}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100
                                  transition-all duration-200"
                    >
                      <button
                        onClick={(e) => handleStartRename(note, e)}
                        className="p-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                                   text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary
                                   transition-all"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(note.id);
                        }}
                        className="p-1 rounded-md hover:bg-red-500/[0.08]
                                   text-sidebar-textSecondary/40 hover:text-red-400
                                   transition-all"
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
            <div className="text-[12px] text-sidebar-textSecondary/35 text-center py-12 tracking-[-0.01em]">
              No notes yet
              <br />
              <span className="text-[11px]">Click + to create one</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
