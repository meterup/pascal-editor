---
'@pascal-app/editor': patch
---

Add a `floorplanPalette` prop for overriding the 2D floor plan's colours.

The palette was computed internally from the scene theme's appearance with no
way in, so hosts matching the plan to their own design system were reduced to
targeting Pascal's hex values with CSS. Overrides are `Partial`, merged over
the built-in light or dark palette, so omitted slots keep their defaults:

```tsx
<Editor floorplanPalette={{ surface: 'transparent', minorGrid: '#e5e7eb' }} />
```

The panel palette is now exported as `FloorplanPanelPalette` for typing the
override. It is a superset of `FloorplanPalette` in `@pascal-app/core`, and the
slots registry kinds consume are forwarded through `<FloorplanRenderProvider>`,
so one override reaches both the panel's own drawing and every kind's geometry.
Renaming it also ends the collision with the core type it mirrors.
