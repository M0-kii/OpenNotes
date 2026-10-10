import type { NoteDraft } from "./noteSaveQueue";

const KEY = "opennotes-pending-drafts-v1";

export function readDrafts(storage: Storage): Array<[string, NoteDraft]> {
  const raw: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
  if (!Array.isArray(raw)) throw new Error("Invalid draft recovery journal");
  return raw.map((entry) => {
    if (!Array.isArray(entry) || typeof entry[0] !== "string" || !entry[1] ||
        typeof entry[1] !== "object") throw new Error("Invalid recovery entry");
    const draft: NoteDraft = {};
    for (const key of ["title", "content"] as const) {
      if (entry[1][key] !== undefined) {
        if (typeof entry[1][key] !== "string") throw new Error("Invalid recovery content");
        draft[key] = entry[1][key];
      }
    }
    return [entry[0], draft];
  });
}

export function writeDrafts(storage: Storage, entries: Array<[string, NoteDraft]>) {
  if (entries.length) storage.setItem(KEY, JSON.stringify(entries));
  else storage.removeItem(KEY);
}
