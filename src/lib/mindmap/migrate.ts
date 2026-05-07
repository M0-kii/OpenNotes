// v1 → v2 migration.
//
// v1 nodes carry absolute x/y on every node. Migration treats every v1 node
// as pinned at its current position so the user loses zero layout work. Once
// they want auto-layout, they unpin (per node or via "Reset positions").

import type { MindmapData, MindmapNode } from "../../types";
import {
  MINDMAP_SCHEMA_VERSION,
  type MindmapGraphV2,
  type MindmapNodeV2,
} from "./types";

export function migrateV1(data: MindmapData): MindmapGraphV2 {
  const nodes: MindmapNodeV2[] = data.nodes.map((n: MindmapNode) => ({
    id: n.id,
    text: n.text,
    parentId: n.parentId,
    collapsed: false,
    pin: { x: n.x, y: n.y },
  }));
  return { schemaVersion: MINDMAP_SCHEMA_VERSION, nodes };
}

export function isV2Graph(value: unknown): value is MindmapGraphV2 {
  if (!value || typeof value !== "object") return false;
  const v = value as { schemaVersion?: unknown; nodes?: unknown };
  return v.schemaVersion === MINDMAP_SCHEMA_VERSION && Array.isArray(v.nodes);
}

export function isV1Data(value: unknown): value is MindmapData {
  if (!value || typeof value !== "object") return false;
  const v = value as { nodes?: unknown; schemaVersion?: unknown };
  return Array.isArray(v.nodes) && v.schemaVersion === undefined;
}
