import { useEffect, useRef } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { markReminderNotified } from "../lib/db";
import type { Note } from "../types";

interface UseRemindersOptions {
  notes: Note[];
}

export function useReminders({ notes }: UseRemindersOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check permission on mount
    const init = async () => {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      if (!granted) {
        console.warn("Notification permission denied");
      }
    };
    init();
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      // Only check when app is visible
      if (document.visibilityState !== "visible") return;

      const { getDueReminders } = await import("../lib/db");
      try {
        const due = await getDueReminders();
        for (const note of due) {
          // Avoid duplicate notifications within the same session
          if (notifiedRef.current.has(note.id)) continue;
          notifiedRef.current.add(note.id);

          const title = note.title || "Untitled";
          const body =
            note.note_type === "mindmap"
              ? "Mind map reminder"
              : note.note_type === "todolist"
                ? "Todo list reminder"
                : "Note reminder";

          sendNotification({ title, body });
          markReminderNotified(note.id).catch(console.error);
        }
      } catch (e) {
        // Silently ignore — expected when reminder_at column doesn't exist yet
      }
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [notes]);
}
