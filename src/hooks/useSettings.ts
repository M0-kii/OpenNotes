import { useCallback, useEffect, useState } from "react";
import type { Settings } from "../types";
import { DEFAULT_SETTINGS, coerceSetting } from "../lib/settings";
import { getAllSettings, setSetting } from "../lib/db";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getAllSettings();
        if (cancelled) return;
        const next: Settings = { ...DEFAULT_SETTINGS };
        (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).forEach((k) => {
          if (k in raw) {
            // coerceSetting narrows by key — TS can't follow that across
            // the dynamic Object.keys iteration, hence the assignment.
            (next as unknown as Record<string, unknown>)[k] = coerceSetting(
              k,
              raw[k]
            );
          }
        });
        setSettings(next);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((s) => {
        const prev = s[key];
        // optimistic update; revert on failure below
        setSetting(key, value).catch(() => {
          setSettings((curr) => ({ ...curr, [key]: prev }));
        });
        return { ...s, [key]: value };
      });
    },
    []
  );

  return { settings, isLoaded, error, update };
}
