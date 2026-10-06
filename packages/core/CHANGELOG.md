# @pascal-app/core

## 0.0.0-snapshot-20260930202703

### Patch Changes

- 7d8e873: Let plugins type their node kinds into `AnyNode` by declaration merging.

  Plugin kinds were absent from `AnyNode`, `AnyNodeType` and `AnyNodeId`, so
  plugin code and anything consuming it had to widen to `string` or cast. Ids
  made it worse: `objectId` produces `` `${kind}_${string}` ``, so a plugin node's
  id was never assignable to `AnyNodeId` and generic scene code reached for
  `as AnyNodeId`.

  Declare kinds in `PluginNodes` and they join all three unions, which restores
  exhaustive `switch`es and drops the casts:

  ```ts
  declare module "@pascal-app/core/plugin-nodes" {
    interface PluginNodes {
      tree: z.infer<typeof TreeNode>;
    }
  }
  ```

  Purely type-level and additive. The interface ships empty, `PluginNodeType`
  resolves to `never`, and `AnyNode` stays exactly equal to the new `BuiltinNode`
  alias, so a host with no plugins sees no change at all. There is no runtime
  component and no API signature churn; `nodeRegistry.get` still takes `string`,
  which it has to, since `setPluginDiscovery` allows kinds that were never
  compiled against.

  Two design points worth knowing:

  The interface lives in its own module and is reachable only at
  `@pascal-app/core/plugin-nodes`. `declare module` merges only with the module
  that declares the interface, and the package entry is a pure barrel, so
  augmenting `@pascal-app/core` would quietly declare an unrelated second
  interface and widen nothing. Nothing else is exported from that module, so an
  augmentation has nothing to shadow.

  `PluginNode` adds the common `BaseNode` fields and takes `type` from the key
  rather than trusting the declared shape. `AnyNode` is a union, and a union only
  exposes properties present on every member, so a declaration that
  under-described itself would silently strip `parentId` and friends from
  `AnyNode` across the entire host, with the errors landing in host code far from
  the plugin responsible.

- d0a75ce: Make `PluginNodes` an interface again, so plugin kinds can actually be declared.

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

## 0.0.0-snapshot-20260922140121

### Minor Changes

- 72125a2: Rebase the fork onto upstream `pascalorg/editor@4c34032c` (2026-08-24) — 478
  commits, and a move off the fork's own `0.9.x` line onto upstream's `1.0.0-beta`
  versioning. The fork now carries nothing but its release machinery and two
  editor patches; everything else is upstream.

  Nothing we previously exported was removed. The public API grew substantially
  (core 172 → 388 exports, viewer 106 → 193, editor 156 → 470) without breaking
  underneath consumers.

  What matters most for consumers:

  - **Near-collinear wall junctions no longer explode.**
    `calculateJunctionIntersections` now rejects a miter on its _outcome_, capped
    at `MITER_LIMIT` (10) half-thicknesses, rather than only rejecting walls that
    are exactly parallel. A junction where two walls run straight through each
    other but miss collinearity by a fraction of a degree used to put a plan
    vertex `halfThickness / sin(θ)` away — kilometres out, collapsing the 2D
    fit-to-bounds into one flat rectangle and firing beams across the 3D scene. It
    now butts. Imported floor plans with off-axis wall runs render correctly.
  - **Level assembly is dramatically faster.** `findJunctions` buckets walls into
    a spatial grid by AABB instead of testing every wall against every junction
    point. On a 1081-wall imported floor that is 584 ms → 11 ms per call, and
    `WallSystem` repeats the call every frame while progressively rebuilding.
  - **Vertical building model.** Scenes now carry explicit building and level
    structure (`buildingId`, `schema/nodes/building.ts`), with load-time
    migrations for saves that predate it — vertical, site-child, wall-slot,
    elevator, retired-floorplan and construction-dimension. Anything synthesizing
    a `SceneGraph` rather than loading a saved one needs to match the new shape;
    this is the single change most likely to require work on the consumer side.
  - **New packages:** `capture-protocol`, `capture-viewer`, `cli`. New core
    systems alongside `wall/` and `stair/`: `fence/`, `slab/`, `elevator/`.
  - **`healSceneNodes`** repairs already-saved scenes on load, dropping
    degenerate nodes such as zero-length walls.

  Three fork patches are dropped here because upstream made them redundant:

  - The `floorplan-registry-layer` geometry cache. Upstream landed its own
    `geometryCacheRef`/`levelDataCacheRef` memoisation plus the `findJunctions`
    prefilter above, which together address the same stall from further up.
  - The `ThreeElements`/`lineBasicNodeMaterial` narrowing in `viewer` that let
    `tsgo` check the package. Upstream adopted the TypeScript 7 native compiler
    and landed the identical narrowing.
  - `crossOrigin` on the 2D guide image. It forced the 2D `<image>` to fetch in
    the same CORS mode as the 3D texture load so the two shared one browser cache
    entry instead of downloading the image twice. Consumers that hand Pascal
    same-origin blob URLs never hit the split in the first place, and the flag is
    actively wrong for guide images served without CORS headers.

### Patch Changes

- 1e95676: Add an `alignmentGuideStroke` slot to `FloorplanPalette` and draw the 2D snap
  guides from it.

  `FloorplanAlignmentGuideLayer` hardcoded `#ef4444`, so the one piece of 2D
  chrome most visible during a drag was the one piece a theme couldn't reach.
  It already consumes the render context, so it now reads the slot and keeps the
  red as its no-provider fallback.

- Updated dependencies [72125a2]
  - @pascal-app/capture-protocol@0.0.0-snapshot-20260922140121
