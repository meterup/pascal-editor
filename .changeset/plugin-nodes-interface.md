---
'@pascal-app/core': patch
---

Make `PluginNodes` an interface again, so plugin kinds can actually be declared.

It shipped as `export type PluginNodes = {}`. `declare module` merges into
interfaces only, so the documented usage failed outright:

```
error TS2300: Duplicate identifier 'PluginNodes'.
```

Every augmentation declared a second, unrelated alias instead of widening the
registry, leaving `AnyNode`, `AnyNodeType` and `AnyNodeId` with no plugin kinds
in them and hosts back to widening to `string` or asserting. The feature had no
working path.

The alias came from `lint/suspicious/noEmptyInterface`, whose fix Biome
classifies as safe. It isn't safe here: rewriting this particular empty
interface removes the only way to contribute a kind, and nothing fails at the
call site, so it reads as a tidy-up. Restored with a scoped `biome-ignore` and a
note, since `biome check --write` reverts it otherwise.

Covered by a compile-time probe: a declared kind's `` `${kind}_${string}` `` id
is now assignable to `AnyNodeId`, which is what the changeset for the original
feature claimed and what `TS2300` was blocking.
