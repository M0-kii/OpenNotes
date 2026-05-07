// Operation dispatcher.
//
// applyOperation(graph, op) → { graph', inverse[] }
//
// This is the only path through which the graph mutates. Every operation
// produces a fully-formed new graph (no in-place mutation) and a list of
// inverse operations that undo the change. Validation throws structured
// `OperationError` so callers (eventually an LLM) can self-correct.

import {
  OperationError,
  type MindmapGraphV2,
  type MindmapNodeV2,
  type OpResult,
  type Operation,
} from "./types";

const clone = (graph: MindmapGraphV2): MindmapGraphV2 => ({
  ...graph,
  nodes: graph.nodes.map((n) => ({ ...n, pin: n.pin ? { ...n.pin } : undefined })),
});

const findNode = (
  graph: MindmapGraphV2,
  id: string,
): MindmapNodeV2 | undefined => graph.nodes.find((n) => n.id === id);

const descendantsOf = (graph: MindmapGraphV2, id: string): string[] => {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of graph.nodes) {
      if (n.parentId === cur) {
        out.push(n.id);
        stack.push(n.id);
      }
    }
  }
  return out;
};

export function applyOperation(
  graph: MindmapGraphV2,
  op: Operation,
): OpResult {
  switch (op.kind) {
    case "add_node": {
      if (findNode(graph, op.id)) {
        throw new OperationError({
          code: "duplicate_id",
          message: `node ${op.id} already exists`,
          id: op.id,
        });
      }
      if (op.parent_id !== null && !findNode(graph, op.parent_id)) {
        throw new OperationError({
          code: "unknown_node",
          message: `parent ${op.parent_id} not found`,
          id: op.parent_id,
        });
      }
      const node: MindmapNodeV2 = {
        id: op.id,
        text: op.text ?? "",
        parentId: op.parent_id,
        collapsed: false,
      };
      const next = clone(graph);
      next.nodes.push(node);
      return { graph: next, inverse: [{ kind: "delete_node", id: op.id }] };
    }

    case "set_node_text": {
      const node = findNode(graph, op.id);
      if (!node) {
        throw new OperationError({
          code: "unknown_node",
          message: `node ${op.id} not found`,
          id: op.id,
        });
      }
      const prev = node.text;
      const next = clone(graph);
      const target = next.nodes.find((n) => n.id === op.id)!;
      target.text = op.text;
      return {
        graph: next,
        inverse: [{ kind: "set_node_text", id: op.id, text: prev }],
      };
    }

    case "set_node_parent": {
      const node = findNode(graph, op.id);
      if (!node) {
        throw new OperationError({
          code: "unknown_node",
          message: `node ${op.id} not found`,
          id: op.id,
        });
      }
      if (op.parent_id === op.id) {
        throw new OperationError({
          code: "self_parent",
          message: `node ${op.id} cannot be its own parent`,
          id: op.id,
        });
      }
      if (op.parent_id !== null) {
        if (!findNode(graph, op.parent_id)) {
          throw new OperationError({
            code: "unknown_node",
            message: `parent ${op.parent_id} not found`,
            id: op.parent_id,
          });
        }
        if (descendantsOf(graph, op.id).includes(op.parent_id)) {
          throw new OperationError({
            code: "cycle",
            message: `setting ${op.parent_id} as parent of ${op.id} creates a cycle`,
            id: op.id,
          });
        }
      }
      const prev = node.parentId;
      const next = clone(graph);
      const target = next.nodes.find((n) => n.id === op.id)!;
      target.parentId = op.parent_id;
      return {
        graph: next,
        inverse: [{ kind: "set_node_parent", id: op.id, parent_id: prev }],
      };
    }

    case "delete_node": {
      const node = findNode(graph, op.id);
      if (!node) {
        throw new OperationError({
          code: "unknown_node",
          message: `node ${op.id} not found`,
          id: op.id,
        });
      }
      // Cascade: descendants are deleted unless pinned. Pinned descendants
      // become roots, keeping their pin.
      const descIds = descendantsOf(graph, op.id);
      const removeIds = new Set<string>([op.id]);
      const promoteIds: string[] = [];
      for (const id of descIds) {
        const d = findNode(graph, id)!;
        if (d.pin) promoteIds.push(id);
        else removeIds.add(id);
      }
      // But pinned descendants whose own ancestors are all being removed
      // need to become roots; if a pinned descendant has a non-removed
      // pinned ancestor, it stays under that ancestor.
      const next = clone(graph);
      // Capture data for inverse before mutating.
      const removedNodes = next.nodes.filter((n) => removeIds.has(n.id));
      const promotedSnapshots = next.nodes
        .filter((n) => promoteIds.includes(n.id))
        .map((n) => ({ id: n.id, parentId: n.parentId }));

      next.nodes = next.nodes.filter((n) => !removeIds.has(n.id));
      for (const n of next.nodes) {
        if (promoteIds.includes(n.id)) {
          // Find the closest still-present ancestor in next.
          let ancestor = n.parentId;
          while (ancestor && removeIds.has(ancestor)) {
            const a = removedNodes.find((r) => r.id === ancestor);
            ancestor = a ? a.parentId : null;
          }
          n.parentId = ancestor;
        }
      }

      const inverse: Operation[] = [];
      // Re-add removed nodes in topological order (parents before children).
      const ordered: typeof removedNodes = [];
      const queue = removedNodes.filter((n) => n.id === op.id);
      while (queue.length) {
        const cur = queue.shift()!;
        ordered.push(cur);
        for (const r of removedNodes) {
          if (r.parentId === cur.id && !ordered.includes(r)) queue.push(r);
        }
      }
      for (const r of ordered) {
        inverse.push({
          kind: "add_node",
          id: r.id,
          parent_id: r.parentId,
          text: r.text,
        });
        if (r.collapsed) inverse.push({ kind: "collapse_node", id: r.id });
      }
      // Restore promoted-descendants' parent links.
      for (const p of promotedSnapshots) {
        inverse.push({ kind: "set_node_parent", id: p.id, parent_id: p.parentId });
      }
      return { graph: next, inverse };
    }

    case "collapse_node":
    case "expand_node": {
      const node = findNode(graph, op.id);
      if (!node) {
        throw new OperationError({
          code: "unknown_node",
          message: `node ${op.id} not found`,
          id: op.id,
        });
      }
      const target = op.kind === "collapse_node";
      if (node.collapsed === target) {
        return { graph, inverse: [] };
      }
      const next = clone(graph);
      next.nodes.find((n) => n.id === op.id)!.collapsed = target;
      return {
        graph: next,
        inverse: [{ kind: target ? "expand_node" : "collapse_node", id: op.id }],
      };
    }

    case "pin_node": {
      const node = findNode(graph, op.id);
      if (!node) {
        throw new OperationError({
          code: "unknown_node",
          message: `node ${op.id} not found`,
          id: op.id,
        });
      }
      const prev = node.pin;
      const next = clone(graph);
      next.nodes.find((n) => n.id === op.id)!.pin = { x: op.x, y: op.y };
      const inverse: Operation[] = prev
        ? [{ kind: "pin_node", id: op.id, x: prev.x, y: prev.y }]
        : [{ kind: "unpin_node", id: op.id }];
      return { graph: next, inverse };
    }

    case "unpin_node": {
      const node = findNode(graph, op.id);
      if (!node) {
        throw new OperationError({
          code: "unknown_node",
          message: `node ${op.id} not found`,
          id: op.id,
        });
      }
      if (!node.pin) return { graph, inverse: [] };
      const prev = node.pin;
      const next = clone(graph);
      next.nodes.find((n) => n.id === op.id)!.pin = undefined;
      return {
        graph: next,
        inverse: [{ kind: "pin_node", id: op.id, x: prev.x, y: prev.y }],
      };
    }
  }
}

/**
 * Apply a batch of operations atomically. If any op throws, the graph is
 * unchanged. Returns the combined inverse (reversed) so a single undo
 * reverts the whole batch.
 */
export function applyBatch(
  graph: MindmapGraphV2,
  ops: Operation[],
): OpResult {
  let cur = graph;
  const allInverses: Operation[] = [];
  for (const op of ops) {
    const { graph: next, inverse } = applyOperation(cur, op);
    cur = next;
    allInverses.unshift(...inverse);
  }
  return { graph: cur, inverse: allInverses };
}
