import { useCallback } from "react";

interface Props {
  // Called with a clamped ratio in [0.2, 0.8] while dragging.
  onResize: (ratio: number) => void;
  // Called once with a definitive value when the drag ends — useful
  // for persistence so we don't write localStorage on every pointer
  // move.
  onResizeEnd?: (ratio: number) => void;
  // The container whose width determines the ratio.
  containerRef: React.RefObject<HTMLElement | null>;
}

const MIN = 0.2;
const MAX = 0.8;

export default function SplitDivider({
  onResize,
  onResizeEnd,
  containerRef,
}: Props) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let lastRatio = 0.5;

      const move = (ev: PointerEvent) => {
        const ratio = (ev.clientX - rect.left) / rect.width;
        const clamped = Math.max(MIN, Math.min(MAX, ratio));
        lastRatio = clamped;
        onResize(clamped);
      };
      const up = () => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
        target.removeEventListener("pointercancel", up);
        try {
          target.releasePointerCapture(e.pointerId);
        } catch {}
        onResizeEnd?.(lastRatio);
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
      target.addEventListener("pointercancel", up);
    },
    [onResize, onResizeEnd, containerRef]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={handlePointerDown}
      className="group relative w-px shrink-0 bg-border cursor-col-resize
                 hover:bg-accent/40 transition-colors duration-150"
      title="Drag to resize"
    >
      {/* Wider invisible hit target so the divider is easy to grab. */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
