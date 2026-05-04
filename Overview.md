You are a senior desktop app engineer.

We're building Windows/macOS notes application using Tauri + React (or Next.js if required) with pnpm.

GOAL:
Create a macOS Notes-style app with a beautiful UI, smooth UX, and local-first storage.

TECH STACK:

- Tauri (desktop shell)
- React (preferred) or Next.js (if necessary)
- TypeScript
- SQLite (local database via Tauri plugin)
- TailwindCSS for styling
- shadcn/ui optional for UI components

CORE FEATURES (MVP):

1. Sidebar with list of notes
2. Create / delete / rename notes
3. Rich text editor (custom-built, NOT external editor libraries)
4. Auto-save notes to SQLite
5. Select note to edit
6. Search notes (basic text search)
7. Dark / light theme

EDITOR REQUIREMENTS:

- Must be custom-built using contenteditable or similar
- Must support:
  - typing
  - cursor tracking
  - selection handling
- Start simple (plain text), structure must allow future rich text expansion

ARCHITECTURE:

- Local-first data model
- Notes stored in SQLite table:
  id, title, content, created_at, updated_at

UI STYLE:

- macOS Notes-inspired
- clean sidebar
- soft rounded corners
- subtle blur/glass effects
- smooth transitions
- minimal but premium look

CONSTRAINTS:

- Do NOT use external rich text editors (no TipTap, Slate, Quill)
- Keep logic simple and modular
- Focus on performance and clean architecture

OUTPUT REQUIREMENTS:

- Provide full project structure
- Provide all key source files
- Ensure it runs with pnpm dev and tauri dev
- Include SQLite setup and schema

Start by scaffolding the project and then build step-by-step:

1. Tauri setup
2. UI layout
3. SQLite integration
4. Notes CRUD
5. Editor implementation
