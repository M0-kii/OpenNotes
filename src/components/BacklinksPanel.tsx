import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Link2Off, FileText, GitBranch, ListTodo, Loader2 } from "lucide-react";
import { getNoteBacklinks } from "../lib/db";
import { getNotePreview } from "../lib/utils";
import type { Note } from "../types";

interface BacklinksPanelProps {
  noteId: string | null;
  onSelectNote: (id: string) => void;
}

const iconMap: Record<Note["note_type"], typeof FileText> = {
  note: FileText,
  mindmap: GitBranch,
  todolist: ListTodo,
};

export default function BacklinksPanel({ noteId, onSelectNote }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!noteId) {
      setBacklinks([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getNoteBacklinks(noteId).then((results) => {
      if (!cancelled) {
        setBacklinks(results);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  if (!noteId) return null;

  return (
    <div className="border-t border-border mt-1 pt-2 pb-1">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 px-2 py-1 cursor-pointer text-[12px] text-editor-text/60 hover:text-editor-text/80 w-full"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        <span className="select-none">Backlinks ({backlinks.length})</span>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="backlinks-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-2">
              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-3 text-editor-text/40">
                  <Loader2 size={14} className="animate-spin" />
                </div>
              )}

              {/* Empty */}
              {!loading && backlinks.length === 0 && (
                <div className="flex items-center gap-2 px-1 py-3 text-[12px] text-editor-text/40">
                  <Link2Off size={14} />
                  <span>No backlinks</span>
                </div>
              )}

              {/* List */}
              <AnimatePresence>
                {!loading &&
                  backlinks.map((note) => {
                    const Icon = iconMap[note.note_type] ?? FileText;
                    return (
                      <motion.button
                        key={note.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => onSelectNote(note.id)}
                        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg hover:bg-accent/5 transition-colors w-full text-left"
                      >
                        <Icon size={14} className="shrink-0 text-editor-text/40" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-editor-text truncate">
                            {note.title || "Untitled"}
                          </div>
                          <div className="text-[11px] text-editor-text/50 truncate">
                            {getNotePreview(note.content, note.note_type, 60)}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
