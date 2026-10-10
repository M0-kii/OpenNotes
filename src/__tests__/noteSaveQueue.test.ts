import { describe, it, expect, vi } from "vitest";
import { NoteSaveQueue } from "../lib/noteSaveQueue";
import { readDrafts, writeDrafts } from "../lib/draftRecovery";

describe("durable note saves", () => {
  it("retains failed edits and retries them, including titles", async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(undefined);
    const queue = new NoteSaveQueue(write);
    queue.enqueue("a", { content: "body" });
    queue.enqueue("a", { title: "title" });
    await expect(queue.flush()).rejects.toThrow();
    expect(queue.size).toBe(1);
    expect(queue.overlay([{ id: "a", title: "old" }])[0].title).toBe("title");
    await queue.flush();
    expect(write).toHaveBeenLastCalledWith("a", { content: "body", title: "title" });
    expect(queue.size).toBe(0);
  });

  it("serializes concurrent flushes and drains edits made during a write", async () => {
    let release!: () => void;
    const first = new Promise<void>((resolve) => { release = resolve; });
    const write = vi.fn().mockReturnValueOnce(first).mockResolvedValue(undefined);
    const changed = vi.fn();
    const queue = new NoteSaveQueue(write, changed);
    queue.enqueue("a", { content: "old" });
    const flush = queue.flush();
    queue.enqueue("a", { content: "new" });
    expect(queue.flush()).toBe(flush);
    expect(write).toHaveBeenCalledTimes(1);
    release();
    await flush;
    expect(write.mock.calls.map((call) => call[1].content)).toEqual(["old", "new"]);
    expect(changed).toHaveBeenLastCalledWith([]);
  });

  it("does not let a failed note prevent other panes from saving", async () => {
    const write = vi.fn(async (id) => { if (id === "a") throw new Error("busy"); });
    const queue = new NoteSaveQueue(write);
    queue.enqueue("a", { content: "left" });
    queue.enqueue("b", { content: "right" });
    await expect(queue.flush()).rejects.toThrow();
    expect(queue.entries()).toEqual([["a", { content: "left" }]]);
    queue.enqueue("a", { content: "latest" });
    expect(queue.entries()[0][1].content).toBe("latest");
  });

  it("does not lose edits queued immediately after an empty flush", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const queue = new NoteSaveQueue(write);
    void queue.flush();
    queue.enqueue("a", { content: "new" });
    await queue.flush();
    expect(write).toHaveBeenCalledOnce();
  });

  it("journals drafts before saving and removes them only after success", async () => {
    localStorage.clear();
    const write = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const queue = new NoteSaveQueue(write, (entries) => writeDrafts(localStorage, entries));
    queue.enqueue("a", { content: "Persian: سلام", title: "Recovered" });
    await expect(queue.flush()).rejects.toThrow();
    expect(readDrafts(localStorage)).toEqual(queue.entries());
    await queue.flush();
    expect(readDrafts(localStorage)).toEqual([]);
  });
});
