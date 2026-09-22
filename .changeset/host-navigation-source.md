---
'@pascal-app/editor': patch
---

Add a `'host'` navigation-sync source so an embedding app can drive the views.

`useEditor.publishNavigationSyncPose` already existed, but `NavigationSyncSource`
was `'2d' | '3d'` and each consumer tested for the other view's literal. A host
pose had to claim it came from a view it isn't, and claiming `'2d'` reached the
camera while claiming `'3d'` reached the floor plan, so neither worked for both.

A view now applies any pose it didn't publish itself, expressed as
`drivesFloorplanView` and `drivesCamera` rather than repeated literals, so the
next source added reaches every consumer. `NavigationSyncPose`,
`NavigationSyncPoseInput` and `NavigationSyncSource` are exported for typing
the call.
