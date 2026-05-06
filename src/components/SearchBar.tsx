import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import InputContextMenu from "./ui/InputContextMenu";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative mx-3 mb-2.5">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-textSecondary/45" />
      <InputContextMenu inputRef={inputRef}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search"
          className="w-full bg-black/[0.04] dark:bg-white/[0.04] text-sidebar-text text-[12px]
                     rounded-input py-1.5 pl-8 pr-8
                     placeholder:text-sidebar-textSecondary/40
                     outline-none ring-0
                     focus:bg-black/[0.06] dark:focus:bg-white/[0.06]
                     transition-all duration-200 tracking-[-0.01em]"
          spellCheck={false}
        />
      </InputContextMenu>
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.12 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5
                       rounded-md hover:bg-black/[0.06] dark:hover:bg-white/[0.06]
                       text-sidebar-textSecondary/50 hover:text-sidebar-textSecondary/80
                       transition-colors"
          >
            <X className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
