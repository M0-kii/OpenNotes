import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import type { Note, MindmapNode, MindmapData, MindmapLayout } from "../types";
import { generateId } from "../lib/utils";

interface Props {
  note: Note | null;
  layout: MindmapLayout;
  onContentChange: (id: string, content: string) => void;
  onTitleChange: (id: string, title: string) => void;
}

interface MindmapNodeViewProps {
  node: MindmapNode;
  isSelected: boolean;
  isEditing: boolean;
  editText: string;
  zoom: number;
  pan: { x: number; y: number };
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: () => void;
  onDoubleClick: () => void;
  onEditChange: (v: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onDrag: (dx: number, dy: number) => void;
  onDragEnd: () => void;
}

const NODE_W = 150;
const NODE_H = 50;
const H_GAP = 80;
const V_GAP = 100;

function emptyMindmap(): MindmapData {
  return { nodes: [] };
}

function parseData(content: string): MindmapData {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.nodes)) return parsed;
  } catch {}
  return emptyMindmap();
}

function serializeData(data: MindmapData): string {
  return JSON.stringify(data);
}

function layoutChildren(
  parent: MindmapNode,
  children: MindmapNode[],
  layout: MindmapLayout
): MindmapNode[] {
  if (children.length === 0) return children;
  const isTopDown = layout === "top-down";

  const totalW =
    isTopDown
      ? children.length * NODE_W + (children.length - 1) * H_GAP
      : children.length * NODE_H + (children.length - 1) * V_GAP;

  const startX = isTopDown
    ? parent.x - totalW / 2 + NODE_W / 2
    : parent.x + H_GAP;
  const startY = isTopDown
    ? parent.y + V_GAP
    : parent.y - totalW / 2 + NODE_H / 2;

  return children.map((child, i) => ({
    ...child,
    x: isTopDown ? startX + i * (NODE_W + H_GAP) : startX,
    y: isTopDown ? startY : startY + i * (NODE_H + V_GAP),
  }));
}

function getConnectionPath(
  parent: MindmapNode,
  child: MindmapNode,
  layout: MindmapLayout
): string {
  const isTopDown = layout === "top-down";
  const px = parent.x;
  const py = isTopDown ? parent.y + NODE_H / 2 : parent.y;
  const cx = isTopDown ? child.x : child.x - NODE_W / 2 - 16;
  const cy = isTopDown ? child.y - NODE_H / 2 - 8 : child.y;

  const midY = (py + cy) / 2;
  const midX = (px + cx) / 2;

  if (isTopDown) {
    return `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
  }
  return `M ${px} ${py} C ${midX} ${py}, ${midX} ${cy}, ${cx} ${cy}`;
}

export default function MindmapEditor({
  note,
  layout,
  onContentChange,
  onTitleChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MindmapData>(emptyMindmap());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const noteIdRef = useRef<string | null>(null);

  const persist = useCallback(
    (newData: MindmapData) => {
      if (!noteIdRef.current) return;
      onContentChange(noteIdRef.current, serializeData(newData));
    },
    [onContentChange]
  );

  useEffect(() => {
    if (!note) {
      noteIdRef.current = null;
      setData(emptyMindmap());
      return;
    }
    noteIdRef.current = note.id;
    setData(parseData(note.content));
    setSelectedNodeId(null);
    setEditingNodeId(null);
  }, [note]);

  useEffect(() => {
    if (editingNodeId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingNodeId]);

  const handleDoubleClickCanvas = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== containerRef.current) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      const newNode: MindmapNode = {
        id: generateId(),
        text: "",
        parentId: null,
        x,
        y,
      };
      const newData = { nodes: [...data.nodes, newNode] };
      setData(newData);
      persist(newData);
      setSelectedNodeId(newNode.id);
      setEditingNodeId(newNode.id);
      setEditText("");
    },
    [data, pan, zoom, persist]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parent = data.nodes.find((n) => n.id === parentId);
      if (!parent) return;
      const children = data.nodes.filter((n) => n.parentId === parentId);
      const laidOut = layoutChildren(
        parent,
        children.length === 0
          ? [
              {
                id: "temp",
                text: "",
                parentId,
                x: 0,
                y: 0,
              },
            ]
          : [...children, { id: "new", text: "", parentId, x: 0, y: 0 }],
        layout
      );
      const newPos = laidOut[laidOut.length - 1];
      const newNode: MindmapNode = {
        id: generateId(),
        text: "",
        parentId,
        x: newPos.x,
        y: newPos.y,
      };
      const newNodes = [...data.nodes, newNode];
      if (children.length > 0) {
        const reLaidOut = layoutChildren(parent, [...children, newNode], layout);
        for (const n of newNodes) {
          const updated = reLaidOut.find((r) => r.id === n.id);
          if (updated) {
            n.x = updated.x;
            n.y = updated.y;
          }
        }
      }
      const newData = { nodes: newNodes };
      setData(newData);
      persist(newData);
      setSelectedNodeId(newNode.id);
      setEditingNodeId(newNode.id);
      setEditText("");
    },
    [data, layout, persist]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const toDelete = new Set<string>();
      const collect = (id: string) => {
        toDelete.add(id);
        data.nodes
          .filter((n) => n.parentId === id)
          .forEach((c) => collect(c.id));
      };
      collect(nodeId);
      const newData = { nodes: data.nodes.filter((n) => !toDelete.has(n.id)) };
      setData(newData);
      persist(newData);
      setSelectedNodeId(null);
      setEditingNodeId(null);
    },
    [data, persist]
  );

  const handleNodeDrag = useCallback(
    (nodeId: string, dx: number, dy: number) => {
      setData((prev) => {
        const newNodes = prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, x: n.x + dx / zoom, y: n.y + dy / zoom } : n
        );
        return { nodes: newNodes };
      });
    },
    [zoom]
  );

  const handleNodeDragEnd = useCallback(() => {
    persist(data);
  }, [data, persist]);

  const handleConfirmEdit = useCallback(() => {
    if (!editingNodeId) return;
    const text = editText.trim();
    const newData = {
      nodes: data.nodes.map((n) =>
        n.id === editingNodeId ? { ...n, text } : n
      ),
    };
    setData(newData);
    persist(newData);
    setEditingNodeId(null);
  }, [editingNodeId, editText, data, persist]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.max(0.2, Math.min(3, z * delta)));
      }
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current && !e.ctrlKey) {
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      }
    },
    [pan]
  );

  useEffect(() => {
    if (!isPanning) return;
    const handleMove = (e: MouseEvent) => {
      setPan({
        x: panStart.current.panX + e.clientX - panStart.current.x,
        y: panStart.current.panY + e.clientY - panStart.current.y,
      });
    };
    const handleUp = () => setIsPanning(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isPanning]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingNodeId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId && !editingNodeId) {
          handleDeleteNode(selectedNodeId);
        }
      }
      if (e.key === "Escape") {
        setSelectedNodeId(null);
        setEditingNodeId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId, editingNodeId, handleDeleteNode]);

  if (!note || note.note_type !== "mindmap") {
    return null;
  }

  const nodes = data.nodes;

  return (
    <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
      <div className="px-10 pt-10 pb-3">
        <input
          type="text"
          value={note.title}
          onChange={(e) => onTitleChange(note.id, e.target.value)}
          placeholder="Mind map title"
          className="w-full text-[26px] font-bold text-editor-text
                     bg-transparent border-none outline-none
                     placeholder:text-editor-text/15 tracking-[-0.02em]
                     pb-3 border-b border-border transition-colors duration-200
                     focus:border-accent/40"
          spellCheck={false}
        />
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onDoubleClick={handleDoubleClickCanvas}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          {nodes.map((node) => {
            if (!node.parentId) return null;
            const parent = nodes.find((n) => n.id === node.parentId);
            if (!parent) return null;
            const d = getConnectionPath(
              { ...parent, x: parent.x * zoom + pan.x, y: parent.y * zoom + pan.y },
              { ...node, x: node.x * zoom + pan.x, y: node.y * zoom + pan.y },
              layout
            );
            return (
              <path
                key={`${parent.id}-${node.id}`}
                d={d}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth={1.5}
              />
            );
          })}
        </svg>

        {nodes.map((node) => (
          <MindmapNodeView
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isEditing={editingNodeId === node.id}
            editText={editText}
            zoom={zoom}
            pan={pan}
            editInputRef={editInputRef}
            onSelect={() => {
              setSelectedNodeId(node.id);
              setEditingNodeId(null);
            }}
            onDoubleClick={() => {
              setEditingNodeId(node.id);
              setEditText(node.text);
            }}
            onEditChange={setEditText}
            onConfirmEdit={handleConfirmEdit}
            onCancelEdit={() => setEditingNodeId(null)}
            onAddChild={() => handleAddChild(node.id)}
            onDelete={() => handleDeleteNode(node.id)}
            onDrag={(dx, dy) => handleNodeDrag(node.id, dx, dy)}
            onDragEnd={handleNodeDragEnd}
          />
        ))}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[13px] text-editor-text/20 tracking-[-0.01em]">
              Double-click to add a node
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MindmapNodeView({
  node,
  isSelected,
  isEditing,
  editText,
  zoom,
  pan,
  editInputRef,
  onSelect,
  onDoubleClick,
  onEditChange,
  onConfirmEdit,
  onCancelEdit,
  onAddChild,
  onDelete,
  onDrag,
  onDragEnd,
}: MindmapNodeViewProps) {
  const dragRef = useRef({ startX: 0, startY: 0, nodeX: 0, nodeY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      onDrag(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);
    };
    const handleUp = () => {
      setIsDragging(false);
      onDragEnd();
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, onDrag, onDragEnd]);

  const x = node.x * zoom + pan.x - (NODE_W * zoom) / 2;
  const y = node.y * zoom + pan.y - (NODE_H * zoom) / 2;

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
          onDoubleClick();
        }}
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
            ref={editInputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={() => onConfirmEdit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirmEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            className="w-[90%] text-center bg-transparent text-[12px] text-editor-text
                       outline-none font-medium tracking-[-0.01em]"
            spellCheck={false}
            autoFocus
          />
        ) : (
          <span
            className="text-[12px] text-editor-text/80 font-medium tracking-[-0.01em]
                       text-center px-2 overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {node.text || "New node"}
          </span>
        )}
      </div>

      {isSelected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1"
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
          >
            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
