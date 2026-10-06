---
'@pascal-app/editor': patch
---

Let the 3D camera pan on a plain drag in a read-only scene.

Left drag was `ACTION.NONE` outside preview mode, so panning a locked scene
meant the middle button or holding space. A laptop trackpad has neither
comfortably to hand, which made panning a scene the viewer can't even edit the
most awkward gesture in it.

A read-only scene has nothing for a drag to pick up or move, so the camera
takes it, exactly as preview mode already did. Touch gets the same treatment: a
one-finger drag trucks instead of orbiting. Editable scenes are unchanged,
including space-to-pan.

Clicking still selects, since a click isn't a drag, and marquee select was
already off in a read-only scene.
