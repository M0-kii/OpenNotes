# Mind maps

The current editor supports tree, radial, and freeform layouts. Nodes can be
edited, collapsed, dragged, searched, or connected to a different parent. The
editor also provides undo/redo and PNG export.

## Stored format

A mind map is saved as JSON in `notes.content`. Version 2 stores the relationships
between nodes separately from the layout:

```json
{
  "schemaVersion": 2,
  "nodes": [
    { "id": "root", "text": "Ideas", "parentId": null, "collapsed": false },
    { "id": "child", "text": "First idea", "parentId": "root", "collapsed": false }
  ]
}
```

The layout calculates positions for unpinned nodes. A node with a `pin` containing
`x` and `y` keeps its position until it is unpinned. The parser migrates older
maps by retaining their saved positions as pins.

## Changes and history

Graph changes go through the operation dispatcher in `src/lib/mindmap/`. It
checks node IDs and parent relationships, rejects cycles, and returns the inverse
operations needed for undo. The history keeps up to 100 entries.

Deleting a node removes its descendants, except pinned descendants, which become
roots. Layout, graph serialization, and history are separate from the React UI.
