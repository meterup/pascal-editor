---
"@pascal-app/editor": patch
---

Introduce geometry cache workaround into **FloorplanRegistryLayer** to fix performance regression related to egregious re-render/scene graph traversal/rebuild for cursor and edit interactions.
