import { Locate, Maximize, RotateCcw, ZoomIn, ZoomOut, Search, CircleHelp } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
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
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
  searchQuery,
  onSearchChange,
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-editor-text/30" strokeWidth={1.5} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search nodes…"
          className="w-36 text-[11px] bg-black/[0.03] dark:bg-white/[0.04] text-editor-text
                     rounded-md py-1 pl-6 pr-2
                     placeholder:text-editor-text/25
                     outline-none
                     focus:bg-black/[0.06] dark:focus:bg-white/[0.06]
                     transition-colors tracking-[-0.01em]"
          spellCheck={false}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-sm
                       text-editor-text/25 hover:text-editor-text/60 transition-colors"
          >
            <span className="text-[10px] leading-none">&times;</span>
          </button>
        )}
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

      {/* Shortcut hints */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className="p-1 rounded-md text-editor-text/25 hover:text-editor-text/50
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            title="Keyboard shortcuts"
          >
            <CircleHelp className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="end"
            sideOffset={6}
            className="z-[9999] rounded-xl border border-border bg-surface-elevated p-3
                       shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]
                       backdrop-blur-xl min-w-[180px]"
          >
            <div className="space-y-1.5">
              <p className="text-[11px] text-editor-text/40 font-medium tracking-[-0.01em] mb-2">
                Shortcuts
              </p>
              {[
                ["Tab", "Add child node"],
                ["Delete", "Delete selected node"],
                ["Enter", "Edit selected node"],
                ["/", "Search nodes"],
                ["Ctrl+Z", "Undo"],
                ["Ctrl+Shift+Z", "Redo"],
                ["Escape", "Deselect / cancel"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <kbd className="text-[10px] text-editor-text/70 bg-black/[0.06] dark:bg-white/[0.06]
                                  rounded px-1.5 py-0.5 font-mono leading-none">
                    {key}
                  </kbd>
                  <span className="text-[10px] text-editor-text/40 tracking-[-0.01em]">{desc}</span>
                </div>
              ))}
            </div>
            <Popover.Arrow className="fill-surface-elevated" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

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
