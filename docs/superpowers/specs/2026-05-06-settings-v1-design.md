# Settings v1 — Design Spec

## Context

OpenNotes currently has no settings surface. Theme is toggled via a stand-alone button in chrome; everything else (editor typography, layout width, folder behavior) is hardcoded. We need a real Settings panel so users can shape the app to their writing preferences without us shipping a new build for every taste preference.

This is the first settings surface, so the design also has to set the *pattern* — how settings are stored, how they render, how they apply at runtime — for everything we'll add later (shortcuts, sync, export, etc.).

Scope is intentionally small: **seven settings, one panel, one persistence story.** Everything else waits for real demand.

## Settings Included (v1)

| # | Setting | Type | Default | Notes |
|---|---|---|---|---|
| 1 | Theme | `'light' \| 'dark' \| 'system'` | `'system'` | Replaces current toggle button as canonical control. Toggle remains in chrome. |
| 2 | Editor font | enum (curated list) | `'system'` | Curated bundled set, see below. |
| 3 | Editor font size | number (px) | `16` | Range 12–22, step 1. |
| 4 | Editor line height | enum: `'tight' \| 'normal' \| 'relaxed'` | `'normal'` | Maps to 1.4 / 1.6 / 1.8. |
| 5 | Editor width | enum: `'narrow' \| 'comfortable' \| 'wide'` | `'comfortable'` | Maps to 640px / 760px / 920px max-width. |
| 6 | Show folder note counts | boolean | `true` | Toggles count badge in `FoldersSidebar`. |
| 7 | Default new-note folder | folder id `\| null` | `null` | When null, new notes land in current filter or "All Notes". |

(Yes, that's seven entries — the table groups Tier 1 + Tier 2 from the discussion.)

## Curated Font Set (v1)

Bundled fonts, all OFL-licensed unless noted:

1. **System** — `-apple-system, system-ui, "Segoe UI", sans-serif`. Yields SF Pro on macOS, Segoe UI on Windows. Not bundled.
2. **Geist** — modern sans, our existing display font.
3. **Heebo** — Hebrew + Latin variable.
4. **Lora** — writing serif.
5. **Fraunces** — display serif (variable).
6. **JetBrains Mono** — monospace, already bundled.

Total bundle delta: ~1.5–2 MB (variable fonts only).

A future v2 will add a "Use system font…" picker that enumerates installed fonts via a Tauri command. Not in v1.

## Architecture

### Data flow

```
SQLite (settings table)  ←──  settingsRepo  ←──  useSettings hook  ←──  components
                                    ↓
                          applies CSS variables to :root
```

- **Source of truth:** SQLite, single-row `settings` table (key/value or wide-row — see Storage).
- **In-memory cache:** Zustand store, hydrated on app boot before first paint.
- **Application:** A `<SettingsApplier />` component (mounted in `App.tsx`) reads the store and writes CSS variables (`--editor-font`, `--editor-font-size`, `--editor-width`, etc.) to `document.documentElement`. Components consume tokens, never the store directly for styling.
- **Mutation:** UI calls `useSettings().setX(value)`. Store writes to SQLite first, then updates the cache. Same pattern as notes/folders.

### Storage

New table:

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Key/value with JSON-encoded values. Survives schema changes better than a wide row, and we can add settings without migrations. Migration adds the table; defaults are applied lazily (read returns default if key absent).

### Files to create

```
src/
├── components/
│   ├── settings/
│   │   ├── SettingsDialog.tsx          # Radix Dialog wrapper, ⌘, to open
│   │   ├── SettingsSection.tsx         # Section heading + children
│   │   ├── SettingsRow.tsx             # Label + control + optional description
│   │   ├── FontPicker.tsx              # Visual font picker (each option in its own face)
│   │   ├── SegmentedControl.tsx        # Reusable segmented chooser (line height, width)
│   │   └── SettingsApplier.tsx         # Mounts CSS vars to :root
├── db/
│   └── settings.repo.ts                # get/set/getAll for settings
├── hooks/
│   └── useSettings.ts                  # Reads store, exposes typed setters
├── stores/
│   └── settingsStore.ts                # Zustand: cache + mutators
├── types/
│   └── settings.ts                     # Settings shape, defaults, validators
├── lib/
│   └── settings-defaults.ts            # Default values, font option list
└── styles/
    └── fonts.css                       # @font-face for bundled fonts (split from index.css)
```

### Files to modify

- `src/App.tsx` — mount `<SettingsApplier />`, wire ⌘, shortcut.
- `src/components/Editor.tsx` — replace hardcoded font sizes/widths with CSS variables (`var(--editor-font-size)`, `var(--editor-font-family)`, `max-width: var(--editor-width)`).
- `src/components/ThemeToggle.tsx` — keep, but make it write through `useSettings().setTheme` so it's reflected in the panel.
- `src/components/FoldersSidebar.tsx` — read `showNoteCounts` setting; conditionally render badge.
- `src/db/migrations.ts` — add migration for `settings` table.
- `src/components/sidebar/Sidebar.tsx` — when creating a note, use `defaultFolderId` setting if no folder filter is active.
- `src/index.css` — extract `@font-face` rules to `fonts.css`, add new font face declarations.

## UI

### Entry points
- **⌘,** keyboard shortcut (standard Mac convention; we honor it on all platforms).
- A **gear icon** button in the existing chrome — small, low-visual-weight, near the theme toggle. Both surface the same dialog.

### Dialog layout (Things-3 lane)
- Centered modal, 560px wide, `--bg-elevated`, `--radius-lg`, hairline border, subtle elevation shadow.
- Single-pane (no left sidebar — five settings doesn't earn nav).
- Sections: **Appearance** · **Editor** · **Folders**.
- Each row: label left, control right, optional muted helper line below.
- Footer: ⌘W or ESC to close. No "Save" button — settings apply *immediately* (and persist immediately).
- Light & dark designed in parallel.

### Font picker (the one bespoke control)
Each font option renders its own name *in that font*, with a sample line ("The quick brown fox") below it in muted text. Selected option has accent-tinted ring and check. Vertical list, scrollable if needed. ~64px row height.

### Motion
- Dialog enter: 180ms ease-out, scale 0.98 → 1, opacity 0 → 1. Standard Radix transition.
- Setting changes apply with `transition: all 120ms ease-out` on relevant CSS vars (font-size, max-width). No flash on theme change.

### Accessibility
- Full keyboard navigation (Tab, Arrow within segmented controls).
- ESC closes.
- Focus ring uses accent at 35% opacity per global rules.
- `prefers-reduced-motion` respected on dialog transition.

## Error Handling

- DB read failure on boot → fall back to defaults, log to console, continue rendering. Settings panel shows banner: "Couldn't load saved preferences."
- DB write failure → toast (sonner): "Couldn't save preference." Revert optimistic update.
- Invalid stored value (e.g., font name not in current curated list) → silently fall back to default for that key, overwrite stored value with default on next write.

## Testing / Verification

1. **Cold boot test** — fresh DB. App launches with all defaults. No flash of unstyled content.
2. **Persistence test** — change each setting, quit app, relaunch. Each setting persists.
3. **Theme test** — set to "system", change OS theme, app updates without restart.
4. **Font test** — switch through all 6 fonts. Verify each renders in its own face in the picker AND in the editor immediately.
5. **Width test** — narrow / comfortable / wide all render with smooth transition, no layout jump.
6. **Shortcut test** — ⌘, opens dialog. ESC closes. Works on all platforms.
7. **Folder count toggle** — turning off removes badge from sidebar without re-render flicker.
8. **Default folder test** — set a default folder. Open app with no filter. Click "+ New". Note lands in the default folder.
9. **Migration test** — existing user (notes.db without `settings` table) opens new build, table is created, defaults apply, no data loss.
10. **Light & dark visual pass** — every section reviewed in both themes against the global aesthetic rules.

## Out of Scope (defer to v2+)

- "Use system font…" picker (Tauri command + Rust enumeration via `font-kit`).
- Custom shortcuts.
- Backup/export.
- Per-folder defaults.
- Spell-check toggle, date format, sync, anything not in the seven rows above.
