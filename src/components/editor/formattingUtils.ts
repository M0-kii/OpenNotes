/**
 * Gets the closest block-level parent element starting from `node`,
 * walking up until we find a direct child of an editor root (contenteditable ancestor)
 * or a known block-level element.
 */
export function getParentBlock(node: Node | null): HTMLElement | null {
  if (!node) return null;
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement) {
      const parent = current.parentElement;
      // If parent is contenteditable, this child IS the block
      if (parent && parent.isContentEditable) {
        return current;
      }
      // Known block-level elements
      const tag = current.tagName.toLowerCase();
      if (
        ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "ul", "ol", "li", "div"].includes(tag) &&
        parent?.isContentEditable
      ) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return null;
}

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strike: boolean;
}

/**
 * Inspects the current selection anchor node up the DOM tree
 * to determine active inline formats.
 */
export function getActiveFormats(): ActiveFormats {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return { bold: false, italic: false, code: false, strike: false };
  }
  let node: Node | null = sel.anchorNode;
  if (!node) return { bold: false, italic: false, code: false, strike: false };

  const result = { bold: false, italic: false, code: false, strike: false };
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement) {
      const tag = current.tagName.toLowerCase();
      if (tag === "strong" || tag === "b") result.bold = true;
      if (tag === "em" || tag === "i") result.italic = true;
      if (tag === "code") result.code = true;
      if (tag === "del" || tag === "s") result.strike = true;
      // Stop at contenteditable boundaries
      if (current.isContentEditable && !current.parentElement?.isContentEditable) {
        break;
      }
    }
    current = current.parentElement;
  }
  return result;
}

export function saveSelection(): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.getRangeAt(0).cloneRange();
}

export function restoreSelection(range: Range): void {
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/**
 * Wraps or unwraps the current selection with the given tag.
 * Toggle behavior: if the selection is already inside the target tag,
 * unwrap instead of wrapping.
 */
export function wrapRange(tag: string): void {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  const doc = document;

  // Determine the effective tag name (maps e.g. "strong" → "strong", "b" → "strong")
  const tagMapping: Record<string, string> = {
    strong: "strong",
    b: "strong",
    em: "em",
    i: "em",
    code: "code",
    del: "del",
    s: "del",
  };
  const effectiveTag = tagMapping[tag.toLowerCase()] ?? tag.toLowerCase();

  // Check if we're already inside this tag at the anchor
  let inside = false;
  let node: Node | null = range.commonAncestorContainer;
  while (node) {
    if (
      node instanceof HTMLElement &&
      node.tagName.toLowerCase() === effectiveTag
    ) {
      inside = true;
      break;
    }
    if (node instanceof HTMLElement && node.isContentEditable && !node.parentElement?.isContentEditable) {
      break;
    }
    node = node.parentElement;
  }

  if (inside) {
    // Unwrap: move children out of the wrapper
    node = range.commonAncestorContainer;
    while (node) {
      if (node instanceof HTMLElement && node.tagName.toLowerCase() === effectiveTag) {
        const parent = node.parentNode;
        if (!parent) break;
        const wrapper = node;
        while (wrapper.firstChild) {
          parent.insertBefore(wrapper.firstChild, wrapper);
        }
        parent.removeChild(wrapper);
        parent.normalize();
        sel.removeAllRanges();
        return;
      }
      node = node.parentElement;
    }
  } else {
    // Wrap
    const wrapper = doc.createElement(effectiveTag);
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    // Normalize to merge adjacent text nodes
    wrapper.parentNode?.normalize();
    // Re-select the wrapped content
    const newRange = doc.createRange();
    newRange.selectNodeContents(wrapper);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}
