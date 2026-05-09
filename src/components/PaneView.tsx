import type { Note, MindmapLayout } from "../types";
import Editor from "./Editor";
import MindmapEditor from "./MindmapEditor";
import MindmapEditorV2 from "./MindmapEditorV2";
import TodoListEditor from "./TodoListEditor";

interface PaneViewProps {
  note: Note | null;
  onContentChange: (id: string, content: string) => void;
  onTitleChange: (id: string, title: string) => void;
  layout?: MindmapLayout;
  mindmapV2Enabled?: boolean;
  isActive?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  notes?: Note[];
}

export default function PaneView({
  note,
  onContentChange,
  onTitleChange,
  layout,
  mindmapV2Enabled,
  isActive,
  onFocus,
  onClose,
  notes,
}: PaneViewProps) {
  switch (note?.note_type) {
    case "mindmap":
      return mindmapV2Enabled ? (
        <MindmapEditorV2
          note={note}
          onContentChange={onContentChange}
          onTitleChange={onTitleChange}
        />
      ) : (
        <MindmapEditor
          note={note}
          layout={layout ?? "top-down"}
          onContentChange={onContentChange}
          onTitleChange={onTitleChange}
        />
      );
    case "todolist":
      return (
        <TodoListEditor
          note={note}
          onContentChange={onContentChange}
          onTitleChange={onTitleChange}
          isActive={isActive}
          onFocus={onFocus}
          onClose={onClose}
        />
      );
    default:
      return (
        <Editor
          note={note}
          onContentChange={onContentChange}
          onTitleChange={onTitleChange}
          isActive={isActive}
          onFocus={onFocus}
          onClose={onClose}
          notes={notes}
        />
      );
  }
}
