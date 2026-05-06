# ISSUE FORMAT TEMPLATE (REFERENCE)

Every issue must follow this exact structure:

Title: <short clear action>

Goal:
<what this feature should achieve>

Implementation Notes:
- <bullet steps or ideas>
- <agent is allowed to decide exact implementation>

Constraints:
- <important limits or rules if any>

Labels: <comma separated tags>

---

# OpenNotes Roadmap

## Already Done

- [x] Local-first notes app with Tauri v2 + React 19 + SQLite
- [x] Note CRUD (create, edit, delete, rename)
- [x] Folders system with drag-to-reorder
- [x] Note reordering via drag-and-drop
- [x] Mind map editor (canvas-based nodes, SVG connections, pan/zoom)
- [x] Auto-save with 400ms debounce
- [x] Light/dark theme with system detection
- [x] Settings dialog (Appearance, Editor, Folders, Mind Map tabs)
- [x] Search across notes
- [x] Split-pane view (side-by-side notes)
- [x] Custom context menus (Radix-based, no native browser menus)
- [x] Platform-aware title bar (macOS traffic lights / Windows caption buttons)
- [x] Sidebar collapse/expand (folders sidebar with animated toggle)

## To Do

- [ ] Accessibility presets (high contrast, larger text, reduced motion)
- [ ] Mind map improvements (radial layout, undo/redo, collapse/expand branches, drag-to-reparent, keyboard shortcuts)
- [ ] Snap Layouts (drag notes to editor edges for Windows 11-style split view)
- [ ] Discord Rich Presence
- [ ] Context menu additions (new note/new folder options in right-click menus)
- [ ] Note content persistence improvements (edge cases, recovery from crashes)

## Out of Scope

- [ ] User accounts and authentication
- [ ] Cloud sync
- [ ] Markdown import/export
- [ ] Rich text formatting (bold, italic, headings, etc.)
- [ ] AI features (summarize, rewrite)
