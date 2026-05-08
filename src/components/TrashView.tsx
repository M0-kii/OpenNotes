import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Undo2, X, FileText, Folder } from "lucide-react";
import type { Note, Folder as FolderType } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import { formatDate } from "../lib/utils";

interface TrashViewProps {
  trashedNotes: Note[];
  trashedFolders: FolderType[];
  onRestoreNote: (id: string) => void;
  onRestoreFolder: (id: string) => void;
  onPermanentlyDeleteNote: (id: string) => void;
  onPermanentlyDeleteFolder: (id: string) => void;
  onEmptyTrash: () => void;
  onClose: () => void;
}

function relativeTime(isoString: string | null): string {
  if (!isoString) return "unknown";
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return formatDate(isoString);
}

export default function TrashView({
  trashedNotes,
  trashedFolders,
  onRestoreNote,
  onRestoreFolder,
  onPermanentlyDeleteNote,
  onPermanentlyDeleteFolder,
  onEmptyTrash,
  onClose,
}: TrashViewProps) {
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const totalItems = trashedNotes.length + trashedFolders.length;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="w-[420px] max-h-[520px] rounded-2xl bg-sidebar-bg
                        border border-border
                        shadow-[0_12px_40px_rgba(0,0,0,0.2),0_0_0_0.5px_rgba(0,0,0,0.1)]
                        dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.1)]
                        flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-[18px] h-[18px] text-sidebar-textSecondary" strokeWidth={1.5} />
                <h2 className="text-[14px] font-semibold text-sidebar-text tracking-[-0.01em]">
                  Trash
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 rounded-btn text-sidebar-textSecondary/60
                           hover:text-sidebar-textSecondary hover:bg-black/[0.04]
                           dark:hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-[14px] h-[14px]" strokeWidth={1.5} />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {totalItems === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Trash2 className="w-10 h-10 text-sidebar-textSecondary/20" strokeWidth={1.5} />
                  <span className="text-[12px] text-sidebar-textSecondary/40 tracking-[-0.01em]">
                    Trash is empty
                  </span>
                </div>
              ) : (
                <>
                  {/* Trashed Notes */}
                  {trashedNotes.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sidebar-textSecondary/50 mb-2">
                        Notes
                      </h3>
                      <div className="space-y-1">
                        {trashedNotes.map((note) => (
                          <TrashItem
                            key={note.id}
                            icon={FileText}
                            name={note.title || "Untitled"}
                            deletedAt={note.deleted_at}
                            onRestore={() => onRestoreNote(note.id)}
                            onDelete={() => onPermanentlyDeleteNote(note.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trashed Folders */}
                  {trashedFolders.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sidebar-textSecondary/50 mb-2">
                        Folders
                      </h3>
                      <div className="space-y-1">
                        {trashedFolders.map((folder) => (
                          <TrashItem
                            key={folder.id}
                            icon={Folder}
                            name={folder.name}
                            deletedAt={folder.deleted_at}
                            onRestore={() => onRestoreFolder(folder.id)}
                            onDelete={() => onPermanentlyDeleteFolder(folder.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer with Empty Trash button */}
            {totalItems > 0 && (
              <div className="px-5 py-3 border-t border-border shrink-0 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowEmptyConfirm(true)}
                  className="px-4 py-1.5 rounded-md text-[12px] font-medium
                             text-red-500 hover:text-white
                             bg-transparent hover:bg-red-500
                             border border-red-500/30 hover:border-red-500
                             transition-colors duration-150"
                >
                  Empty Trash
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <ConfirmDialog
        open={showEmptyConfirm}
        onOpenChange={setShowEmptyConfirm}
        title="Empty Trash?"
        description="All items in the trash will be permanently deleted. This action cannot be undone."
        confirmLabel="Empty Trash"
        destructive
        onConfirm={() => {
          onEmptyTrash();
          setShowEmptyConfirm(false);
        }}
      />
    </>
  );
}

function TrashItem({
  icon: Icon,
  name,
  deletedAt,
  onRestore,
  onDelete,
}: {
  icon: typeof FileText;
  name: string;
  deletedAt: string | null;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-2.5 px-3 py-2 rounded-note
                 hover:bg-black/[0.025] dark:hover:bg-white/[0.025]
                 transition-colors duration-150"
    >
      <Icon className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-sidebar-text truncate tracking-[-0.01em]">
          {name}
        </div>
        <div className="text-[10px] text-sidebar-textSecondary/50 tracking-[-0.01em]">
          Deleted {relativeTime(deletedAt)}
        </div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          className="p-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                     text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary
                     transition-colors"
          title="Restore"
        >
          <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-md hover:bg-red-500/[0.08]
                     text-sidebar-textSecondary/40 hover:text-red-400
                     transition-colors"
          title="Delete permanently"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </motion.button>
      </div>
    </div>
  );
}
