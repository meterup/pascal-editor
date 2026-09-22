---
'@pascal-app/editor': patch
---

Add `floorplanBackgroundSlot`, a host-owned SVG backdrop for the 2D floor plan.

`floorplanSceneSlot` is the last child of the transformed scene group, so its
content paints over the plan. That makes it unusable for a backdrop, since SVG
has no `z-index`. The new slot renders as the **first** child of the same group,
under the grid and every geometry layer, and is a render prop so it can size
itself from the panel's own numbers:

```tsx
<Editor
  floorplanBackgroundSlot={({ bounds, unitsPerPixel, rotationDeg }) => (
    <rect
      x={bounds.minX}
      y={bounds.minY}
      width={bounds.maxX - bounds.minX}
      height={bounds.maxY - bounds.minY}
      fill="url(#host-dot-pattern)"
    />
  )}
/>
```

`bounds` is the same rotation-inflated extent the grid spans, so a backdrop
sized to it cannot expose a corner at any rotation. `unitsPerPixel` is there to
hold pattern detail at a fixed screen size across zoom. `rotationDeg` is the
scene rotation, for content that needs to counter-rotate. Being inside the
scene group, the backdrop pans and rotates with the plan for free.

`FloorplanBackgroundContext` is exported for typing the callback.
