---
'@pascal-app/editor': patch
---

Request the 2D floor-plan guide image with CORS.

The 2D panel's `<image>` loaded the guide without `crossOrigin`, so the browser
cached the response with no CORS headers on it. 3D then loads the same URL as a
texture, which does need them, gets the cached header-less response back, and
fails. Whether 3D works came down to which view happened to load the image
first.

`crossOrigin="anonymous"` on the 2D `<image>` makes both views ask for the same
thing, so one cache entry serves both. The attribute has no effect on 2D
rendering.
