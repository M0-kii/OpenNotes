import { marked } from "marked";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
