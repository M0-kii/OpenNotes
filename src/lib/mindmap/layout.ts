// Layout engine: pure (graph, mode) → positions.
//
// The graph never carries positions for unpinned nodes. This function
// computes them at render time. Pinned nodes always win — their pin
// coordinates are returned verbatim regardless of mode.

import type { LayoutMode, MindmapGraphV2, MindmapNodeV2 } from "./types";

export const NODE_W = 150;
export const NODE_H = 50;
const H_GAP = 80;
const V_GAP = 100;
const RADIAL_RING = 220;

export interface Position {
  x: number;
  y: number;
}

export type Positions = Map<string, Position>;

// Children-by-parent index, excluding nodes hidden under a collapsed ancestor.
function indexChildren(graph: MindmapGraphV2): Map<string | null, MindmapNodeV2[]> {
  const byParent = new Map<string | null, MindmapNodeV2[]>();
  for (const node of graph.nodes) {
    const arr = byParent.get(node.parentId) ?? [];
    arr.push(node);
    byParent.set(node.parentId, arr);
  }
  return byParent;
}

// Returns the set of node ids that should be hidden because some ancestor
// is collapsed.
export function hiddenNodes(graph: MindmapGraphV2): Set<string> {
  const byParent = indexChildren(graph);
  const hidden = new Set<string>();
  const hideDescendants = (id: string) => {
    const kids = byParent.get(id) ?? [];
    for (const k of kids) {
      hidden.add(k.id);
      hideDescendants(k.id);
    }
  };
  for (const node of graph.nodes) {
    if (node.collapsed) hideDescendants(node.id);
  }
  return hidden;
}

function layoutTree(graph: MindmapGraphV2, positions: Positions): void {
  const byParent = indexChildren(graph);
  const roots = byParent.get(null) ?? [];
  if (roots.length === 0) return;

  // Place unpinned roots in a single horizontal row centered at origin.
  const unpinnedRoots = roots.filter((r) => !r.pin);
  const totalRootW =
    unpinnedRoots.length * NODE_W + Math.max(0, unpinnedRoots.length - 1) * H_GAP;
  let rootX = -totalRootW / 2 + NODE_W / 2;
  for (const r of unpinnedRoots) {
    if (!positions.has(r.id)) positions.set(r.id, { x: rootX, y: 0 });
    rootX += NODE_W + H_GAP;
  }

  const placeChildren = (parent: MindmapNodeV2): void => {
    const kids = (byParent.get(parent.id) ?? []).filter((c) => !c.pin);
    if (parent.collapsed || kids.length === 0) {
      // Recurse only for non-collapsed branches.
      if (!parent.collapsed) {
        const allKids = byParent.get(parent.id) ?? [];
        for (const k of allKids) placeChildren(k);
      }
      return;
    }
    const parentPos = positions.get(parent.id);
    if (!parentPos) return;
    const totalW = kids.length * NODE_W + (kids.length - 1) * H_GAP;
    const startX = parentPos.x - totalW / 2 + NODE_W / 2;
    const y = parentPos.y + V_GAP;
    kids.forEach((k, i) => {
      if (!positions.has(k.id)) {
        positions.set(k.id, { x: startX + i * (NODE_W + H_GAP), y });
      }
    });
    const allKids = byParent.get(parent.id) ?? [];
    for (const k of allKids) placeChildren(k);
  };

  for (const r of roots) placeChildren(r);
}

function layoutRadial(graph: MindmapGraphV2, positions: Positions): void {
  const byParent = indexChildren(graph);
  const roots = byParent.get(null) ?? [];
  if (roots.length === 0) return;

  // Single root → centered. Multiple roots → distributed on outer ring.
  const unpinnedRoots = roots.filter((r) => !r.pin);
  if (unpinnedRoots.length === 1 && !positions.has(unpinnedRoots[0].id)) {
    positions.set(unpinnedRoots[0].id, { x: 0, y: 0 });
  } else {
    unpinnedRoots.forEach((r, i) => {
      if (positions.has(r.id)) return;
      const angle = (i / unpinnedRoots.length) * Math.PI * 2 - Math.PI / 2;
      positions.set(r.id, {
        x: Math.cos(angle) * RADIAL_RING * 0.5,
        y: Math.sin(angle) * RADIAL_RING * 0.5,
      });
    });
  }

  // Place children on a ring around their parent. Spread across an arc
  // pointing away from the grandparent so the subtree doesn't overlap it.
  const placeChildren = (parent: MindmapNodeV2, parentAngle: number, depth: number): void => {
    if (parent.collapsed) return;
    const kids = byParent.get(parent.id) ?? [];
    if (kids.length === 0) return;
    const parentPos = positions.get(parent.id);
    if (!parentPos) return;

    const radius = RADIAL_RING - Math.min(depth * 30, 80);
    const unpinnedKids = kids.filter((c) => !c.pin);
    const arc = unpinnedKids.length === 1 ? 0 : Math.PI * 0.9;
    const start = parentAngle - arc / 2;
    const step = unpinnedKids.length > 1 ? arc / (unpinnedKids.length - 1) : 0;

    unpinnedKids.forEach((k, i) => {
      const angle = unpinnedKids.length === 1 ? parentAngle : start + i * step;
      if (!positions.has(k.id)) {
        positions.set(k.id, {
          x: parentPos.x + Math.cos(angle) * radius,
          y: parentPos.y + Math.sin(angle) * radius,
        });
      }
      placeChildren(k, angle, depth + 1);
    });
    // Pinned kids: still recurse so their subtrees lay out around them.
    for (const k of kids) {
      if (k.pin) {
        const pinPos = positions.get(k.id)!;
        const angle = Math.atan2(pinPos.y - parentPos.y, pinPos.x - parentPos.x);
        placeChildren(k, angle, depth + 1);
      }
    }
  };

  for (const r of roots) {
    const pos = positions.get(r.id);
    if (!pos) continue;
    const angle = pos.x === 0 && pos.y === 0 ? -Math.PI / 2 : Math.atan2(pos.y, pos.x);
    placeChildren(r, angle, 1);
  }
}

function layoutFreeform(graph: MindmapGraphV2, positions: Positions): void {
  // Freeform: pinned nodes hold their position; unpinned nodes drift just
  // below their parent (or near origin if root) so they're visible and the
  // user can grab and pin them.
  const byParent = indexChildren(graph);

  const placeChildren = (parent: MindmapNodeV2 | null, depth: number, indexAtDepth: { i: number }): void => {
    const parentId = parent?.id ?? null;
    const kids = byParent.get(parentId) ?? [];
    const parentPos = parent ? positions.get(parent.id) : { x: 0, y: 0 };
    if (!parentPos) return;

    const unpinned = kids.filter((c) => !c.pin);
    unpinned.forEach((k, i) => {
      if (!positions.has(k.id)) {
        positions.set(k.id, {
          x: parentPos.x + (i - (unpinned.length - 1) / 2) * (NODE_W + 24),
          y: parentPos.y + (depth === 0 ? 0 : V_GAP),
        });
      }
      indexAtDepth.i++;
    });
    for (const k of kids) {
      if (!(parent === null && k.pin)) placeChildren(k, depth + 1, indexAtDepth);
    }
  };

  placeChildren(null, 0, { i: 0 });
}

/**
 * Compute screen-space positions for every node in `graph`. Pinned nodes
 * use their pin coordinates; unpinned nodes are positioned by `mode`.
 *
 * Pure: never mutates graph.
 */
export function layout(graph: MindmapGraphV2, mode: LayoutMode): Positions {
  const positions: Positions = new Map();

  // Seed with all pinned nodes — these always win.
  for (const node of graph.nodes) {
    if (node.pin) positions.set(node.id, { x: node.pin.x, y: node.pin.y });
  }

  switch (mode) {
    case "tree":
      layoutTree(graph, positions);
      break;
    case "radial":
      layoutRadial(graph, positions);
      break;
    case "freeform":
      layoutFreeform(graph, positions);
      break;
  }

  // Fallback for any node that didn't get placed (defensive — shouldn't happen).
  for (const node of graph.nodes) {
    if (!positions.has(node.id)) positions.set(node.id, { x: 0, y: 0 });
  }
  return positions;
}
