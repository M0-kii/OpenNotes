import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETTINGS,
  coerceSetting,
  FONT_OPTIONS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
} from "../lib/settings";

describe("DEFAULT_SETTINGS", () => {
  it("has defaults for all required keys", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("system");
    expect(DEFAULT_SETTINGS.editorFontSize).toBe(16);
    expect(DEFAULT_SETTINGS.showFolderCounts).toBe(true);
    expect(DEFAULT_SETTINGS.reducedMotion).toBe(false);
  });
});

describe("FONT_OPTIONS", () => {
  it("includes all expected fonts", () => {
    const keys = FONT_OPTIONS.map((f) => f.key);
    expect(keys).toContain("system");
    expect(keys).toContain("geist");
    expect(keys).toContain("jetbrains-mono");
  });

  it("each font has a label and cssStack", () => {
    for (const font of FONT_OPTIONS) {
      expect(typeof font.label).toBe("string");
      expect(font.label.length).toBeGreaterThan(0);
      expect(typeof font.cssStack).toBe("string");
      expect(font.cssStack.length).toBeGreaterThan(0);
    }
  });
});

describe("coerceSetting", () => {
  it("returns valid theme values as-is", () => {
    expect(coerceSetting("theme", "light")).toBe("light");
    expect(coerceSetting("theme", "dark")).toBe("dark");
    expect(coerceSetting("theme", "system")).toBe("system");
  });

  it("falls back for invalid theme", () => {
    expect(coerceSetting("theme", "invalid")).toBe("system");
  });

  it("coerces editorFontSize within range", () => {
    expect(coerceSetting("editorFontSize", FONT_SIZE_MIN)).toBe(
      FONT_SIZE_MIN
    );
    expect(coerceSetting("editorFontSize", FONT_SIZE_MAX)).toBe(
      FONT_SIZE_MAX
    );
  });

  it("clamps editorFontSize out of range", () => {
    expect(coerceSetting("editorFontSize", FONT_SIZE_MIN - 1)).toBe(
      DEFAULT_SETTINGS.editorFontSize
    );
    expect(coerceSetting("editorFontSize", FONT_SIZE_MAX + 1)).toBe(
      DEFAULT_SETTINGS.editorFontSize
    );
  });

  it("coerces numeric string for editorFontSize", () => {
    expect(coerceSetting("editorFontSize", "14")).toBe(14);
  });

  it("coerces boolean values", () => {
    expect(coerceSetting("highContrast", true)).toBe(true);
    expect(coerceSetting("highContrast", false)).toBe(false);
    expect(coerceSetting("highContrast", "yes")).toBe(false);
  });

  it("returns fallback for unknown keys", () => {
    const result = coerceSetting("theme", undefined);
    expect(result).toBe(DEFAULT_SETTINGS.theme);
  });
});
