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

`hideBuiltInOverlays` hides exactly the chrome and nothing else:

```tsx
<Editor hideBuiltInOverlays layoutVersion="v2" />
```

That drops the level selector, the action menu, the panel manager, the helper
manager, the built-in Plugins rail entry and the camera-controls hint, in both
layout versions. The Plugins entry matters because `useHostPanels` appends it
in the `edit` workspace, so a host passing `sidebarTabs={[]}` still got a
non-empty tab bar and the v2 layout rendered a left column for a panel it never
asked for. The camera hint matters because it names the *built-in* gestures,
which a host overriding them with `cameraInput` has just made wrong.

Host panels and registered plugin panels are untouched, so a host can hide the
built-in rail entry and still show its own. Selection, hover highlighting and
the editing handles all keep working, so a host can replace the chrome and
still have an interactive canvas. Capture mode is unchanged and still
suppresses the lot for the duration of a shot.

The split-view divider also picks up `data-pascal-floorplan-divider` on its hit
area and `data-pascal-floorplan-divider-thumb` on the pill, so a host can
restyle it to match its own resize handles:

```css
[data-pascal-floorplan-divider-thumb] {
  background: var(--my-handle-color);
}
```
