---
'@pascal-app/editor': patch
---

Refuse editing modes on a read-only scene.

`readOnly` was honoured by the registry-driven path and nowhere else, so each
affordance that predates it had to be found and guarded one at a time: the
guide image, the site boundary, the 2D marquee. The ones derived from tool
state are the large family, and they all share a cause — every
`phase === … && mode === 'build' && tool === …` asks what the user picked and
never whether the scene can be changed.

`setMode` now refuses anything but `'select'` while the scene is read-only, and
`setTool` refuses to arm one, though clearing is always allowed. Holding that
pair at their inert values leaves every derived flag already false, including
for tools added later, which is the part that doesn't need anyone to remember.

Rehydration is covered too: `mode` and `tool` are persisted and don't go
through the setters, so a `'build'` stored during an editable visit would
otherwise arm itself on the next read-only one.

This doesn't reach affordances that aren't derived from tool state — the
marquee is selection-shaped, not tool-shaped — so those still need a decision
each. It removes the family that was growing.
