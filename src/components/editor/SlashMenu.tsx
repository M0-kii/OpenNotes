import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SlashCommand } from "./slashCommands";
import { slashCommands } from "./slashCommands";

// Map icon strings to lucide components
const iconMap: Record<string, LucideIcon> = {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
};

interface SlashMenuProps {
  open: boolean;
  block: HTMLElement | null;
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export default function SlashMenu({
  open,
  block,
  query,
  onSelect,
  onClose,
}: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = slashCommands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

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

  // Reset selection index when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

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
          className="z-[9999] min-w-[200px] max-h-[240px] overflow-y-auto
                     rounded-[10px] glass border border-border
                     shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                     backdrop-blur-xl py-1"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-editor-text/30">
              No commands found
            </div>
          ) : (
            filtered.map((cmd, index) => {
              const IconComponent = iconMap[cmd.icon];
              return (
                <button
                  key={cmd.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(cmd);
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
                  {IconComponent && (
                    <IconComponent className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  <span>{cmd.label}</span>
                </button>
              );
            })
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
