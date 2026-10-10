export interface NoteDraft {
  content?: string;
  title?: string;
}

// Entries remain dirty until the entire write succeeds. A single drain serializes
// writers, including edits made while a previous version is being persisted.
export class NoteSaveQueue {
  private pending = new Map<string, NoteDraft>();
  private inFlight: Promise<void> | null = null;

  constructor(
    private write: (id: string, draft: NoteDraft) => Promise<void>,
    private changed: (entries: Array<[string, NoteDraft]>) => void = () => {},
  ) {}

  get size() { return this.pending.size; }

  enqueue(id: string, draft: NoteDraft) {
    this.pending.set(id, { ...this.pending.get(id), ...draft });
    this.changed(this.entries());
  }

  entries(): Array<[string, NoteDraft]> { return [...this.pending.entries()]; }

  overlay<T extends { id: string }>(notes: T[]): T[] {
    return notes.map((note) => ({ ...note, ...this.pending.get(note.id) }));
  }

  flush(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (!this.pending.size) return Promise.resolve();
    this.inFlight = this.drain().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async drain() {
    while (this.pending.size) {
      const failures: unknown[] = [];
      for (const [id, draft] of this.entries()) {
        try {
          await this.write(id, draft);
          // A newer edit replaces the object; never acknowledge that edit early.
          if (this.pending.get(id) === draft) {
            this.pending.delete(id);
            this.changed(this.entries());
          }
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length) throw new AggregateError(failures, "Some notes could not be saved");
    }
  }
}
