import { ReactNode } from "react";

interface Props {
  label: string;
  description?: string;
  children: ReactNode;
}

export default function SettingsRow({ label, description, children }: Props) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-editor-text tracking-[-0.01em]">
          {label}
        </div>
        {description && (
          <div className="text-[12px] text-editor-text/45 tracking-[-0.005em] mt-0.5">
            {description}
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
