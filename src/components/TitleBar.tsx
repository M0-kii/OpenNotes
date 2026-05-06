import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import type { TitlebarStyle } from "../types";

interface Props {
  style: TitlebarStyle;
}

export default function TitleBar({ style }: Props) {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindowRef = useRef(getCurrentWindow());
  const isMac = style === "macos";

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
    <div
      data-tauri-drag-region
      className="h-[38px] flex items-center justify-between bg-sidebar-bg border-b border-border shrink-0 select-none cursor-default"
    >
      {isMac ? (
        <>
          {/* macOS traffic lights — left */}
          <div className="flex items-center gap-2 pl-3 h-full">
            <div className="flex items-center gap-[7px]">
              <button
                onClick={handleClose}
                className="w-[12px] h-[12px] rounded-full bg-[#EC6A5F] hover:bg-[#EC6A5F] active:bg-[#D14B42]
                           flex items-center justify-center transition-colors duration-100
                           group"
                aria-label="Close"
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-[6px] h-[6px]" viewBox="0 0 6 6" fill="none">
                    <path d="M1 1l4 4M5 1L1 5" stroke="#760202" strokeWidth="0.8" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <button
                onClick={handleMinimize}
                className="w-[12px] h-[12px] rounded-full bg-[#F4BF4F] hover:bg-[#F4BF4F] active:bg-[#D6A03A]
                           flex items-center justify-center transition-colors duration-100
                           group"
                aria-label="Minimize"
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-[6px] h-[6px]" viewBox="0 0 6 6" fill="none">
                    <path d="M0.5 3H5.5" stroke="#985300" strokeWidth="0.8" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <button
                onClick={handleToggleMaximize}
                className="w-[12px] h-[12px] rounded-full bg-[#61C454] hover:bg-[#61C454] active:bg-[#4DA83D]
                           flex items-center justify-center transition-colors duration-100
                           group"
                aria-label={isMaximized ? "Restore" : "Maximize"}
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-[6px] h-[6px]" viewBox="0 0 6 6" fill="none">
                    <path
                      d={isMaximized
                        ? "M1.5 1V1.5H1V4.5H4.5V4H5V1H1.5Z M1.5 4V4.5H2H4.5V4"
                        : "M0.75 1.25V4.75H2.75M3.5 0.5V1M3.5 1V4H0.75"
                      }
                      stroke="#034D00"
                      strokeWidth="0.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill={isMaximized ? "#034D00" : "none"}
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>

          {/* Drag region */}
          <div
            onMouseDown={handleDragStart}
            className="flex-1 flex items-center justify-center h-full"
          >
            <span className="text-[11px] font-medium text-sidebar-text/45 tracking-[-0.01em]">
              OpenNotes
            </span>
          </div>

          {/* Spacer to balance traffic lights */}
          <div className="w-[76px]" />
        </>
      ) : (
        <>
          {/* Windows style — drag region left */}
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

          {/* Windows controls — right */}
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
        </>
      )}
    </div>
  );
}
