# Architecture

OpenNotes runs a React frontend inside a Tauri desktop window. SQLite stores
notes, folders, links, reminders, and settings. The frontend talks to the database
through `src/lib/db.ts`, which also handles schema setup and migrations.

## Saving notes

`useNotes` updates the visible note immediately and queues title and body changes
in `NoteSaveQueue`. After 400 milliseconds without another edit, the queue writes
them to SQLite. Writes run in order. An edit leaves the queue only after its full
write succeeds, and a completed write cannot clear a newer edit.

Failed saves stay in the queue and retry with a delay that increases to a maximum
of 30 seconds. Database reads merge pending edits back into the results so a
refresh doesn't replace what the user just typed.

`draftRecovery.ts` stores pending drafts in localStorage under
`opennotes-pending-drafts-v1`. Startup restores drafts for existing notes,
including notes in the trash. The journal is cleared when the save queue is empty.

`useSaveLifecycle` asks editors to collect any remaining DOM changes before
flushing. Native close requests wait for that flush, and the window closes only
when it succeeds. Losing focus or hiding the window also triggers a flush.

## The editor

`RichEditor` handles a contenteditable surface, selections, keyboard input, and
composition events. `editorDom.ts` contains Markdown shortcuts and caret helpers.
`markdownUtils.ts` converts between Markdown and HTML with Marked and Turndown,
and sanitizes HTML with DOMPurify.

Tables are stored as HTML blocks inside Markdown to preserve their cell
structure. Wikilinks keep both their target and optional alias. Code highlighting
labels and other editor controls are removed before saving.

## Code layout

| Area | Files |
| --- | --- |
| App composition | `src/App.tsx` |
| Tabs, panes, and split sizing | `src/hooks/useEditorWorkspace.ts` |
| Notes and saving | `src/hooks/useNotes.ts`, `src/lib/noteSaveQueue.ts` |
| Recovery and closing | `src/lib/draftRecovery.ts`, `src/hooks/useSaveLifecycle.ts` |
| Folders | `src/hooks/useFolders.ts` |
| Settings | `src/hooks/useSettings.ts`, `src/lib/settings.ts` |
| Database queries and migrations | `src/lib/db.ts` |
| Rich-text editor | `src/components/editor/` |
| Mind-map data and operations | `src/lib/mindmap/` |
| Mind-map UI | `src/components/MindmapEditorV2.tsx`, `src/components/MindmapV2/` |
| Desktop startup and Discord presence | `src-tauri/src/` |

The legacy mind-map editor remains available for older data and the editor
setting. Shared UI components use Radix and the theme variables in `src/index.css`.

## Checks

Run `pnpm test` and `pnpm build` before submitting code changes. The tests cover
save failures, concurrent edits, draft recovery, close handling, and editor
round trips. They use jsdom and mocked native APIs, so desktop changes also need
a check in the native app.
