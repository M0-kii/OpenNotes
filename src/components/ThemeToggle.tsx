import { Sun, Moon } from "lucide-react";
import type { Theme } from "../types";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-btn text-sidebar-textSecondary/70
                 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                 hover:text-sidebar-textSecondary active:scale-95
                 transition-all duration-200"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-[15px] h-[15px]" />
      ) : (
        <Moon className="w-[15px] h-[15px]" />
      )}
    </button>
  );
}
