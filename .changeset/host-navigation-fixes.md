---
'@pascal-app/editor': patch
---

Stop host navigation re-rendering its caller, and keep the shared pose current.

`useFloorplanNavigationControls` subscribed to `navigationSyncPose`, which
changes every frame while anything is moving. Any component calling the hook
re-rendered at that rate, and for one that renders the editor that is the whole
cost the imperative viewport exists to avoid. It made a tweened rotation look
chunky rather than smooth. `pose` and `metersPerPixel` are now `getPose()` and
`getMetersPerPixel()`, read at call time, and the returned object has a stable
identity so it can go straight into an effect's dependencies.

Separately, the panel seeded `navigationSyncPose` exactly once. A single seed
goes stale as soon as the plan moves any other way, most obviously the initial
fit, which lands after the first viewport exists. A host reading that stale pose
and publishing it back dragged the plan to wherever the seed was taken, which
showed up as the view jumping on the first host-driven move. The panel now
republishes on every committed viewport change, under the same conditions as
before, so the store keeps describing the live 2D view.
