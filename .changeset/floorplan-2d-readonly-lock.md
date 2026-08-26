---
'@pascal-app/editor': patch
---

Respect the scene `readOnly` flag in the 2D floor plan. When the scene is
read-only (e.g. version-preview mode, `isVersionPreview`), the registry action
menu is hidden and the interactive edit handles (move / resize / vertex /
midpoint / edge / rotate) are stripped from the overlay pass, while selection
hit-lines, labels and dimensions still render. This mirrors the existing 3D
`noEditing` gating so a locked plan is fully view-only in both views.

It composes with, rather than replaces, the multi-selection `stripHandleChrome`
pass: that one also drops dimensions, dimension labels and equal-spacing badges,
because a multi-selection has no use for per-node measurements. A locked plan
does — it is still worth measuring — so the read-only strip removes only the
kinds that accept pointer input.
