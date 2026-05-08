# Draft: Multi-Feature Batch (11 Tasks)

## Requirements (from user message)
1. Keep CLAUDE.md updated
2. Settings modal not centered in app window
3. + button popup goes behind editor window (z-index)
4. Make mindmap editor match mindmap.md spec
5. Create GitHub issues from roadmap.md sections
6. Drag notes/mindmaps to folders to move them; drag to editor for Snap Layouts
7. Note content disappearing after typing (but title stays)
8. Add collapse/expand to Sidebar like FoldersSidebar
9. Add contrast settings to Appearance tab
10. Add context menu to Sidebar and FoldersSidebar (New folder, New note, New mindmap)
11. Add Discord Rich Presence with settings toggle

## Clarified Answers
- Task 2: Settings centering is STILL BROKEN despite the layout prop fix. Need to investigate further.
- Task 6: Snap Layouts = Windows 11-style window snapping. Drag notes to editor to open side-by-side/split view panels.
- Task 9: Accessibility presets (high contrast, larger text, reduced motion, etc.) — not just a simple toggle.
- Task 5: roadmap.md is "inspiration" — rewrite it with proper [ ] checkbox sections, then create GitHub issues from each.

## Research Findings

### Task 3: Popup Z-Index Bug
**Root cause**: `.glass` class (index.css:190) applies `backdrop-filter: blur(20px)` which creates a CSS stacking context per spec. The NoteTypePopup (z-50, position:absolute) is trapped inside the Sidebar's stacking context, while the Editor (a DOM sibling that comes later) paints on top by DOM order. Fix: React portal + position:fixed computed from button's bounding rect.

### Task 4: Mindmap Gap Analysis
Current covers ~15-20% of mindmap.md spec. Critical missing items:
- Data model (childrenIds[], collapsed, style, timestamps, dict-based storage, rootId)
- Radial layout mode (only top-down/left-right exist)
- Undo/redo system (completely absent)
- Collapse/expand branches
- Drag-to-reparent (drag only moves position, not hierarchy)
- Keyboard shortcuts (Enter=child, Tab=indent, Ctrl+F=search)
- Performance (no viewport culling, virtual rendering, debounce)

### Task 6: Snap Layouts
App.tsx already has split-view infrastructure! (splitNoteId, activePane, rightNote, splitRatio, SplitDivider). The feature needs: drag-from-sidebar-to-editor gesture that opens note in a split pane via existing `openInSplit()` callback.

### Task 7: Content Disappearing
Awaiting bug investigation results.

### Task 11: Discord RPC
Use `discord-rich-presence` v1.1.0 crate (MIT, 258K+ downloads) directly with custom Tauri commands. ~80 lines of Rust glue. No special Tauri permissions needed. Settings toggle via `discordRpcEnabled` boolean key. Frontend calls via `invoke()`.

## Open Questions
- Task 7: Content disappearing bug — awaiting explore agent
- Task 2: Settings centering still broken — need fresh investigation
- Task 5: Roadmap — user wants me to rewrite with [ ] checkboxes, then create issues

## Scope Boundaries
- IN: All 11 tasks as described
- OUT: Rich text formatting, cloud sync, markdown import/export
- Mindmap: Incremental improvements prioritized (data model → radial → undo → collapse → reparent), not full spec compliance
