import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo,
  Check,
  Trash2,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import type { Note, TodoItem } from "../types";
import { generateId } from "../lib/utils";
import InputContextMenu from "./ui/InputContextMenu";
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

interface TodoListEditorProps {
  note: Note | null;
  onContentChange: (id: string, content: string) => void;
  onTitleChange?: (id: string, title: string) => void;
  isActive?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
}

function parseItems(content: string): TodoItem[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.items)) return parsed.items;
  } catch {
    /* empty */
  }
  return [];
}

function serializeItems(items: TodoItem[]): string {
  return JSON.stringify({ items });
}

export default function TodoListEditor({
  note,
  onContentChange,
  onTitleChange,
  isActive = true,
  onFocus,
  onClose,
}: TodoListEditorProps) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState("");

  const noteIdRef = useRef<string | null>(null);
  const isUpdatingFromProp = useRef(false);
  const lastContentRef = useRef<string>("");
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const titleInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Sync from note prop ──────────────────────────────────────────
  useEffect(() => {
    if (!note || note.note_type !== "todolist") {
      noteIdRef.current = null;
      lastContentRef.current = "";
      setItems([]);
      setTitle("");
      return;
    }

    if (noteIdRef.current !== note.id) {
      noteIdRef.current = note.id;
      isUpdatingFromProp.current = true;
      const parsed = parseItems(note.content);
      setItems(parsed);
      setTitle(note.title);
      lastContentRef.current = note.content;
      // Clear flag after render
      requestAnimationFrame(() => {
        isUpdatingFromProp.current = false;
      });
    }
  }, [note]);

  // ── Save helper ──────────────────────────────────────────────────
  const save = useCallback(
    (newItems: TodoItem[]) => {
      if (!noteIdRef.current) return;
      const json = serializeItems(newItems);
      if (json !== lastContentRef.current) {
        lastContentRef.current = json;
        onContentChange(noteIdRef.current, json);
      }
    },
    [onContentChange]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<TodoItem>) => {
      if (isUpdatingFromProp.current) return;
      const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
      setItems(next);
      save(next);
    },
    [items, save]
  );

  const toggleItem = useCallback(
    (id: string) => {
      const item = items.find((it) => it.id === id);
      if (item) updateItem(id, { completed: !item.completed });
    },
    [items, updateItem]
  );

  const deleteItem = useCallback(
    (id: string) => {
      if (isUpdatingFromProp.current) return;
      const next = items.filter((it) => it.id !== id);
      setItems(next);
      save(next);
    },
    [items, save]
  );

  const addItem = useCallback(
    (afterId?: string) => {
      if (isUpdatingFromProp.current) return;
      const newItem: TodoItem = {
        id: generateId(),
        text: "",
        completed: false,
        createdAt: new Date().toISOString(),
      };
      let next: TodoItem[];
      if (afterId) {
        const idx = items.findIndex((it) => it.id === afterId);
        next = [...items];
        next.splice(idx + 1, 0, newItem);
      } else {
        next = [...items, newItem];
      }
      setItems(next);
      save(next);
      // Focus the new item after render
      requestAnimationFrame(() => {
        const el = itemRefs.current.get(newItem.id);
        el?.focus();
      });
    },
    [items, save]
  );

  const handleTextChange = useCallback(
    (id: string, text: string) => {
      updateItem(id, { text });
    },
    [updateItem]
  );

  const handleTitleBlur = useCallback(() => {
    if (note && onTitleChange) {
      onTitleChange(note.id, title);
    }
  }, [note, onTitleChange, title]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLInputElement).blur();
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((it) => it.id === active.id);
      const newIndex = items.findIndex((it) => it.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = [...items];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      setItems(next);
      save(next);
    },
    [items, save]
  );

  const itemIds = useMemo(() => items.map((it) => it.id), [items]);

  // ── Guard clause: wrong note type or no note ─────────────────────
  if (!note || note.note_type !== "todolist") {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg">
        <AnimatePresence mode="wait">
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-3 text-editor-text/20"
          >
            <ListTodo className="w-12 h-12" strokeWidth={1} />
            <span className="text-[13px] tracking-[-0.01em]">
              Select a todo list or create a new one
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      onMouseDownCapture={onFocus}
      onFocusCapture={onFocus}
      className={`flex-1 min-w-0 flex flex-col bg-editor-bg overflow-hidden
                  relative transition-colors duration-150
                  ${isActive ? "" : "opacity-[0.92]"}`}
    >
      {/* Active pane indicator */}
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
          <X className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="editor-column flex-1 flex flex-col min-h-0">
          {/* ── Title ─────────────────────────────────────────── */}
          <div className="px-10 pt-10 pb-3">
            <InputContextMenu inputRef={titleInputRef}>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                placeholder="Todo list title..."
                className="w-full text-[26px] font-bold text-editor-text
                           bg-transparent border-none outline-none
                           placeholder:text-editor-text/15 tracking-[-0.02em]
                           pb-3 border-b border-border transition-colors duration-200
                           focus:border-accent/40"
                spellCheck={false}
              />
            </InputContextMenu>
            <div className="flex items-center justify-between gap-6 mt-2.5 text-[11px] text-editor-text/20 tracking-[-0.01em]">
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
              <div className="flex items-center gap-4">
                <span>
                  {items.filter((i) => i.completed).length}/{items.length} completed
                </span>
                {items.some((i) => i.completed) && (
                  <button
                    onClick={() => {
                      const remaining = items.filter((i) => !i.completed);
                      setItems(remaining);
                      save(remaining);
                    }}
                    className="text-editor-text/15 hover:text-editor-text/40 transition-colors"
                  >
                    Clear completed
                  </button>
                )}
              </div>
            </div>
            {items.length > 0 && (
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${items.every((i) => i.completed) ? "bg-confirm" : "bg-accent"}`}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(items.filter((i) => i.completed).length / items.length) * 100}%`,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            )}
            {items.length > 0 && items.every((i) => i.completed) && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-[11px] text-confirm/70 tracking-[-0.01em]"
              >
                All done!
              </motion.div>
            )}
          </div>

          {/* ── Items list ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-10 py-5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={itemIds}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <SortableTodoItem
                      key={item.id}
                      item={item}
                      itemRefs={itemRefs}
                      onToggle={toggleItem}
                      onTextChange={handleTextChange}
                      onDelete={deleteItem}
                      onAddBelow={addItem}
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>
            </DndContext>

            {/* ── Add button ─────────────────────────────────── */}
            <button
              onClick={() => addItem()}
              className="group flex items-center gap-2.5 mt-2 px-2 py-2 w-full
                         text-editor-text/15 hover:text-editor-text/30
                         transition-colors duration-150 rounded-md
                         hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[12px] tracking-[-0.01em]">Add item</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sortable todo item ─────────────────────────────────────────────

function SortableTodoItem({
  item,
  itemRefs,
  onToggle,
  onTextChange,
  onDelete,
  onAddBelow,
}: {
  item: TodoItem;
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onToggle: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onAddBelow: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const setItemRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        itemRefs.current.set(item.id, el);
      } else {
        itemRefs.current.delete(item.id);
      }
    },
    [item.id, itemRefs]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggle(item.id);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const text = (e.target as HTMLDivElement).innerText.trim();
        if (text) {
          onAddBelow(item.id);
        }
      }
      if (e.key === "Backspace") {
        const el = e.target as HTMLDivElement;
        if (el.innerText.trim() === "" && el.textContent?.length === 0) {
          e.preventDefault();
          onDelete(item.id);
        }
      }
    },
    [item.id, onAddBelow, onDelete, onToggle]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const text = (e.target as HTMLDivElement).innerText.trim();
      if (text !== item.text) {
        onTextChange(item.id, text);
      }
    },
    [item.id, item.text, onTextChange]
  );

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -8, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`group flex items-center gap-2 py-1.5
                  ${isDragging ? "opacity-50 z-10" : ""}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-0.5 cursor-grab active:cursor-grabbing
                   text-editor-text/10 group-hover:text-editor-text/20
                   transition-colors duration-150"
      >
        <GripVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
      </div>

      {/* Checkbox */}
      <motion.button
        onClick={() => onToggle(item.id)}
        whileTap={{ scale: 0.85 }}
        className={`flex-shrink-0 w-4 h-4 rounded-[4px] flex items-center justify-center
                    transition-colors duration-150 cursor-pointer
                    ${
                      item.completed
                        ? "bg-accent border-accent"
                        : "border border-border hover:border-editor-text/20"
                    }`}
      >
        <AnimatePresence mode="wait">
          {item.completed ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ type: "spring", stiffness: 500, damping: 25, mass: 0.5 }}
            >
              <Check
                className="w-2.5 h-2.5 text-white dark:text-black"
                strokeWidth={3}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.1 }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Text */}
      <div
        ref={setItemRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        data-placeholder={item.text ? undefined : "New item..."}
        className={`flex-1 text-[13px] leading-relaxed outline-none py-0.5 px-0
                    whitespace-pre-wrap break-words tracking-[-0.01em]
                    caret-accent transition-colors duration-150
                    empty:before:content-[attr(data-placeholder)]
                    empty:before:text-editor-text/15
                    empty:before:tracking-[-0.01em]
                    ${
                      item.completed
                        ? "line-through text-editor-text/25"
                        : "text-editor-text/80"
                    }`}
        spellCheck={false}
      >
        {item.text}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 p-0.5 opacity-0 group-hover:opacity-100
                   text-editor-text/15 hover:text-editor-text/40
                   transition-all duration-150 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}
