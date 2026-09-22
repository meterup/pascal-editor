---
'@pascal-app/editor': patch
---

Add `floorplanNavigationInput` for hosts that want their own 2D pan, rotate
and zoom bindings.

The built-in gestures are middle-drag or space and left-drag to pan, right-drag
to rotate, wheel and pinch to zoom, all hardcoded. They suit a full-page editor
but read oddly embedded, and on a trackpad there is no pan gesture at all
without the keyboard. Setting `'host'` suppresses the pointer-down handler, the
space-pan modifier and the wheel and pinch listeners, leaving the host free to
bind what it wants and drive the view with `'host'` poses through
`useEditor.publishNavigationSyncPose`.

Nothing else is affected: node interaction, selection and the compass all still
work. Space key-up stays unguarded so flipping modes mid-press can't leave the
pan modifier stuck on.
