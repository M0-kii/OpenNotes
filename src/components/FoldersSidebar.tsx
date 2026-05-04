import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderPlus,
  Folders,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { Folder as FolderType } from "../types";

interface FoldersSidebarProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  defaultFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolderRequest: (id: string) => void;
}

const NEW_FOLDER_ID = "__new__";

export default function FoldersSidebar({
  folders,
  selectedFolderId,
  defaultFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolderRequest,
}: FoldersSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const startRename = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  };

  const startNewFolder = () => {
    setCollapsed(false);
    setRenamingId(NEW_FOLDER_ID);
    setRenameValue("");
  };

  const confirmRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = renameValue.trim();
    if (!value) {
      cancelRename();
      return;
    }
    if (renamingId === NEW_FOLDER_ID) {
      onCreateFolder(value);
    } else if (renamingId) {
      onRenameFolder(renamingId, value);
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const renameForm = (
    <motion.form
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      onSubmit={confirmRename}
      className="flex-1 flex items-center gap-1.5"
    >
      <input
        ref={renameInputRef}
        type="text"
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onBlur={confirmRename}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancelRename();
        }}
        placeholder="Folder name"
        className="flex-1 bg-transparent text-[12px] font-medium
                   text-sidebar-text outline-none border-b
                   border-accent pb-px tracking-[-0.01em] min-w-0"
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
        onClick={cancelRename}
        className="p-0.5 text-sidebar-textSecondary/60 hover:text-sidebar-textSecondary transition-colors"
      >
        <X className="w-3 h-3" />
      </motion.button>
    </motion.form>
  );

  const isAllNotesSelected = selectedFolderId === null;

  return (
    <motion.div
      animate={{ width: collapsed ? 48 : 200 }}
      initial={{ width: 200 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="h-full flex flex-col glass border-r border-border select-none shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <h1 className="text-[13px] font-semibold text-sidebar-text tracking-[-0.01em] whitespace-nowrap">
                OpenNotes
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-btn text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary
                     hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150
                     ml-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-[14px] h-[14px]" strokeWidth={1.5} />
          ) : (
            <ChevronLeft className="w-[14px] h-[14px]" strokeWidth={1.5} />
          )}
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* All Notes */}
        <div className="px-1.5 pt-1 pb-2">
          <button
            type="button"
            onClick={() => onSelectFolder(null)}
            className={`group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-note text-left
                        transition-colors duration-200
                        ${collapsed ? "justify-center px-0" : ""}
                        ${
                          isAllNotesSelected
                            ? "bg-black/[0.05] dark:bg-white/[0.06]"
                            : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                        }`}
            title={collapsed ? "All Notes" : undefined}
          >
            <Folders
              className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0"
              strokeWidth={1.5}
            />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  className="text-[12px] font-medium text-sidebar-text tracking-[-0.01em] whitespace-nowrap"
                >
                  All Notes
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Folders header */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="px-5 pt-2 pb-1"
            >
              <div className="text-[10px] uppercase tracking-[0.06em] text-sidebar-textSecondary/50 font-medium">
                Folders
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Folder list */}
        <div className="px-1.5 pb-2 space-y-px">
          <AnimatePresence initial={false}>
            {folders.map((folder) => {
              const isSelected = folder.id === selectedFolderId;
              const isRenaming = folder.id === renamingId;
              const isDefault = folder.id === defaultFolderId;
              return (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onClick={() => !isRenaming && onSelectFolder(folder.id)}
                  className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-note cursor-pointer
                              transition-colors duration-200
                              ${collapsed ? "justify-center px-0" : ""}
                              ${
                                isSelected
                                  ? "bg-black/[0.05] dark:bg-white/[0.06]"
                                  : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                              }`}
                  title={collapsed ? folder.name : undefined}
                >
                  <Folder
                    className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0"
                    strokeWidth={1.5}
                  />
                  {isRenaming ? (
                    renameForm
                  ) : (
                    <>
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.12 }}
                            className="flex-1 text-[12px] font-medium text-sidebar-text tracking-[-0.01em] truncate"
                          >
                            {folder.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.div
                            initial={false}
                            animate={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            className="flex items-center gap-0.5"
                          >
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => startRename(folder, e)}
                              className="p-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                                         text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary
                                         transition-colors"
                              title="Rename"
                            >
                              <Pencil className="w-3 h-3" />
                            </motion.button>
                            {!isDefault && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteFolderRequest(folder.id);
                                }}
                                className="p-1 rounded-md hover:bg-red-500/[0.08]
                                           text-sidebar-textSecondary/40 hover:text-red-400
                                           transition-colors"
                                title="Delete folder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </motion.button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* New folder inline form */}
          {renamingId === NEW_FOLDER_ID && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-note
                         bg-black/[0.025] dark:bg-white/[0.025]
                         ${collapsed ? "justify-center px-0" : ""}`}
            >
              <Folder
                className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0"
                strokeWidth={1.5}
              />
              {renameForm}
            </motion.div>
          )}
        </div>
      </div>

      {/* New Folder button */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="px-1.5 pb-3 pt-1 border-t border-border"
          >
            <motion.button
              whileHover={{ backgroundColor: "var(--sidebar-hover)" }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={startNewFolder}
              disabled={renamingId === NEW_FOLDER_ID}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 mt-2 rounded-note text-left
                         transition-colors duration-200
                         text-sidebar-textSecondary disabled:opacity-40
                         disabled:hover:bg-transparent"
            >
              <FolderPlus
                className="w-[14px] h-[14px] shrink-0"
                strokeWidth={1.5}
              />
              <span className="text-[12px] font-medium tracking-[-0.01em]">
                New Folder
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
