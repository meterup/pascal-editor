---
'@pascal-app/editor': minor
---

Take `cameraNavigationInput` as an `<Editor>` prop.

The camera's ownership flag only existed on the viewer store, so declaring who
drives a pane meant a prop for the floor plan and a store write for the camera.
Both are the same kind of statement and both are now props:

```tsx
<Editor
  floorplanNavigationInput="host"
  cameraNavigationInput="host"
/>
```

Threaded through the store internally, because the camera controls sit inside
the 3D canvas and take no props. The prop is the API; the store field is how it
gets there.
