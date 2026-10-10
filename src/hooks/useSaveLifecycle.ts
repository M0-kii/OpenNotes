import { useCallback, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const FLUSH_EDITORS_EVENT = "opennotes:flush-editors";

export function useSaveLifecycle(flushSave: () => Promise<boolean>) {
  const closing = useRef(false);
  const collectAndSave = useCallback(() => {
    // Flush DOM edits (including context-menu edits) before draining the DB queue.
    window.dispatchEvent(new Event(FLUSH_EDITORS_EVENT));
    return flushSave();
  }, [flushSave]);

  const requestClose = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    try {
      if (!await collectAndSave()) return;
      await getCurrentWindow().destroy();
    } catch (error) {
      console.error("Failed to close window:", error);
    } finally {
      closing.current = false;
    }
  }, [collectAndSave]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      await requestClose();
    }).then((dispose) => {
      if (disposed) dispose();
      else unlisten = dispose;
    }).catch((error) => console.error("Failed to register close handler:", error));

    const blur = () => { void collectAndSave(); };
    const hidden = () => { if (document.hidden) void collectAndSave(); };
    const unloading = () => {
      // Browser reload cannot await SQLite. The journal preserves pending edits.
      void collectAndSave();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("beforeunload", unloading);
    return () => {
      disposed = true;
      unlisten?.();
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("beforeunload", unloading);
    };
  }, [collectAndSave, requestClose]);

  return requestClose;
}
