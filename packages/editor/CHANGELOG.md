# @pascal-app/editor

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

- b2a11ba: Add an `appearance` prop controlling the editor's colour mode, replacing the
  unconditional `document.body.classList.add('dark')`.

  Defaults to `'dark'`, so nothing changes for existing hosts. `'light'` clears
  the class instead, and `'inherit'` leaves it alone for hosts that embed the
  editor in a page whose colour mode they already own. The effect now records
  the prior state and restores it on unmount, rather than assuming it set the
  class itself.

  The layout roots and chrome overlays also pinned `dark` on their own
  `className`, which would have made `'light'` and `'inherit'` a lie. They now
  inherit from the one class the prop manages. Every one of them sits inside
  `document.body` (the mobile panel sheet portals there), so nothing needs its
  own copy.

  Note this covers the editor's own Tailwind chrome. Scene and floor-plan
  colours follow `sceneTheme`'s `appearance` and the new `floorplanPalette`
  override, which are independent.

- f216d4b: Ship type declarations and resolve them via a `types` export condition.

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

- d360d5b: Respect the scene `readOnly` flag in the 2D floor plan. When the scene is
  read-only (e.g. version-preview mode, `isVersionPreview`), the registry action
  menu is hidden and the interactive edit handles (move / resize / vertex /
  midpoint / edge / rotate) are stripped from the overlay pass, while selection
  hit-lines, labels and dimensions still render. This mirrors the existing 3D
  `noEditing` gating so a locked plan is fully view-only in both views.

  It composes with, rather than replaces, the multi-selection `stripHandleChrome`
  pass: that one also drops dimensions, dimension labels and equal-spacing badges,
  because a multi-selection has no use for per-node measurements. A locked plan
  does — it is still worth measuring — so the read-only strip removes only the
  kinds that accept pointer input.

- 57cfab4: Add `floorplanBackgroundSlot`, a host-owned SVG backdrop for the 2D floor plan.

  `floorplanSceneSlot` is the last child of the transformed scene group, so its
  content paints over the plan. That makes it unusable for a backdrop, since SVG
  has no `z-index`. The new slot renders as the **first** child of the same group,
  under the grid and every geometry layer, and is a render prop so it can size
  itself from the panel's own numbers:

  ```tsx
  <Editor
    floorplanBackgroundSlot={({ bounds, unitsPerPixel, rotationDeg }) => (
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.maxX - bounds.minX}
        height={bounds.maxY - bounds.minY}
        fill="url(#host-dot-pattern)"
      />
    )}
  />
  ```

  `bounds` is the same rotation-inflated extent the grid spans, so a backdrop
  sized to it cannot expose a corner at any rotation. `unitsPerPixel` is there to
  hold pattern detail at a fixed screen size across zoom. `rotationDeg` is the
  scene rotation, for content that needs to counter-rotate. Being inside the
  scene group, the backdrop pans and rotates with the plan for free.

  `FloorplanBackgroundContext` is exported for typing the callback.

- fb559ef: Add `floorplanCompassSlot`, replacing the built-in floor-plan compass.

  The built-in one is hardcoded down to its needle colours and its corner, so a
  host matching its own design system had no way in short of hiding it with CSS.
  The slot receives what the built-in control renders from, so a replacement can
  match its behaviour rather than approximate it: the heading in degrees, an
  align-to-north callback, and the needle ref the live camera stream writes to per
  frame while the plan is hidden.

  ```tsx
  <Editor
    floorplanCompassSlot={({ northRotationDeg, alignToNorth, needleRef }) => (
      <MyCompass
        onClick={alignToNorth}
        ref={needleRef}
        rotation={northRotationDeg}
      />
    )}
  />
  ```

  Return `null` for no compass at all. It applies to both compass surfaces, the
  editor's 2D panel and `FloorplanPreview`, so Pascal's compass doesn't reappear
  in preview mode. `FloorplanCompassContext` and `FloorplanCompassSlot` are
  exported for typing the callback.

- da83f6c: Add `floorplanNavigationInput` for hosts that want their own 2D pan, rotate
  and zoom bindings.

  The built-in gestures are middle-drag or space and left-drag to pan, right-drag
  to rotate, wheel and pinch to zoom, all hardcoded. They suit a full-page editor
  but read oddly embedded, and on a trackpad there is no pan gesture at all
  without the keyboard. Setting `'host'` suppresses the pointer-down handler, the
  space-pan modifier and the wheel and pinch listeners, leaving the host free to
  bind what it wants and drive the view with `'host'` poses through
  `useEditor.publishNavigationSyncPose`.

  Nothing else is affected: node interaction, selection and the compass all still
  work. Space key-up stays unguarded so flipping modes mid-press can't leave the
  pan modifier stuck on.

- 4f0ae73: Add `floorplanNavigationLink` for letting the 2D plan and the 3D camera hold
  independent viewpoints in split mode.

  Defaults to `true`, the existing behaviour. `false` stops 2D poses reaching the
  camera (through the sync bridge's `setActive`) and stops camera poses moving the
  plan's viewport, while leaving host-published poses applying to the plan either
  way. Re-linking snaps the plan back onto the camera.

  The compass keeps working throughout, which took two fixes:

  - The needle tracks the camera while the panel is hidden, and did so by writing
    the ref holding the plan's own rotation. Unlinked, that drifts the plan's
    recorded rotation to a heading it never had, and align-to-north then works
    from the wrong baseline. It only follows the camera while linked now.
  - The needle describes whichever view is on screen, but each source only wrote
    on its own updates, so a still camera left the previous view's heading in an
    inline transform React had no reason to replace. It is handed over explicitly
    on every switch.

  Also seeds `navigationSyncPose`, which was only ever written as a side effect
  of navigating and so started null, leaving a host with nothing to read and no
  way to take a first relative step. Seeding happens where it cannot move
  anything by itself: when the host owns navigation input, or when the views are
  unlinked. It publishes a `'2d'` pose, which while linked drives the camera, and
  the plan's view width is its own fit rather than the camera's, so seeding
  unconditionally would rezoom the 3D view on mount.

  That is what lets a host drive one gesture and leave the rest built-in. Poses
  published as `'host'` apply to the plan whatever `floorplanNavigationInput` is
  set to, so an unlinked host can, say, step the plan in quarter turns while
  built-in pan and zoom carry on and the 3D camera orbits freely.

  The pure converters `cameraPoseToFloorplanNavigationPose` and
  `floorplanNavigationPoseToCameraPose` are exported for relating the two views.

- 74e7ba0: Add a `floorplanPalette` prop for overriding the 2D floor plan's colours.

  The palette was computed internally from the scene theme's appearance with no
  way in, so hosts matching the plan to their own design system were reduced to
  targeting Pascal's hex values with CSS. Overrides are `Partial`, merged over
  the built-in light or dark palette, so omitted slots keep their defaults:

  ```tsx
  <Editor floorplanPalette={{ surface: "transparent", minorGrid: "#e5e7eb" }} />
  ```

  The panel palette is now exported as `FloorplanPanelPalette` for typing the
  override. It is a superset of `FloorplanPalette` in `@pascal-app/core`, and the
  slots registry kinds consume are forwarded through `<FloorplanRenderProvider>`,
  so one override reaches both the panel's own drawing and every kind's geometry.
  Renaming it also ends the collision with the core type it mirrors.

- 437b854: Export the rest of the fresh-placement helpers: `createFreshPlacementSubtree`,
  `prepareFreshPlacementRootDuplicate` and `duplicatesAsFreshSubtree`.

  Only `commitFreshPlacementSubtree` was exported, so a host driving its own
  placement flow could finish a draft but not start one. It had to reimplement
  the create half, including the `metadata.isNew` convention, and then drift from
  it. `duplicatesAsFreshSubtree` is the predicate that picks between the subtree
  and root-duplicate paths, so it ships alongside them.

- 9deb497: Restore the always-on 3D ground grid and reconnect it to the viewer's `showGrid`
  preference.

  The grid had become a placement-only aid: the baseline alpha was pinned to `0`
  and mesh visibility keyed on `isGridSnapActive()`, replacing the previous
  `visible={showGrid}` binding. A host that never arms a build tool (read-only
  plan viewers, embedded scenes) was left with no grid at all and an inert Display
  toggle, with no way to opt back in.

  Placement behaviour is unchanged. An armed draft/build tool, a node move, or a
  reshape still gets the tight cursor patch with no baseline and a brightened
  alpha. Otherwise the grid is the ground reference again: the wider
  `revealRadius` reveal over a constant baseline, unboosted, shown only while
  `showGrid` is on.

  ```ts
  const snapPatchVisible = isGridSnapActive();
  revealRadiusUniform.value = snapPatchVisible
    ? PLACEMENT_REVEAL_RADIUS
    : revealRadius;
  baseAlphaUniform.value = snapPatchVisible ? 0 : IDLE_BASE_ALPHA;
  patchAlphaUniform.value = snapPatchVisible ? 1.5 : 1;
  gridRef.current.visible = snapPatchVisible || showGrid;
  ```

  Grid pointer events are unaffected either way: `useGridEvents` raycasts its own
  math plane rather than the mesh, so visibility never changed tool behaviour.

- cb26a98: Add a `'host'` navigation-sync source so an embedding app can drive the views.

  `useEditor.publishNavigationSyncPose` already existed, but `NavigationSyncSource`
  was `'2d' | '3d'` and each consumer tested for the other view's literal. A host
  pose had to claim it came from a view it isn't, and claiming `'2d'` reached the
  camera while claiming `'3d'` reached the floor plan, so neither worked for both.

  A view now applies any pose it didn't publish itself, expressed as
  `drivesFloorplanView` and `drivesCamera` rather than repeated literals, so the
  next source added reaches every consumer. `NavigationSyncPose`,
  `NavigationSyncPoseInput` and `NavigationSyncSource` are exported for typing
  the call.

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

- b7e3e0f: Stop gating the editor shell on 3D scene readiness when only the 2D pane is
  showing.

  In a 2D-only view the 3D pane is `display: none`, so its canvas measures 0x0,
  R3F never renders the scene tree, no node renderer calls `useRegistry`, and
  `hasCommittedSceneRoot()` stays false. `isViewerSceneReady` is therefore
  unreachable rather than merely slow, and every load sat behind the full
  `SCENE_READY_FALLBACK_MS` before the fallback fired and logged
  `viewer scene readiness timed out`. Measured on a 351-node plan: a consistent
  ~8s loader over an already-rendered floor plan, with `sceneRegistry` empty
  throughout.

  This is reachable without a host forcing anything. `viewMode` is persisted in
  `pascal-editor-ui-preferences` and restored verbatim by
  `normalizePersistedEditorUiState`, so any session that ended in 2D rehydrates
  straight back into it on the next load.

  The loader now waits only on what a 2D stage actually needs, and the readiness
  timeout is skipped entirely in that case:

  ```ts
  const sceneLoaded = !isLoading && !isSceneLoading && hasLoadedInitialScene;
  const twoDimensionalOnly = isPreviewMode
    ? previewStageMode === "2d"
    : viewMode === "2d";
  const showLoader =
    !sceneLoaded || (!twoDimensionalOnly && !isViewerSceneReady);
  ```

  This subsumes the previous `visibleLoader` carve-out, which applied the same
  reasoning to the 2D preview stage only, so that variable is gone. Overlay
  behaviour for preview is unchanged; 2D-only stages additionally pause the hidden
  viewer once the scene has loaded, which costs nothing given it was never
  rendering.

- Updated dependencies [1e95676]
- Updated dependencies [72125a2]
- Updated dependencies [31a9122]
  - @pascal-app/core@0.0.0-snapshot-20260922140121
  - @pascal-app/viewer@0.0.0-snapshot-20260922140121
