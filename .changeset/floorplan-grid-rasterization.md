---
'@pascal-app/editor': patch
---

Stop the 2D grid shimmering when the plan is rotated.

The grid drew with `shapeRendering="crispEdges"`, which turns off anti-aliasing
so a 1px line lands exactly on the pixel grid. That only holds for axis-aligned
lines. Rotate the plan and the lines are diagonal, so switching anti-aliasing
off just stair-steps them, and the stepping pattern changes with every
sub-pixel change to the view box. Every frame of a pan or zoom re-rasterized the
whole grid differently, which reads as the grid flashing rather than moving. It
aliases at rest too, and a 2x device pixel ratio doesn't rescue it, because the
hint disables anti-aliasing regardless of density.

`crispEdges` is now used only when the scene rotation is a multiple of 90
degrees, where it's the right hint, and `geometricPrecision` otherwise.

Measured on a rotated plan: across a zoom, mean luminance over the grid changed
345 times with 261 of those reversing direction. A level-of-detail ladder is
monotonic through a continuous zoom, so a 76% reversal rate is re-rasterization,
not lines being added and removed.
