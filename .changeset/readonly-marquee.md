---
'@pascal-app/editor': patch
---

Honour `readOnly` for the 2D marquee.

A plain drag across a locked plan painted a selection box and brought up the
multi-selection affordances that go with it, for a scene where none of them can
do anything. The 3D view already withholds its own box select on those grounds;
the 2D one never checked.

Same gap as the guide image and the site boundary: `readOnly` was only ever
consulted by the registry-driven path, and everything older renders its
affordances directly. It surfaces now because a drag over a locked plan is
increasingly likely to mean "move the view".
