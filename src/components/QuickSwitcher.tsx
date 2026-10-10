import { useState, useRef, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Plus } from "lucide-react";
import { springGentle, springSnappy } from "../lib/animations";
import type { Note, Folder } from "../types";

interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onSelect: (id: string) => void;
  onCreate: (title: string) => void;
}

const MAX_RESULTS = 12;

function getFolderName(folderId: string | null, folders: Folder[]): string {
  if (!folderId) return "No folder";
  return folders.find((f) => f.id === folderId)?.name ?? "Unknown";
}

export default function QuickSwitcher({
  open,
  onClose,
  notes,
  folders,
  onSelect,
  onCreate,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? notes
        .filter(
          (n) =>
            n.title.toLowerCase().includes(query.toLowerCase()) ||
            n.content?.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, MAX_RESULTS)
    : notes.slice(0, MAX_RESULTS);

  const showCreate = query.trim() && !notes.some(
    (n) => n.title.toLowerCase() === query.trim().toLowerCase(),
  );

  const totalItems = filtered.length + (showCreate ? 1 : 0);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus the input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current || activeIndex < 0) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, totalItems - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter": {
          e.preventDefault();
          if (activeIndex < filtered.length) {
            onSelect(filtered[activeIndex].id);
            onClose();
          } else if (showCreate && activeIndex === filtered.length) {
            onCreate(query.trim());
            onClose();
          }
          break;
        }
      }
    },
    [activeIndex, filtered, showCreate, query, onSelect, onCreate, onClose, totalItems],
  );

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild onOpenAutoFocus={(e) => e.preventDefault()}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={springGentle}
                className="fixed top-[15%] left-1/2 -translate-x-1/2
                           z-50 w-[420px] max-h-[360px]
                           bg-editor-bg border border-border rounded-[14px]
                           shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Search input */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
                  <Search className="w-4 h-4 text-editor-text/30 shrink-0" strokeWidth={1.5} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search notes..."
                    className="flex-1 bg-transparent text-[13px] text-editor-text
                               outline-none placeholder:text-editor-text/25
                               tracking-[-0.01em]"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                {/* Results */}
                <div
                  ref={listRef}
                  className="flex-1 overflow-y-auto py-1 px-1.5 space-y-px"
                >
                  {totalItems === 0 && (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-[12px] text-editor-text/25 tracking-[-0.01em]">
                        No notes yet
                      </span>
                    </div>
                  )}

                  {filtered.map((note, i) => (
                    <motion.button
                      key={note.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...springSnappy, delay: i * 0.02 }}
                      onClick={() => {
                        onSelect(note.id);
                        onClose();
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                                  transition-colors duration-100 ${
                        activeIndex === i
                          ? "bg-black/[0.05] dark:bg-white/[0.06]"
                          : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-editor-text/25 shrink-0" strokeWidth={1.5} />
                      <span className="flex-1 text-[12px] font-medium text-editor-text truncate tracking-[-0.01em]">
                        {note.title || "Untitled"}
                      </span>
                      <span className="text-[10px] text-editor-text/30 shrink-0 px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.03]">
                        {getFolderName(note.folder_id, folders)}
                      </span>
                    </motion.button>
                  ))}

                  {showCreate && (
                    <motion.button
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={springSnappy}
                      onClick={() => {
                        onCreate(query.trim());
                        onClose();
                      }}
                      onMouseEnter={() => setActiveIndex(filtered.length)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                                  transition-colors duration-100 ${
                        activeIndex === filtered.length
                          ? "bg-black/[0.05] dark:bg-white/[0.06]"
                          : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.5} />
                      <span className="flex-1 text-[12px] text-editor-text truncate tracking-[-0.01em]">
                        Create note "<span className="font-medium">{query.trim()}</span>"
                      </span>
                    </motion.button>
                  )}
                </div>

                {/* Footer hint */}
                <div className="flex items-center gap-3 px-4 py-2 border-t border-border">
                  <span className="text-[10px] text-editor-text/20 tracking-[-0.01em]">
                    <kbd className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04] font-mono">↑↓</kbd> navigate
                  </span>
                  <span className="text-[10px] text-editor-text/20 tracking-[-0.01em]">
                    <kbd className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04] font-mono">↵</kbd> select
                  </span>
                  <span className="text-[10px] text-editor-text/20 tracking-[-0.01em]">
                    <kbd className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04] font-mono">esc</kbd> close
                  </span>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
