````md
# 🧠 Mind Map Editor — Design & Logic Spec

This document describes how a **modern, good mind map editor** should be structured, both visually and logically. It focuses on UX behavior, data model, interactions, and system design.

---

# 1. 🎯 Core Idea

A mind map editor is a **graph-based editor** where:
- Each **node = idea / concept**
- Each **edge = relationship**
- The structure is **hierarchical but flexible (not strictly tree-only)**

Goal:
> Help users visually organize thoughts, projects, and systems in a fast, intuitive way.

---

# 2. 🧩 Data Model (Core Logic)

## 2.1 Node Structure

```ts
type Node = {
  id: string;
  text: string;
  position: { x: number; y: number };

  parentId: string | null;
  childrenIds: string[];

  style?: {
    color?: string;
    fontSize?: number;
    bold?: boolean;
    shape?: "circle" | "rectangle" | "pill";
  };

  collapsed?: boolean;
  createdAt: number;
  updatedAt: number;
};
````

---

## 2.2 Edge Structure (Optional for advanced mode)

```ts
type Edge = {
  id: string;
  from: string;
  to: string;

  type?: "parent-child" | "reference" | "dependency";
};
```

---

## 2.3 Mind Map State

```ts
type MindMap = {
  rootId: string;
  nodes: Record<string, Node>;
  edges?: Record<string, Edge>;
};
```

---

# 3. 🧠 Layout System (How it should look)

## 3.1 Auto Layout Rules

* Root node is always center
* Children spread radially or tree-like
* Sibling nodes avoid overlap
* Dynamic spacing based on:

  * text length
  * depth level
  * number of siblings

### Layout modes:

* 🌳 Tree layout (clean hierarchy)
* 🌐 Radial layout (brain-like)
* 🧱 Freeform layout (drag everything manually)

---

## 3.2 Positioning Algorithm (Simple idea)

```pseudo
function layout(node):
    if node is root:
        place at center

    for each child:
        angle = index * (360 / total children)
        radius = baseRadius + depth * spacing

        child.x = parent.x + cos(angle) * radius
        child.y = parent.y + sin(angle) * radius
```

---

# 4. 🖱️ Interaction System

## 4.1 Node Actions

* Click → select node
* Double click → edit text
* Drag → move node
* Shift + drag → create connection
* Enter → create child node
* Tab → indent (make child)
* Backspace (empty node) → delete node

---

## 4.2 Canvas Actions

* Drag background → pan view
* Scroll → zoom in/out
* Ctrl + F → search nodes
* Ctrl + Z → undo
* Ctrl + Shift + Z → redo

---

## 4.3 Connection Rules

* One node can have multiple children
* Cycles are:

  * ❌ disabled in strict mode
  * ✅ allowed in graph mode
* Visual arrows always show direction

---

# 5. 🎨 UI/UX Design

## 5.1 Node Design

Each node should support:

* Rounded corners
* Soft shadows
* Smooth hover scaling
* Inline text editing

Example styles:

* Active node → glowing border
* Selected → highlight ring
* Hover → slight lift effect

---

## 5.2 Color System

* Root → accent color (blue/purple)
* Level 1 → slightly lighter
* Deeper levels → fade intensity
* Tags → colored badges inside nodes

---

## 5.3 Connection Styling

* Curved bezier lines (preferred)
* Thickness based on importance
* Animated flow optional (pro mode)

---

# 6. ⚙️ Editor Features

## 6.1 Essential Features

* Create / delete nodes
* Drag & drop hierarchy
* Auto-save
* Undo / redo system
* Zoom + pan canvas
* Collapse/expand branches

---

## 6.2 Advanced Features

* 🔍 Search nodes instantly
* 🏷 Tags system
* 🔗 Cross-node linking
* 🧠 AI suggestion of structure
* 📤 Export to:

  * PNG
  * JSON
  * Markdown outline
* 📥 Import from JSON / text outline

---

# 7. 🧠 Smart Behavior (Important)

A good mind map editor should be **adaptive**:

## Auto behaviors:

* Auto-align nodes when dropped
* Prevent overlap automatically
* Auto-space children dynamically
* Suggest grouping when nodes are close
* Auto-collapse deep branches

---

# 8. 💾 Persistence Layer

## Save format (JSON)

```json
{
  "rootId": "node_1",
  "nodes": {
    "node_1": { "text": "Main Idea", "childrenIds": ["node_2"] }
  }
}
```

## Save system:

* Auto-save every X seconds
* Local storage or DB sync
* Version history (optional)

---

# 9. 🚀 Performance Rules

* Use virtual rendering for large maps
* Only render visible nodes (viewport culling)
* Debounce drag updates
* Batch layout recalculations

---

# 10. 🧩 UX Philosophy

A good mind map editor should feel:

* ⚡ Instant (no lag)
* 🧠 Natural (like thinking visually)
* 🎯 Minimal (no UI clutter)
* 🔄 Fluid (everything animates smoothly)
* 🧭 Predictable (no surprising behavior)

---

# 11. 🔥 Summary

A high-quality mind map editor is:

* A **graph system (not just tree UI)**
* A **physics-aware layout engine**
* A **fast interactive canvas**
* A **structured but flexible data model**
* A **tool that feels like thinking, not editing**

---

```
```
