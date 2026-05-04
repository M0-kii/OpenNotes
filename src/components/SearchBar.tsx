import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative mx-3 mb-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-textSecondary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search notes..."
        className="w-full bg-black/5 dark:bg-white/5 text-sidebar-text text-xs
                   rounded-md py-1.5 pl-8 pr-7
                   placeholder:text-sidebar-textSecondary/60
                   outline-none ring-0
                   focus:bg-black/8 dark:focus:bg-white/8
                   transition-colors"
        spellCheck={false}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5
                     rounded-sm hover:bg-black/10 dark:hover:bg-white/10
                     text-sidebar-textSecondary"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
