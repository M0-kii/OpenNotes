# OpenNotes

OpenNotes is a desktop app for notes, mind maps, and todo lists. It stores your
notes on your computer in SQLite. You don't need an account.

You can organize notes in folders, link them with `[[wikilinks]]`, and work in
tabs or side-by-side panes. The editor supports Markdown shortcuts, tables, code
blocks, and slash commands. There are also reminders, favorites, trash and
restore, and settings for themes and typography.

## Run it locally

Install Node.js, pnpm, Rust, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
for your system, then run:

```sh
pnpm install
pnpm tauri dev
```

`pnpm dev` starts just the frontend. Use the desktop app to work with notes;
database access and other native features need Tauri.

## Development

The app uses React, TypeScript, Vite, and Tailwind, with Tauri handling the desktop
window and native plugins.

```sh
pnpm test        # Run the test suite
pnpm typecheck   # Check TypeScript
pnpm build       # Build the frontend
pnpm tauri build # Build the desktop app
```

See [the architecture notes](docs/architecture.md) for the save flow and code
layout, [mind maps](docs/mindmaps.md) for their data format, and
[the roadmap](roadmap.md) for upcoming work.

## Your data

Notes save automatically after a short pause. If a save fails, OpenNotes keeps
the edits pending, retries, and shows a message with a **Retry now** button. When
you close the window, it waits for pending saves. If they fail, the window stays
open.

Unsaved drafts are also kept in the app's local storage and recovered on startup
for notes that still exist. Clearing that storage removes pending drafts.

The database is `opennotes.db` in the app-data directory for `com.opennotes.app`.
Regular notes contain Markdown; mind maps and todo lists contain JSON. Draft
recovery isn't a backup, so keep a copy of the database before changing local
data manually.

## License

OpenNotes is licensed under [GPL-3.0-or-later](LICENSE).
