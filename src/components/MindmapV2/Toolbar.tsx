import { Locate, Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { LayoutMode } from "../../lib/mindmap/types";

interface Props {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onResetPositions: () => void;
  resetPositionsDisabled: boolean;
  onCenter: () => void;
  centerDisabled: boolean;
  // Future hookup: AI generation lock. Surface ships now, behavior later.
  aiBusy?: boolean;
}

const MODES: Array<{ value: LayoutMode; label: string }> = [
  { value: "tree", label: "Tree" },
  { value: "radial", label: "Radial" },
  { value: "freeform", label: "Freeform" },
];

export default function Toolbar({
  mode,
  onModeChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onResetPositions,
  resetPositionsDisabled,
  onCenter,
  centerDisabled,
  aiBusy,
}: Props) {
  return (
    <div className="px-10 pb-2 flex items-center gap-3">
      <div
        role="tablist"
        aria-label="Layout mode"
        className="flex items-center gap-px rounded-md p-0.5
                   bg-black/[0.03] dark:bg-white/[0.04]"
      >
        {MODES.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              role="tab"
              aria-selected={active}
              onClick={() => onModeChange(m.value)}
              className={`px-2.5 py-1 rounded-[5px] text-[11px] tracking-[-0.01em] font-medium
                          transition-colors ${
                            active
                              ? "bg-editor-bg text-editor-text shadow-[0_0_0_1px_var(--border)]"
                              : "text-editor-text/55 hover:text-editor-text/80"
                          }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={onResetPositions}
        disabled={resetPositionsDisabled}
        className="text-[11px] tracking-[-0.01em] text-editor-text/45
                   hover:text-editor-text/80 transition-colors flex items-center gap-1
                   disabled:opacity-40 disabled:hover:text-editor-text/45 disabled:cursor-default"
        title="Unpin all nodes and let layout take over"
      >
        <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
        Reset positions
      </button>

      <button
        onClick={onCenter}
        disabled={centerDisabled}
        className="text-[11px] tracking-[-0.01em] text-editor-text/45
                   hover:text-editor-text/80 transition-colors flex items-center gap-1
                   disabled:opacity-40 disabled:hover:text-editor-text/45 disabled:cursor-default"
        title="Center on root"
      >
        <Locate className="w-3 h-3" strokeWidth={1.75} />
        Center
      </button>

      <div className="flex-1" />

      <span className="text-[11px] text-editor-text/35 tracking-[-0.01em] tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomOut}
        className="p-1 rounded-md text-editor-text/30 hover:text-editor-text/60
                   hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        title="Zoom out"
      >
        <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <button
        onClick={onZoomIn}
        className="p-1 rounded-md text-editor-text/30 hover:text-editor-text/60
                   hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        title="Zoom in"
      >
        <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <button
        onClick={onResetView}
        className="p-1 rounded-md text-editor-text/30 hover:text-editor-text/60
                   hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        title="Reset zoom & pan"
      >
        <Maximize className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>

      {aiBusy && (
        <span className="text-[11px] text-accent/80 tracking-[-0.01em] ml-2">
          AI is generating…
        </span>
      )}
    </div>
  );
}
