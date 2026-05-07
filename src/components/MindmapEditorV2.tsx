// Mind map v2 editor.
//
// All mutation goes through the operations API in `lib/mindmap/operations`.
// Direct setState on the graph is forbidden in this file. The graph is the
// source of truth; positions are derived at render time by the layout engine.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutMode, MindmapGraphV2, Operation } from "../lib/mindmap/types";
import type { Note } from "../types";
import { user } from "../lib/mindmap/operations";
import { hiddenNodes, layout } from "../lib/mindmap/layout";
import { emptyGraph, parse, serialize } from "../lib/mindmap/serialize";
import {
  emptyHistory,
  popRedo,
  popUndo,
  pushHistory,
  type History,
} from "../lib/mindmap/history";
import { generateId } from "../lib/utils";
import Connections from "./MindmapV2/Connections";
import Node from "./MindmapV2/Node";
import Toolbar from "./MindmapV2/Toolbar";

interface Props {
  note: Note | null;
  onContentChange: (id: string, content: string) => void;
  onTitleChange: (id: string, title: string) => void;
}

export default function MindmapEditorV2({
  note,
  onContentChange,
  onTitleChange,
}: Props) {
  const [mode, setMode] = useState<LayoutMode>("tree");
  const containerRef = useRef<HTMLDivElement>(null);
  const noteIdRef = useRef<string | null>(null);

  const [graph, setGraph] = useState<MindmapGraphV2>(emptyGraph());
  const [history, setHistory] = useState<History>(emptyHistory());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Drag state — shadow positions while a node is dragged so we don't
  // commit pin_node ops on every mousemove. We commit once on drag end.
  const dragOriginRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [dragShadow, setDragShadow] = useState<{ id: string; x: number; y: number } | null>(null);

  // Load note content into graph; reset transient UI only when the *id*
  // changes. Same-id prop updates are our own save echoes — re-running the
  // load body would clobber editingId/selectedId mid-interaction (the
  // user's typing would die because the input unmounts).
  useEffect(() => {
    const nextId = note?.id ?? null;
    if (noteIdRef.current === nextId) return;
    noteIdRef.current = nextId;
    if (!note) {
      setGraph(emptyGraph());
    } else {
      setGraph(parse(note.content));
    }
    setHistory(emptyHistory());
    setSelectedId(null);
    setEditingId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [note]);

  const persist = useCallback(
    (g: MindmapGraphV2) => {
      if (!noteIdRef.current) return;
      onContentChange(noteIdRef.current, serialize(g));
    },
    [onContentChange],
  );

  // Single dispatch path: applies op(s), updates graph + history, persists.
  const dispatch = useCallback(
    (ops: Operation[], { record = true }: { record?: boolean } = {}) => {
      if (ops.length === 0) return;
      try {
        const { graph: next, inverse } = user.applyBatch(graph, ops);
        setGraph(next);
        if (record) {
          setHistory((h) => pushHistory(h, { forward: ops, inverse }));
        }
        persist(next);
      } catch (err) {
        // Structured OperationError — for now, log; future LLM gets the
        // structured form for self-correction.
        console.error("[mindmap v2] op failed", err);
      }
    },
    [graph, persist],
  );

  const undo = useCallback(() => {
    const popped = popUndo(history);
    if (!popped) return;
    try {
      const { graph: next } = user.applyBatch(graph, popped.entry.inverse);
      setGraph(next);
      setHistory(popped.history);
      persist(next);
    } catch (err) {
      console.error("[mindmap v2] undo failed", err);
    }
  }, [history, graph, persist]);

  const redo = useCallback(() => {
    const popped = popRedo(history);
    if (!popped) return;
    try {
      const { graph: next } = user.applyBatch(graph, popped.entry.forward);
      setGraph(next);
      setHistory(popped.history);
      persist(next);
    } catch (err) {
      console.error("[mindmap v2] redo failed", err);
    }
  }, [history, graph, persist]);

  // Derived layout for the current graph + mode. dragShadow overrides the
  // dragged node's position visually until drag ends.
  const positions = useMemo(() => {
    const p = layout(graph, mode);
    if (dragShadow) p.set(dragShadow.id, { x: dragShadow.x, y: dragShadow.y });
    return p;
  }, [graph, mode, dragShadow]);

  const hidden = useMemo(() => hiddenNodes(graph), [graph]);
  const visibleNodes = useMemo(
    () => graph.nodes.filter((n) => !hidden.has(n.id)),
    [graph.nodes, hidden],
  );

  const pinnedCount = useMemo(
    () => graph.nodes.reduce((acc, n) => acc + (n.pin ? 1 : 0), 0),
    [graph.nodes],
  );

  const resetPositions = useCallback(() => {
    const ops: Operation[] = graph.nodes
      .filter((n) => n.pin)
      .map((n) => ({ kind: "unpin_node" as const, id: n.id }));
    if (ops.length > 0) dispatch(ops);
  }, [dispatch, graph.nodes]);

  const childCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of graph.nodes) {
      if (n.parentId) m.set(n.parentId, (m.get(n.parentId) ?? 0) + 1);
    }
    return m;
  }, [graph.nodes]);

  // Add a node, optionally as a child of `parentId`. Position: if there is
  // no parent, place it at the canvas point under the user's cursor (pinned
  // — this is the "double-click empty canvas" gesture). Otherwise let the
  // layout engine place it (auto-laid-out child).
  const addNode = useCallback(
    (parentId: string | null, pinAt?: { x: number; y: number }) => {
      const id = generateId();
      const ops: Operation[] = [{ kind: "add_node", id, parent_id: parentId }];
      if (pinAt) ops.push({ kind: "pin_node", id, x: pinAt.x, y: pinAt.y });
      dispatch(ops);
      setSelectedId(id);
      setEditingId(id);
      setEditText("");
    },
    [dispatch],
  );

  const handleDoubleClickCanvas = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== containerRef.current) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      addNode(null, { x, y });
    },
    [addNode, pan, zoom],
  );

  const handleAddChild = useCallback(
    (parentId: string) => addNode(parentId),
    [addNode],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      dispatch([{ kind: "delete_node", id }]);
      setSelectedId(null);
      setEditingId(null);
    },
    [dispatch],
  );

  const confirmEdit = useCallback(() => {
    if (!editingId) return;
    const text = editText.trim();
    const node = graph.nodes.find((n) => n.id === editingId);
    if (node && node.text !== text) {
      dispatch([{ kind: "set_node_text", id: editingId, text }]);
    }
    setEditingId(null);
  }, [dispatch, editText, editingId, graph.nodes]);

  const handleNodeContextMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const node = graph.nodes.find((n) => n.id === id);
      if (node?.pin) {
        // Single-action context: release the pin so it rejoins auto-layout.
        dispatch([{ kind: "unpin_node", id }]);
      }
    },
    [dispatch, graph.nodes],
  );

  const handleToggleCollapse = useCallback(
    (id: string) => {
      const node = graph.nodes.find((n) => n.id === id);
      if (!node) return;
      dispatch([
        node.collapsed
          ? { kind: "expand_node", id }
          : { kind: "collapse_node", id },
      ]);
    },
    [dispatch, graph.nodes],
  );

  // Drag flow: capture origin from the layout (or current pin), translate
  // mouse delta into graph coords (divided by zoom), and on release commit
  // a pin_node op.
  const handleDragStart = useCallback(
    (id: string) => {
      const pos = positions.get(id);
      if (!pos) return;
      dragOriginRef.current = { id, x: pos.x, y: pos.y };
      setDragShadow({ id, x: pos.x, y: pos.y });
    },
    [positions],
  );

  const handleDrag = useCallback(
    (clientDx: number, clientDy: number) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      setDragShadow({
        id: origin.id,
        x: origin.x + clientDx / zoom,
        y: origin.y + clientDy / zoom,
      });
    },
    [zoom],
  );

  const handleDragEnd = useCallback(() => {
    const shadow = dragShadow;
    const origin = dragOriginRef.current;
    dragOriginRef.current = null;
    setDragShadow(null);
    if (!shadow || !origin) return;
    if (shadow.x === origin.x && shadow.y === origin.y) return;
    dispatch([{ kind: "pin_node", id: shadow.id, x: shadow.x, y: shadow.y }]);
  }, [dispatch, dragShadow]);

  // Canvas pan + zoom (ported from v1).
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.2, Math.min(3, z * delta)));
    } else {
      e.preventDefault();
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current && !e.ctrlKey) {
        setIsPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX: pan.x,
          panY: pan.y,
        };
      }
    },
    [pan],
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

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingId) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          handleDeleteNode(selectedId);
        }
        return;
      }
      if (e.key === "Enter" && selectedId) {
        e.preventDefault();
        handleAddChild(selectedId);
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setEditingId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingId, selectedId, undo, redo, handleDeleteNode, handleAddChild]);

  if (!note || note.note_type !== "mindmap") return null;

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

      {graph.nodes.length > 0 && (
        <Toolbar
          mode={mode}
          onModeChange={setMode}
          zoom={zoom}
          onZoomIn={() => setZoom((z) => Math.min(3, z * 1.2))}
          onZoomOut={() => setZoom((z) => Math.max(0.2, z / 1.2))}
          onResetView={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          onResetPositions={resetPositions}
          resetPositionsDisabled={pinnedCount === 0}
        />
      )}

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onDoubleClick={handleDoubleClickCanvas}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <Connections
          nodes={visibleNodes}
          positions={positions}
          hidden={hidden}
          mode={mode}
          zoom={zoom}
          pan={pan}
        />

        {visibleNodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          return (
            <Node
              key={node.id}
              node={node}
              position={pos}
              zoom={zoom}
              pan={pan}
              isSelected={selectedId === node.id}
              isEditing={editingId === node.id}
              editText={editText}
              hasChildren={(childCount.get(node.id) ?? 0) > 0}
              onSelect={() => {
                setSelectedId(node.id);
                if (editingId !== node.id) setEditingId(null);
              }}
              onStartEdit={() => {
                setEditingId(node.id);
                setEditText(node.text);
              }}
              onEditChange={setEditText}
              onConfirmEdit={confirmEdit}
              onCancelEdit={() => setEditingId(null)}
              onAddChild={() => handleAddChild(node.id)}
              onDelete={() => handleDeleteNode(node.id)}
              onContextMenu={(e) => handleNodeContextMenu(node.id, e)}
              onToggleCollapse={() => handleToggleCollapse(node.id)}
              onDragStart={() => handleDragStart(node.id)}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
            />
          );
        })}

        {graph.nodes.length === 0 && (
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
