---
'@pascal-app/editor': patch
---

Keep the compass live while the plan is being rotated.

A rotation with the panel open moves the view with a CSS transform on the SVG,
and the compass sits outside that SVG, so it wasn't carried along. The needle
held its last committed heading for the whole gesture and jumped when the
viewport settled.

It was invisible with the built-in gestures, which commit often enough to hide
it, and obvious under host-driven rotation, where a tween streams poses for a
few hundred milliseconds before anything commits. A host consuming
`onHeadingChange` saw nothing at all for the duration, since that signal is
published from the same place the needle is written.

The presentation path now writes the heading as it goes, so both the built-in
needle and `onHeadingChange` track the gesture.
