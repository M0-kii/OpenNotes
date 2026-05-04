# OpenNotes — Project Guide for Agents

**Product north star: Apple Notes clone.** When in doubt about a UX
decision, open Apple Notes on macOS and copy the behavior. This is not
a markdown / power-user notes app (Obsidian, Linear, Things 3) — it is
Apple Notes parity, with our own visual polish on top.

A local-first desktop notes app. Tauri 2 shell, React 18 + TypeScript
frontend, SQLite via `@tauri-apps/plugin-sql`. Apple-soft visual
direction: JetBrains Mono for mono, glass sidebar, generous radii,
quiet motion. Light and dark are equal citizens.

The global `~/.claude/CLAUDE.md` sets the design floor (tokens, motion,
typography). This file adds project-specific context only.

## Product principles (Apple Notes parity)

- **Editor is rich-text WYSIWYG** (TipTap on ProseMirror) — no markdown
  source mode, no edit/preview toggle, no code-fence or wiki-link
  shortcuts that Apple Notes doesn't have.
- **Auto-save without ceremony** — no "saved" indicator that draws
  attention. Persistence should feel invisible.
- **Native chrome** — custom titlebar with traffic lights inset,
  system materials where the platform supports them, sidebar
  proportions that mirror Apple Notes.
- **Organization**: folders + pinning before tags.

## Stack

- **Shell**: Tauri 2 (Rust) — `src-tauri/`
- **Frontend**: React 18.3 + TypeScript 5.6 (strict) + Vite 6
- **Styling**: Tailwind 3.4 + CSS variables in `src/index.css`
- **DB**: SQLite via `@tauri-apps/plugin-sql` (no custom Tauri commands yet)
- **Icons**: lucide-react only — no emoji as UI
- **Font**: JetBrainsMono (self-hosted in `public/ttf/`)

## Directory map — where to put things

```
OpenNotes/
├── src/                       # React frontend
│   ├── App.tsx                # Layout shell: Sidebar + Editor
│   ├── main.tsx               # ReactDOM mount
│   ├── index.css              # CSS variables (:root / .dark), @font-face
│   ├── components/            # Presentational + small stateful UI
│   │   ├── Sidebar.tsx        # Note list, search, theme toggle, CRUD chrome
│   │   ├── Editor.tsx         # contenteditable note body
│   │   ├── SearchBar.tsx
│   │   └── ThemeToggle.tsx
│   ├── hooks/
│   │   ├── useNotes.ts        # ⭐ Core app state: CRUD, search, debounced save
│   │   └── useTheme.ts        # localStorage + system-pref theme
│   ├── lib/
│   │   ├── db.ts              # ⭐ All SQLite queries — add new queries HERE
│   │   └── utils.ts           # generateId, formatDate, getNotePreview
│   └── types/index.ts         # Note, Theme
├── src-tauri/
│   ├── src/lib.rs             # Tauri builder — add custom commands HERE
│   ├── src/main.rs            # Thin wrapper around lib.rs
│   ├── tauri.conf.json        # Window (1100×720), SQL preload (sqlite:opennotes.db)
│   ├── Cargo.toml
│   └── capabilities/          # Tauri permissions (SQL allow-list lives here)
├── public/ttf/                # JetBrainsMono font files
├── tailwind.config.js         # Custom tokens (sidebar.*, editor.*, accent, accent-soft, border)
└── index.html
```

⭐ = load-bearing. Read these first when changing app behavior.

## Where to work on what

| Task                              | Touch                                          |
|-----------------------------------|------------------------------------------------|
| Add a note field / column         | `lib/db.ts` (schema + queries) → `types/index.ts` → `hooks/useNotes.ts` → consuming component |
| New SQL query                     | `lib/db.ts` only; expose through `useNotes.ts` |
| New UI surface                    | `components/` + wire into `App.tsx`            |
| Theme / color change              | `src/index.css` (CSS vars) + `tailwind.config.js` — never hardcode in components |
| Editor behavior                   | `components/Editor.tsx` + save flow in `hooks/useNotes.ts` |
| Custom native call (file dialog…) | `src-tauri/src/lib.rs` (`#[tauri::command]`) + capability in `src-tauri/capabilities/` |
| Window / app config               | `src-tauri/tauri.conf.json`                    |

## Conventions

- **Colors**: never hardcode hex/rgb in components. Use CSS variables
  from `index.css` or Tailwind tokens (`sidebar.*`, `editor.*`,
  `accent`, `accent-soft`, `border`). Light and dark must both look
  intentional.
- **TypeScript**: strict mode is on. No `any`. Prefer narrow types.
- **Components**: PascalCase files. Keep them presentational; state
  belongs in `hooks/`.
- **Saves**: editor uses optimistic UI + 500ms debounce → DB
  (`useNotes.ts:88`). When changing the save flow, preserve
  flush-on-unmount and flush-on-note-switch (`useNotes.ts:142,150`).
- **Search**: 200ms debounce, queries title + content
  (`useNotes.ts:54`, `lib/db.ts`).
- **Icons**: lucide-react, 16 or 20px, stroke 1.5 or 2. No emoji.
- **No new dependencies** without a clear reason; prefer the stack above.

## Workflow

- **Commit per logical change.** One concern per commit, with a clear
  message. Don't bundle a refactor with a feature, or two unrelated
  fixes. If you find yourself writing "and" in a commit subject, split it.
- Match the existing commit voice (short, imperative, lowercase).
- Verify before claiming done: `pnpm build` (`tsc && vite build`) must
  pass. For UI work, run `pnpm tauri dev` and exercise the change in
  the desktop window — type-check passing ≠ feature working.

## Scripts

```bash
pnpm install          # first time
pnpm dev              # vite only (browser, no native shell) — :1420
pnpm tauri dev        # full desktop app with SQLite — use this for UI work
pnpm build            # tsc && vite build → dist/
pnpm tauri build      # production desktop bundle
```

## Current state (2026-05-04)

Feature-complete MVP: CRUD, search, light/dark, debounced persistence.
Most recent direction: Apple-soft redesign (commit `cdafa96`) —
JetBrainsMono, glass sidebar, rounded UI. Stay in that lane unless
explicitly redirected.

No custom Tauri commands yet — frontend talks to SQLite directly via
`@tauri-apps/plugin-sql`. Add commands to `lib.rs` only when you need
native capability the plugin doesn't cover.
