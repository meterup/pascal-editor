---
'@pascal-app/editor': patch
---

Stop the 2D grid swapping its major and minor lines on every zoom step.

`majorStep` was pinned at `minorStep * 2`, so it inherited every minor
doubling. Each time the fine lines coarsened, the coarse frame moved with them
and half the emphasised lines demoted to minor, in one jump, across the whole
grid. Zooming read as the grid flip-flopping rather than refining.

The majors get their own screen-spacing threshold now, so the two ladders cross
at different zooms and the usual step refines the fine lines while the coarse
frame stays put. Swept over a zoom-out, the number of steps that move both went
from 5 to 0.

Both ladders still double, so `majorStep / minorStep` stays a power of two.
That's load-bearing: the minor path drops whatever lands on a major line via an
alignment test, and a ratio like 2.5 would leave the lattices incommensurate,
drawing fine lines under coarse ones and silently missing exclusions.

The grid maths moved to `floorplan-grid.ts` and is covered by
`floorplan-grid.test.ts`, matching how the other pure floor-plan helpers in this
directory are structured and tested. No behaviour change beyond the ladder.
