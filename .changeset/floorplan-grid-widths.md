---
'@pascal-app/editor': patch
---

Let a host set the 2D grid's line widths.

They were module constants, so the grid's weight was the one part of its
appearance a host couldn't reach, while its colours and opacities were already
overridable.

`minorGridWidth` and `majorGridWidth` join `FloorplanPanelPalette`, which means
they come through the existing `floorplanPalette` prop with no new API:

```tsx
<Editor floorplanPalette={{ minorGridWidth: 0.3, majorGridWidth: 0.5 }} />
```

Defaults are the previous constants, so nothing changes unless you set them.

Worth knowing before you do: the lines are drawn with `non-scaling-stroke`, so
these are screen pixels and don't follow the zoom, and the defaults are
sub-pixel. That used to be propped up by `crispEdges` snapping thin lines up to a
solid pixel. Now that the grid always anti-aliases, these values are what decide
whether it reads at all.
