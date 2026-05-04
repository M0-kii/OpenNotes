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

export type Theme = "light" | "dark";
