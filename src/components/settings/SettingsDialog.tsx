import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Settings, Folder } from "../../types";
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "../../lib/settings";
import SettingsRow from "./SettingsRow";
import SegmentedControl from "./SegmentedControl";
import FontPicker from "./FontPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  folders: Folder[];
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export default function SettingsDialog({
  open,
  onOpenChange,
  settings,
  folders,
  onChange,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 4 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                           w-[560px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-64px)]
                           bg-editor-bg border border-border rounded-[14px]
                           shadow-2xl overflow-hidden flex flex-col z-50"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <Dialog.Title className="text-[14px] font-semibold text-editor-text tracking-[-0.01em]">
                    Settings
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close"
                      className="p-1 rounded-md text-editor-text/40 hover:text-editor-text/70
                                 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-2">
                  <Section title="Appearance">
                    <SettingsRow label="Theme">
                      <SegmentedControl
                        ariaLabel="Theme"
                        value={settings.theme}
                        onChange={(v) => onChange("theme", v)}
                        options={[
                          { value: "light", label: "Light" },
                          { value: "system", label: "System" },
                          { value: "dark", label: "Dark" },
                        ]}
                      />
                    </SettingsRow>
                  </Section>

                  <Section title="Editor">
                    <div className="py-3">
                      <div className="text-[13px] font-medium text-editor-text tracking-[-0.01em] mb-2">
                        Font
                      </div>
                      <FontPicker
                        value={settings.editorFont}
                        onChange={(v) => onChange("editorFont", v)}
                      />
                    </div>

                    <SettingsRow
                      label="Font size"
                      description={`${settings.editorFontSize}px`}
                    >
                      <input
                        type="range"
                        min={FONT_SIZE_MIN}
                        max={FONT_SIZE_MAX}
                        step={1}
                        value={settings.editorFontSize}
                        onChange={(e) =>
                          onChange("editorFontSize", Number(e.target.value))
                        }
                        className="w-[160px] accent-accent"
                      />
                    </SettingsRow>

                    <SettingsRow label="Line height">
                      <SegmentedControl
                        ariaLabel="Line height"
                        value={settings.editorLineHeight}
                        onChange={(v) => onChange("editorLineHeight", v)}
                        options={[
                          { value: "tight", label: "Tight" },
                          { value: "normal", label: "Normal" },
                          { value: "relaxed", label: "Relaxed" },
                        ]}
                      />
                    </SettingsRow>

                    <SettingsRow label="Editor width">
                      <SegmentedControl
                        ariaLabel="Editor width"
                        value={settings.editorWidth}
                        onChange={(v) => onChange("editorWidth", v)}
                        options={[
                          { value: "narrow", label: "Narrow" },
                          { value: "comfortable", label: "Comfortable" },
                          { value: "wide", label: "Wide" },
                        ]}
                      />
                    </SettingsRow>
                  </Section>

                  <Section title="Folders">
                    <SettingsRow
                      label="Show note counts"
                      description="Display note count next to each folder."
                    >
                      <ToggleSwitch
                        checked={settings.showFolderCounts}
                        onChange={(v) => onChange("showFolderCounts", v)}
                      />
                    </SettingsRow>

                    <SettingsRow
                      label="Default folder for new notes"
                      description="Used when no folder is selected."
                    >
                      <select
                        value={settings.defaultFolderId ?? ""}
                        onChange={(e) =>
                          onChange(
                            "defaultFolderId",
                            e.target.value === "" ? null : e.target.value
                          )
                        }
                        className="text-[12px] bg-editor-bg border border-border rounded
                                   px-2 py-1 text-editor-text outline-none
                                   focus:border-accent/40"
                      >
                        <option value="">Use current selection</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </SettingsRow>
                  </Section>
                </div>

                <div className="px-5 py-2.5 border-t border-border text-[11px] text-editor-text/35 tracking-[-0.005em]">
                  Changes are saved automatically.
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 first:pt-2 last:pb-2 border-b border-border last:border-b-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em]
                      text-editor-text/40 mb-1.5 px-0.5">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[22px] w-[36px] shrink-0 rounded-full
                  transition-colors duration-200 outline-none
                  focus-visible:ring-2 focus-visible:ring-accent/35
                  ${checked ? "bg-accent" : "bg-black/[0.12] dark:bg-white/[0.18]"}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full
                    bg-white shadow-sm transition-transform duration-200
                    ${checked ? "translate-x-[14px]" : "translate-x-0"}`}
      />
    </button>
  );
}
