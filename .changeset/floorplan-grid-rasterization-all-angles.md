---
'@pascal-app/editor': patch
---

Stop the 2D grid flashing at axis-aligned rotations too.

`crispEdges` was kept for multiples of 90 degrees on the theory that snapping
lines onto the pixel grid is only harmful when they're diagonal. It isn't. The
snap is per line, so on every sub-pixel change to the view box each line jumps a
whole pixel independently of its neighbours. Diagonal lines re-stair-step, which
reads as a shimmer; axis-aligned lines jitter. Being axis-aligned changes the
artifact, not whether there is one.

`crispEdges` only pays off for a grid that is both axis-aligned and still, and
this one is a moving reference, so the grid now always asks for
`geometricPrecision`.
