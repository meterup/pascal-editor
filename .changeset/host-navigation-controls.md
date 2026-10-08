---
'@pascal-app/editor': minor
---

Add `useFloorplanNavigationControls` for host-driven 2D navigation.

A host could already move the plan with `publishNavigationSyncPose`, but only by
knowing rather a lot: that a pose is `{ target, azimuth, viewWidth }`, that
`'host'` is the one source that always reaches the plan, that azimuth is
radians, that screen deltas have to be rotated into the plan by its own azimuth
before they can move the target, and that animating means publishing a stream
rather than a single pose. The demo in `apps/editor` did all of that by hand.

The hook does it instead:

```tsx
const plan = useFloorplanNavigationControls()

useGesture({
  onDrag: ({ delta: [dx, dy] }) => plan.panByPixels(-dx, -dy),
  onPinch: ({ offset: [scale] }) => plan.zoomTo(scale),
})

<button onClick={() => plan.rotateByDegrees(90, { durationMs: 260 })}>Rotate</button>
```

Rotation tweens take the short way round, so turning from 350° to 10° travels
20° forwards rather than 340° back, and an in-flight tween is cancelled by the
next command or by unmount.

Whether a command moves the 3D camera too is the link's business, not the
hook's: these publish as `'host'`, which always drives the plan, and the camera
follows only while `floorplanNavigationLink` is on.

The hook reads the shared pose at call time through `getPose()` and
`getMetersPerPixel()` rather than subscribing to it. `navigationSyncPose`
changes every frame while anything is moving, so a subscription would re-render
the caller at that rate, which for a component that renders the editor is the
whole cost the imperative viewport exists to avoid. The returned object has a
stable identity, so it can go straight into an effect's dependencies.

Supporting this, the floor-plan panel now publishes its measured size in CSS
pixels. A pose carries only its width in metres, so until now nobody but the
panel could convert one back to screen space, which is why the playground had
to stand in `window.innerWidth` and why it was wrong in split view. The panel
also republishes `navigationSyncPose` on every committed viewport change rather
than seeding it once: a single seed goes stale as soon as the plan moves any
other way, most obviously the initial fit, and a host reading that stale pose
and publishing it back dragged the plan to wherever the seed was taken.
