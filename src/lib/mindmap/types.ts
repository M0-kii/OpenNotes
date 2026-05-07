// Mind map v2 graph types.
//
// The graph is the source of truth. Layout positions for unpinned nodes are
// derived at render time by `layout.ts`. Pinned nodes carry an absolute
// `pin: { x, y }` and override layout. The schema is versioned on the
// persisted blob so we can migrate forward without breaking older notes.

export const MINDMAP_SCHEMA_VERSION = 2 as const;

export type LayoutMode = "tree" | "radial" | "freeform";

export interface Pin {
  x: number;
  y: number;
}

export interface MindmapNodeV2 {
  id: string;
  text: string;
  parentId: string | null;
  collapsed: boolean;
  pin?: Pin;
}

export interface MindmapGraphV2 {
  schemaVersion: typeof MINDMAP_SCHEMA_VERSION;
  nodes: MindmapNodeV2[];
}

// Each graph operation has an inverse for undo and redo.

export type UserOperation =
  | { kind: "add_node"; id: string; parent_id: string | null; text?: string }
  | { kind: "set_node_text"; id: string; text: string }
  | { kind: "set_node_parent"; id: string; parent_id: string | null }
  | { kind: "delete_node"; id: string }
  | { kind: "collapse_node"; id: string }
  | { kind: "expand_node"; id: string }
  | { kind: "pin_node"; id: string; x: number; y: number }
  | { kind: "unpin_node"; id: string };

export type Operation = UserOperation;

// Validation errors identify the affected node when possible.
export type OpErrorCode =
  | "unknown_node"
  | "duplicate_id"
  | "cycle"
  | "self_parent"
  | "invalid_state";

export interface OpError {
  code: OpErrorCode;
  message: string;
  id?: string;
}

export class OperationError extends Error {
  code: OpErrorCode;
  id?: string;
  constructor(err: OpError) {
    super(err.message);
    this.code = err.code;
    this.id = err.id;
  }
}

// Result of applying an operation: the new graph, plus the inverse op (or
// list of ops, for cascading deletes) that reverts the change.
export interface OpResult {
  graph: MindmapGraphV2;
  inverse: Operation[];
}
