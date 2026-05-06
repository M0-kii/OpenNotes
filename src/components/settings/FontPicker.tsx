import { Check } from "lucide-react";
import type { FontKey } from "../../types";
import { FONT_OPTIONS } from "../../lib/settings";

interface Props {
  value: FontKey;
  onChange: (key: FontKey) => void;
}

export default function FontPicker({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Editor font"
      className="flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-1"
    >
      {FONT_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.key)}
            className={`flex items-center justify-between gap-3 px-3 py-2.5
                        rounded-md border text-left transition-colors duration-150
                        ${
                          active
                            ? "border-accent/40 bg-accent-soft"
                            : "border-border hover:bg-black/[0.025] dark:hover:bg-white/[0.03]"
                        }`}
          >
            <div className="min-w-0 flex-1">
              <div
                className="text-[14px] font-medium text-editor-text tracking-[-0.01em] truncate"
                style={{ fontFamily: opt.cssStack }}
              >
                {opt.label}
              </div>
              <div
                className="text-[12px] text-editor-text/45 tracking-[-0.005em] mt-0.5 truncate"
                style={{ fontFamily: opt.cssStack }}
              >
                {opt.sample}
              </div>
            </div>
            {active && (
              <Check className="w-4 h-4 text-accent shrink-0" strokeWidth={2} />
            )}
          </button>
        );
      })}
    </div>
  );
}
