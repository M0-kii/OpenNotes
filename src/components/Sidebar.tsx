import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Check, X, GripVertical, FileText, GitBranch, ListTodo, ChevronLeft, Star } from "lucide-react";
import type { Note } from "../types";
import SearchBar from "./SearchBar";
import GenericContextMenu from "./ui/GenericContextMenu";
import InputContextMenu from "./ui/InputContextMenu";
import NoteTypePopup from "./ui/NoteTypePopup";
import { formatDate, getNotePreview } from "../lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SidebarProps {
  notes: Note[];
  selectedId: string | null;
  searchQuery: string;
  folderName: string;
  onSearchChange: (query: string) => void;
  onSelect: (id: string, openInSplit?: boolean) => void;
  onCreate: () => void;
  onCreateMindmap: () => void;
  onCreateTodo: () => void;
  onDeleteRequest: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onMoveToFolder?: (noteId: string, folderId: string) => void;
  onDropInEditor?: (noteId: string) => void;
  onDragStart?: () => void;
  onDragEndDrag?: () => void;
  onDropZone?: (noteId: string, zone: string) => void;
  onToggleFavorite: (id: string) => void;
}

export default function Sidebar({
  notes,
  selectedId,
  searchQuery,
  folderName,
  onSearchChange,
  onSelect,
  onCreate,
  onCreateMindmap,
  onCreateTodo,
  onDeleteRequest,
  onRename,
  onReorder,
  onMoveToFolder,
  onDropInEditor,
  onDragStart,
  onDragEndDrag,
  onDropZone,
  onToggleFavorite,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Existing reorder logic
    if (over && active.id !== over.id) {
      const oldIndex = notes.findIndex((n) => n.id === active.id);
      const newIndex = notes.findIndex((n) => n.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...notes];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        onReorder(reordered.map((n) => n.id));
        return; // Handled as reorder
      }
    }

    // Check if dropped on a folder or editor
    const activatorEvent = event.activatorEvent as PointerEvent;
    const dropX = activatorEvent.clientX;
    const dropY = activatorEvent.clientY;

    if (dropX !== undefined && dropY !== undefined) {
      const elementsAtPoint = document.elementsFromPoint(dropX, dropY);

      // Check for folder drop
      for (const el of elementsAtPoint) {
        const folderId = (el as HTMLElement).closest?.('[data-folder-id]')?.getAttribute?.('data-folder-id');
        if (folderId) {
          onMoveToFolder?.(String(active.id), folderId);
          return;
        }
      }

      // Check for snap layout zone drop
      for (const el of elementsAtPoint) {
        const zone = (el as HTMLElement).closest?.('[data-drop-zone]')
                     ?.getAttribute?.('data-drop-zone');
        if (zone === "tab" || zone === "split-left" || zone === "split-right") {
          onDropZone?.(String(active.id), zone);
          return;
        }
      }

      // Check for editor drop
      const editorEl = document.querySelector('[data-editor-drop-zone]');
      if (editorEl) {
        const editorRect = editorEl.getBoundingClientRect();
        if (
          dropX >= editorRect.left &&
          dropX <= editorRect.right &&
          dropY >= editorRect.top &&
          dropY <= editorRect.bottom
        ) {
          onDropInEditor?.(String(active.id));
        }
      }
    }
    onDragEndDrag?.();
  };

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleStartRename = (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingId(note.id);
    setRenameValue(note.title);
  };

  const handleConfirmRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = renameValue.trim();
    if (renamingId && trimmed) {
      onRename(renamingId, trimmed);
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 48 : 270 }}
      initial={{ width: 270 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col glass border-r border-border select-none shrink-0 overflow-hidden"
    >
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
                {folderName}
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
        {!collapsed && (
          <div className="flex items-center gap-1">
            <div className="relative">
              <motion.button
                ref={plusButtonRef}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setPopupOpen((o) => !o)}
                className="p-1.5 rounded-btn text-sidebar-textSecondary
                           hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                           transition-colors duration-150"
                title="New note or mind map"
              >
                <Plus className="w-[15px] h-[15px]" />
              </motion.button>
              <NoteTypePopup
                open={popupOpen}
                onClose={() => setPopupOpen(false)}
                onNote={onCreate}
                onMindmap={onCreateMindmap}
                onTodo={onCreateTodo}
                buttonRef={plusButtonRef}
              />
            </div>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setCollapsed(!collapsed)}
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

      {!collapsed && <SearchBar value={searchQuery} onChange={onSearchChange} />}

      {!collapsed && notes.some((n) => n.is_favorite === 1) && (
        <div className="px-3 pt-2 pb-1">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-text/40 flex items-center gap-1">
            <Star className="w-3 h-3" /> Favorites
          </h3>
        </div>
      )}

      {!collapsed && (
      <div className="flex-1 overflow-y-auto">
        <GenericContextMenu
          items={[
            { label: "New note", icon: FileText, onClick: onCreate },
            { label: "New mind map", icon: GitBranch, onClick: onCreateMindmap },
            { label: "New todo list", icon: ListTodo, onClick: onCreateTodo },
          ]}
        >
          <div className="px-2.5 py-1 space-y-px">
            <AnimatePresence initial={false}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => onDragStart?.()}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={notes.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                {notes.map((note) => (
                  <SortableNoteItem
                    key={note.id}
                    note={note}
                    isSelected={note.id === selectedId}
                    renamingId={renamingId}
                    renameValue={renameValue}
                    renameInputRef={
                      renamingId === note.id ? renameInputRef : undefined
                    }
                    onSelect={onSelect}
                    onStartRename={handleStartRename}
                    onDeleteRequest={onDeleteRequest}
                    onRenameValueChange={setRenameValue}
                    onConfirmRename={handleConfirmRename}
                    onCancelRename={handleCancelRename}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </AnimatePresence>

          {notes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="text-[12px] text-sidebar-textSecondary/35 text-center py-12 tracking-[-0.01em]"
            >
              No notes yet
              <br />
              <span className="text-[11px]">Click + to create one</span>
            </motion.div>
          )}
        </div>
        </GenericContextMenu>
      </div>
      )}
    </motion.div>
  );
}

function SortableNoteItem({
  note,
  isSelected,
  renamingId,
  renameValue,
  renameInputRef,
  onSelect,
  onStartRename,
  onDeleteRequest,
  onRenameValueChange,
  onConfirmRename,
  onCancelRename,
  onToggleFavorite,
}: {
  note: Note;
  isSelected: boolean;
  renamingId: string | null;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null> | undefined;
  onSelect: (id: string, openInSplit?: boolean) => void;
  onStartRename: (note: Note, e?: React.MouseEvent) => void;
  onDeleteRequest: (id: string) => void;
  onRenameValueChange: (v: string) => void;
  onConfirmRename: (e?: React.FormEvent) => void;
  onCancelRename: () => void;
  onToggleFavorite: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12, height: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <GenericContextMenu
        items={[
          {
            label: "Rename",
            icon: Pencil,
            onClick: () => onStartRename(note),
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => onDeleteRequest(note.id),
            destructive: true,
          },
        ]}
      >
        <motion.div
          onClick={(e) => onSelect(note.id, e.metaKey || e.ctrlKey)}
          className={`group relative px-3 py-2.5 mx-0.5 rounded-note cursor-pointer
                      transition-colors duration-200
                      ${isDragging ? "shadow-lg z-10" : ""}
                      ${
                        isSelected
                          ? "bg-black/[0.05] dark:bg-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                          : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                      }`}
        >
          <div className="flex items-center justify-between min-w-0">
            <div {...attributes} {...listeners} className="flex items-center mr-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-sidebar-textSecondary/30" strokeWidth={1.5} />
            </div>
            {renamingId === note.id ? (
              <motion.form
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                onSubmit={onConfirmRename}
                className="flex-1 flex items-center gap-1.5"
              >
                <input
                  ref={renameInputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={renameValue}
                  onChange={(e) => onRenameValueChange(e.target.value)}
                  onBlur={onConfirmRename}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") onCancelRename();
                  }}
                  className="flex-1 bg-transparent text-[12px] font-medium
                              text-sidebar-text outline-none border-b
                              border-accent pb-px tracking-[-0.01em]"
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
                  onClick={onCancelRename}
                  className="p-0.5 text-sidebar-textSecondary/60 hover:text-sidebar-textSecondary transition-colors"
                >
                  <X className="w-3 h-3" />
                </motion.button>
              </motion.form>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(note.id);
                  }}
                  className={`p-0.5 rounded-sm transition-colors mr-0.5 ${
                    note.is_favorite === 1
                      ? "text-accent"
                      : "text-sidebar-text/20 group-hover:text-sidebar-text/50"
                  }`}
                  title={note.is_favorite === 1 ? "Unfavorite" : "Favorite"}
                >
                  <Star
                    className="w-3.5 h-3.5"
                    fill={note.is_favorite === 1 ? "currentColor" : "none"}
                  />
                </motion.button>
                <div className="flex-1 min-w-0 mr-1.5">
                  <div className="text-[12px] font-medium text-sidebar-text truncate tracking-[-0.01em] leading-snug">
                    {note.title || "Untitled"}
                  </div>
                  <div className="text-[11px] text-sidebar-textSecondary/60 truncate mt-0.5 leading-relaxed">
                    {getNotePreview(note.content, note.note_type, 60)}
                  </div>
                  <div className="text-[10px] text-sidebar-textSecondary/40 mt-1 tracking-[-0.01em]">
                    {formatDate(note.updated_at)}
                  </div>
                </div>
                <motion.div
                  initial={false}
                  animate={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="flex items-center gap-0.5"
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => onStartRename(note, e)}
                    className="p-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                               text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary
                               transition-colors"
                    title="Rename"
                  >
                    <Pencil className="w-3 h-3" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRequest(note.id);
                    }}
                    className="p-1 rounded-md hover:bg-red-500/[0.08]
                               text-sidebar-textSecondary/40 hover:text-red-400
                               transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </motion.button>
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      </GenericContextMenu>
    </motion.div>
  );
}
