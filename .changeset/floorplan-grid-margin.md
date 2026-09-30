---
'@pascal-app/editor': patch
---

Rule the 2D grid past the edge of the view so a gesture doesn't outrun it.

Pan and zoom are applied imperatively (`applyFloorplanViewportImperatively`
writes the `viewBox` directly) and only re-render on a 300ms debounce, so a path
ruled exactly to the view leaves an unruled margin the moment either moves.

The slack is counted in minor steps, not taken as a multiple of the view. The
cost in `buildGridPath` is the number of subpaths, and a multiple of the view
scales that with zoom without bound: a large enough `d` gets geometry dropped by
the renderer and lines stop crossing the scene. Counted in steps the extra is
fixed at `2 * GRID_MARGIN_STEPS` per axis at every zoom, while the distance
covered still scales, because the step itself scales with zoom.
