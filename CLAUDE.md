# OpenNotes — Agent Guide

A local-first notes app (macOS/Windows/Linux) with folders, mind maps, and a contenteditable editor. Built greenfield in 2026-05.

Read `Overview.md` for the original product brief.

---

## Tech Stack (locked)

- **Tauri 2.x** (desktop shell, Rust)
- **React 19 + Vite + TypeScript** (frontend)
- **Tailwind v4** + CSS variables (styling)
- **Radix primitives** (Dialog, ContextMenu) — never hand-roll dialog/menu/tooltip/popover
- **SQLite via `@tauri-apps/plugin-sql`** (local persistence)
- **@dnd-kit/core + @dnd-kit/sortable** (drag-and-drop reordering)
- **framer-motion 12** (animations)
- **lucide-react** icons (16/20px, stroke 1.5 — no emoji as UI)
- **pnpm** (package manager — never npm/yarn)

---

## Where to Implement What

```
src/
├── main.tsx                   → entry point
├── App.tsx                    → root composition + routing, no domain logic
├── styles/
│   ├── tokens.css             → CSS variables (light + dark). All color lives here.
│   └── globals.css            → Tailwind import + base resets
├── components/
│   ├── settings/
│   │   ├── SettingsDialog.tsx  → tabs: Appearance, Editor, Folders, Mind Map
│   │   ├── SettingsRow.tsx     → single setting row (label, description, control)
│   │   ├── SegmentedControl.tsx→ A/B toggle (e.g. "Note" | "Mind Map")
│   │   ├── FontPicker.tsx      → font dropdown with preview
│   │   └── SettingsApplier.tsx → applies theme/font/scale/accessibility CSS data-* attributes to <html>
│   ├── ui/
│   │   ├── GenericContextMenu.tsx  → Radix ContextMenu wrapper for rename/delete on notes & folders
│   │   ├── InputContextMenu.tsx    → Cut/Copy/Paste/Select All for <input>/<textarea>
│   │   ├── EditorContextMenu.tsx   → context menu for the editor contenteditable
│   │   └── NoteTypePopup.tsx       → popup below + button to choose "Note" or "Mind Map" (renders via createPortal to document.body)
│   ├── Sidebar.tsx            → note list with search, sortable drag-and-drop, collapse/expand, drag-to-folder, drag-to-editor (snap layouts), + button with NoteTypePopup
│   ├── FoldersSidebar.tsx     → folder list with sortable drag-and-drop, inline rename, useDroppable for folder drop targets
│   ├── SearchBar.tsx          → search input wrapped with InputContextMenu
│   ├── Editor.tsx             → contenteditable editor + title input, both with context menus
│   ├── TitleBar.tsx           → macOS-style traffic lights or Windows caption buttons
│   ├── ThemeToggle.tsx        → light / dark / system toggle
│   ├── SplitDivider.tsx       → resize handle for split-pane mode
│   ├── ConfirmDialog.tsx      → Radix AlertDialog for destructive confirmations
│   ├── ErrorBoundary.tsx      → React error boundary
│   └── MindmapEditor.tsx      → canvas-based mind map with nodes, SVG connections, pan/zoom, radial layout, depth-aware coloring
├── hooks/
│   ├── useNotes.ts            → note CRUD, search, reorder, debounced save
│   ├── useFolders.ts          → folder CRUD, reorder
│   └── useSettings.ts         → load/update settings from SQLite
├── lib/
│   ├── db.ts                  → ALL SQL (initDb, CRUD for notes/folders/settings, reorder, moveNoteToFolder, migrations)
│   ├── settings.ts            → DEFAULT_SETTINGS + coercion for each key
│   └── utils.ts               → cn() + generateId() helpers
└── types/
    └── index.ts               → Note, Folder, Settings, MindmapNode, etc.

src-tauri/
├── tauri.conf.json            → window config, plugin allowlist
├── src/lib.rs                 → register tauri_plugin_sql + discord_rpc commands
├── src/discord_rpc.rs         → Discord Rich Presence integration
└── capabilities/default.json → permission allowlist (sql:default scoped to notes.db)
```

**Adding a feature checklist:**
1. Type → `src/types/index.ts`
2. SQL → `src/lib/db.ts`
3. Hook → `src/hooks/`
4. Component → matching folder under `src/components/`
5. Wire into `App.tsx`

---

## Data Model

### notes table
```
id           TEXT PRIMARY KEY
title        TEXT NOT NULL DEFAULT ''
content      TEXT NOT NULL DEFAULT ''   (JSON string for mind maps)
folder_id    TEXT REFERENCES folders(id)
position     INTEGER NOT NULL DEFAULT 0  (sort order)
note_type    TEXT NOT NULL DEFAULT 'note'  ('note' | 'mindmap')
created_at   TEXT NOT NULL
updated_at   TEXT NOT NULL
```

### folders table
```
id           TEXT PRIMARY KEY
name         TEXT NOT NULL
is_default   INTEGER NOT NULL DEFAULT 0
position     INTEGER NOT NULL DEFAULT 0  (sort order)
created_at   TEXT NOT NULL
updated_at   TEXT NOT NULL
```

### settings table
```
key          TEXT PRIMARY KEY
value        TEXT NOT NULL
updated_at   INTEGER NOT NULL
```

### Mind map data (stored as JSON in notes.content)
```ts
MindmapNode { id, text, parentId, x, y }
MindmapData { nodes: MindmapNode[] }
```

### Current Settings keys
`theme`, `titlebarStyle`, `uiFont`, `editorFont`, `editorFontSize`, `editorLineHeight`, `editorWidth`, `showFolderCounts`, `defaultFolderId`, `mindmapLayout`, `discordRpcEnabled`, `highContrast`, `largerText`, `reducedMotion`

---

## Conventions

- **Commit per logical change.** One concern per commit. Never bundle scaffold + behavior + style in a single commit.
- **Commit message style:** lowercase imperative subject, ≤72 chars. Body explains *why*.
- **No raw color literals** in components — no `text-white`, `bg-black`, `bg-blue-500`, no hex, no rgb. Colors come from `tokens.css` via Tailwind's `@theme` mapping. Components consume tokens.
- **No external rich-text editors** (TipTap / Slate / Quill / Lexical). The editor is custom contenteditable. Per `Overview.md`, this is non-negotiable.
- **SQLite is source of truth.** Never let UI state diverge — write to DB first, then update optimistic state.
- **Auto-save, no save button.** Debounce 400ms after last keystroke; flush on window blur.
- **Context menus are custom.** Never use native browser context menus. The root `<div>` in `App.tsx` calls `e.preventDefault()` on `onContextMenu`. Use `GenericContextMenu` for list items, `InputContextMenu` for inputs, `EditorContextMenu` for the editor.
- **Drag-and-drop** uses `@dnd-kit`. Always use `PointerSensor` with 5px activation distance. Use grip handles (GripVertical icon, visible on hover via `group-hover`). Never apply framer-motion's `layout` prop to sortable items — it conflicts with dnd-kit's transform.
- **DB migrations** are inline in `lib/db.ts` — `ALTER TABLE` wrapped in try/catch to swallow "duplicate column" errors for idempotency.

---

## Aesthetic (project-specific)

Inherits the global rules in `~/.claude/CLAUDE.md`. Project specifics:

- **Lane:** Things 3 / Apple Notes — warm near-white & near-black, generous whitespace.
- **Radii:** ~10px default (`--radius` = 10px), 6 for inputs, 14 for cards, 20 for sheets.
- **Accent:** single warm amber (proposal: `--accent: 35 80% 55%`). Used sparingly — primary action only.
- **Borders carry hierarchy.** No shadows except on true elevation (modals, menus, command palette).
- **Light & dark are equal citizens.** Every component designed for both from day one.
- **Display font:** Geist or SF Pro Display. Never Inter or system-ui as display.
- **Motion:** 120–250ms, ease-out. Respect `prefers-reduced-motion`.

---

## Build & Run

```bash
pnpm install
pnpm tauri dev          # debug build with hot-reload
pnpm tauri build        # production bundle
pnpm exec tsc --noEmit  # type-check only
```

The SQLite file lives in the OS app-data dir (`~/Library/Application Support/com.opennotes.app/notes.db` on macOS). To wipe local state, delete that file.

---

## Out of Scope (current)

Rich text formatting, cloud sync, markdown import/export, FTS5 search. Note types and folder system already implemented.
