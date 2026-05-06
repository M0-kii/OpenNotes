import { motion, LayoutGroup } from "framer-motion";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <LayoutGroup>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="relative inline-flex p-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.05]
                   border border-border"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className="relative px-3 py-1 text-[12px] font-medium rounded
                         tracking-[-0.005em] transition-colors duration-150
                         z-10"
            >
              {active && (
                <motion.div
                  layoutId="segmented-pill"
                  className="absolute inset-0 bg-editor-bg rounded shadow-sm"
                  transition={{ type: "spring", stiffness: 480, damping: 30 }}
                />
              )}
              <span
                className={`relative transition-colors duration-150 ${
                  active
                    ? "text-editor-text"
                    : "text-editor-text/55 hover:text-editor-text/80"
                }`}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
