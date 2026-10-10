import { Marked } from "marked";
import TurndownService from "turndown";
import DOMPurify from "dompurify";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

const escapeMarkdown = turndown.escape.bind(turndown);
turndown.escape = (text) => escapeMarkdown(text).replace(/</g, "\\<").replace(/>/g, "\\>");

const marked = new Marked({ extensions: [{
  name: "wikilink",
  level: "inline",
  start: (src) => src.indexOf("[["),
  tokenizer(src) {
    const match = /^\[\[([^\[\]]+)\]\]/.exec(src);
    if (match) return { type: "wikilink", raw: match[0] };
  },
  renderer(token) {
    // Parse wikilinks as literal text, even if titles contain Markdown or HTML.
    const span = document.createElement("span");
    span.textContent = token.raw;
    return span.innerHTML;
  },
}] });

turndown.addRule("strikethrough", {
  filter: (node) => ["DEL", "S", "STRIKE"].includes(node.nodeName),
  replacement: (content) => `~~${content}~~`,
});
turndown.addRule("wikilink", {
  filter: (node) => node.nodeName === "SPAN" && node.hasAttribute("data-target"),
  replacement: (_content, node) => {
    const target = node.getAttribute("data-target") ?? "";
    const alias = node.getAttribute("data-alias");
    return `[[${target}${alias ? `|${alias}` : ""}]]`;
  },
});
// Keep arbitrary cell layouts intact, including tables without header rows.
// Markdown supports HTML blocks, so this is lossless even for edited tables.
turndown.keep(["table"]);

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["input", "button", "form", "textarea", "select", "style"],
    FORBID_ATTR: ["style"],
  });
}

export function htmlToMarkdown(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = sanitizeHtml(html);
  container.querySelectorAll(".code-lang-label").forEach((node) => node.remove());
  return turndown.turndown(container.innerHTML);
}

export function markdownToHtml(md: string): string {
  return sanitizeHtml(marked.parse(md, { async: false }) as string);
}
