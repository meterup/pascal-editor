---
'@pascal-app/editor': patch
---

Ease the 2D view onto the camera when navigation is re-linked.

Re-linking jumped. Two separate effects both fired on the toggle and both went
through the navigation sync scheduler, which exists to track a live stream and
so presents every pose the instant it arrives. A one-shot pose through it is a
jump by construction.

The re-link now decomposes the camera pose itself and hands the result to the
view animator, so it picks up the same exponential decay the compass needle and
the camera buttons use. The panel-open sync is latched to the opening edge,
since it would otherwise land its snap first and leave the animation nothing to
travel.

Width is applied unclamped, matching the live sync path: the camera is the
authority on how wide the view is, and clamping would ease towards a width the
stream would immediately contradict.

The follow effect is latched too. It reads the building transform, so without
that, moving the building looked like a re-link and dragged the view off
whatever the user was looking at.
