---
'@pascal-app/editor': patch
---

Add `floorplanNavigationLink` for letting the 2D plan and the 3D camera hold
independent viewpoints in split mode.

Defaults to `true`, the existing behaviour. `false` stops 2D poses reaching the
camera (through the sync bridge's `setActive`) and stops camera poses moving the
plan's viewport, while leaving host-published poses applying to the plan either
way. Re-linking snaps the plan back onto the camera.

The compass keeps working throughout, which took two fixes:

- The needle tracks the camera while the panel is hidden, and did so by writing
  the ref holding the plan's own rotation. Unlinked, that drifts the plan's
  recorded rotation to a heading it never had, and align-to-north then works
  from the wrong baseline. It only follows the camera while linked now.
- The needle describes whichever view is on screen, but each source only wrote
  on its own updates, so a still camera left the previous view's heading in an
  inline transform React had no reason to replace. It is handed over explicitly
  on every switch.

Also seeds `navigationSyncPose`, which was only ever written as a side effect
of navigating and so started null, leaving a host with nothing to read and no
way to take a first relative step. Seeding happens where it cannot move
anything by itself: when the host owns navigation input, or when the views are
unlinked. It publishes a `'2d'` pose, which while linked drives the camera, and
the plan's view width is its own fit rather than the camera's, so seeding
unconditionally would rezoom the 3D view on mount.

That is what lets a host drive one gesture and leave the rest built-in. Poses
published as `'host'` apply to the plan whatever `floorplanNavigationInput` is
set to, so an unlinked host can, say, step the plan in quarter turns while
built-in pan and zoom carry on and the 3D camera orbits freely.

The pure converters `cameraPoseToFloorplanNavigationPose` and
`floorplanNavigationPoseToCameraPose` are exported for relating the two views.
