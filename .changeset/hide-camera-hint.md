---
'@pascal-app/editor': patch
---

Let `hideBuiltInOverlays` hide the camera-controls hint.

The dismissible hint panel that names the camera gestures sits inside the
viewer canvas rather than the overlay block, so the flag didn't reach it. A host
that replaced the chrome still got it, and worse, it describes the *built-in*
bindings, which a host overriding them with `cameraInput` has just made wrong.
