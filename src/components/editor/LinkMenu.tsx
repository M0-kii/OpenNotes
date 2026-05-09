import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, FileX } from "lucide-react";
import type { Note } from "../../types";

interface LinkMenuProps {
  open: boolean;
  query: string;
  notes: Note[];
  onSelect: (note: Note) => void;
  onClose: () => void;
}

export default function LinkMenu({
  open,
  query,
  notes,
  onSelect,
  onClose,
}: LinkMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = notes
    .filter((n) => n.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  // Compute position from caret
  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setPosition({ top: rect.bottom + 6, left: rect.left });
    }
  }, [open]);

  // Reset selection index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, notes]);

  // Click outside handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, onSelect, onClose]
  );

  if (!open || !position) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
          }}
          onKeyDown={handleKeyDown}
          className="z-[9999] w-[280px] max-h-[240px] overflow-y-auto
                     rounded-[10px] glass border border-border
                     shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                     backdrop-blur-xl py-1"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-editor-text/30">
              <FileX className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>No matching notes</span>
            </div>
          ) : (
            filtered.map((note, index) => (
              <button
                key={note.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(note);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px]
                            transition-colors duration-100 tracking-[-0.01em]
                            ${
                              index === selectedIndex
                                ? "bg-accent/10 text-editor-text"
                                : "text-editor-text/70 hover:bg-white/[0.04] dark:hover:bg-white/[0.04]"
                            }`}
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                <span className="truncate">{note.title}</span>
              </button>
            ))
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
