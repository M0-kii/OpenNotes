import { useEffect, useRef, useState } from "react";
import { Check, Folder, FolderPlus, Folders, Pencil, Trash2, X } from "lucide-react";
import type { Folder as FolderType } from "../types";

interface FoldersSidebarProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  defaultFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolderRequest: (id: string) => void;
}

const NEW_FOLDER_ID = "__new__";

export default function FoldersSidebar({
  folders,
  selectedFolderId,
  defaultFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolderRequest,
}: FoldersSidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const startRename = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  };

  const startNewFolder = () => {
    setRenamingId(NEW_FOLDER_ID);
    setRenameValue("");
  };

  const confirmRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = renameValue.trim();
    if (!value) {
      cancelRename();
      return;
    }
    if (renamingId === NEW_FOLDER_ID) {
      onCreateFolder(value);
    } else if (renamingId) {
      onRenameFolder(renamingId, value);
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const renameForm = (
    <form
      onSubmit={confirmRename}
      className="flex-1 flex items-center gap-1.5"
    >
      <input
        ref={renameInputRef}
        type="text"
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onBlur={confirmRename}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancelRename();
        }}
        placeholder="Folder name"
        className="flex-1 bg-transparent text-[12px] font-medium
                   text-sidebar-text outline-none border-b
                   border-accent/40
                   pb-px tracking-[-0.01em] min-w-0"
        spellCheck={false}
      />
      <button
        type="submit"
        onMouseDown={(e) => e.preventDefault()}
        className="p-0.5 text-green-500 hover:text-green-600 transition-colors"
      >
        <Check className="w-3 h-3" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={cancelRename}
        className="p-0.5 text-sidebar-textSecondary/60 hover:text-sidebar-textSecondary transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </form>
  );

  const isAllNotesSelected = selectedFolderId === null;

  return (
    <div
      className="w-[200px] min-w-[200px] h-full flex flex-col
                 glass border-r border-border select-none"
    >
      <div className="px-5 pt-4 pb-3">
        <h1 className="text-[13px] font-semibold text-sidebar-text tracking-[-0.01em]">
          OpenNotes
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-2.5 pt-1 pb-2 space-y-px">
          <button
            type="button"
            onClick={() => onSelectFolder(null)}
            className={`group w-full flex items-center gap-2 px-3 py-1.5 mx-0.5
                        rounded-note text-left transition-all duration-200
                        ${
                          isAllNotesSelected
                            ? "bg-black/[0.05] dark:bg-white/[0.06]"
                            : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                        }`}
          >
            <Folders className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-sidebar-text tracking-[-0.01em]">
              All Notes
            </span>
          </button>
        </div>

        <div className="px-5 pt-2 pb-1">
          <div className="text-[10px] uppercase tracking-[0.06em] text-sidebar-textSecondary/50 font-medium">
            Folders
          </div>
        </div>

        <div className="px-2.5 pb-2 space-y-px">
          {folders.map((folder) => {
            const isSelected = folder.id === selectedFolderId;
            const isRenaming = folder.id === renamingId;
            const isDefault = folder.id === defaultFolderId;
            return (
              <div
                key={folder.id}
                onClick={() => !isRenaming && onSelectFolder(folder.id)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 mx-0.5
                            rounded-note cursor-pointer transition-all duration-200
                            ${
                              isSelected
                                ? "bg-black/[0.05] dark:bg-white/[0.06]"
                                : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                            }`}
              >
                <Folder className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0" strokeWidth={1.5} />
                {isRenaming ? (
                  renameForm
                ) : (
                  <>
                    <span className="flex-1 text-[12px] font-medium text-sidebar-text tracking-[-0.01em] truncate">
                      {folder.name}
                    </span>
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100
                                 transition-all duration-200"
                    >
                      <button
                        onClick={(e) => startRename(folder, e)}
                        className="p-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                                   text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary
                                   transition-all"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {!isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolderRequest(folder.id);
                          }}
                          className="p-1 rounded-md hover:bg-red-500/[0.08]
                                     text-sidebar-textSecondary/40 hover:text-red-400
                                     transition-all"
                          title="Delete folder"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {renamingId === NEW_FOLDER_ID && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 mx-0.5 rounded-note
                         bg-black/[0.025] dark:bg-white/[0.025]"
            >
              <Folder className="w-[14px] h-[14px] text-sidebar-textSecondary shrink-0" strokeWidth={1.5} />
              {renameForm}
            </div>
          )}
        </div>
      </div>

      <div className="px-2.5 pb-3 pt-1 border-t border-border">
        <button
          type="button"
          onClick={startNewFolder}
          disabled={renamingId === NEW_FOLDER_ID}
          className="w-full flex items-center gap-2 px-3 py-1.5 mt-2 mx-0.5
                     rounded-note text-left transition-all duration-200
                     hover:bg-black/[0.025] dark:hover:bg-white/[0.025]
                     text-sidebar-textSecondary disabled:opacity-40
                     disabled:hover:bg-transparent"
        >
          <FolderPlus className="w-[14px] h-[14px] shrink-0" strokeWidth={1.5} />
          <span className="text-[12px] font-medium tracking-[-0.01em]">
            New Folder
          </span>
        </button>
      </div>
    </div>
  );
}
