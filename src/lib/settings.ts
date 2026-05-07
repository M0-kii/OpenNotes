import type {
  Settings,
  TitlebarStyle,
  FontKey,
  LineHeightKey,
  EditorWidthKey,
  MindmapLayout,
} from "../types";

const detectedPlatform: TitlebarStyle =
  typeof navigator !== "undefined" && navigator.platform?.includes("Mac")
    ? "macos"
    : "windows";

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  titlebarStyle: detectedPlatform,
  uiFont: "system",
  editorFont: "system",
  editorFontSize: 16,
  editorLineHeight: "normal",
  editorWidth: "comfortable",
  showFolderCounts: true,
  defaultFolderId: null,
  mindmapLayout: "top-down",
  mindmapV2Enabled: false,
  discordRpcEnabled: false,
  highContrast: false,
  largerText: false,
  reducedMotion: false,
};

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 22;

export interface FontOption {
  key: FontKey;
  label: string;
  cssStack: string;
  sample: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    key: "system",
    label: "System",
    cssStack:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    key: "geist",
    label: "Geist",
    cssStack: '"Geist Variable", system-ui, sans-serif',
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    key: "heebo",
    label: "Heebo",
    cssStack: '"Heebo Variable", system-ui, sans-serif',
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    key: "lora",
    label: "Lora",
    cssStack: '"Lora Variable", Georgia, serif',
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    key: "fraunces",
    label: "Fraunces",
    cssStack: '"Fraunces Variable", Georgia, serif',
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    key: "jetbrains-mono",
    label: "JetBrains Mono",
    cssStack: '"JetBrainsMono", ui-monospace, monospace',
    sample: "const fox = () => quick.brown();",
  },
];

export const LINE_HEIGHT_MAP: Record<LineHeightKey, number> = {
  tight: 1.4,
  normal: 1.6,
  relaxed: 1.8,
};

export const EDITOR_WIDTH_MAP: Record<EditorWidthKey, string> = {
  narrow: "640px",
  comfortable: "760px",
  wide: "920px",
};

export function coerceSetting<K extends keyof Settings>(
  key: K,
  raw: unknown
): Settings[K] {
  const fallback = DEFAULT_SETTINGS[key];
  switch (key) {
    case "theme":
      return (raw === "light" || raw === "dark" || raw === "system"
        ? raw
        : fallback) as Settings[K];
    case "titlebarStyle":
      return (raw === "macos" || raw === "windows"
        ? raw
        : fallback) as Settings[K];
    case "uiFont":
    case "editorFont":
      return (FONT_OPTIONS.some((f) => f.key === raw)
        ? raw
        : fallback) as Settings[K];
    case "editorFontSize": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return (Number.isFinite(n) && n >= FONT_SIZE_MIN && n <= FONT_SIZE_MAX
        ? n
        : fallback) as Settings[K];
    }
    case "editorLineHeight":
      return (raw === "tight" || raw === "normal" || raw === "relaxed"
        ? raw
        : fallback) as Settings[K];
    case "editorWidth":
      return (raw === "narrow" || raw === "comfortable" || raw === "wide"
        ? raw
        : fallback) as Settings[K];
    case "showFolderCounts":
      return (typeof raw === "boolean" ? raw : fallback) as Settings[K];
    case "defaultFolderId":
      return (typeof raw === "string" || raw === null
        ? raw
        : fallback) as Settings[K];
    case "mindmapLayout":
      return (raw === "top-down" || raw === "left-right"
        ? raw
        : fallback) as Settings[K];
    case "mindmapV2Enabled":
    case "discordRpcEnabled":
    case "highContrast":
    case "largerText":
    case "reducedMotion":
      return (typeof raw === "boolean" ? raw : fallback) as Settings[K];
    default:
      return fallback;
  }
}
