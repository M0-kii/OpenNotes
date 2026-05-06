# OpenNotes — Agent Guide

A local-first, cross-platform (macOS/Windows/Linux) notes app inspired by macOS Notes. Built greenfield in 2026-05.

Read `Overview.md` for the original product brief. The full architecture and folder rationale lives in the approved plan at `~/.claude/plans/read-overview-md-and-plan-snug-ember.md` — consult it before making structural changes.

---

## Tech Stack (locked)

- **Tauri 2.x** (desktop shell, Rust)
- **React 19 + Vite + TypeScript** (frontend)
- **Tailwind v4** + CSS variables (styling)
- **Radix via shadcn/ui** (primitives — never hand-roll dialog/menu/tooltip/popover)
- **SQLite via `@tauri-apps/plugin-sql`** (local persistence)
- **Zustand** (UI state cache; SQLite is source of truth)
- **lucide-react** icons (16/20px, stroke 1.5 — no emoji as UI)
- **pnpm** (package manager — never npm/yarn)

---

## Where to Implement What

```
src/
├── main.tsx, App.tsx        → entry + root composition only, no logic
├── styles/
│   ├── tokens.css           → CSS variables (light + dark). All color lives here.
│   └── globals.css          → Tailwind import + base resets
├── components/
│   ├── layout/              → AppShell, Sidebar, EditorPane, EmptyState (structure)
│   ├── sidebar/             → NoteList, NoteListItem, SearchInput, NewNoteButton
│   ├── editor/              → Editor (contenteditable), TitleInput, editor.types.ts
│   ├── theme/               → ThemeProvider, ThemeToggle
│   └── ui/                  → shadcn primitives only — added via `pnpm dlx shadcn add <x>`
├── hooks/                   → React hooks (useNotes, useDebouncedSave, useSearch, useTheme, useKeyboardShortcuts, useActiveNote)
├── db/
│   ├── client.ts            → Database.load() singleton — DO NOT call from components
│   ├── migrations.ts        → schema versioning
│   └── notes.repo.ts        → ALL SQL for notes lives here. Components/hooks call this, never raw SQL.
├── stores/                  → Zustand stores. Mutations: write SQLite first, then update store optimistically.
├── lib/                     → Pure helpers (cn, date, ids, debounce). No React, no SQL.
└── types/                   → Shared TS types (Note, etc.)

src-tauri/
├── tauri.conf.json          → window config, plugin allowlist
├── src/lib.rs               → register tauri_plugin_sql with migrations
└── capabilities/default.json → permission allowlist (sql:default scoped to notes.db)
```

**Adding a feature checklist:**
1. Type → `src/types/`
2. SQL → `src/db/notes.repo.ts`
3. Store action → `src/stores/notesStore.ts`
4. Hook (if reused) → `src/hooks/`
5. Component → matching folder under `src/components/`
6. Wire into `AppShell.tsx`

---

## Conventions

- **Commit per logical change.** One concern per commit. "Add SQLite client + migrations" and "Add notes repo" are two commits, not one. Never bundle scaffold + behavior + style in a single commit.
- **Commit message style:** lowercase imperative subject, ≤72 chars. Body explains *why*. Co-author trailer for Claude work.
- **No raw color literals** in components — no `text-white`, `bg-black`, `bg-blue-500`, no hex, no rgb. Colors come from `tokens.css` via Tailwind's `@theme` mapping. Components consume tokens.
- **No external rich-text editors** (TipTap / Slate / Quill / Lexical). The editor is custom contenteditable. Per `Overview.md`, this is non-negotiable.
- **SQLite is source of truth.** Never let UI state diverge — write to DB first, then update store.
- **Auto-save, no save button.** Debounce 400ms after last keystroke; flush on window blur.

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
pnpm tauri dev      # dev window
pnpm tauri build    # production bundle
```

The SQLite file lives in the OS app-data dir (`~/Library/Application Support/com.opennotes.app/notes.db` on macOS). To wipe local state, delete that file.

---

## Out of Scope (MVP)

Rich text formatting, folders/tags, cloud sync, markdown import/export, FTS5 search. The editor abstraction (`editor.types.ts`) is structured to accept rich text later without a schema break.
