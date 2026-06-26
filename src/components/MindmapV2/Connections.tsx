import type { LayoutMode } from "../../lib/mindmap/types";
import type { MindmapNodeV2 } from "../../lib/mindmap/types";
import type { Positions } from "../../lib/mindmap/layout";
import { NODE_W, NODE_H } from "../../lib/mindmap/layout";

interface Props {
  nodes: MindmapNodeV2[];
  positions: Positions;
  hidden: Set<string>;
  collapsedParents: Set<string>;
  mode: LayoutMode;
  zoom: number;
  pan: { x: number; y: number };
  onToggleCollapse: (id: string) => void;
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

function midpoint(
  parent: { x: number; y: number },
  child: { x: number; y: number },
  mode: LayoutMode,
  zoom: number,
): { x: number; y: number } {
  const isVertical = mode === "tree";
  const zh = NODE_H * zoom;
  if (isVertical) {
    const py = parent.y + zh / 2;
    const cy = child.y - zh / 2 - 8 * zoom;
    return { x: (parent.x + child.x) / 2, y: (py + cy) / 2 };
  }
  return { x: (parent.x + child.x) / 2, y: (parent.y + child.y) / 2 };
}

export default function Connections({
  nodes,
  positions,
  hidden,
  collapsedParents,
  mode,
  zoom,
  pan,
  onToggleCollapse,
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
        const pPos = { x: parentPos.x * zoom + pan.x, y: parentPos.y * zoom + pan.y };
        const cPos = { x: childPos.x * zoom + pan.x, y: childPos.y * zoom + pan.y };
        const d = path(pPos, cPos, mode, zoom);
        const isCollapsedParent = collapsedParents.has(node.parentId);
        const mid = isCollapsedParent ? midpoint(pPos, cPos, mode, zoom) : null;
        return (
          <g key={`${node.parentId}-${node.id}`}>
            <path
              d={d}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth={1.5}
            />
            {isCollapsedParent && mid && (
              <g
                className="pointer-events-auto cursor-pointer"
                onClick={() => onToggleCollapse(node.parentId!)}
              >
                <circle cx={mid.x} cy={mid.y} r={7} className="fill-accent" />
                <text
                  x={mid.x}
                  y={mid.y + 3.5}
                  textAnchor="middle"
                  className="fill-white text-[10px] font-bold leading-none"
                >
                  +
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
