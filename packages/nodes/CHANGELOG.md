# @pascal-app/nodes

## 1.0.0-beta.6

### Minor Changes

- 2f5c4e1: Rebase the fork onto upstream `pascalorg/editor@4c34032c` (2026-08-24) — 478
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

- e1d3a5a: Add `showSiteBoundary` to hide the site's boundary geometry.

  The boundary was always drawn, with no way to turn it off. It is a useful
  reference while laying out a site and pure noise on a surface that only presents
  a finished building.

  `showSiteBoundary` joins `useViewer` next to `showGrid` / `showZones` and
  governs both views from one flag, because it is the same polygon in each:

  ```ts
  useViewer.getState().setShowSiteBoundary(false);
  ```

  In 2D that drops the dashed polygon, its edge labels and its handles. In 3D it
  drops the ground pad and the amber outline. Buildings, items and the horizon
  ground are unaffected, so the scene loses its lot outline rather than its floor
  — the horizon disc punches holes for slab footprints, not for the site polygon,
  so it still covers the ground the pad was covering.

  Two things stay deliberately outside the flag. The fitted viewport still sizes
  itself from the site polygon, so toggling this doesn't reframe the plan. And
  sculpted terrain keeps rendering, since that is modelled geometry rather than
  boundary chrome.

  Defaults to `true` and isn't persisted, so nothing changes until a host sets it.
