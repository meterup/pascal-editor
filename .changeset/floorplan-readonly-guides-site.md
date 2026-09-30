---
'@pascal-app/editor': patch
---

Honour `readOnly` for the 2D guide image and site boundary.

Both were draggable in a locked scene. The drag even appeared to work: the
geometry followed the cursor, then snapped back on release when the store
refused the write.

`readOnly` was only ever consulted by the registry-driven path
(`floorplan-registry-layer`, `floorplan-registry-action-menu`), which strips its
own handles. The guide and site-boundary layers predate that mechanism and
render their affordances directly, so nothing was checking the flag for them.

They now gate on it alongside their existing conditions, so a read-only scene
gets the guide and the boundary as static geometry with no drag targets,
vertex handles, edge handles or midpoint handles.

The site polygon itself is untouched by this: the fitted-viewport calculation
still reads it to size the initial frame, so a locked scene frames the plan
exactly as an editable one does.
