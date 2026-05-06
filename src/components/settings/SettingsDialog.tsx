import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Palette,
  PencilLine,
  Folder as FolderIcon,
  Github,
  SunMoon,
  Monitor,
  Type,
  ALargeSmall,
  WrapText,
  Columns2,
  Eye,
  FolderDown,
  Minus,
  Plus,
  ChevronDown,
} from "lucide-react";
import type { Settings, Folder, TitlebarStyle, FontKey } from "../../types";
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
  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? "";

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
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                layout
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                           z-50 w-[calc(100vw-32px)] sm:w-[600px]
                           max-h-[min(calc(100vh-48px),640px)]
                           bg-editor-bg border border-border rounded-[14px]
                           shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
                  <Dialog.Title className="flex items-baseline gap-1.5 text-[14px] font-semibold text-editor-text tracking-[-0.01em]">
                    <span>Settings</span>
                    <span className="text-editor-text/30 font-normal text-[13px]">
                      →
                    </span>
                    <span className="text-editor-text/50 font-normal">
                      {activeLabel}
                    </span>
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
                  <div className="w-[150px] shrink-0 border-r border-border p-2 flex flex-col gap-0.5">
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
                          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
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
                          <motion.div variants={rowItem} className="pt-2">
                            <div className="flex items-center gap-2 text-[13px] font-medium text-editor-text tracking-[-0.01em] mb-2">
                              <Type className="w-[15px] h-[15px] text-editor-text/40" strokeWidth={1.5} />
                              Interface font
                            </div>
                            <FontPicker
                              value={settings.uiFont}
                              onChange={(v) => onChange("uiFont", v as FontKey)}
                            />
                          </motion.div>
                        </motion.div>
                      )}

                      {activeTab === "editor" && (
                        <motion.div
                          key="editor"
                          variants={rowStagger}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                        >
                          <motion.div variants={rowItem} className="pb-3">
                            <div className="flex items-center gap-2 text-[13px] font-medium text-editor-text tracking-[-0.01em] mb-2">
                              <Type className="w-[15px] h-[15px] text-editor-text/40" strokeWidth={1.5} />
                              Editor font
                            </div>
                            <FontPicker
                              value={settings.editorFont}
                              onChange={(v) => onChange("editorFont", v)}
                            />
                          </motion.div>

                          <motion.div variants={rowItem}>
                            <SettingsRow
                              label="Font size"
                              description="Adjust the editor text size."
                              icon={ALargeSmall}
                            >
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    onChange(
                                      "editorFontSize",
                                      Math.max(FONT_SIZE_MIN, settings.editorFontSize - 1)
                                    )
                                  }
                                  className="w-[24px] h-[24px] rounded-md flex items-center justify-center
                                             border border-border text-editor-text/50 hover:text-editor-text
                                             hover:bg-black/[0.03] dark:hover:bg-white/[0.04]
                                             transition-colors duration-150"
                                  aria-label="Decrease font size"
                                >
                                  <Minus className="w-3 h-3" strokeWidth={1.75} />
                                </button>
                                <input
                                  type="range"
                                  min={FONT_SIZE_MIN}
                                  max={FONT_SIZE_MAX}
                                  step={1}
                                  value={settings.editorFontSize}
                                  onChange={(e) =>
                                    onChange("editorFontSize", Number(e.target.value))
                                  }
                                  className="w-[90px] h-1.5 accent-accent"
                                />
                                <button
                                  onClick={() =>
                                    onChange(
                                      "editorFontSize",
                                      Math.min(FONT_SIZE_MAX, settings.editorFontSize + 1)
                                    )
                                  }
                                  className="w-[24px] h-[24px] rounded-md flex items-center justify-center
                                             border border-border text-editor-text/50 hover:text-editor-text
                                             hover:bg-black/[0.03] dark:hover:bg-white/[0.04]
                                             transition-colors duration-150"
                                  aria-label="Increase font size"
                                >
                                  <Plus className="w-3 h-3" strokeWidth={1.75} />
                                </button>
                                <span className="text-[12px] font-medium text-editor-text tabular-nums w-[26px] text-center">
                                  {settings.editorFontSize}
                                </span>
                              </div>
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
                          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
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
                              <FolderSelect
                                folders={folders}
                                selectedId={settings.defaultFolderId}
                                onChange={(id) => onChange("defaultFolderId", id)}
                              />
                            </SettingsRow>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 py-2.5 border-t border-border text-[11px] text-editor-text/35 tracking-[-0.005em] shrink-0">
                  <span>Changes are saved automatically.</span>
                  <a
                    href="https://github.com/M0-kii/OpenNotes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-editor-text/25 hover:text-editor-text/50 transition-colors duration-150"
                    aria-label="OpenNotes on GitHub"
                  >
                    <Github className="w-[14px] h-[14px]" strokeWidth={1.75} />
                  </a>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function FolderSelect({
  folders,
  selectedId,
  onChange,
}: {
  folders: Folder[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const selected = selectedId
    ? folders.find((f) => f.id === selectedId)
    : null;

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 text-[12px] bg-editor-bg border border-border rounded-md
                   px-2.5 py-1.5 text-editor-text outline-none
                   hover:border-editor-text/20
                   focus:border-accent/40 transition-colors duration-150 min-w-[170px]"
      >
        <span className="flex-1 text-left truncate">
          {selected ? selected.name : "Use current selection"}
        </span>
        <motion.div
          animate={{ rotate: menuOpen ? 180 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-editor-text/35" strokeWidth={1.75} />
        </motion.div>
      </button>
      <AnimatePresence>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-full mt-1 z-50 w-full min-w-[200px]
                         bg-editor-bg border border-border rounded-lg shadow-lg
                         overflow-hidden py-0.5"
            >
              <button
                onClick={() => {
                  onChange(null);
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] tracking-[-0.01em]
                           transition-colors duration-100
                           ${
                             selectedId === null
                               ? "bg-accent-soft text-accent font-medium"
                               : "text-editor-text/70 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                           }`}
              >
                Use current selection
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onChange(f.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] tracking-[-0.01em]
                             transition-colors duration-100
                             ${
                               selectedId === f.id
                                 ? "bg-accent-soft text-accent font-medium"
                                 : "text-editor-text/70 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                             }`}
                >
                  {f.name}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
