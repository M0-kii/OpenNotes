# Learnings - Multi Feature Batch

## Fix: NoteTypePopup Z-stacking Context Trap

**Date**: 2026-05-06

**Problem**: The + button popup (NoteTypePopup) rendered _behind_ the editor window despite having `z-50`. Root cause: the `.glass` CSS class uses `backdrop-filter: blur(20px)`, which creates a CSS stacking context per spec. NoteTypePopup was a DOM child of the Sidebar (which has `.glass`), so its z-index was trapped within the Sidebar's stacking context. The Editor, a later DOM sibling, painted on top.

**Solution**: 
1. Render popup via `ReactDOM.createPortal(..., document.body)` — escapes the Sidebar's stacking context entirely
2. Compute position from `buttonRef.current.getBoundingClientRect()` in a useEffect
3. Use `position: fixed` with calculated `top`/`left` instead of `absolute top-full left-0`
4. Used `z-[9999]` (arbitrarily high Tailwind value) to ensure popup sits above everything

**Key decisions**:
- Component signature/API unchanged — Sidebar parent needs zero modifications
- `AnimatePresence` and all framer-motion animations preserved
- Click-outside-to-close logic unchanged (popupRef + buttonRef checks still work since they're real DOM refs, not position-dependent)
- Early return `if (!open || !position) return null` prevents flash of incorrectly positioned content

**Pattern**: CSS `backdrop-filter` creates a stacking context → children with `z-index` are trapped within that parent. Use React Portals to escape. Use `getBoundingClientRect()` + `position: fixed` for viewport-relative positioning.

## Context menu on empty areas (2026-05-06)

### Pattern: Wrapping scrollable areas in GenericContextMenu
- Wrapped `flex-1 overflow-y-auto` div's children in `GenericContextMenu` for background right-click menus
- FoldersSidebar: `startNewFolder` is a local function (not prop) — used directly since GenericContextMenu is inside component scope
- Sidebar: `onCreate` and `onCreateMindmap` are props — used directly
- Radix ContextMenu.Root nesting: inner context menus on sortable items take precedence over outer background menu on right-click, so no conflict

### Files changed
- `src/components/FoldersSidebar.tsx`: GenericContextMenu with "New folder" (FolderPlus icon) wrapping scrollable content (lines 250-520)
- `src/components/Sidebar.tsx`: Added FileText, GitBranch imports; GenericContextMenu with "New note" and "New mind map" wrapping scrollable content (lines 138-192)

## Roadmap rewrite + GitHub issues (2026-05-06)

**What was done:**
- Rewrote `roadmap.md` from a generic 80-line template (with user accounts, auth, etc.) into a structured roadmap with checkboxes reflecting the actual OpenNotes app state
- Preserved the issue format template at the top of the file
- Created 6 GitHub issues (#23-#28) from the "To Do" sections

**Codebase verification findings:**
- Sidebar collapse/expand is ALREADY implemented in `FoldersSidebar.tsx` (lines 63, 108, 201, 231-242, etc.) with a full `collapsed` state toggle and animated width transitions — moved from "To Do" to "Already Done"
- Sidebar.tsx did NOT have collapse — this was added in task T-01 below
- No `prefers-reduced-motion` support exists anywhere — accessibility presets remain valid TODO
- Mind map has basic nodes, SVG connections, pan/zoom, add/delete but no undo/redo, no radial layout, no collapse/expand branches, no drag-to-reparent — valid TODO
- Context menus for empty background areas were already added in the previous task (learned from lines 23-33 above) — but "New note"/"New folder" in right-click menu on list items (not background) is still TODO

**Issues created (all labeled "enhancement"):**
- #23: Accessibility presets
- #24: Mind map improvements (radial layout, undo/redo, collapse/expand branches, drag-to-reparent, keyboard shortcuts)
- #25: Snap Layouts
- #26: Discord Rich Presence
- #27: Context menu additions (new note/new folder in context menus)
- #28: Note content persistence improvements

**Pattern:** When rewriting roadmap for an existing project, audit the actual codebase against the checklist. Don't trust CLAUDE.md alone — grep for feature implementations to confirm what's done. Sidebar collapse was not mentioned in CLAUDE.md but was fully implemented in code.

## Sidebar Collapse (Task T-01)

**Date:** 2026-05-06
**Pattern replicated from:** FoldersSidebar.tsx (lines 63, 200-248, 250-267)

**Implementation:**
1. Added `ChevronLeft` to lucide-react imports (line 3)
2. Added `const [collapsed, setCollapsed] = useState(false)` after renameInputRef
3. Changed outer `<div>` to `<motion.div>` with `animate={{ width: collapsed ? 48 : 270 }}`
4. Wrapped folder name in `AnimatePresence mode="wait"` with fade+width animation (matching FoldersSidebar)
5. Added ChevronLeft button with 180deg rotate animation on collapse toggle
6. Wrapped + button (with NoteTypePopup), SearchBar, and note list area in `{!collapsed && (...)}`
7. Changed header padding from `px-5` to `px-3` (matching FoldersSidebar) — necessary because at 48px collapsed width, px-5 left only 8px content area, insufficient for the 22px ChevronLeft button

**Key decisions:**
- Header padding changed to `px-3` to match FoldersSidebar and ensure ChevronLeft button fits in collapsed state
- `ml-auto` on ChevronLeft button (same as FoldersSidebar) keeps it right-aligned when title is hidden
- Outer motion.div uses `shrink-0 overflow-hidden` to prevent layout issues during width animation
- Transition: `duration: 0.25, ease: [0.4, 0, 0.2, 1]` — identical to FoldersSidebar

**File modified:** `src/components/Sidebar.tsx` only
**Verification:** `pnpm exec tsc --noEmit` passed with zero errors

## Content-Disappearing Bug Investigation (2026-05-06)

### Root Cause: Race Condition in `flushSave` (useNotes.ts:83-101)

Classic stale-closure-over-async-operations bug. The race sequence:

1. **`saveNoteContent`** (useNotes.ts:103) fires on every keystroke. Does optimistic `setNotes(content: latest)` (line 105-111) AND queues debounced DB write via `pendingSavesRef` (line 112) with 500ms timer (line 114).
2. **`flushSave`** (useNotes.ts:83) fires after 500ms of inactivity. Captures content from `pendingSavesRef` at line 85, immediately clears pending queue at line 86, then awaits async DB write (`db.updateNoteContent`) at line 89.
3. **Critical race**: If user types MORE during the `await`, a new `saveNoteContent` fires — does fresh optimistic `setNotes` with LATEST text AND re-populates `pendingSavesRef`. But in-flight `flushSave` already captured OLD content. When its `await` resolves, it runs `setNotes` with STALE content (lines 90-96), overwriting the newer optimistic update.
4. **Content disappears** because after stale `setNotes` overwrites state, the 3-second interval (Editor.tsx:75) checks `innerText` against `lastContentRef` — they match (both have latest user-typed text) — so interval does NOT re-save. Stale state persists until next keystroke.
5. If user switches notes during this stale-state window, Editor's `useEffect` (line 57-71) sets `editorRef.current.innerText = note.content` (line 62) — resetting DOM to stale content (or empty string in worst case).

### Why Title Survives But Content Doesn't

| Aspect | Title (survives) | Content (disappears) |
|--------|-----------------|---------------------|
| Input type | Controlled (`value={note.title}`, Editor.tsx:205) | Uncontrolled (`contentEditable`, Editor.tsx:244) |
| Save mechanism | `renameNote` (useNotes.ts:151) awaits DB write BEFORE `setNotes` — no stale callback | `flushSave` (useNotes.ts:83) captures content BEFORE async DB write, then `setNotes` AFTER — stale closure |
| State restoration | React manages input value from props — always in sync | DOM independent of React state — can desync |

### Proposed Fix: Versioned Save Tracking

**File**: `src/hooks/useNotes.ts`

1. **Add version counter** (after line 23):
   ```typescript
   const saveVersionRef = useRef<Map<string, number>>(new Map());
   ```

2. **Increment version in `saveNoteContent`** (lines 103-117):
   ```typescript
   const version = (saveVersionRef.current.get(id) ?? 0) + 1;
   saveVersionRef.current.set(id, version);
   ```

3. **Check version in `flushSave`** (lines 83-101) after `await db.updateNoteContent`:
   ```typescript
   const versionsAtStart = new Map(saveVersionRef.current);
   // ... after await ...
   if (saveVersionRef.current.get(id) === capturedVersion) {
       setNotes(/* ... */);
   }
   ```

This ensures stale `flushSave` callbacks are discarded when a newer save was queued during the async DB write.

**Affected files**:
- `src/hooks/useNotes.ts` — PRIMARY BUG. `flushSave` (lines 83-101) + `saveNoteContent` (lines 103-117)
- `src/components/Editor.tsx` — SYMPTOM. Uncontrolled contentEditable (line 244), 3-second interval (line 75), `lastContentRef` guard (line 41)
- `src/App.tsx` — PASS-THROUGH. `saveNoteContent` passed as `onContentChange` (line 338)
- `src/lib/db.ts` — ASYNC OP. `updateNoteContent` (lines 237-247) creates the race window

## Settings Dialog Off-Center Fix (2026-05-06)

### Root Cause: Framer-Motion Transform Conflict

The Settings dialog used BOTH Tailwind centering classes AND framer-motion `scale` animation on the same `motion.div`, creating a deadlock:

1. Tailwind `-translate-x-1/2 -translate-y-1/2` → CSS: `transform: translate(-50%, -50%)`
2. Framer-motion `initial/animate/exit` with `scale: 0.97` / `scale: 1` → inline style: `transform: scale(X)`
3. **Inline styles override CSS classes** → the translate was completely wiped out, leaving the dialog with its top-left corner at 50%/50% (off-center)

### Why the previous fix (removing `layout` prop) didn't work
The `layout` prop was a red herring. The real issue was that ANY framer-motion transform animation (scale, x, y, rotate, etc.) sets inline `transform` on the element, which clobbers the CSS class-based translate. Removing `layout` only removed auto-animated layout transitions — it didn't fix the static transform conflict.

### Fix Applied
Replaced Tailwind classes `-translate-x-1/2 -translate-y-1/2` with framer-motion `x: "-50%", y: "-50%"` in all three animation states (`initial`, `animate`, `exit`):

```tsx
// BEFORE (broken — translate overridden by scale animation)
initial={{ opacity: 0, scale: 0.97 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.97 }}
className="... -translate-x-1/2 -translate-y-1/2 ..."

// AFTER (fixed — framer-motion composites translate + scale into single transform)
initial={{ opacity: 0, scale: 0.97, x: "-50%", y: "-50%" }}
animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
exit={{ opacity: 0, scale: 0.97, x: "-50%", y: "-50%" }}
className="... (no translate classes) ..."
```

Framer-motion composites `x`, `y`, and `scale` into a single `transform: translate(-50%, -50%) scale(X)` — preserving both centering and animation.

### File changed
- `src/components/settings/SettingsDialog.tsx` (line 101-110): Added `x: "-50%", y: "-50%"` to motion states, removed `-translate-x-1/2 -translate-y-1/2` from className

### Pattern
When using Tailwind positioning transforms (`-translate-*`, `scale-*`, `rotate-*`) on a framer-motion element that also animates transform properties (`x`, `y`, `scale`, `rotate`, etc.), always move ALL transforms into framer-motion's animation values. Never split transforms between Tailwind classes and framer-motion — one will overwrite the other.

### Verification
- `pnpm exec tsc --noEmit`: passed with zero errors
- Dialog uses `Dialog.Portal` (renders to `document.body`), so no parent `overflow-hidden` or `backdrop-filter` containing-block issues
- Overlay (`backdrop-blur-[2px]`) is a sibling, not parent — no containing-block trap

## Accessibility Presets (2026-05-06)

### Implementation Summary
Added three accessibility toggles to the Appearance tab in SettingsDialog:

1. **High Contrast**: Toggles `data-high-contrast` attribute on `<html>`. CSS overrides `--border` and `--sidebar-text-secondary` CSS variables to higher-opacity values. Dark mode variant handled via `.dark[data-high-contrast]`.

2. **Larger Text**: Toggles `data-larger-text` attribute on `<html>`. CSS sets `font-size: 120%` on `[data-larger-text]`, which cascades through all rem-based Tailwind sizes.

3. **Reduced Motion**: Toggles `data-reduced-motion` attribute on `<html>`. CSS selects `[data-reduced-motion] *, [data-reduced-motion] *::before, [data-reduced-motion] *::after` and zeroes out `animation-duration`, `animation-delay`, `transition-duration`, `transition-delay` with `!important`.

### Files Modified
- `src/types/index.ts`: +3 boolean keys on Settings interface (highContrast, largerText, reducedMotion)
- `src/lib/settings.ts`: +3 defaults (false) + coercion (uses shared `typeof raw === "boolean"` check, same pattern as showFolderCounts)
- `src/components/settings/SettingsDialog.tsx`: +Accessibility section with section header and 3 SettingsRow + ToggleSwitch entries, following existing rowStagger animation pattern
- `src/components/settings/SettingsApplier.tsx`: +3 separate useEffect hooks setting/removing data attributes on document.documentElement
- `src/index.css`: +accessibility CSS block at EOF

### Key Decisions
- **Separate useEffect per setting**: Matches existing pattern where theme has its own useEffect. Avoids unnecessary reapplication when only one setting changes.
- **Data attributes over CSS classes**: `data-high-contrast`, `data-larger-text`, `data-reduced-motion` — idiomatic for feature flags on root element, avoids classname conflicts.
- **CSS approach for effects**: Kept JS minimal (set/remove attribute). All visual effects in CSS for separation of concerns.
- **No icon for Accessibility section header**: Used text-only `text-[10px] uppercase` header matching task spec. Other section headers use icons (Type for "Interface font") but this one is intentionally subtle.

### Pattern
Settings system is fully modular — adding a new setting requires modification in exactly 4 places: types (interface), settings (defaults + coercion), SettingsDialog (UI), SettingsApplier (effects). The DB layer (`getAllSettings`, `setSetting`) is generic and needs no changes for new string/boolean keys.

### Verification
- `pnpm exec tsc --noEmit`: passed with zero errors
- No changes needed to `useSettings.ts` — iterates `Object.keys(DEFAULT_SETTINGS)` dynamically
- No changes needed to `db.ts` — `setSetting` accepts `unknown`, `getAllSettings` returns `Record<string, unknown>`

## Content-Disappearing Bug Fix Applied (2026-05-06)

### Fix: Version Counter Pattern in `useNotes.ts`

Applied the proposed fix from investigation (lines 82-133 above). Three changes to `src/hooks/useNotes.ts`:

1. **Added `saveVersionRef`** (line 27): `Map<string, number>` tracking version per note ID
2. **`flushSave`** (lines 87-113): Snapshot `saveVersionRef` into `versionsSnapshot` BEFORE clearing `pendingSavesRef`. After each `await db.updateNoteContent`, compare `currentVersion !== snapshotVersion` — if mismatch (newer save queued during await), skip the stale `setNotes` call
3. **`saveNoteContent`** (lines 115-135): Increment version counter before optimistic `setNotes` — ensures any in-flight `flushSave` will detect the newer save

### Race Scenario (Fixed)
1. User types "hello" → version 1, optimistic state "hello", queued in pendingSavesRef
2. User types " world" → version 2, optimistic state "hello world", queued
3. Timer fires flushSave → snapshots version = 2, clears queue
4. `await db.updateNoteContent("id", "hello world")` — user types "!!!" → version 3, optimistic "hello world!!!"
5. FlushSave resumes — checks: current version (3) !== snapshot (2) → STALE → `continue` (skip setNotes) ✅
6. Next timer fires flushSave with "hello world!!!" → snapshot version = 3, after await version still 3 → applies setNotes ✅

### Verification
- `pnpm exec tsc --noEmit`: passed with zero errors
- Only `src/hooks/useNotes.ts` modified
- No changes to debounce timing (500ms), save/reorder/create/delete/rename logic, or any other file




## Snap Layouts + Move to Folder (2026-05-06)

### What was done
- Added folder/editor drop detection to `Sidebar.tsx` `handleDragEnd`
- Wired `onMoveToFolder` and `onDropInEditor` props through to `App.tsx`
- Added `data-editor-drop-zone="true"` attribute to editor container div

### Key decisions
- Drop detection uses `document.elementsFromPoint(dropX, dropY)` to find elements under the pointer at drag-end
- Folder detection: iterates `elementsAtPoint`, calls `.closest('[data-folder-id]')` to find the folder element
- Editor detection: queries `[data-editor-drop-zone]` and checks if drop coordinates fall within its bounding rect
- Reorder logic is checked FIRST - if a valid reorder target is found, it returns early before checking folder/editor drops. This prevents accidental folder moves during reordering
- `handleMoveToFolder` in App.tsx calls `moveNoteToFolder()` then `refreshNotes()` to immediately reflect the change in the UI. `refreshNotes` is already exported from `useNotes` hook

### Files modified
- `src/components/Sidebar.tsx`: Added `onMoveToFolder`/`onDropInEditor` to destructuring, rewrote `handleDragEnd`
- `src/App.tsx`: Added `moveNoteToFolder` import, `refreshNotes` destructuring, `handleMoveToFolder` callback, props passthrough, `data-editor-drop-zone` attribute
