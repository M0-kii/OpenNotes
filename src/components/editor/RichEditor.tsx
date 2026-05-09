import { useRef, useEffect, useCallback, useState } from "react";
import { htmlToMarkdown, markdownToHtml } from "./markdownUtils";
import { wrapRange, getActiveFormats, getParentBlock } from "./formattingUtils";
import type { ActiveFormats } from "./formattingUtils";
import type { SlashCommand } from "./slashCommands";
import FloatingToolbar from "./FloatingToolbar";
import TableToolbar, { getParentCell } from "./TableToolbar";
import SlashMenu from "./SlashMenu";
import EditorContextMenu from "../ui/EditorContextMenu";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup"; // HTML/XML

interface RichEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onFocus?: () => void;
}

// Walk text nodes in a block and apply markdown shortcut patterns.
// Mutates the DOM. Returns the range that was saved before mutation.
function applyMarkdownShortcutsInBlock(block: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const savedRange = sel.getRangeAt(0).cloneRange();

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
    let html = textNode.textContent ?? "";

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
      }
    }

    if (changed && textNode.parentNode) {
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
          temp.innerHTML = template;
          if (temp.firstChild) {
            block.parentNode?.replaceChild(temp.firstChild, block);
            changed = true;
          }
          break;
        }
      }
    }
  }

  if (!changed) return null;
  return savedRange;
}

function highlightCodeBlocks(container: HTMLElement) {
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

export default function RichEditor({
  content,
  onContentChange,
  onFocus,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>("");
  const isComposingRef = useRef(false);
  const isUpdatingFromProp = useRef(false);
  const didInitialLoadRef = useRef(false);

  // Floating toolbar state
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    code: false,
    strike: false,
  });

  // Table toolbar state
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);

  // Slash menu state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashBlock, setSlashBlock] = useState<HTMLElement | null>(null);
  const [slashQuery, setSlashQuery] = useState("");

  const saveContent = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const md = htmlToMarkdown(html);
    if (md === lastContentRef.current) return;
    lastContentRef.current = md;
    onContentChange(md);
  }, [onContentChange]);

  // Sync content prop → DOM (only on initial load or external content change)
  useEffect(() => {
    if (!editorRef.current) return;
    // Skip if the content hasn't changed from what we last set
    if (content === lastContentRef.current) return;

    isUpdatingFromProp.current = true;
    const html = markdownToHtml(content);
    editorRef.current.innerHTML = html;
    lastContentRef.current = content;

    requestAnimationFrame(() => {
      if (editorRef.current) highlightCodeBlocks(editorRef.current);
    });

    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
    }

    requestAnimationFrame(() => {
      isUpdatingFromProp.current = false;
      if (editorRef.current && !didInitialLoadRef.current) {
        editorRef.current.focus();
      }
    });
  }, [content]);

  // Periodic save
  useEffect(() => {
    const interval = setInterval(() => {
      saveContent();
      // Only highlight if editor not focused (avoid disrupting active typing in code blocks)
      if (editorRef.current && document.activeElement !== editorRef.current) {
        highlightCodeBlocks(editorRef.current);
      }
    }, 3000);
    return () => {
      clearInterval(interval);
      saveContent();
    };
  }, [saveContent]);

  // Selection change → detect when cursor enters/leaves a table cell
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.anchorNode) {
      setActiveTable(null);
      return;
    }
    const cell = getParentCell(sel.anchorNode);
    if (cell) {
      setActiveTable(cell.closest("table") as HTMLTableElement);
    } else {
      setActiveTable(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const checkSlashCommand = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) {
      setSlashOpen(false);
      return;
    }
    const block = getParentBlock(sel.anchorNode);
    if (!block || !editorRef.current?.contains(block)) {
      setSlashOpen(false);
      return;
    }
    const text = block.textContent ?? "";
    if (text.startsWith("/")) {
      setSlashBlock(block);
      setSlashQuery(text.slice(1));
      setSlashOpen(true);
    } else {
      setSlashOpen(false);
    }
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current || isUpdatingFromProp.current) return;
    if (isComposingRef.current) return;

    // Apply live markdown shortcuts in the current block
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      const block = getParentBlock(sel.anchorNode);
      if (block && editorRef.current.contains(block)) {
        const savedRange = applyMarkdownShortcutsInBlock(block);
        if (savedRange) {
          try {
            sel.removeAllRanges();
            sel.addRange(savedRange);
          } catch {
            // Range may be invalid after DOM mutation; ignore
          }
        }
      }
    }

    saveContent();
    checkSlashCommand();
  }, [saveContent, checkSlashCommand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl+B → Bold
      if (mod && e.key === "b") {
        e.preventDefault();
        wrapRange("strong");
        setActiveFormats(getActiveFormats());
        saveContent();
        return;
      }
      // Ctrl+I → Italic
      if (mod && e.key === "i") {
        e.preventDefault();
        wrapRange("em");
        setActiveFormats(getActiveFormats());
        saveContent();
        return;
      }
      // Ctrl+` → Inline Code
      if (mod && e.key === "`") {
        e.preventDefault();
        wrapRange("code");
        setActiveFormats(getActiveFormats());
        saveContent();
        return;
      }
      // Ctrl+Shift+X → Strikethrough
      if (mod && e.shiftKey && e.key === "X") {
        e.preventDefault();
        wrapRange("del");
        setActiveFormats(getActiveFormats());
        saveContent();
        return;
      }
      // Tab → 2 spaces
      if (e.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertText", false, "  ");
      }
      // Close slash menu on Escape
      if (e.key === "Escape" && slashOpen) {
        e.preventDefault();
        e.stopPropagation();
        setSlashOpen(false);
      }
    },
    [saveContent, slashOpen]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    saveContent();
  }, [saveContent]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const updateSelectionState = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setToolbarOpen(false);
      return;
    }
    setActiveFormats(getActiveFormats());
    requestAnimationFrame(() => {
      const currentSel = window.getSelection();
      if (currentSel && !currentSel.isCollapsed) {
        setToolbarOpen(true);
        setActiveFormats(getActiveFormats());
      }
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    updateSelectionState();
  }, [updateSelectionState]);

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "Shift"
      ) {
        updateSelectionState();
      }
    },
    [updateSelectionState]
  );

  const handleBlur = useCallback(() => {
    saveContent();
    setTimeout(() => {
      setToolbarOpen(false);
    }, 200);
  }, [saveContent]);

  // Format action handlers
  const handleBold = useCallback(() => {
    wrapRange("strong");
    setActiveFormats(getActiveFormats());
    saveContent();
  }, [saveContent]);

  const handleItalic = useCallback(() => {
    wrapRange("em");
    setActiveFormats(getActiveFormats());
    saveContent();
  }, [saveContent]);

  const handleCode = useCallback(() => {
    wrapRange("code");
    setActiveFormats(getActiveFormats());
    saveContent();
  }, [saveContent]);

  const handleStrikethrough = useCallback(() => {
    wrapRange("del");
    setActiveFormats(getActiveFormats());
    saveContent();
  }, [saveContent]);

  // Slash command handler
  const handleSlashSelect = useCallback(
    (command: SlashCommand) => {
      if (!slashBlock || !editorRef.current) return;
      const temp = document.createElement("div");
      temp.innerHTML = command.template;
      if (temp.firstChild) {
        slashBlock.parentNode?.replaceChild(temp.firstChild, slashBlock);
        const sel = window.getSelection();
        const range = document.createRange();
        // Place cursor inside the new element
        const firstText = editorRef.current.querySelector(
          "li, td, th, code"
        ) as HTMLElement | null;
        const target = firstText || editorRef.current;
        range.selectNodeContents(target);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setSlashOpen(false);
      setSlashBlock(null);
      saveContent();
    },
    [slashBlock, saveContent]
  );

  const handleSlashClose = useCallback(() => {
    setSlashOpen(false);
    setSlashBlock(null);
  }, []);

  return (
    <>
      <EditorContextMenu editorRef={editorRef}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPaste={handlePaste}
          onBlur={handleBlur}
          onFocus={onFocus}
          className="editor-content editor-surface w-full h-full min-h-[200px]
                     font-[400] text-editor-text/90 outline-none
                     break-words caret-accent
                     empty:before:content-[attr(data-placeholder)]
                     empty:before:text-editor-text/15 empty:before:tracking-[-0.01em]
                     selection:bg-accent/15
                     tracking-[-0.01em]"
          data-placeholder="Start writing..."
          spellCheck
        />
      </EditorContextMenu>
      <FloatingToolbar
        open={toolbarOpen}
        onBold={handleBold}
        onItalic={handleItalic}
        onCode={handleCode}
        onStrikethrough={handleStrikethrough}
        activeFormats={activeFormats}
      />
      <SlashMenu
        open={slashOpen}
        block={slashBlock}
        query={slashQuery}
        onSelect={handleSlashSelect}
        onClose={handleSlashClose}
      />
      <TableToolbar
        table={activeTable}
        open={!!activeTable}
      />
    </>
  );
}
