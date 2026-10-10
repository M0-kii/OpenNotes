import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useEditorWorkspace } from "../hooks/useEditorWorkspace";
import { getNoteById } from "../lib/db";
import type { Note } from "../types";

vi.mock("../lib/db", () => ({ getNoteById: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const note: Note = { id: "a", title: "title", content: "old", folder_id: null,
  position: 0, note_type: "note", is_favorite: 0, deleted_at: null,
  reminder_at: null, reminder_notified: 0, created_at: "2026-01-01", updated_at: "2026-01-01" };
const callbacks = () => ({ selectNote: vi.fn().mockResolvedValue(undefined),
  saveNoteContent: vi.fn(), renameNote: vi.fn().mockResolvedValue(undefined),
  setNoteReminder: vi.fn().mockResolvedValue(undefined) });

describe("editor workspace", () => {
  it("does not duplicate tabs and closes the split when its final tab closes", () => {
    const { result } = renderHook(() => useEditorWorkspace({ notes: [note], selectedId: "a", ...callbacks() }));
    act(() => { result.current.openInRight("a"); result.current.openInRight("a"); });
    expect(result.current.rightPaneTabs).toEqual(["a"]);
    act(() => { result.current.closeRightTab(0); });
    expect(result.current.splitNoteId).toBeNull();
    expect(result.current.activePane).toBe("left");
  });

  it("keeps newer right-pane edits when its note is outside the folder filter", async () => {
    vi.mocked(getNoteById).mockResolvedValue(note);
    const actions = callbacks();
    const hook = renderHook(({ notes }: { notes: Note[] }) => useEditorWorkspace({ notes, selectedId: null, ...actions }),
      { initialProps: { notes: [] as Note[] } });
    act(() => { hook.result.current.openInRight("a"); });
    await waitFor(() => expect(hook.result.current.rightNote?.content).toBe("old"));
    act(() => { hook.result.current.handleRightContentChange("a", "new"); });
    hook.rerender({ notes: [] });
    await act(async () => {});
    expect(hook.result.current.rightNote?.content).toBe("new");
    expect(actions.saveNoteContent).toHaveBeenCalledWith("a", "new");
  });
});
