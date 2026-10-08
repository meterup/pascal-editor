---
'@pascal-app/editor': patch
---

Stop the 2D grid shimmering as the view moves.

The grid drew with `shapeRendering="crispEdges"`, which turns off anti-aliasing
so a 1px line lands exactly on the pixel grid. The snap is per line, so on every
sub-pixel change to the view box each line jumps a whole pixel independently of
its neighbours. Diagonal lines re-stair-step, which reads as a shimmer;
axis-aligned lines jitter. Every frame of a pan or zoom re-rasterized the whole
grid differently, and it aliases at rest too: a 2x device pixel ratio doesn't
rescue it, because the hint disables anti-aliasing regardless of density.

`crispEdges` only pays off for a grid that is both axis-aligned and still, and
this one is a moving reference, so the grid now always asks for
`geometricPrecision`.

Measured on a rotated plan: across a zoom, mean luminance over the grid changed
345 times with 261 of those reversing direction. A level-of-detail ladder is
monotonic through a continuous zoom, so a 76% reversal rate is re-rasterization,
not lines being added and removed.
