import Prism from "prismjs";

function escapeHtml(text: string): string {
  const span = document.createElement("span");
  span.textContent = text;
  return span.innerHTML;
}

// Walk text nodes in a block and apply markdown shortcut patterns.
// Mutates the DOM and returns a range in the new text, preserving the caret.
export function applyMarkdownShortcutsInBlock(block: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed || block.closest("pre, code")) return null;
  const original = sel.getRangeAt(0);
  if (!block.contains(original.startContainer)) return null;
  const prefix = document.createRange();
  prefix.selectNodeContents(block);
  prefix.setEnd(original.startContainer, original.startOffset);
  const textBefore = prefix.toString();
  let caretOffset = textBefore
    .replace(/\*\*(.+?)\*\*/g, "$1").replace(/~~(.+?)~~/g, "$1")
    .replace(/\*(.+?)\*/g, "$1").replace(/`([^`\n]+?)`/g, "$1").length;
  let resultBlock = block;

  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    // Skip text inside code, pre, or already-formatted elements
    let parent: HTMLElement | null = textNode.parentElement;
    let skip = false;
    while (parent && parent !== block) {
      const tag = parent.tagName.toLowerCase();
      if (
        tag === "code" ||
        tag === "pre" ||
        tag === "strong" ||
        tag === "em" ||
        tag === "del"
      ) {
        skip = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (!skip && textNode.textContent) {
      textNodes.push(textNode);
    }
  }

  let changed = false;

  for (const textNode of textNodes) {
    let html = escapeHtml(textNode.textContent ?? "");
    let nodeChanged = false;

    // Inline patterns (ordered: bold first to avoid conflict with italic's single asterisk)
    const inlineReplacements: Array<{ regex: RegExp; template: string }> = [
      { regex: /\*\*(.+?)\*\*/g, template: "<strong>$1</strong>" },
      { regex: /~~(.+?)~~/g, template: "<del>$1</del>" },
      { regex: /\*(.+?)\*/g, template: "<em>$1</em>" },
      { regex: /`([^`\n]+?)`/g, template: "<code>$1</code>" },
    ];

    for (const { regex, template } of inlineReplacements) {
      const newHtml = html.replace(regex, template);
      if (newHtml !== html) {
        html = newHtml;
        changed = true;
        nodeChanged = true;
      }
    }

    if (nodeChanged && textNode.parentNode) {
      const span = document.createElement("span");
      span.innerHTML = html;
      const parent = textNode.parentNode;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, textNode);
      }
      parent.removeChild(textNode);
      parent.normalize();
    }
  }

  // Block-level conversions: check if entire block text matches a heading/list pattern
  if (!changed) {
    const blockText = block.textContent ?? "";
    const blockTag = block.tagName.toLowerCase();

    const isDefaultBlock =
      blockTag === "div" || blockTag === "p" || blockTag === "body" || !blockTag;

    if (isDefaultBlock) {
      const blockPatterns: Array<{
        regex: RegExp;
        tag: string;
        template: string;
      }> = [
        { regex: /^###\s+(.+)/, tag: "h3", template: "<h3>$1</h3>" },
        { regex: /^##\s+(.+)/, tag: "h2", template: "<h2>$1</h2>" },
        { regex: /^#\s+(.+)/, tag: "h1", template: "<h1>$1</h1>" },
        { regex: /^>\s+(.+)/, tag: "blockquote", template: "<blockquote>$1</blockquote>" },
        { regex: /^-\s+(.+)/, tag: "ul", template: "<ul><li>$1</li></ul>" },
        {
          regex: /^\d+\.\s+(.+)/,
          tag: "ol",
          template: "<ol><li>$1</li></ol>",
        },
      ];

      for (const { regex, template } of blockPatterns) {
        const match = blockText.match(regex);
        if (match) {
          const temp = document.createElement("div");
          temp.innerHTML = escapeHtml(blockText).replace(regex, template);
          if (temp.firstChild) {
            const replacement = temp.firstChild as HTMLElement;
            caretOffset = textBefore.replace(/^\s*(?:#{1,3}|>|-|\d+\.)\s+/, "").length;
            if (block.getAttribute("contenteditable") === "true") {
              block.replaceChildren(replacement);
            } else {
              block.parentNode?.replaceChild(replacement, block);
            }
            resultBlock = replacement;
            changed = true;
          }
          break;
        }
      }
    }
  }

  if (!changed) return null;
  const caret = document.createRange();
  const output = document.createTreeWalker(resultBlock, NodeFilter.SHOW_TEXT);
  while (output.nextNode()) {
    const node = output.currentNode;
    const length = node.textContent?.length ?? 0;
    if (caretOffset <= length) {
      caret.setStart(node, caretOffset);
      caret.collapse(true);
      return caret;
    }
    caretOffset -= length;
  }
  caret.selectNodeContents(resultBlock);
  caret.collapse(false);
  return caret;
}

export function highlightCodeBlocks(container: HTMLElement) {
  container.querySelectorAll("pre code").forEach((block) => {
    Prism.highlightElement(block as HTMLElement);
  });
  container.querySelectorAll("pre[data-language]").forEach((pre) => {
    if (!pre.querySelector(".code-lang-label")) {
      const label = document.createElement("span");
      label.className = "code-lang-label";
      label.contentEditable = "false";
      label.textContent = pre.getAttribute("data-language") || "plaintext";
      pre.appendChild(label);
    }
  });
}

export function highlightWikilinks(container: HTMLElement) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) =>
        node.textContent?.includes("[[") && !node.parentElement?.closest("pre, code, .wiki-link")
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    }
  );
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }
  for (const textNode of textNodes) {
    // Build elements from text so quotes and markup in titles stay literal.
    const text = textNode.textContent!;
    const pattern = /\[\[([^\[\]\|]+?)(?:\|([^\[\]]+?))?\]\]/g;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    let found = false;
    for (const match of text.matchAll(pattern)) {
      found = true;
      fragment.append(document.createTextNode(text.slice(offset, match.index)));
      const link = document.createElement("span");
      link.className = "wiki-link";
      link.dataset.target = match[1];
      if (match[2]) link.dataset.alias = match[2];
      link.contentEditable = "false";
      link.textContent = match[2] || match[1];
      fragment.append(link);
      offset = match.index! + match[0].length;
    }
    if (found) {
      fragment.append(document.createTextNode(text.slice(offset)));
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }
}
