---
'@pascal-app/editor': patch
---

Draw icons and hit targets correctly in the floor-plan PDF.

Two things went wrong for any node drawn as an icon over a hit target, such
as an item with a floor-plan image:

- Hit targets use `fill: 'transparent'`, which SVG treats as no paint. pdfkit
  doesn't recognize it and filled them solid black, so every icon became a
  black square. `transparent` is now skipped like `none`.
- The icon itself was dropped. Images were always `fetch`ed, which a CSP
  `connect-src` without `data:` refuses for a `data:` URL, and pdfkit only
  embeds PNG and JPEG. `data:` URLs are now used as-is, and SVG is rasterized
  to PNG first. Failures were swallowed, so neither problem was visible.
