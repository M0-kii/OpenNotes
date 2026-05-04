import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindowRef = useRef(getCurrentWindow());

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const appWindow = appWindowRef.current;

    const setupWindow = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (e) {
        console.error("Failed to check maximized state:", e);
      }

      try {
        // In Tauri v2, listen returns a function to unlisten directly
        unlisten = await appWindow.listen("tauri://resize", async () => {
          try {
            const maximized = await appWindow.isMaximized();
            setIsMaximized(maximized);
          } catch (e) {
            console.error("Failed to check maximized state on resize:", e);
          }
        });
      } catch (e) {
        console.error("Failed to listen to resize:", e);
      }
    };

    setupWindow();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleDragStart = useCallback(async () => {
    try {
      await appWindowRef.current.startDragging();
    } catch (e) {
      console.error("Failed to start dragging:", e);
    }
  }, []);

  const handleMinimize = async () => {
    try {
      await appWindowRef.current.minimize();
    } catch (e) {
      console.error("Failed to minimize:", e);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await appWindowRef.current.toggleMaximize();
    } catch (e) {
      console.error("Failed to toggle maximize:", e);
    }
  };

  const handleClose = async () => {
    try {
      await appWindowRef.current.close();
    } catch (e) {
      console.error("Failed to close:", e);
    }
  };

  return (
    <div className="h-[38px] flex items-center justify-between bg-sidebar-bg border-b border-border shrink-0 select-none cursor-default">
      {/* Drag region */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center gap-2 pl-3 flex-1 h-full"
      >
        <img
          src="/OpenNotes.png"
          alt=""
          className="w-[15px] h-[15px] rounded-[3px]"
          draggable={false}
        />
        <span className="text-[11px] font-medium text-sidebar-text/60 tracking-[-0.01em]">
          OpenNotes
        </span>
      </div>

      {/* Window controls */}
      <div className="flex h-full" onMouseDown={(e) => e.stopPropagation()}>
        <button
          onClick={handleMinimize}
          className="px-3.5 h-full flex items-center justify-center hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors duration-150"
        >
          <Minus
            className="w-3 h-3 text-sidebar-textSecondary/60"
            strokeWidth={1.5}
          />
        </button>
        <button
          onClick={handleToggleMaximize}
          className="px-3.5 h-full flex items-center justify-center hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors duration-150"
        >
          {isMaximized ? (
            <svg
              className="w-[11px] h-[11px] text-sidebar-textSecondary/60"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
            >
              <rect x="0.5" y="3" width="8" height="8" rx="1" />
              <rect x="3.5" y="0.5" width="8" height="8" rx="1" />
            </svg>
          ) : (
            <Square
              className="w-[11px] h-[11px] text-sidebar-textSecondary/60"
              strokeWidth={1.5}
            />
          )}
        </button>
        <button
          onClick={handleClose}
          className="px-3.5 h-full flex items-center justify-center hover:bg-red-500/90 transition-colors duration-150 group"
        >
          <X
            className="w-3.5 h-3.5 text-sidebar-textSecondary/60 group-hover:text-white transition-colors duration-150"
            strokeWidth={1.5}
          />
        </button>
      </div>
    </div>
  );
}
