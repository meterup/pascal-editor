---
'@pascal-app/editor': minor
---

Export the floor-plan PDF as a `Blob` for hosts, and drop `blob-stream`.

`renderFloorplanPdf({ scope, levelIds })` renders the same multi-page PDF the
settings panel's export buttons do and resolves to `{ blob, filename,
pageCount }` (or `null` when there is nothing to draw), so a host can download,
upload or inspect it. `levelIds` limits the export to particular levels; pages
still run bottom-to-top. `exportFloorplanPdf(scope)` is now exported too, and
remains the download-only path.

The PDF bytes are now collected from pdfkit's own readable stream instead of
`blob-stream`. That module calls `util.inherits(…, stream.Writable)` when it
loads, so any bundler that doesn't shim Node's `stream` and `util` (Vite, for
one) failed as soon as it evaluated the module.
