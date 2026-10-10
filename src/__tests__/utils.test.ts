import { describe, it, expect } from "vitest";
import { generateId, formatDate, getNotePreview, cn } from "../lib/utils";

describe("generateId", () => {
  it("produces a string with timestamp-random format", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(10);
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("formatDate", () => {
  it('returns "Just now" for recent dates', () => {
    expect(formatDate(new Date().toISOString())).toBe("Just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatDate(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(
      Date.now() - 3 * 3600 * 1000
    ).toISOString();
    expect(formatDate(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 86400 * 1000
    ).toISOString();
    expect(formatDate(twoDaysAgo)).toBe("2d ago");
  });

  it("returns formatted date for older items", () => {
    const oldDate = new Date("2026-01-15").toISOString();
    const result = formatDate(oldDate);
    expect(result).toMatch(/Jan 15/);
  });
});

describe("getNotePreview", () => {
  it("strips markdown from note content", () => {
    const preview = getNotePreview("**bold** and *italic*", "note");
    expect(preview).toBe("bold and italic");
  });

  it("returns 'No content' for empty text", () => {
    expect(getNotePreview("", "note")).toBe("No content");
  });

  it("truncates long content with ellipsis", () => {
    const long = "a".repeat(200);
    const preview = getNotePreview(long, "note", 50);
    expect(preview).toHaveLength(51);
    expect(preview).toMatch(/…$/);
  });

  it("extracts text from mind map JSON", () => {
    const mindmapContent = JSON.stringify({
      nodes: [{ text: "root" }, { text: "child" }],
    });
    const preview = getNotePreview(mindmapContent, "mindmap");
    expect(preview).toBe("root · child");
  });

  it("handles empty mind map", () => {
    const mindmapContent = JSON.stringify({ nodes: [] });
    const preview = getNotePreview(mindmapContent, "mindmap");
    expect(preview).toBe("Empty mind map");
  });

  it("handles invalid mind map JSON gracefully", () => {
    const preview = getNotePreview("not json", "mindmap");
    expect(typeof preview).toBe("string");
  });

  it("shows todo list progress", () => {
    const todoContent = JSON.stringify({
      items: [
        { text: "done task", completed: true },
        { text: "pending task", completed: false },
      ],
    });
    const preview = getNotePreview(todoContent, "todolist");
    expect(preview).toContain("1/2");
  });

  it("strips wikilinks in note preview", () => {
    const preview = getNotePreview("See [[My Note]] for details", "note");
    expect(preview).toBe("See My Note for details");
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
