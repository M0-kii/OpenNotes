import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X as CloseIcon } from "lucide-react";
import InputContextMenu from "./ui/InputContextMenu";
import RichEditor from "./editor/RichEditor";
import type { Note } from "../types";

interface EditorProps {
  note: Note | null;
  onContentChange: (id: string, content: string) => void;
  onTitleChange?: (id: string, title: string) => void;
  isActive?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  notes?: Note[];
}

export default function Editor({
  note,
  onContentChange,
  onTitleChange,
  isActive = true,
  onFocus,
  onClose,
  notes,
}: EditorProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleContentChange = useCallback(
    (content: string) => {
      if (note) {
        onContentChange(note.id, content);
      }
    },
    [note, onContentChange]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (note && onTitleChange) {
        onTitleChange(note.id, e.target.value);
      }
    },
    [note, onTitleChange]
  );

  return (
    <div
      onMouseDownCapture={onFocus}
      onFocusCapture={onFocus}
      className={`flex-1 min-w-0 flex flex-col bg-editor-bg overflow-hidden
                  relative transition-colors duration-150
                  ${isActive ? "" : "opacity-[0.92]"}`}
    >
      {onClose && (
        <div
          aria-hidden
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-[2px]
                      transition-colors duration-200
                      ${isActive ? "bg-accent" : "bg-transparent"}`}
        />
      )}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close split"
          title="Close split (⌘W)"
          className="absolute top-3 right-3 z-10 p-1 rounded-md
                     text-editor-text/30 hover:text-editor-text/70
                     hover:bg-black/[0.04] dark:hover:bg-white/[0.05]
                     transition-colors"
        >
          <CloseIcon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {!note ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex items-center justify-center bg-editor-bg"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-20 h-20 mx-auto mb-5 rounded-[20px] bg-black/[0.025] dark:bg-white/[0.025] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                >
                  <svg
                    className="w-10 h-10 text-black/[0.08] dark:text-white/[0.06]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </motion.div>
                <p className="text-[13px] text-editor-text/20 dark:text-editor-text/15 tracking-[-0.01em]">
                  Select a note or create a new one
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 flex flex-col bg-editor-bg overflow-hidden"
            >
              <div className="editor-column flex-1 flex flex-col min-h-0">
                <div className="px-10 pt-10 pb-3">
                  <InputContextMenu inputRef={titleInputRef}>
                      <input
                        ref={titleInputRef}
                      type="text"
                      value={note.title}
                      onChange={handleTitleChange}
                      placeholder="Title"
                      className="w-full text-[26px] font-bold text-editor-text
                                 bg-transparent border-none outline-none
                                 placeholder:text-editor-text/15 tracking-[-0.02em]
                                 pb-3 border-b border-border transition-colors duration-200
                                 focus:border-accent/40"
                      spellCheck={false}
                    />
                  </InputContextMenu>
                  <div className="flex items-center gap-6 mt-2.5 text-[11px] text-editor-text/20 tracking-[-0.01em]">
                    <span>
                      Created{" "}
                      {new Date(note.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>
                      Edited{" "}
                      {new Date(note.updated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-10 py-5">
                  <RichEditor
                    key={note.id}
                    content={note.content}
                    onContentChange={handleContentChange}
                    onFocus={onFocus}
                    notes={notes}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
