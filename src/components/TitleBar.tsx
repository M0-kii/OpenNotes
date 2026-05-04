import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    try {
      const appWindow = getCurrentWindow();

      appWindow
        .isMaximized()
        .then(setIsMaximized)
        .catch(() => {});

      appWindow
        .listen("tauri://resize", () => {
          appWindow
            .isMaximized()
            .then(setIsMaximized)
            .catch(() => {});
        })
        .then((fn) => {
          unlisten = fn;
        })
        .catch(() => {});
    } catch {
      // not running inside Tauri
    }

    return () => {
      unlisten?.();
    };
  }, []);

  const handleDragStart = useCallback(() => {
    try {
      getCurrentWindow().startDragging();
    } catch {}
  }, []);

  const handleMinimize = () => {
    try {
      getCurrentWindow().minimize();
    } catch {}
  };

  const handleToggleMaximize = () => {
    try {
      getCurrentWindow().toggleMaximize();
    } catch {}
  };

  const handleClose = () => {
    try {
      getCurrentWindow().close();
    } catch {}
  };

  return (
    <div
      onMouseDown={handleDragStart}
      className="h-[38px] flex items-center justify-between bg-sidebar-bg border-b border-border shrink-0 select-none cursor-default"
    >
      <div className="flex items-center gap-2 pl-3">
        <img
          src="/OpenNotes.png"
          alt=""
          className="w-[15px] h-[15px] rounded-[3px]"
        />
        <span className="text-[11px] font-medium text-sidebar-text/60 tracking-[-0.01em]">
          OpenNotes
        </span>
      </div>
      <div className="flex h-full">
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
