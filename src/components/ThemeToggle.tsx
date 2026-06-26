import { motion, AnimatePresence } from "framer-motion";
import { Monitor } from "lucide-react";
import { SunIcon } from "./ui/sun";
import { MoonIcon } from "./ui/moon";
import type { Theme } from "../types";
import { springBouncy, tapScaleSmall, hoverLiftSmall, springSnappy } from "../lib/animations";

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
  const Icon = theme === "dark" ? SunIcon : theme === "light" ? MoonIcon : Monitor;

  return (
    <motion.button
      whileHover={hoverLiftSmall}
      whileTap={tapScaleSmall}
      transition={springBouncy}
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
          initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
          transition={springSnappy}
        >
          <Icon className="w-[15px] h-[15px]" />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
