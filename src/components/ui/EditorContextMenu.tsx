import { useState, useCallback } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { cn } from "../../lib/utils";
import { Copy, Scissors, Clipboard, TextSelect } from "lucide-react";

interface EditorContextMenuProps {
  children: React.ReactNode;
  editorRef: React.RefObject<HTMLDivElement | null>;
}

export default function EditorContextMenu({ children, editorRef }: EditorContextMenuProps) {
  const [hasSelection, setHasSelection] = useState(false);

  const onOpenChange = useCallback((open: boolean) => {
    if (open && editorRef.current) {
      const sel = window.getSelection();
      setHasSelection(!!(sel && !sel.isCollapsed && editorRef.current.contains(sel.anchorNode)));
    }
  }, [editorRef]);

  const handleCut = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("cut");
    }
  };

  const handleCopy = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("copy");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && editorRef.current) {
        editorRef.current.focus();
        document.execCommand("insertText", false, text);
      }
    } catch {
      // clipboard read not permitted
    }
  };

  const handleSelectAll = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("selectAll");
    }
  };

  const itemClass = cn(
    "flex items-center gap-2 px-3 py-1.5 text-[12px] tracking-[-0.01em]",
    "text-sidebar-text/80 outline-none cursor-default select-none",
    "rounded-[6px] mx-1",
    "data-[highlighted]:bg-hover-subtle data-[highlighted]:text-sidebar-text",
    "data-[disabled]:opacity-30 data-[disabled]:pointer-events-none",
    "transition-colors duration-100"
  );

  const shortcutClass = "ml-auto text-[10px] text-sidebar-textSecondary/40 tracking-[-0.01em]";

  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger className="contents">
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className={cn(
            "z-[9999] min-w-[180px] py-1",
            "rounded-[10px]",
            "glass border border-border",
            "shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            "backdrop-blur-xl",
            "animate-context-menu-open"
          )}
        >
          <ContextMenu.Item className={itemClass} onClick={handleCut} disabled={!hasSelection}>
            <Scissors className="w-3.5 h-3.5" />
            Cut
            <span className={shortcutClass}>Ctrl+X</span>
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onClick={handleCopy} disabled={!hasSelection}>
            <Copy className="w-3.5 h-3.5" />
            Copy
            <span className={shortcutClass}>Ctrl+C</span>
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onClick={handlePaste}>
            <Clipboard className="w-3.5 h-3.5" />
            Paste
            <span className={shortcutClass}>Ctrl+V</span>
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-border/50 mx-2 my-1" />
          <ContextMenu.Item className={itemClass} onClick={handleSelectAll}>
            <TextSelect className="w-3.5 h-3.5" />
            Select All
            <span className={shortcutClass}>Ctrl+A</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
