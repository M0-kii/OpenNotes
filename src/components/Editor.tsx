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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/3 dark:bg-white/3 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-black/15 dark:text-white/10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-sm text-editor-text/30 dark:text-editor-text/20">
            Select a note or create a new one
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-editor-bg">
      <div className="px-8 pt-8 pb-2">
        <input
          type="text"
          value={note.title}
          onChange={handleTitleInput}
          placeholder="Title"
          className="w-full text-2xl font-bold text-editor-text
                     bg-transparent border-none outline-none
                     placeholder:text-editor-text/20
                     pb-2 border-b border-black/5 dark:border-white/5"
          spellCheck={false}
        />
        <div className="flex items-center gap-4 mt-2 text-[10px] text-editor-text/25">
          <span>
            Created:{" "}
            {new Date(note.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span>
            Updated:{" "}
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

      <div className="flex-1 overflow-y-auto px-8 py-4">
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
          className="w-full h-full min-h-[200px] text-sm leading-relaxed
                     text-editor-text outline-none whitespace-pre-wrap
                     break-words caret-blue-500
                     empty:before:content-[attr(data-placeholder)]
                     empty:before:text-editor-text/20
                     selection:bg-blue-500/20"
          data-placeholder="Start writing..."
          spellCheck
        />
      </div>
    </div>
  );
}
