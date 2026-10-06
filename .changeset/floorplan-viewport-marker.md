---
'@pascal-app/editor': patch
---

Mark the 2D viewport with `data-pascal-floorplan-viewport`.

A host binding its own navigation needs to know where the plan actually is on
screen: anchoring a zoom to the pointer means measuring the cursor against the
plan's own rect, and in split view that isn't the editor's rect. The 3D pane has
carried `data-pascal-viewer-3d` for a while; this is its counterpart.
