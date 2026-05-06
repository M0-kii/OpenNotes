import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, GitBranch } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onNote: () => void;
  onMindmap: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export default function NoteTypePopup({
  open,
  onClose,
  onNote,
  onMindmap,
  buttonRef,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Compute fixed position from the + button's viewport rect
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    } else {
      setPosition(null);
    }
  }, [open, buttonRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current !== e.target
      ) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, onClose, buttonRef]);

  if (!open || !position) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
          }}
          className="z-[9999] min-w-[140px]
                     rounded-[10px] glass border border-border
                     shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                     backdrop-blur-xl py-1 overflow-hidden"
        >
          <button
            onClick={() => {
              onNote();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px]
                       text-sidebar-text/80 hover:bg-white/[0.06]
                       transition-colors duration-100 tracking-[-0.01em]"
          >
            <FileText className="w-3.5 h-3.5 text-sidebar-textSecondary" strokeWidth={1.5} />
            Note
          </button>
          <button
            onClick={() => {
              onMindmap();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px]
                       text-sidebar-text/80 hover:bg-white/[0.06]
                       transition-colors duration-100 tracking-[-0.01em]"
          >
            <GitBranch className="w-3.5 h-3.5 text-sidebar-textSecondary" strokeWidth={1.5} />
            Mind Map
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
