import { useEffect } from "react";
import { MotionGlobalConfig } from "framer-motion";
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

  // Accessibility: High Contrast
  useEffect(() => {
    const root = document.documentElement;
    if (settings.highContrast) {
      root.setAttribute("data-high-contrast", "");
    } else {
      root.removeAttribute("data-high-contrast");
    }
  }, [settings.highContrast]);

  // Accessibility: Larger Text
  useEffect(() => {
    const root = document.documentElement;
    if (settings.largerText) {
      root.setAttribute("data-larger-text", "");
    } else {
      root.removeAttribute("data-larger-text");
    }
  }, [settings.largerText]);

  // Accessibility: Reduced Motion
  useEffect(() => {
    const root = document.documentElement;
    if (settings.reducedMotion) {
      root.setAttribute("data-reduced-motion", "");
    } else {
      root.removeAttribute("data-reduced-motion");
    }
    MotionGlobalConfig.skipAnimations = settings.reducedMotion;
  }, [settings.reducedMotion]);

  return null;
}
