---
'@pascal-app/editor': patch
---

Add `floorplanCompassSlot`, replacing the built-in floor-plan compass.

The built-in one is hardcoded down to its needle colours and its corner, so a
host matching its own design system had no way in short of hiding it with CSS.
The slot receives what the built-in control renders from, so a replacement can
match its behaviour rather than approximate it: the heading in degrees, an
align-to-north callback, and the needle ref the live camera stream writes to per
frame while the plan is hidden.

```tsx
<Editor
  floorplanCompassSlot={({ northRotationDeg, alignToNorth, needleRef }) => (
    <MyCompass onClick={alignToNorth} ref={needleRef} rotation={northRotationDeg} />
  )}
/>
```

Return `null` for no compass at all. It applies to both compass surfaces, the
editor's 2D panel and `FloorplanPreview`, so Pascal's compass doesn't reappear
in preview mode. `FloorplanCompassContext` and `FloorplanCompassSlot` are
exported for typing the callback.
