import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useNotes } from "../hooks/useNotes";
import * as db from "../lib/db";
import { readDrafts, writeDrafts } from "../lib/draftRecovery";

vi.mock("../lib/db", () => ({
  initDb: vi.fn(), getAllNotes: vi.fn(), getNoteById: vi.fn(),
  updateNoteContent: vi.fn(), updateNoteTitle: vi.fn(), setNoteLinks: vi.fn(),
  getTrashedNotes: vi.fn(), searchNotes: vi.fn(),
}));
const note = { id: "a", title: "title", content: "old", folder_id: null, position: 0,
  note_type: "note" as const, is_favorite: 0, deleted_at: null, reminder_at: null,
  reminder_notified: 0, created_at: "2026-01-01", updated_at: "2026-01-01" };

beforeEach(() => {
  localStorage.clear();
  vi.mocked(db.initDb).mockResolvedValue();
  vi.mocked(db.getAllNotes).mockResolvedValue([{ ...note }]);
  vi.mocked(db.getNoteById).mockResolvedValue({ ...note });
  vi.mocked(db.getTrashedNotes).mockResolvedValue([]);
  vi.mocked(db.updateNoteContent).mockResolvedValue();
  vi.mocked(db.updateNoteTitle).mockResolvedValue();
  vi.mocked(db.setNoteLinks).mockResolvedValue();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

async function ready() {
  const hook = renderHook(() => useNotes({ folderId: null }));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe("note persistence integration", () => {
  it("keeps failed edits visible through refresh and retries automatically", async () => {
    const { result } = await ready();
    vi.useFakeTimers();
    vi.mocked(db.updateNoteContent).mockRejectedValueOnce(new Error("disk full"));
    await act(async () => { result.current.saveNoteContent("a", "new"); });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(result.current.saveError).not.toBeNull();
    expect(result.current.hasPendingSaves).toBe(true);
    await act(async () => { await result.current.refreshNotes(); });
    expect(result.current.notes[0].content).toBe("new");
    expect(readDrafts(localStorage)[0][1].content).toBe("new");
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(result.current.saveError).toBeNull();
    expect(result.current.hasPendingSaves).toBe(false);
    expect(db.updateNoteContent).toHaveBeenLastCalledWith("a", "new");
  });

  it("flushes the latest title and body together before debounce expires", async () => {
    const { result } = await ready();
    await act(async () => {
      result.current.saveNoteContent("a", "body");
      await result.current.renameNote("a", "first");
      await result.current.renameNote("a", "last");
      expect(await result.current.flushSave()).toBe(true);
    });
    expect(db.updateNoteTitle).toHaveBeenCalledWith("a", "last");
    expect(db.updateNoteTitle).not.toHaveBeenCalledWith("a", "first");
    expect(db.updateNoteContent).toHaveBeenCalledWith("a", "body");
    expect(readDrafts(localStorage)).toEqual([]);
  });

  it("recovers drafts from a previous session", async () => {
    writeDrafts(localStorage, [["a", { content: "recovered", title: "recovered title" }]]);
    const { result } = await ready();
    expect(result.current.notes[0].content).toBe("recovered");
    await waitFor(() => expect(db.updateNoteContent).toHaveBeenCalledWith("a", "recovered"));
    expect(db.updateNoteTitle).toHaveBeenCalledWith("a", "recovered title");
  });

  it("does not resurrect a permanently deleted note", async () => {
    vi.mocked(db.getNoteById).mockResolvedValue(null);
    writeDrafts(localStorage, [["deleted", { content: "stale" }]]);
    await ready();
    expect(db.updateNoteContent).not.toHaveBeenCalled();
    expect(readDrafts(localStorage)).toEqual([]);
  });

  it("does not overwrite a newer edit with an older asynchronous refresh", async () => {
    const { result } = await ready();
    let resolve!: (notes: typeof note[]) => void;
    vi.mocked(db.getAllNotes).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const refresh = result.current.refreshNotes();
    await act(async () => {
      result.current.saveNoteContent("a", "latest");
      await result.current.flushSave();
      resolve([{ ...note }]);
      await refresh;
    });
    expect(result.current.notes[0].content).toBe("latest");
  });
});
