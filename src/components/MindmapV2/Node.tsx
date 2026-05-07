import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { MindmapNodeV2 } from "../../lib/mindmap/types";
import { NODE_W, NODE_H } from "../../lib/mindmap/layout";

interface Props {
  node: MindmapNodeV2;
  position: { x: number; y: number };
  zoom: number;
  pan: { x: number; y: number };
  isSelected: boolean;
  isEditing: boolean;
  editText: string;
  hasChildren: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onToggleCollapse: () => void;
  onDragStart: () => void;
  onDrag: (clientDx: number, clientDy: number) => void;
  onDragEnd: () => void;
}

export default function Node({
  node,
  position,
  zoom,
  pan,
  isSelected,
  isEditing,
  editText,
  hasChildren,
  onSelect,
  onStartEdit,
  onEditChange,
  onConfirmEdit,
  onCancelEdit,
  onAddChild,
  onDelete,
  onContextMenu,
  onToggleCollapse,
  onDragStart,
  onDrag,
  onDragEnd,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Focus + select on entering edit mode. Re-runs only on the transition.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Click-outside confirm. Replaces input.onBlur which is unreliable under
  // re-renders (a stray blur — e.g., from a focus shuffle during a save
  // echo or framer-motion mount — used to fire onConfirmEdit and snap the
  // input out of edit mode mid-keystroke). The capture-phase document
  // listener fires before the new target's own handlers, so clicking
  // another node also commits cleanly.
  useEffect(() => {
    if (!isEditing) return;
    const handle = (e: MouseEvent) => {
      const input = inputRef.current;
      if (!input) return;
      const target = e.target;
      if (target instanceof globalThis.Node && input.contains(target)) return;
      onConfirmEdit();
    };
    document.addEventListener("mousedown", handle, true);
    return () => document.removeEventListener("mousedown", handle, true);
  }, [isEditing, onConfirmEdit]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // While editing this node, mousedown is the user positioning the
    // caret — don't re-select or start a drag (which would set isDragging
    // and shuffle dragShadow, possibly stealing focus).
    if (isEditing) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    onDragStart();
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      onDrag(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
    };
    const handleUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      onDragEnd();
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, onDrag, onDragEnd]);

  const x = position.x * zoom + pan.x - (NODE_W * zoom) / 2;
  const y = position.y * zoom + pan.y - (NODE_H * zoom) / 2;

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        width: NODE_W * zoom,
        height: NODE_H * zoom,
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        onContextMenu={onContextMenu}
        className={`relative w-full h-full rounded-[8px] border flex items-center justify-center
                    transition-colors duration-150 cursor-pointer select-none
                    ${
                      isSelected
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-editor-bg hover:border-editor-text/20"
                    }`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onConfirmEdit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit();
              }
            }}
            // Stop bubbling so the canvas's pan handler doesn't grab the
            // mousedown and steal focus while the user is positioning the
            // cursor inside the input.
            onMouseDown={(e) => e.stopPropagation()}
            className="w-[90%] text-center bg-transparent text-[13px] text-editor-text
                       outline-none font-medium tracking-[-0.01em]"
            spellCheck={false}
            autoFocus
          />
        ) : (
          <span
            className="text-[13px] text-editor-text/80 font-medium tracking-[-0.01em]
                       text-center px-2 overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {node.text || "New node"}
          </span>
        )}

        {/* Pin marker — small dot on the corner. Not a badge, not a label. */}
        {node.pin && (
          <span
            aria-hidden
            className="absolute top-1 right-1 w-1 h-1 rounded-full bg-accent/70"
          />
        )}

        {/* Collapse chevron — only when the node has children. */}
        {hasChildren && (
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full
                       bg-editor-bg border border-border
                       flex items-center justify-center
                       text-editor-text/50 hover:text-editor-text/80 hover:border-editor-text/20
                       transition-colors"
            title={node.collapsed ? "Expand" : "Collapse"}
          >
            {node.collapsed ? (
              <ChevronRight className="w-2.5 h-2.5" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="w-2.5 h-2.5" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>

      {isSelected && !isEditing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-1"
        >
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
            className="w-5 h-5 rounded-full bg-editor-bg border border-border
                       flex items-center justify-center
                       text-editor-text/40 hover:text-accent hover:border-accent/40
                       transition-colors"
            title="Add child"
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} />
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-5 h-5 rounded-full bg-editor-bg border border-border
                       flex items-center justify-center
                       text-editor-text/40 hover:text-red-400 hover:border-red-400/40
                       transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
