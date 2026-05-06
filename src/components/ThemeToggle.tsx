import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import type { Theme } from "../types";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

const NEXT: Record<Theme, Theme> = {
  light: "system",
  system: "dark",
  dark: "light",
};

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const Icon = theme === "dark" ? Sun : theme === "light" ? Moon : Monitor;

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      className="p-1.5 rounded-btn text-sidebar-textSecondary/70
                 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                 hover:text-sidebar-textSecondary
                 transition-colors duration-200 relative"
      title={`Theme: ${theme}. Click for ${NEXT[theme]}.`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Icon className="w-[15px] h-[15px]" />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
