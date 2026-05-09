import { X, Plus } from "lucide-react";

interface TabInfo {
  id: string;
  title: string;
}

interface TabBarProps {
  tabs: TabInfo[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: (index: number) => void;
  onCreate?: () => void;
}

export default function TabBar({
  tabs,
  activeIndex,
  onSelect,
  onClose,
  onCreate,
}: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-end h-9 bg-editor-bg border-b border-border pl-2 shrink-0">
      {/* Scrollable tab list */}
      <div
        className="flex items-end gap-px overflow-x-auto flex-1 h-full
                    [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(i)}
              className={`group relative flex items-center max-w-[160px] h-full px-3
                          text-sm rounded-t-lg transition-colors duration-150 shrink-0
                          ${
                            isActive
                              ? "bg-sidebar-bg text-editor-text border border-border border-b-0 -mb-px"
                              : "text-sidebar-textSecondary hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                          }`}
            >
              <span className="truncate min-w-0">{tab.title || "Untitled"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(i);
                }}
                className="ml-1.5 opacity-0 group-hover:opacity-100 shrink-0
                           text-sidebar-textSecondary hover:text-editor-text
                           hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                           p-0.5 rounded-full transition-opacity duration-150"
                title="Close tab"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </button>
          );
        })}
      </div>

      {/* Plus button — fixed at right edge */}
      {onCreate && (
        <button
          onClick={onCreate}
          className="shrink-0 mx-1 p-1 rounded-md text-sidebar-textSecondary
                     hover:text-editor-text hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                     transition-colors duration-150"
          title="New tab"
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
