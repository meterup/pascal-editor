---
'@pascal-app/editor': patch
---

Make version preview actually mark the scene read-only.

`isVersionPreviewMode` withheld the editing *UI* and nothing else. The scene
store kept reporting itself editable, so every `readOnly` guard behind it —
the mutation guards in the scene store, and the affordance guards in the 2D
panel — sat inert under a prop that plainly means the scene can't be edited.

It's a quiet failure: the guards read correctly, so they survive review and
then do nothing. The 2D marquee is the example, still painting a selection box
across a plan nobody can change, with the fix for it already written.

Preview now sets `readOnly` while it's on and restores the previous value when
it ends. One-way on purpose: preview implies read-only, but a scene can be
read-only for reasons of its own, so leaving preview must not declare it
editable.

Hosts that set `readOnly` themselves are unaffected.
