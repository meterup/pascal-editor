---
'@pascal-app/viewer': minor
'@pascal-app/nodes': patch
'@pascal-app/editor': patch
---

Add `showSiteBoundary` to hide the site's boundary geometry.

The boundary was always drawn, with no way to turn it off. It is a useful
reference while laying out a site and pure noise on a surface that only presents
a finished building.

`showSiteBoundary` joins `useViewer` next to `showGrid` / `showZones` and
governs both views from one flag, because it is the same polygon in each:

```ts
useViewer.getState().setShowSiteBoundary(false)
```

In 2D that drops the dashed polygon, its edge labels and its handles. In 3D it
drops the ground pad and the amber outline. Buildings, items and the horizon
ground are unaffected, so the scene loses its lot outline rather than its floor
— the horizon disc punches holes for slab footprints, not for the site polygon,
so it still covers the ground the pad was covering.

Two things stay deliberately outside the flag. The fitted viewport still sizes
itself from the site polygon, so toggling this doesn't reframe the plan. And
sculpted terrain keeps rendering, since that is modelled geometry rather than
boundary chrome.

Defaults to `true` and isn't persisted, so nothing changes until a host sets it.
