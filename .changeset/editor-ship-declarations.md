---
"@pascal-app/editor": patch
---

Ship type declarations and resolve them via a `types` export condition.

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
