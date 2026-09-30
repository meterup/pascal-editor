---
'@pascal-app/editor': patch
---

Re-rule the 2D grid during a pan or zoom instead of after it.

The grid's level of detail only caught up when the viewport committed, roughly
300ms after you stopped, so zooming out crowded the lines together and then
popped them to the right density once you let go.

The cause is structural rather than a missing dependency. Pan and zoom write the
SVG's `viewBox` imperatively precisely so they don't `setState` on
`FloorplanPanel`, whose render costs ~120-220ms, so anything the panel derives
in React is a gesture behind by construction. Writing the path attribute behind
React's back doesn't work either: the next render restores the committed path,
and the grid alternates between the two.

So the live view box is published to a small store and `FloorplanGridLayer`
subscribes and rules itself. Same approach as `useFloorplanDraftPreview` and the
other hot-value stores here: the panel stays out of the render path and only the
two-path layer re-renders per frame.

Two things keep that affordable, since `buildGridPath` walks the whole ruled
area:

- the ruled bounds snap to `GRID_QUANTUM_STEPS`, so a pan rebuilds the path once
  per few steps of travel rather than per pointer move
- `GRID_MARGIN_STEPS` stays larger than the quantum, so the drift in between is
  already covered

`floorplanBackgroundSlot`'s `bounds` is unchanged: it's still the
rotation-inflated view, without the grid's margin, which is an implementation
detail of how often the grid rebuilds.
