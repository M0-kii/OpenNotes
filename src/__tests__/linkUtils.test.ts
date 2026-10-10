import { describe, it, expect } from "vitest";
import { parseWikilinks, stripWikilinks } from "../lib/linkUtils";

describe("parseWikilinks", () => {
  it("extracts a simple wikilink", () => {
    const result = parseWikilinks("See [[My Note]] for details");
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe("My Note");
    expect(result[0].alias).toBeNull();
    expect(result[0].raw).toBe("[[My Note]]");
  });

  it("extracts a wikilink with alias", () => {
    const result = parseWikilinks("See [[Note Title|display text]]");
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe("Note Title");
    expect(result[0].alias).toBe("display text");
  });

  it("extracts multiple wikilinks", () => {
    const result = parseWikilinks("[[First]] and [[Second|alias]] here");
    expect(result).toHaveLength(2);
    expect(result[0].target).toBe("First");
    expect(result[1].target).toBe("Second");
  });

  it("returns empty array when no wikilinks", () => {
    const result = parseWikilinks("just plain text");
    expect(result).toEqual([]);
  });

  it("handles wikilinks with surrounding text", () => {
    const result = parseWikilinks("Refer to [[Project Notes]] for more.");
    expect(result[0].index).toBe(9);
    expect(result[0].target).toBe("Project Notes");
  });
});

describe("stripWikilinks", () => {
  it("replaces simple wikilink with target text", () => {
    expect(stripWikilinks("See [[My Note]] here")).toBe("See My Note here");
  });

  it("replaces aliased wikilink with alias", () => {
    expect(stripWikilinks("See [[Note|display text]] here")).toBe(
      "See display text here"
    );
  });

  it("strips multiple wikilinks", () => {
    expect(stripWikilinks("[[A]] and [[B|alias]]")).toBe("A and alias");
  });

  it("passes through text without wikilinks", () => {
    expect(stripWikilinks("plain text")).toBe("plain text");
  });
});
