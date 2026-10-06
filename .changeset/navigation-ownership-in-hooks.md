---
'@pascal-app/editor': minor
---

Move navigation ownership into the hooks, and colocate them.

`floorplanNavigationInput` was an `<Editor>` prop while the thing that honoured
it lived in a hook somewhere else, so the two could disagree. Declaring
`'host'` and then binding nothing left a pane that silently couldn't be
navigated, and nothing caught it.

Ownership is claimed by the hook that does the work, and released when it
unmounts:

```tsx
const plan = useFloorplanNavigation({ input: 'host' })
const camera = useCameraNavigation({ input: 'host', bindings })
```

So the claim and the binding are the same call. Omitting it falls back to
`'builtin'`, which is the safe direction: a pane nobody claimed keeps its own
gestures rather than losing them.

**Breaking:** the `floorplanNavigationInput` prop is gone. Pass `input` to
`useFloorplanNavigation` instead. `FloorplanNavigationInput` now comes from the
editor store rather than the floor-plan panel.

The two hooks moved to `lib/navigation/{floorplan,camera}.ts`, since they're
counterparts and were sitting in unrelated places.
