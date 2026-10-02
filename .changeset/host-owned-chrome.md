---
'@pascal-app/editor': minor
---

Add `hideBuiltInOverlays`, and let hosts style the split-view divider.

Hosts that bring their own toolbar had one way to get rid of the editor's
floating overlays: hold capture mode on. That works, but capture mode is a
snapshot mode. It also unmounts `SelectionManager`, which owns the highlight
material and the outliner as well as click handling, so the canvas ends up
unselectable and nothing highlights even when something is selected from the
2D plan. Permanent capture mode is the wrong tool and this was the cost.

`hideBuiltInOverlays` hides exactly the overlays and nothing else:

```tsx
<Editor hideBuiltInOverlays layoutVersion="v2" />
```

That drops the level selector, the action menu, the panel manager and the
helper manager, in both layout versions. Selection, hover highlighting and the
editing handles all keep working, so a host can replace the chrome and still
have an interactive canvas. Capture mode is unchanged and still suppresses the
lot for the duration of a shot.

The split-view divider also picks up `data-pascal-floorplan-divider` on its hit
area and `data-pascal-floorplan-divider-thumb` on the pill, so a host can
restyle it to match its own resize handles:

```css
[data-pascal-floorplan-divider-thumb] {
  background: var(--my-handle-color);
}
```
