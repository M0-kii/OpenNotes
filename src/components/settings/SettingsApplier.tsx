import { useEffect } from "react";
import type { Settings } from "../../types";
import {
  EDITOR_WIDTH_MAP,
  FONT_OPTIONS,
  LINE_HEIGHT_MAP,
} from "../../lib/settings";

interface Props {
  settings: Settings;
}

function resolveFontStack(key: Settings["editorFont"] | Settings["uiFont"]): string {
  return (
    FONT_OPTIONS.find((f) => f.key === key)?.cssStack ??
    FONT_OPTIONS[0].cssStack
  );
}

function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

export default function SettingsApplier({ settings }: Props) {
  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(settings.theme);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings.theme]);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty(
      "--ui-font-family",
      resolveFontStack(settings.uiFont)
    );
    root.setProperty(
      "--editor-font-family",
      resolveFontStack(settings.editorFont)
    );
    root.setProperty("--editor-font-size", `${settings.editorFontSize}px`);
    root.setProperty(
      "--editor-line-height",
      String(LINE_HEIGHT_MAP[settings.editorLineHeight])
    );
    root.setProperty(
      "--editor-max-width",
      EDITOR_WIDTH_MAP[settings.editorWidth]
    );
  }, [
    settings.uiFont,
    settings.editorFont,
    settings.editorFontSize,
    settings.editorLineHeight,
    settings.editorWidth,
  ]);

  return null;
}
