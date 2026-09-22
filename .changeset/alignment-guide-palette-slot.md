---
'@pascal-app/core': patch
'@pascal-app/editor': patch
---

Add an `alignmentGuideStroke` slot to `FloorplanPalette` and draw the 2D snap
guides from it.

`FloorplanAlignmentGuideLayer` hardcoded `#ef4444`, so the one piece of 2D
chrome most visible during a drag was the one piece a theme couldn't reach.
It already consumes the render context, so it now reads the slot and keeps the
red as its no-provider fallback.
