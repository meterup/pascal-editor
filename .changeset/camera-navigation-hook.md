---
'@pascal-app/viewer': minor
'@pascal-app/editor': minor
---

Add `useCameraNavigation`, and `cameraNavigationInput` to match the plan's.

The camera's configuration was a store setter while the floor plan's was a
hook, and the camera had no equivalent of `floorplanNavigationInput` at all, so
the two panes were configured in two different idioms for the same kinds of
decision.

`useCameraNavigation` carries both halves: the bindings, applied while it's
mounted and restored when it unmounts, and the commands a toolbar drives the
camera with.

```tsx
const CAMERA_BINDINGS = { mouseButtons: { left: 'pan' } } as const

const camera = useCameraNavigation({ bindings: CAMERA_BINDINGS })
<button onClick={camera.fitScene}>Fit</button>
```

`fitScene` measures the scene itself. The camera's fallback is a fixed
`setLookAt(20, 20, 20, …)` that lands inside anything wider than about 20m, so
every host was computing bounds by hand to avoid it. `computeSceneBoundsXZ` is
exported now too, since the event's own docs pointed at it while it was
internal.

`cameraNavigationInput` is the camera's `'builtin' | 'host'`, and resolves to
binding every gesture to nothing rather than being a second mechanism each
binding site has to account for.

Renamed `useFloorplanNavigationControls` to `useFloorplanNavigation`, matching
the new hook and dropping a suffix that collided with both camera-controls and
UI controls.

A caveat for host-owned input on an editable scene: the editor claims some
drags for itself (an armed tool, a node being moved, a handle under the
cursor), and that arbitration isn't exposed yet. Binding your own gestures is
safe on a read-only scene and will fight the editor on an editable one until it
is.
