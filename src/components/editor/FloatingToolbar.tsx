import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bold, Italic, Code, Strikethrough } from "lucide-react";
import type { ActiveFormats } from "./formattingUtils";

interface FloatingToolbarProps {
  open: boolean;
  onBold: () => void;
  onItalic: () => void;
  onCode: () => void;
  onStrikethrough: () => void;
  activeFormats: ActiveFormats;
}

export default function FloatingToolbar({
  open,
  onBold,
  onItalic,
  onCode,
  onStrikethrough,
  activeFormats,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [showBelow, setShowBelow] = useState(false);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const compute = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPosition(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const below = rect.top < 80;
      setShowBelow(below);
      const top = below ? rect.bottom + 8 : rect.top - 8;
      const left = rect.left + rect.width / 2;
      setPosition({ top, left });
    };
    compute();
  }, [open]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent losing focus from contenteditable
    e.preventDefault();
  }, []);

  if (!open || !position) return null;

  const buttons = [
    {
      key: "bold" as const,
      icon: Bold,
      onClick: onBold,
      label: "Bold",
      shortcut: "Ctrl+B",
    },
    {
      key: "italic" as const,
      icon: Italic,
      onClick: onItalic,
      label: "Italic",
      shortcut: "Ctrl+I",
    },
    {
      key: "code" as const,
      icon: Code,
      onClick: onCode,
      label: "Code",
      shortcut: "Ctrl+`",
    },
    {
      key: "strike" as const,
      icon: Strikethrough,
      onClick: onStrikethrough,
      label: "Strikethrough",
      shortcut: "Ctrl+Shift+X",
    },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            transform: `translate(-50%, ${showBelow ? "0" : "-100%"})`,
          }}
          onMouseDown={onMouseDown}
          className="z-[9999] flex items-center gap-0.5 px-1 py-1
                     rounded-[10px] glass border border-border
                     shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]
                     backdrop-blur-xl"
        >
          {buttons.map((btn) => {
            const isActive = activeFormats[btn.key];
            return (
              <button
                key={btn.key}
                onClick={btn.onClick}
                onMouseDown={onMouseDown}
                title={`${btn.label} (${btn.shortcut})`}
                className={`p-1.5 rounded-md transition-colors duration-100
                            ${
                              isActive
                                ? "bg-accent/10 text-accent"
                                : "text-editor-text/60 hover:text-editor-text hover:bg-white/[0.04] dark:hover:bg-white/[0.04]"
                            }`}
              >
                <btn.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
