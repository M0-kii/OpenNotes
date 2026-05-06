export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export type Theme = "light" | "dark" | "system";

export type TitlebarStyle = "macos" | "windows";

export type FontKey =
  | "system"
  | "geist"
  | "heebo"
  | "lora"
  | "fraunces"
  | "jetbrains-mono";

export type LineHeightKey = "tight" | "normal" | "relaxed";
export type EditorWidthKey = "narrow" | "comfortable" | "wide";

export interface Settings {
  theme: Theme;
  titlebarStyle: TitlebarStyle;
  editorFont: FontKey;
  editorFontSize: number;
  editorLineHeight: LineHeightKey;
  editorWidth: EditorWidthKey;
  showFolderCounts: boolean;
  defaultFolderId: string | null;
}
