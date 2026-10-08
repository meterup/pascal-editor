---
'@pascal-app/editor': minor
---

Add `useFloorplanNavigation` and `useCameraNavigation` so a host can own either
pane's gestures.

The built-in bindings are fixed: middle-drag or space and left-drag to pan the
plan, right-drag to rotate, wheel and pinch to zoom, and the 3D equivalents on
the camera. They suit a full-page editor but read oddly embedded, and on a
trackpad there is no 2D pan gesture at all without the keyboard.

Ownership is claimed by the hook that does the work, and released when it
unmounts:

```tsx
const plan = useFloorplanNavigation({ input: 'host' })
const camera = useCameraNavigation({ input: 'host', bindings })
```

So the claim and the binding are the same call, and declaring `'host'` can't
leave a pane that silently has no gestures because nothing bound any. Omitting
`input` falls back to `'builtin'`, which is the safe direction: a pane nobody
claimed keeps its own.

For the plan, `'host'` suppresses the pointer-down handler, the space-pan
modifier, and the wheel and pinch listeners. Node interaction, selection and
the compass are unaffected, and space key-up stays unguarded so flipping modes
mid-press can't leave the pan modifier stuck on.

The two hooks are counterparts and live together at
`lib/navigation/{floorplan,camera}.ts`. `FloorplanNavigationInput` comes from
the editor store.
