---
'@pascal-app/editor': patch
---

Stop the 2D grid re-ruling when the view box hasn't changed.

`setLiveViewBox` published a fresh object on every imperative viewport write,
and the grid's memo chain is keyed on that object's identity. So the grid
rebuilt both of its paths every frame whether or not the view had moved, and
`quantizeGridBounds` — which exists so a pan rebuilds the path once per few
steps of travel rather than per frame — never got the chance to do its job.

Rotation is where it showed. A rotation presentation moves the view with a CSS
transform on the SVG and writes the *same* view box every frame, so every one
of those rebuilds redrew geometry that hadn't moved. Host-driven rotation felt
chunky as a result, while the built-in gestures hid it behind the fact that
they also change the view box.

The store now holds its reference when the values are equal, and the two path
memos key on the bounds' values rather than the bounds object, so quantisation
counts for something on pan and zoom too.
