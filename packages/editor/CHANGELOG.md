# @pascal-app/editor

## 0.9.3

### Patch Changes

- 13890ba: Ship type declarations and resolve them via a `types` export condition.

  **@pascal-app/editor** exposed only its TypeScript source via
  `exports["."] = "./src/index.tsx"`, so every TypeScript consumer
  type-checked the editor's whole source tree—surfacing the internal
  **react-three-fiber** JSX augmentation (`declare module 'react/jsx-runtime'` in
  box-select-tool.tsx), which conflicts with React 19 DOM element types
  and pollutes the global `JSX.IntrinsicElements` union downstream.

  Emit declaration-only output to **dist/** and
  point the `types` export condition at `dist/index.d.ts` The runtime entrypoint stays on
  **src/** for embedders' bundlers. Consumers now resolve the public type
  surface and the augmentation lives only in `box-select-tool`'s declaration,
  which nothing in the public type graph imports, so it stops leaking.

## 0.9.2

### Patch Changes

- 6b38be1: Add the `crossOrigin="anonymous"` attribute to the `<image>` SVG tag used to load the floor plan guide image in the **2D** editor. This ensures we get **CORS** headers back from the server. While they aren't required to display the image in the 2D editor, they _are_ required in the **3D** editor, where the image is loaded as a texture. If we don't make a CORS request in 2D and we load the image there first, the response is cached in the browser without the necessary headers. Then, when the 3D editor loads the same URL for the texture, it gets the cached response back without the necessary headers and blows up with a CORS error.

## 0.9.1

### Patch Changes

- 480483e: Introduce geometry cache workaround into **FloorplanRegistryLayer** to fix performance regression related to egregious re-render/scene graph traversal/rebuild for cursor and edit interactions.
