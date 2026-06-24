---
"@pascal-app/editor": patch
---

Respect the scene `readOnly` flag in the 2D floor plan. When the scene is
read-only (e.g. version-preview mode, `isVersionPreview`), the registry action
menu is hidden and the interactive edit handles (move / resize / vertex
/ midpoint / edge / rotate) are stripped from the overlay pass, while selection
(hit-lines), labels, and dimensions still render. This mirrors the existing 3D
`noEditing` gating so a locked plan is fully view-only in both views.
