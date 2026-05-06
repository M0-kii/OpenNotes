import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Palette,
  PencilLine,
  Folder as FolderIcon,
  SunMoon,
  Monitor,
  Type,
  ALargeSmall,
  WrapText,
  Columns2,
  Eye,
  FolderDown,
} from "lucide-react";
import type { Settings, Folder, TitlebarStyle } from "../../types";
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

type TabId = "appearance" | "editor" | "folders";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }> }[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "editor", label: "Editor", icon: PencilLine },
  { id: "folders", label: "Folders", icon: FolderIcon },
];

const rowStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

const rowItem = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function SettingsDialog({
  open,
  onOpenChange,
  settings,
  folders,
  onChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("appearance");

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
            <Dialog.Content
              asChild
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                           z-50 w-[600px] max-w-[calc(100vw-32px)]
                           max-h-[min(640px,calc(100vh-48px))]
                           bg-editor-bg border border-border rounded-[14px]
                           shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
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

                <div className="flex flex-1 overflow-hidden min-h-0">
                  {/* Tab sidebar */}
                  <div className="w-[160px] shrink-0 border-r border-border p-2 flex flex-col gap-0.5">
                    {TABS.map((tab, i) => {
                      const isActive = tab.id === activeTab;
                      return (
                        <motion.button
                          key={tab.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.18,
                            ease: [0.22, 1, 0.36, 1],
                            delay: 0.04 * i,
                          }}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left
                                     transition-colors duration-150
                                     ${
                                       isActive
                                         ? "bg-black/[0.05] dark:bg-white/[0.06] text-editor-text"
                                         : "text-editor-text/50 hover:text-editor-text/75 hover:bg-black/[0.025] dark:hover:bg-white/[0.03]"
                                     }`}
                        >
                          <tab.icon
                            className={`w-[15px] h-[15px] shrink-0 transition-colors duration-150 ${
                              isActive ? "text-accent" : ""
                            }`}
                            strokeWidth={1.5}
                          />
                          <span className="text-[12px] font-medium tracking-[-0.01em]">
                            {tab.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-y-auto px-5 py-3">
                    <AnimatePresence mode="wait">
                      {activeTab === "appearance" && (
                        <motion.div
                          key="appearance"
                          variants={rowStagger}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -6 }}
                        >
                          <motion.div variants={rowItem}>
                            <SettingsRow label="Theme" icon={SunMoon}>
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
                          </motion.div>
                          <motion.div variants={rowItem}>
                            <SettingsRow
                              label="Title bar style"
                              description="Switch between macOS traffic lights or Windows controls."
                              icon={Monitor}
                            >
                              <SegmentedControl<TitlebarStyle>
                                ariaLabel="Title bar style"
                                value={settings.titlebarStyle}
                                onChange={(v) => onChange("titlebarStyle", v)}
                                options={[
                                  { value: "macos", label: "macOS" },
                                  { value: "windows", label: "Windows" },
                                ]}
                              />
                            </SettingsRow>
                          </motion.div>
                        </motion.div>
                      )}

                      {activeTab === "editor" && (
                        <motion.div
                          key="editor"
                          variants={rowStagger}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -6 }}
                        >
                          <motion.div variants={rowItem} className="pb-3">
                            <div className="flex items-center gap-2 text-[13px] font-medium text-editor-text tracking-[-0.01em] mb-2">
                              <Type className="w-[15px] h-[15px] text-editor-text/40" strokeWidth={1.5} />
                              Font
                            </div>
                            <FontPicker
                              value={settings.editorFont}
                              onChange={(v) => onChange("editorFont", v)}
                            />
                          </motion.div>

                          <motion.div variants={rowItem}>
                            <SettingsRow
                              label="Font size"
                              description={`${settings.editorFontSize}px`}
                              icon={ALargeSmall}
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
                          </motion.div>

                          <motion.div variants={rowItem}>
                            <SettingsRow label="Line height" icon={WrapText}>
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
                          </motion.div>

                          <motion.div variants={rowItem}>
                            <SettingsRow label="Editor width" icon={Columns2}>
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
                          </motion.div>
                        </motion.div>
                      )}

                      {activeTab === "folders" && (
                        <motion.div
                          key="folders"
                          variants={rowStagger}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -6 }}
                        >
                          <motion.div variants={rowItem}>
                            <SettingsRow
                              label="Show note counts"
                              description="Display note count next to each folder."
                              icon={Eye}
                            >
                              <ToggleSwitch
                                checked={settings.showFolderCounts}
                                onChange={(v) => onChange("showFolderCounts", v)}
                              />
                            </SettingsRow>
                          </motion.div>

                          <motion.div variants={rowItem}>
                            <SettingsRow
                              label="Default folder for new notes"
                              description="Used when no folder is selected."
                              icon={FolderDown}
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
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="px-5 py-2.5 border-t border-border text-[11px] text-editor-text/35 tracking-[-0.005em] shrink-0">
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
