import type { LayoutMode } from "../../lib/mindmap/types";
import type { MindmapNodeV2 } from "../../lib/mindmap/types";
import type { Positions } from "../../lib/mindmap/layout";
import { NODE_W, NODE_H } from "../../lib/mindmap/layout";

interface Props {
  nodes: MindmapNodeV2[];
  positions: Positions;
  hidden: Set<string>;
  mode: LayoutMode;
  zoom: number;
  pan: { x: number; y: number };
}

function path(
  parent: { x: number; y: number },
  child: { x: number; y: number },
  mode: LayoutMode,
  zoom: number,
): string {
  const isVertical = mode === "tree";
  const zw = NODE_W * zoom;
  const zh = NODE_H * zoom;

  if (isVertical) {
    const px = parent.x;
    const py = parent.y + zh / 2;
    const cx = child.x;
    const cy = child.y - zh / 2 - 8 * zoom;
    const midY = (py + cy) / 2;
    return `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
  }
  // Radial / freeform → straight line from edge of parent to edge of child.
  const dx = child.x - parent.x;
  const dy = child.y - parent.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Clip to roughly the half-width of each node along the line.
  const r = (zw / 2 + 8 * zoom);
  const px = parent.x + ux * r;
  const py = parent.y + uy * r;
  const cx = child.x - ux * r;
  const cy = child.y - uy * r;
  const mx = (px + cx) / 2;
  const my = (py + cy) / 2;
  return `M ${px} ${py} Q ${mx} ${my}, ${cx} ${cy}`;
}

export default function Connections({
  nodes,
  positions,
  hidden,
  mode,
  zoom,
  pan,
}: Props) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    >
      {nodes.map((node) => {
        if (!node.parentId) return null;
        if (hidden.has(node.id) || hidden.has(node.parentId)) return null;
        const parentPos = positions.get(node.parentId);
        const childPos = positions.get(node.id);
        if (!parentPos || !childPos) return null;
        const d = path(
          { x: parentPos.x * zoom + pan.x, y: parentPos.y * zoom + pan.y },
          { x: childPos.x * zoom + pan.x, y: childPos.y * zoom + pan.y },
          mode,
          zoom,
        );
        return (
          <path
            key={`${node.parentId}-${node.id}`}
            d={d}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}
