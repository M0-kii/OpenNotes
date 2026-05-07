// Read/write the persisted JSON blob with schema-version dispatch.
//
// parse(content) accepts either a v1 blob (legacy {nodes:[{x,y,...}]}) or a
// v2 blob ({schemaVersion:2, nodes:[...]}). Always returns a v2 graph. v1
// blobs are migrated via `migrateV1` (every node becomes pinned).
//
// serialize(graph) always emits v2.

import {
  MINDMAP_SCHEMA_VERSION,
  type MindmapGraphV2,
  type MindmapNodeV2,
} from "./types";
import { isV1Data, isV2Graph, migrateV1 } from "./migrate";

export function emptyGraph(): MindmapGraphV2 {
  return { schemaVersion: MINDMAP_SCHEMA_VERSION, nodes: [] };
}

export function parse(content: string): MindmapGraphV2 {
  if (!content) return emptyGraph();
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return emptyGraph();
  }

  if (isV2Graph(raw)) {
    // Coerce node fields defensively in case an older v2 blob is missing
    // `collapsed` (added in this commit's wave).
    const nodes: MindmapNodeV2[] = raw.nodes.map((n) => ({
      id: String(n.id),
      text: typeof n.text === "string" ? n.text : "",
      parentId: n.parentId == null ? null : String(n.parentId),
      collapsed: Boolean(n.collapsed),
      pin:
        n.pin && typeof n.pin.x === "number" && typeof n.pin.y === "number"
          ? { x: n.pin.x, y: n.pin.y }
          : undefined,
    }));
    return { schemaVersion: MINDMAP_SCHEMA_VERSION, nodes };
  }

  if (isV1Data(raw)) return migrateV1(raw);

  return emptyGraph();
}

export function serialize(graph: MindmapGraphV2): string {
  return JSON.stringify(graph);
}
