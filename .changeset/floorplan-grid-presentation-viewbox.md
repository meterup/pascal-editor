---
'@pascal-app/editor': patch
---

Rule the 2D grid from the viewport that's on screen, not the last committed one.

`gridSteps` and `gridBounds` derived from `viewBox`, the committed viewport,
while the SVG itself renders `presentationViewBox`, which tracks the imperative
updates a pan or zoom makes. The two agree outside a gesture. During one they
don't, so any render that happened for an unrelated reason (a selection, a
hover) re-ruled the grid for the pre-gesture view and undid the gesture's effect
on it until the 300ms viewport commit caught up.

Both now read `presentationViewBox`, which is what the rest of the panel
already presents from.

Worth noting what this does not do: it doesn't make the grid live. Nothing
re-renders per frame during a gesture, by design. It makes the renders that do
happen correct, which together with the ruled margin is what keeps the grid
stable through a gesture. Writing the path attribute imperatively per frame
would be the alternative, and it fights React: the next render puts the
committed path back.
