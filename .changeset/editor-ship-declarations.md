---
'@pascal-app/editor': patch
---

Ship type declarations and resolve them via a `types` export condition.

`@pascal-app/editor` is the only publishable package that exposes raw
TypeScript rather than build output — `exports["."]` points straight at
`./src/index.tsx`. Every TypeScript consumer therefore type-checks the editor's
entire source tree, all 406 non-test files of it, on top of its own. That is
slow enough to matter on its own, and it also drags whatever the source
transitively pulls in — notably the react-three-fiber JSX augmentation — into
the consumer's global `JSX.IntrinsicElements` union, where it conflicts with
React 19's DOM element types and can push unrelated files past the
type-checker's complexity limits.

Emit declaration-only output to `dist/` via a `tsconfig.build.json` and point
the `types` export condition at `dist/index.d.ts`. The runtime conditions stay
on `src/` so embedders' bundlers are unaffected; only type resolution changes.
Consumers now see the public type surface instead of the implementation.

One consequence worth knowing: the `types` condition applies to _self_-
referential `@pascal-app/editor` imports too, so a stale or missing `dist/`
makes the package's own type-check report phantom "has no exported member"
errors. Build before checking types.
