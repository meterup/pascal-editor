---
'@pascal-app/viewer': minor
'@pascal-app/editor': minor
---

Let a host bind the 3D camera's gestures.

The bindings were fixed: left drag selects unless you're in preview mode or
holding space, middle pans, right rotates, wheel zooms. A host whose scene is
read-only, or whose users are on laptop trackpads with no middle button, had no
say — panning meant the space bar.

`cameraInput` on `useViewer` merges over the defaults rather than replacing
them, so an unset entry keeps whatever the current mode asked for:

```ts
useViewer.getState().setCameraInput({
  mouseButtons: { left: 'pan' },
  touches: { one: 'pan' },
})
```

Actions are named for what the user sees (`pan`, `rotate`, `zoom`, `dolly`,
and `zoomPan` / `dollyPan` for the combined two-finger gestures) rather than
mirroring the camera library's enum, so the binding API doesn't tie a host to
that dependency. The wheel and the one-finger slots take narrower sets than the
others, because a wheel has one axis and a pinch needs two fingers.

Merging also covers the modifier path, which rebuilds the bindings on every key
change, so holding space no longer drops a host's overrides.
