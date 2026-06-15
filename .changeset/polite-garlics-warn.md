---
"@pascal-app/editor": patch
---

Add the `crossOrigin="anonymous"` attribute to the `<image>` SVG tag used to load the floor plan guide image in the **2D** editor. This ensures we get **CORS** headers back from the server. While they aren't required to display the image in the 2D editor, they _are_ required in the **3D** editor, where the image is loaded as a texture. If we don't make a CORS request in 2D and we load the image there first, the response is cached in the browser without the necessary headers. Then, when the 3D editor loads the same URL for the texture, it gets the cached response back without the necessary headers and blows up with a CORS error.
