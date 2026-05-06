import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Check, X, Settings as SettingsIcon } from "lucide-react";
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
  onDeleteRequest: (id: string) => void;
  onRename: (id: string, title: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  notes,
  selectedId,
  searchQuery,
  folderName,
  onSearchChange,
  onSelect,
  onCreate,
  onDeleteRequest,
  onRename,
  theme,
  onToggleTheme,
  onOpenSettings,
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
    const trimmed = renameValue.trim();
    if (renamingId && trimmed) {
      onRename(renamingId, trimmed);
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
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onOpenSettings}
            className="p-1.5 rounded-btn text-sidebar-textSecondary/70
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                       hover:text-sidebar-textSecondary
                       transition-colors duration-200"
            title="Settings (⌘,)"
            aria-label="Settings"
          >
            <SettingsIcon className="w-[15px] h-[15px]" strokeWidth={1.75} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onCreate}
            className="p-1.5 rounded-btn text-sidebar-textSecondary
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                       transition-colors duration-150"
            title="New note"
          >
            <Plus className="w-[15px] h-[15px]" />
          </motion.button>
        </div>
      </div>

      <SearchBar value={searchQuery} onChange={onSearchChange} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-2.5 py-1 space-y-px">
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                onClick={() => onSelect(note.id)}
                className={`group relative px-3 py-2.5 mx-0.5 rounded-note cursor-pointer
                            transition-colors duration-200
                            ${
                              note.id === selectedId
                                ? "bg-black/[0.05] dark:bg-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                                : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                            }`}
              >
                <div className="flex items-center justify-between min-w-0">
                  {renamingId === note.id ? (
                    <motion.form
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      onSubmit={handleConfirmRename}
                      className="flex-1 flex items-center gap-1.5"
                    >
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleConfirmRename}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") handleCancelRename();
                        }}
                        className="flex-1 bg-transparent text-[12px] font-medium
                                    text-sidebar-text outline-none border-b
                                    border-accent pb-px tracking-[-0.01em]"
                        spellCheck={false}
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="submit"
                        onMouseDown={(e) => e.preventDefault()}
                        className="p-0.5 text-green-500 hover:text-green-600 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleCancelRename}
                        className="p-0.5 text-sidebar-textSecondary/60 hover:text-sidebar-textSecondary transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </motion.button>
                    </motion.form>
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
                      <motion.div
                        initial={false}
                        animate={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="flex items-center gap-0.5"
                      >
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleStartRename(note, e)}
                          className="p-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                                     text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary
                                     transition-colors"
                          title="Rename"
                        >
                          <Pencil className="w-3 h-3" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRequest(note.id);
                          }}
                          className="p-1 rounded-md hover:bg-red-500/[0.08]
                                     text-sidebar-textSecondary/40 hover:text-red-400
                                     transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {notes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="text-[12px] text-sidebar-textSecondary/35 text-center py-12 tracking-[-0.01em]"
            >
              No notes yet
              <br />
              <span className="text-[11px]">Click + to create one</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
