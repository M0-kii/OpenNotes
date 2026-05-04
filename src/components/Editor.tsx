import { useRef, useEffect, useCallback } from "react";
import type { Note } from "../types";

interface EditorProps {
  note: Note | null;
  onContentChange: (id: string, content: string) => void;
  onTitleChange?: (id: string, title: string) => void;
}

export default function Editor({
  note,
  onContentChange,
  onTitleChange,
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>("");
  const isComposingRef = useRef(false);
  const noteIdRef = useRef<string | null>(null);
  const isUpdatingFromProp = useRef(false);

  const saveContent = useCallback(() => {
    if (!noteIdRef.current || !editorRef.current) return;
    const text = editorRef.current.innerText ?? "";
    if (text !== lastContentRef.current) {
      lastContentRef.current = text;
      onContentChange(noteIdRef.current, text);
    }
  }, [onContentChange]);

  useEffect(() => {
    if (!note) {
      noteIdRef.current = null;
      lastContentRef.current = "";
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      return;
    }

    if (noteIdRef.current !== note.id) {
      saveContent();
      noteIdRef.current = note.id;
      isUpdatingFromProp.current = true;
      if (editorRef.current) {
        editorRef.current.innerText = note.content;
      }
      lastContentRef.current = note.content;
      requestAnimationFrame(() => {
        isUpdatingFromProp.current = false;
        if (editorRef.current) {
          editorRef.current.focus();
        }
      });
    }
  }, [note, saveContent]);

  useEffect(() => {
    const interval = setInterval(saveContent, 3000);
    return () => {
      clearInterval(interval);
      saveContent();
    };
  }, [saveContent]);

  const handleInput = useCallback(() => {
    if (!editorRef.current || isUpdatingFromProp.current) return;
    if (isComposingRef.current) return;
    saveContent();
  }, [saveContent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertText", false, "  ");
      }
    },
    []
  );

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    saveContent();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleTitleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (note && onTitleChange) {
        onTitleChange(note.id, e.target.value);
      }
    },
    [note, onTitleChange]
  );

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-[20px] bg-black/[0.025] dark:bg-white/[0.025] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <svg
              className="w-10 h-10 text-black/[0.08] dark:text-white/[0.06]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-[13px] text-editor-text/20 dark:text-editor-text/15 tracking-[-0.01em]">
            Select a note or create a new one
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-editor-bg">
      <div className="px-10 pt-10 pb-3">
        <input
          type="text"
          value={note.title}
          onChange={handleTitleInput}
          placeholder="Title"
          className="w-full text-[26px] font-bold text-editor-text
                     bg-transparent border-none outline-none
                     placeholder:text-editor-text/15 tracking-[-0.02em]
                     pb-3 border-b border-border"
          spellCheck={false}
        />
        <div className="flex items-center gap-6 mt-2.5 text-[11px] text-editor-text/20 tracking-[-0.01em]">
          <span>
            {new Date(note.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span>
            {new Date(note.updated_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-5">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPaste={handlePaste}
          onBlur={saveContent}
          className="editor-content w-full h-full min-h-[200px] text-[14px] leading-[1.8]
                     font-[400] text-editor-text/90 outline-none whitespace-pre-wrap
                     break-words caret-[#0071e3]
                     empty:before:content-[attr(data-placeholder)]
                     empty:before:text-editor-text/15 empty:before:tracking-[-0.01em]
                     selection:bg-[#0071e3]/15
                     tracking-[-0.01em]"
          data-placeholder="Start writing..."
          spellCheck
        />
      </div>
    </div>
  );
}
