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
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex p-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.05]
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
            className={`px-3 py-1 text-[12px] font-medium rounded
                        tracking-[-0.005em] transition-colors duration-150
                        ${
                          active
                            ? "bg-editor-bg text-editor-text shadow-sm"
                            : "text-editor-text/55 hover:text-editor-text/80"
                        }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
