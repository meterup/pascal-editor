---
'@pascal-app/editor': patch
---

Theme the container behind the 2D floor-plan SVG.

`palette.surface` was already host-settable and already painted the surface rect,
but the container the SVG sits in was a hardcoded `bg-white`. That isn't always
covered: the rect lives inside the SVG, and a rotation gesture CSS-rotates the
SVG, so the rect swings away from the corners and the container shows through.
On a dark palette it flashed white for the length of every rotation.

It takes `palette.surface` now, so there's one background colour for the plan
rather than a themed one in front of an unthemed one.
