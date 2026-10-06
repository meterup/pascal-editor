# @pascal-app/viewer

## 0.0.0-snapshot-20261006111152

### Minor Changes

- e02fd18: Add `useCameraNavigation`, and `cameraNavigationInput` to match the plan's.

  The camera's configuration was a store setter while the floor plan's was a
  hook, and the camera had no equivalent of `floorplanNavigationInput` at all, so
  the two panes were configured in two different idioms for the same kinds of
  decision.

  `useCameraNavigation` carries both halves: the bindings, applied while it's
  mounted and restored when it unmounts, and the commands a toolbar drives the
  camera with.

  ```tsx
  const CAMERA_BINDINGS = { mouseButtons: { left: 'pan' } } as const

  const camera = useCameraNavigation({ bindings: CAMERA_BINDINGS })
  <button onClick={camera.fitScene}>Fit</button>
  ```

  `fitScene` measures the scene itself. The camera's fallback is a fixed
  `setLookAt(20, 20, 20, …)` that lands inside anything wider than about 20m, so
  every host was computing bounds by hand to avoid it. `computeSceneBoundsXZ` is
  exported now too, since the event's own docs pointed at it while it was
  internal.

  `cameraNavigationInput` is the camera's `'builtin' | 'host'`, and resolves to
  binding every gesture to nothing rather than being a second mechanism each
  binding site has to account for.

  Renamed `useFloorplanNavigationControls` to `useFloorplanNavigation`, matching
  the new hook and dropping a suffix that collided with both camera-controls and
  UI controls.

  A caveat for host-owned input on an editable scene: the editor claims some
  drags for itself (an armed tool, a node being moved, a handle under the
  cursor), and that arbitration isn't exposed yet. Binding your own gestures is
  safe on a read-only scene and will fight the editor on an editable one until it
  is.

## 0.0.0-snapshot-20261006102507

### Minor Changes

- 28d6cff: Let a host bind the 3D camera's gestures.

  The bindings were fixed: left drag selects unless you're in preview mode or
  holding space, middle pans, right rotates, wheel zooms. A host whose scene is
  read-only, or whose users are on laptop trackpads with no middle button, had no
  say — panning meant the space bar.

  `cameraInput` on `useViewer` merges over the defaults rather than replacing
  them, so an unset entry keeps whatever the current mode asked for:

  ```ts
  useViewer.getState().setCameraInput({
    mouseButtons: { left: "pan" },
    touches: { one: "pan" },
  });
  ```

  Actions are named for what the user sees (`pan`, `rotate`, `zoom`, `dolly`,
  and `zoomPan` / `dollyPan` for the combined two-finger gestures) rather than
  mirroring the camera library's enum, so the binding API doesn't tie a host to
  that dependency. The wheel and the one-finger slots take narrower sets than the
  others, because a wheel has one axis and a pinch needs two fingers.

  Merging also covers the modifier path, which rebuilds the bindings on every key
  change, so holding space no longer drops a host's overrides.

## 0.0.0-snapshot-20260930202703

### Minor Changes

- 8e9b05d: Add `showSiteBoundary` to hide the site's boundary geometry.

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

- 31a9122: Let a scene theme set the ground grid's line colours and idle opacity.

  `appearance` hardcoded both colours, and in dark mode `<Grid>` also ignored its
  own `cellColor` / `sectionColor` props, so neither a theme nor a host could
  adjust how the grid read. That matters because the grid is drawn over the lit
  `ground` fill: its contrast against that surface is a property of the pair, and
  a light/dark flag can't settle it. `ground` and `backgroundSky` were already
  carved out of `appearance` for the same reason.

  ```ts
  const theme = SCENE_THEMES.find((t) => t.id === "night");
  theme.grid = { cell: "#2b2d3a", section: "#343747", idleOpacity: 0.18 };
  ```

  All three keys are optional and fall back to the previous `appearance`-derived
  values, so existing themes render identically. `idleOpacity` applies to the
  always-on ground reference only; an active placement patch keeps its own
  brightened treatment.

- Updated dependencies [1e95676]
- Updated dependencies [72125a2]
  - @pascal-app/core@0.0.0-snapshot-20260922140121
