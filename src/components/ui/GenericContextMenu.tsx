import * as ContextMenu from "@radix-ui/react-context-menu";
import { cn } from "../../lib/utils";

export interface ContextMenuItemDef {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  onClick: () => void;
  destructive?: boolean;
  shortcut?: string;
  disabled?: boolean;
}

interface Props {
  children: React.ReactNode;
  items: ContextMenuItemDef[];
}

const itemClass = cn(
  "flex items-center gap-2 px-3 py-1.5 text-[12px] tracking-[-0.01em]",
  "outline-none cursor-default select-none",
  "rounded-[6px] mx-1",
  "data-[highlighted]:bg-hover-subtle",
  "data-[disabled]:opacity-30 data-[disabled]:pointer-events-none",
  "transition-colors duration-100"
);

const shortcutClass =
  "ml-auto text-[10px] text-sidebar-textSecondary/40 tracking-[-0.01em]";

export default function GenericContextMenu({ children, items }: Props) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="contents">
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className={cn(
            "z-[9999] min-w-[150px] py-1",
            "rounded-[10px]",
            "glass border border-border",
            "shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            "backdrop-blur-xl",
            "animate-context-menu-open"
          )}
        >
          {items.map((item, i) => (
            <ContextMenu.Item
              key={i}
              className={cn(
                itemClass,
                item.destructive
                  ? "text-red-400 data-[highlighted]:text-red-300"
                  : "text-sidebar-text/80 data-[highlighted]:text-sidebar-text"
              )}
              onClick={item.onClick}
              disabled={item.disabled}
            >
              <item.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {item.label}
              {item.shortcut && (
                <span className={shortcutClass}>{item.shortcut}</span>
              )}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
