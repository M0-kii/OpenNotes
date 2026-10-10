import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ execute: vi.fn(), select: vi.fn() }));
const load = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/plugin-sql", () => ({ default: { load } }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  load.mockResolvedValue(database);
  database.execute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
  database.select.mockImplementation(async (query: string) => query.includes("COUNT(*) as c") ? [{ c: 1 }] : []);
});

describe("database startup", () => {
  it("initializes once when notes, folders and startup queries load together", async () => {
    const db = await import("../lib/db");
    await Promise.all([db.initDb(), db.initDb(), db.getNoteCountsByFolder(), db.getAllSettings(), db.getTrashedNotes()]);
    expect(load).toHaveBeenCalledOnce();
    expect(database.execute.mock.calls.filter(([query]) => query.includes("CREATE TABLE IF NOT EXISTS notes"))).toHaveLength(1);
    const notesTableCall = database.execute.mock.invocationCallOrder[
      database.execute.mock.calls.findIndex(([query]) => query.includes("CREATE TABLE IF NOT EXISTS notes"))];
    const countsCall = database.select.mock.invocationCallOrder[
      database.select.mock.calls.findIndex(([query]) => query.includes("GROUP BY folder_id"))];
    expect(countsCall).toBeGreaterThan(notesTableCall);
  });

  it("can retry initialization after an actual migration failure", async () => {
    const db = await import("../lib/db");
    database.execute.mockRejectedValueOnce(new Error("disk busy"));
    await expect(db.initDb()).rejects.toThrow("disk busy");
    await expect(db.initDb()).resolves.toBeUndefined();
  });
});
