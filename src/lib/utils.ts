import type { NoteType } from "../types";
import { stripWikilinks } from "./linkUtils";

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function stripMarkdown(text: string): string {
  text = stripWikilinks(text);
  return text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .replace(/^>\s+/gm, "") // blockquote
    .replace(/^-\s+/gm, "") // unordered list
    .replace(/^\d+\.\s+/gm, "") // ordered list
    .replace(/^---$/gm, "") // horizontal rule
    .trim();
}

export function getNotePreview(content: string, noteType: NoteType, maxLength = 80): string {
  let text: string;
  if (noteType === "mindmap") {
    try {
      const raw = JSON.parse(content) as { nodes?: Array<{ text?: string }> };
      // Both v1 ({nodes:[{x,y,text}]}) and v2 ({schemaVersion:2, nodes:[{text}]})
      // store node text in the same shape, so a single read works for both.
      const nodes = Array.isArray(raw?.nodes) ? raw.nodes : [];
      text = nodes
        .map((n) => (typeof n.text === "string" ? n.text : ""))
        .filter(Boolean)
        .join(" · ") || "Empty mind map";
    } catch {
      text = content;
    }
  } else if (noteType === "todolist") {
    try {
      const raw = JSON.parse(content) as { items?: Array<{ text?: string; completed?: boolean }> };
      const items = Array.isArray(raw?.items) ? raw.items : [];
      const done = items.filter((i) => i.completed).length;
      const total = items.length;
      if (total === 0) return "Empty todo list";
      text = items
        .filter((i) => !i.completed)
        .map((i) => (typeof i.text === "string" ? i.text : ""))
        .filter(Boolean)
        .slice(0, 3)
        .join(" · ") || `${done}/${total} completed`;
      return `${text}  (${done}/${total})`;
    } catch {
      text = content;
    }
  } else {
    text = stripMarkdown(content);
  }
  text = text.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text || "No content";
  return text.substring(0, maxLength) + "…";
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
