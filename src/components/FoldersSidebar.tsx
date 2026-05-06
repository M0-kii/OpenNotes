import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  Folder,
  FolderPlus,
  Folders,
  Pencil,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import type { Folder as FolderType } from "../types";
import GenericContextMenu from "./ui/GenericContextMenu";

interface FoldersSidebarProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  defaultFolderId: string | null;
  noteCounts: Record<string, number>;
  totalNoteCount: number;
  showFolderCounts: boolean;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolderRequest: (id: string) => void;
  onOpenSettings: () => void;
}

const NEW_FOLDER_ID = "__new__";

export default function FoldersSidebar({
  folders,
  selectedFolderId,
  defaultFolderId,
  noteCounts,
  totalNoteCount,
  showFolderCounts,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolderRequest,
  onOpenSettings,
}: FoldersSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenamingCollapsed, setIsRenamingCollapsed] = useState(false);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [hoveredAllNotes, setHoveredAllNotes] = useState(false);
  const [hoveredNewFolder, setHoveredNewFolder] = useState(false);
  const [hoveredSettings, setHoveredSettings] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 100);
    }
  }, [renamingId, isRenamingCollapsed]);

  const startRename = (folder: FolderType, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingId(folder.id);
    setRenameValue(folder.name);
    setIsRenamingCollapsed(false);
  };

  const startNewFolder = () => {
    setRenamingId(NEW_FOLDER_ID);
    setRenameValue("");
    if (collapsed) {
      setIsRenamingCollapsed(true);
    } else {
      setIsRenamingCollapsed(false);
    }
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
    setIsRenamingCollapsed(false);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
    setIsRenamingCollapsed(false);
  };

  const renameForm = (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="flex-1 min-w-0"
    >
      <form onSubmit={confirmRename} className="w-full">
        <div className="relative">
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
            className="w-full bg-black/[0.04] dark:bg-white/[0.06] rounded-md
                       text-[12px] font-medium text-sidebar-text
                       outline-none ring-1 ring-accent/30
                       focus:ring-accent
                       px-2 py-1 tracking-[-0.01em]
                       placeholder:text-sidebar-textSecondary/40"
            spellCheck={false}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              type="submit"
              onMouseDown={(e) => e.preventDefault()}
              className="p-1 rounded-md text-green-500 hover:text-green-600 
                         hover:bg-green-50 dark:hover:bg-green-500/10
                         transition-colors"
            >
              <Check className="w-3 h-3" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancelRename}
              className="p-1 rounded-md text-sidebar-textSecondary/60 
                         hover:text-sidebar-textSecondary
                         hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                         transition-colors"
            >
              <X className="w-3 h-3" />
            </motion.button>
          </div>
        </div>
      </form>
    </motion.div>
  );

  const isAllNotesSelected = selectedFolderId === null;

  return (
    <motion.div
      animate={{ width: collapsed ? 48 : 200 }}
      initial={{ width: 200 }}
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="h-full flex flex-col glass border-r border-border select-none shrink-0 overflow-hidden relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="title"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center gap-2 overflow-hidden"
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
          onClick={() => {
            setCollapsed(!collapsed);
            if (isRenamingCollapsed) {
              cancelRename();
            }
          }}
          className="p-1 rounded-btn text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary
                     hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150
                     ml-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronLeft className="w-[14px] h-[14px]" strokeWidth={1.5} />
          </motion.div>
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* All Notes */}
        <div className="px-1.5 pt-1 pb-2">
          <motion.button
            type="button"
            onClick={() => onSelectFolder(null)}
            onMouseEnter={() => setHoveredAllNotes(true)}
            onMouseLeave={() => setHoveredAllNotes(false)}
            className={`group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-note text-left
                        transition-colors duration-200
                        ${collapsed ? "justify-center px-0" : ""}
                        ${
                          isAllNotesSelected
                            ? "bg-black/[0.05] dark:bg-white/[0.06]"
                            : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                        }`}
            title={collapsed ? "All Notes" : undefined}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{
                ...(isAllNotesSelected && !hoveredAllNotes
                  ? {
                      scale: [1, 1.2, 1],
                      rotate: [0, -10, 0],
                    }
                  : {}),
                ...(hoveredAllNotes
                  ? {
                      scale: 1.2,
                      rotate: -15,
                    }
                  : {
                      scale: 1,
                      rotate: 0,
                    }),
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
            >
              <Folders
                className={`w-[14px] h-[14px] shrink-0 ${
                  isAllNotesSelected
                    ? "text-accent"
                    : "text-sidebar-textSecondary"
                }`}
                strokeWidth={1.5}
              />
            </motion.div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  key="all-notes-text"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="flex-1 text-[12px] font-medium text-sidebar-text tracking-[-0.01em] whitespace-nowrap"
                >
                  All Notes
                </motion.span>
              )}
            </AnimatePresence>
            {!collapsed && showFolderCounts && totalNoteCount > 0 && (
              <span className="text-[11px] tabular-nums text-sidebar-textSecondary/55 tracking-[-0.005em]">
                {totalNoteCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Divider between All Notes and Folders */}
        <motion.div
          className="px-3 py-1"
          layout
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={collapsed ? "divider-collapsed" : "divider-expanded"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              {collapsed ? (
                <div className="border-t border-sidebar-textSecondary/20" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-sidebar-textSecondary/15" />
                  <span className="text-[10px] uppercase tracking-[0.06em] text-sidebar-textSecondary/40 font-medium whitespace-nowrap">
                    Folders
                  </span>
                  <div className="flex-1 border-t border-sidebar-textSecondary/15" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Folder list */}
        <div className="px-1.5 pb-2 space-y-px">
          <AnimatePresence initial={false}>
            {folders.map((folder) => {
              const isSelected = folder.id === selectedFolderId;
              const isRenaming =
                folder.id === renamingId && !isRenamingCollapsed;
              const isDefault = folder.id === defaultFolderId;
              const isHovered = hoveredFolderId === folder.id;
              return (
                <motion.div
                  key={folder.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16, height: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                    layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                  }}
                >
                  <GenericContextMenu
                    items={[
                      {
                        label: "Rename",
                        icon: Pencil,
                        onClick: () => startRename(folder),
                      },
                      ...(isDefault
                        ? []
                        : [
                            {
                              label: "Delete" as const,
                              icon: Trash2,
                              onClick: () => onDeleteFolderRequest(folder.id),
                              destructive: true as const,
                            },
                          ]),
                    ]}
                  >
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setHoveredFolderId(folder.id)}
                      onMouseLeave={() => setHoveredFolderId(null)}
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
                  <motion.div
                    animate={{
                      ...(isSelected && !isHovered
                        ? {
                            scale: [1, 1.15, 1],
                            rotate: [0, -8, 0],
                          }
                        : {}),
                      scale: isHovered ? 1.2 : 1,
                      rotate: isHovered ? 10 : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                    }}
                  >
                    <Folder
                      className={`w-[14px] h-[14px] shrink-0 ${
                        isSelected
                          ? "text-accent"
                          : "text-sidebar-textSecondary"
                      }`}
                      strokeWidth={1.5}
                    />
                  </motion.div>
                  {isRenaming ? (
                    renameForm
                  ) : (
                    <>
                      <AnimatePresence mode="wait">
                        {!collapsed && (
                          <motion.span
                            key="folder-name"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{
                              duration: 0.2,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            className="flex-1 text-[12px] font-medium text-sidebar-text tracking-[-0.01em] truncate"
                          >
                            {folder.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {!collapsed &&
                        showFolderCounts &&
                        !isHovered &&
                        (noteCounts[folder.id] ?? 0) > 0 && (
                          <span className="text-[11px] tabular-nums text-sidebar-textSecondary/55 tracking-[-0.005em]">
                            {noteCounts[folder.id]}
                          </span>
                        )}
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
                  </GenericContextMenu>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* New folder inline form - collapsed version */}
          {renamingId === NEW_FOLDER_ID && isRenamingCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="px-1.5 py-1"
            >
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-note
                             bg-black/[0.02] dark:bg-white/[0.03]"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    rotate: 360,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 20,
                  }}
                >
                  <Folder
                    className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0"
                    strokeWidth={1.5}
                  />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelRename();
                      if (e.key === "Enter") confirmRename();
                    }}
                    placeholder="Name..."
                    className="w-full bg-transparent text-[12px] font-medium text-sidebar-text
                               outline-none border-b border-accent/30 focus:border-accent
                               pb-px tracking-[-0.01em] placeholder:text-sidebar-textSecondary/40"
                    spellCheck={false}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      confirmRename();
                    }}
                    className="p-1 rounded-md text-green-500 hover:text-green-600 
                               hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      cancelRename();
                    }}
                    className="p-1 rounded-md text-sidebar-textSecondary/60 
                               hover:text-sidebar-textSecondary
                               hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* New folder inline form - expanded version */}
          {renamingId === NEW_FOLDER_ID && !isRenamingCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-note
                         bg-black/[0.025] dark:bg-white/[0.025]
                         ${collapsed ? "justify-center px-0" : ""}`}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  rotate: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 20,
                  delay: 0.05,
                }}
              >
                <Folder
                  className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0"
                  strokeWidth={1.5}
                />
              </motion.div>
              {!collapsed && renameForm}
            </motion.div>
          )}
        </div>
      </div>

      {/* New Folder button */}
      <motion.div
        className="px-1.5 pb-3 pt-1 border-t border-border"
        layout
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.button
          type="button"
          onClick={startNewFolder}
          disabled={renamingId === NEW_FOLDER_ID}
          onMouseEnter={() => setHoveredNewFolder(true)}
          onMouseLeave={() => setHoveredNewFolder(false)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 mt-2 rounded-note text-left
                     transition-colors duration-200
                     text-sidebar-textSecondary disabled:opacity-40
                     disabled:hover:bg-transparent
                     ${collapsed ? "justify-center px-0" : ""}`}
          title="New Folder"
          whileHover={{
            scale: 1.02,
            backgroundColor: "rgba(0,0,0,0.03)",
          }}
          whileTap={{ scale: 0.96 }}
        >
          <motion.div
            animate={{
              scale: hoveredNewFolder ? 1.2 : 1,
              rotate: hoveredNewFolder ? 90 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <FolderPlus
              className="w-[14px] h-[14px] shrink-0"
              strokeWidth={1.5}
            />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="new-folder-text"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="text-[12px] font-medium tracking-[-0.01em]"
              >
                New Folder
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          type="button"
          onClick={onOpenSettings}
          onMouseEnter={() => setHoveredSettings(true)}
          onMouseLeave={() => setHoveredSettings(false)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-note text-left
                     transition-colors duration-200
                     text-sidebar-textSecondary
                     ${collapsed ? "justify-center px-0" : ""}`}
          title="Settings"
          whileHover={{
            scale: 1.02,
            backgroundColor: "rgba(0,0,0,0.03)",
          }}
          whileTap={{ scale: 0.96 }}
        >
          <motion.div
            animate={{
              scale: hoveredSettings ? 1.2 : 1,
              rotate: hoveredSettings ? 90 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Settings className="w-[14px] h-[14px] shrink-0" strokeWidth={1.5} />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="settings-text"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="text-[12px] font-medium tracking-[-0.01em]"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
