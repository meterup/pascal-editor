---
'@pascal-app/editor': patch
---

Restore the always-on 3D ground grid and reconnect it to the viewer's `showGrid`
preference.

The grid had become a placement-only aid: the baseline alpha was pinned to `0`
and mesh visibility keyed on `isGridSnapActive()`, replacing the previous
`visible={showGrid}` binding. A host that never arms a build tool (read-only
plan viewers, embedded scenes) was left with no grid at all and an inert Display
toggle, with no way to opt back in.

Placement behaviour is unchanged. An armed draft/build tool, a node move, or a
reshape still gets the tight cursor patch with no baseline and a brightened
alpha. Otherwise the grid is the ground reference again: the wider
`revealRadius` reveal over a constant baseline, unboosted, shown only while
`showGrid` is on.

```ts
const snapPatchVisible = isGridSnapActive()
revealRadiusUniform.value = snapPatchVisible ? PLACEMENT_REVEAL_RADIUS : revealRadius
baseAlphaUniform.value = snapPatchVisible ? 0 : IDLE_BASE_ALPHA
patchAlphaUniform.value = snapPatchVisible ? 1.5 : 1
gridRef.current.visible = snapPatchVisible || showGrid
```

Grid pointer events are unaffected either way: `useGridEvents` raycasts its own
math plane rather than the mesh, so visibility never changed tool behaviour.
