import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bell, BellOff, CalendarClock } from "lucide-react";
import type { Note } from "../types";

interface ReminderPickerProps {
  note: Note;
  onSetReminder: (id: string, reminderAt: string | null) => void;
}

function formatReminderDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const isOverdue = diffMs < 0;

  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isOverdue) return `Overdue — ${formatted}`;
  if (diffMs < 3600000) return `In ${Math.ceil(diffMs / 60000)}m — ${formatted}`;
  if (diffMs < 86400000) return `In ${Math.ceil(diffMs / 3600000)}h — ${formatted}`;
  return formatted;
}

function getDefaultDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 60 - (d.getMinutes() % 60), 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function ReminderPicker({ note, onSetReminder }: ReminderPickerProps) {
  const [open, setOpen] = useState(false);
  const [datetimeValue, setDatetimeValue] = useState(getDefaultDatetimeValue);

  const hasReminder = note.reminder_at !== null;
  const handleSet = () => {
    const iso = new Date(datetimeValue).toISOString();
    onSetReminder(note.id, iso);
    setOpen(false);
  };

  const handleRemove = () => {
    onSetReminder(note.id, null);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`inline-flex items-center gap-1 text-[11px] tracking-[-0.01em] transition-colors
            ${hasReminder
              ? "text-accent hover:text-accent/80"
              : "text-editor-text/20 hover:text-editor-text/40"
            }`}
          title={hasReminder ? `Reminder: ${formatReminderDate(note.reminder_at!)}` : "Add reminder"}
        >
          {hasReminder ? <Bell className="w-3 h-3" strokeWidth={1.5} /> : <BellOff className="w-3 h-3" strokeWidth={1.5} />}
          {hasReminder && <span>{formatReminderDate(note.reminder_at!)}</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[9999] rounded-xl border border-border bg-surface-elevated p-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl w-[260px]"
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[12px] text-editor-text/60 font-medium">
              <CalendarClock className="w-3.5 h-3.5" strokeWidth={1.5} />
              Reminder
            </div>
            <input
              type="datetime-local"
              value={datetimeValue}
              onChange={(e) => setDatetimeValue(e.target.value)}
              className="w-full text-[13px] bg-black/[0.04] dark:bg-white/[0.04] text-editor-text
                         rounded-lg px-2.5 py-1.5 border border-border
                         outline-none focus:border-accent/40 transition-colors
                         [color-scheme:light] dark:[color-scheme:dark]"
            />
            <div className="flex items-center gap-2 justify-end">
              {hasReminder && (
                <button
                  onClick={handleRemove}
                  className="text-[11px] text-editor-text/40 hover:text-red-500 transition-colors px-2 py-1 rounded-md"
                >
                  Remove
                </button>
              )}
              <button
                onClick={handleSet}
                className="text-[11px] bg-accent text-white px-3 py-1 rounded-md
                           hover:bg-accent/90 transition-colors font-medium"
              >
                Set
              </button>
            </div>
          </div>
          <Popover.Arrow className="fill-surface-elevated" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
