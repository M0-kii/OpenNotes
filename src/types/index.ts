export type NoteType = "note" | "mindmap" | "todolist";

export interface MindmapNode {
  id: string;
  text: string;
  parentId: string | null;
  x: number;
  y: number;
}

export interface MindmapData {
  nodes: MindmapNode[];
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  position: number;
  note_type: NoteType;
  is_favorite: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  is_default: number;
  parent_id: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderNode extends Folder {
  children: FolderNode[];
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

export type MindmapLayout = "top-down" | "left-right" | "radial";

export interface Settings {
  theme: Theme;
  titlebarStyle: TitlebarStyle;
  uiFont: FontKey;
  editorFont: FontKey;
  editorFontSize: number;
  editorLineHeight: LineHeightKey;
  editorWidth: EditorWidthKey;
  showFolderCounts: boolean;
  defaultFolderId: string | null;
  mindmapLayout: MindmapLayout;
  mindmapV2Enabled: boolean;
  discordRpcEnabled: boolean;
  highContrast: boolean;
  largerText: boolean;
  reducedMotion: boolean;
}
