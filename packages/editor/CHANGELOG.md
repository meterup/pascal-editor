# @pascal-app/editor

## 0.0.0-snapshot-20261006115347

### Minor Changes

- c7bd3bb: Take `cameraNavigationInput` as an `<Editor>` prop.

  The camera's ownership flag only existed on the viewer store, so declaring who
  drives a pane meant a prop for the floor plan and a store write for the camera.
  Both are the same kind of statement and both are now props:

  ```tsx
  <Editor floorplanNavigationInput="host" cameraNavigationInput="host" />
  ```

  Threaded through the store internally, because the camera controls sit inside
  the 3D canvas and take no props. The prop is the API; the store field is how it
  gets there.

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

### Patch Changes

- d5ad1c1: Let `hideBuiltInOverlays` hide the camera-controls hint.

  The dismissible hint panel that names the camera gestures sits inside the
  viewer canvas rather than the overlay block, so the flag didn't reach it. A host
  that replaced the chrome still got it, and worse, it describes the _built-in_
  bindings, which a host overriding them with `cameraInput` has just made wrong.

- ed7e32a: Let the 3D camera pan on a plain drag in a read-only scene.

  Left drag was `ACTION.NONE` outside preview mode, so panning a locked scene
  meant the middle button or holding space. A laptop trackpad has neither
  comfortably to hand, which made panning a scene the viewer can't even edit the
  most awkward gesture in it.

  A read-only scene has nothing for a drag to pick up or move, so the camera
  takes it, exactly as preview mode already did. Touch gets the same treatment: a
  one-finger drag trucks instead of orbiting. Editable scenes are unchanged,
  including space-to-pan.

  Clicking still selects, since a click isn't a drag, and marquee select was
  already off in a read-only scene.

## 0.0.0-snapshot-20261006095825

### Patch Changes

- f7a7267: Mark the 2D viewport with `data-pascal-floorplan-viewport`.

  A host binding its own navigation needs to know where the plan actually is on
  screen: anchoring a zoom to the pointer means measuring the cursor against the
  plan's own rect, and in split view that isn't the editor's rect. The 3D pane has
  carried `data-pascal-viewer-3d` for a while; this is its counterpart.

## 0.0.0-snapshot-20261006093619

### Patch Changes

- 1fd334b: Keep the compass live while the plan is being rotated.

  A rotation with the panel open moves the view with a CSS transform on the SVG,
  and the compass sits outside that SVG, so it wasn't carried along. The needle
  held its last committed heading for the whole gesture and jumped when the
  viewport settled.

  It was invisible with the built-in gestures, which commit often enough to hide
  it, and obvious under host-driven rotation, where a tween streams poses for a
  few hundred milliseconds before anything commits. A host consuming
  `onHeadingChange` saw nothing at all for the duration, since that signal is
  published from the same place the needle is written.

  The presentation path now writes the heading as it goes, so both the built-in
  needle and `onHeadingChange` track the gesture.

## 0.0.0-snapshot-20261006091106

### Patch Changes

- 9c85e9d: Stop the 2D grid re-ruling when the view box hasn't changed.

  `setLiveViewBox` published a fresh object on every imperative viewport write,
  and the grid's memo chain is keyed on that object's identity. So the grid
  rebuilt both of its paths every frame whether or not the view had moved, and
  `quantizeGridBounds` — which exists so a pan rebuilds the path once per few
  steps of travel rather than per frame — never got the chance to do its job.

  Rotation is where it showed. A rotation presentation moves the view with a CSS
  transform on the SVG and writes the _same_ view box every frame, so every one
  of those rebuilds redrew geometry that hadn't moved. Host-driven rotation felt
  chunky as a result, while the built-in gestures hid it behind the fact that
  they also change the view box.

  The store now holds its reference when the values are equal, and the two path
  memos key on the bounds' values rather than the bounds object, so quantisation
  counts for something on pan and zoom too.

## 0.0.0-snapshot-20261004123301

### Patch Changes

- 9e8fbcb: Stop host navigation re-rendering its caller, and keep the shared pose current.

  `useFloorplanNavigationControls` subscribed to `navigationSyncPose`, which
  changes every frame while anything is moving. Any component calling the hook
  re-rendered at that rate, and for one that renders the editor that is the whole
  cost the imperative viewport exists to avoid. It made a tweened rotation look
  chunky rather than smooth. `pose` and `metersPerPixel` are now `getPose()` and
  `getMetersPerPixel()`, read at call time, and the returned object has a stable
  identity so it can go straight into an effect's dependencies.

  Separately, the panel seeded `navigationSyncPose` exactly once. A single seed
  goes stale as soon as the plan moves any other way, most obviously the initial
  fit, which lands after the first viewport exists. A host reading that stale pose
  and publishing it back dragged the plan to wherever the seed was taken, which
  showed up as the view jumping on the first host-driven move. The panel now
  republishes on every committed viewport change, under the same conditions as
  before, so the store keeps describing the live 2D view.

## 0.0.0-snapshot-20261004120739

### Minor Changes

- 4baeb8e: Add `onHeadingChange` to the floor-plan compass slot.

  `needleRef` is the only way a host gets the per-frame heading, and it's typed
  `RefObject<SVGSVGElement>` for the element that visually rotates. That works for
  a host whose rotating element is an `<svg>` it owns, and not at all for one
  composing an existing icon component, which has nowhere to put the ref and
  falls back to re-rendering per commit.

  `onHeadingChange` carries the same values as a subscription:

  ```tsx
  floorplanCompassSlot={({ northRotationDeg, alignToNorth, onHeadingChange }) => {
    const heading = useMotionValue(northRotationDeg)
    useEffect(() => onHeadingChange((deg) => heading.set(deg)), [onHeadingChange])
    return <motion.div style={{ rotate: heading }} onClick={alignToNorth}>{glyph}</motion.div>
  }}
  ```

  It fires immediately with the current heading, because each source only writes
  on its own updates and a still view sends nothing, so a subscriber that waited
  would show north until the first movement.

  Deliberately a callback rather than an animation library's value type, so the
  slot contract stays library-agnostic and a host can drive a plain style write
  instead if it prefers. `needleRef` is unchanged.

- 4baeb8e: Add `useFloorplanNavigationControls` for host-driven 2D navigation.

  A host could already move the plan with `publishNavigationSyncPose`, but only by
  knowing rather a lot: that a pose is `{ target, azimuth, viewWidth }`, that
  `'host'` is the one source that always reaches the plan, that azimuth is
  radians, that screen deltas have to be rotated into the plan by its own azimuth
  before they can move the target, and that animating means publishing a stream
  rather than a single pose. The demo in `apps/editor` does all of that by hand.

  The hook does it instead:

  ```tsx
  const plan = useFloorplanNavigationControls()

  useGesture({
    onDrag: ({ delta: [dx, dy] }) => plan.panByPixels(-dx, -dy),
    onPinch: ({ offset: [scale] }) => plan.zoomTo(scale),
  })

  <button onClick={() => plan.rotateByDegrees(90, { durationMs: 260 })}>Rotate</button>
  ```

  Rotation tweens take the short way round, so turning from 350° to 10° travels
  20° forwards rather than 340° back, and an in-flight tween is cancelled by the
  next command or by unmount.

  Whether a command moves the 3D camera too is the link's business, not the
  hook's: these publish as `'host'`, which always drives the plan, and the camera
  follows only while `floorplanNavigationLink` is on.

  Supporting this, the floor-plan panel now publishes its measured size in CSS
  pixels. A pose carries only its width in metres, so until now nobody but the
  panel could convert one back to screen space, which is why the playground had
  to stand in `window.innerWidth` and why it was wrong in split view.

## 0.0.0-snapshot-20261002183359

### Patch Changes

- 665ed39: Let `hideBuiltInOverlays` hide the built-in Plugins panel.

  The flag cleared the floating overlays but left the Plugins manager in the rail,
  which `useHostPanels` appends in the `edit` workspace. A host passing
  `sidebarTabs={[]}` still got a non-empty tab bar, so the v2 layout rendered its
  left column for a panel the host never asked for. Capture mode used to cover
  this, which is exactly the coupling `hideBuiltInOverlays` exists to break.

  The flag now drops that panel too. Host panels and registered plugin panels are
  untouched, so a host can hide the built-in rail entry and still show its own.

## 0.0.0-snapshot-20261002155703

### Minor Changes

- a79cc1b: Add `floorplanDividerSlot` for host-owned split-view dividers.

  The divider's pill was a fixed neutral capsule, so a host whose own resize
  handles look nothing like it had no way to reconcile the two, and nowhere to
  hang a control that belongs on the boundary between the panes.

  The slot replaces the pill and receives the handler that starts the pane drag,
  so a host can put it on whatever the user actually grabs:

  ```tsx
  <Editor
    floorplanDividerSlot={({ startResize }) => (
      <MyControlGroup>
        <MyToggle onClick={(event) => event.stopPropagation()} />
        <MyGrabHandle onPointerDown={startResize} />
      </MyControlGroup>
    )}
  />
  ```

  The divider itself still starts a drag on pointer down, so controls that aren't
  the grab handle need to stop propagation or clicking them resizes the panes.

  Only rendered in split view. Omitting the slot keeps the built-in pill, which
  also now carries `data-pascal-floorplan-divider-thumb` for hosts that only want
  to restyle it.

## 0.0.0-snapshot-20261002154734

### Minor Changes

- dfb72d4: Add `hideBuiltInOverlays`, and let hosts style the split-view divider.

  Hosts that bring their own toolbar had one way to get rid of the editor's
  floating overlays: hold capture mode on. That works, but capture mode is a
  snapshot mode. It also unmounts `SelectionManager`, which owns the highlight
  material and the outliner as well as click handling, so the canvas ends up
  unselectable and nothing highlights even when something is selected from the
  2D plan. Permanent capture mode is the wrong tool and this was the cost.

  `hideBuiltInOverlays` hides exactly the overlays and nothing else:

  ```tsx
  <Editor hideBuiltInOverlays layoutVersion="v2" />
  ```

  That drops the level selector, the action menu, the panel manager and the
  helper manager, in both layout versions. Selection, hover highlighting and the
  editing handles all keep working, so a host can replace the chrome and still
  have an interactive canvas. Capture mode is unchanged and still suppresses the
  lot for the duration of a shot.

  The split-view divider also picks up `data-pascal-floorplan-divider` on its hit
  area and `data-pascal-floorplan-divider-thumb` on the pill, so a host can
  restyle it to match its own resize handles:

  ```css
  [data-pascal-floorplan-divider-thumb] {
    background: var(--my-handle-color);
  }
  ```

## 0.0.0-snapshot-20260930202703

### Patch Changes

- e5df7cf: Stop the 2D grid swapping its major and minor lines on every zoom step.

  `majorStep` was pinned at `minorStep * 2`, so it inherited every minor
  doubling. Each time the fine lines coarsened, the coarse frame moved with them
  and half the emphasised lines demoted to minor, in one jump, across the whole
  grid. Zooming read as the grid flip-flopping rather than refining.

  The majors get their own screen-spacing threshold now, so the two ladders cross
  at different zooms and the usual step refines the fine lines while the coarse
  frame stays put. Swept over a zoom-out, the number of steps that move both went
  from 5 to 0.

  Both ladders still double, so `majorStep / minorStep` stays a power of two.
  That's load-bearing: the minor path drops whatever lands on a major line via an
  alignment test, and a ratio like 2.5 would leave the lattices incommensurate,
  drawing fine lines under coarse ones and silently missing exclusions.

  The grid maths moved to `floorplan-grid.ts` and is covered by
  `floorplan-grid.test.ts`, matching how the other pure floor-plan helpers in this
  directory are structured and tested. No behaviour change beyond the ladder.

- 8156d9f: Re-rule the 2D grid during a pan or zoom instead of after it.

  The grid's level of detail only caught up when the viewport committed, roughly
  300ms after you stopped, so zooming out crowded the lines together and then
  popped them to the right density once you let go.

  The cause is structural rather than a missing dependency. Pan and zoom write the
  SVG's `viewBox` imperatively precisely so they don't `setState` on
  `FloorplanPanel`, whose render costs ~120-220ms, so anything the panel derives
  in React is a gesture behind by construction. Writing the path attribute behind
  React's back doesn't work either: the next render restores the committed path,
  and the grid alternates between the two.

  So the live view box is published to a small store and `FloorplanGridLayer`
  subscribes and rules itself. Same approach as `useFloorplanDraftPreview` and the
  other hot-value stores here: the panel stays out of the render path and only the
  two-path layer re-renders per frame.

  Two things keep that affordable, since `buildGridPath` walks the whole ruled
  area:

  - the ruled bounds snap to `GRID_QUANTUM_STEPS`, so a pan rebuilds the path once
    per few steps of travel rather than per pointer move
  - `GRID_MARGIN_STEPS` stays larger than the quantum, so the drift in between is
    already covered

  `floorplanBackgroundSlot`'s `bounds` is unchanged: it's still the
  rotation-inflated view, without the grid's margin, which is an implementation
  detail of how often the grid rebuilds.

- 7828128: Rule the 2D grid past the edge of the view so a gesture doesn't outrun it.

  Pan and zoom are applied imperatively (`applyFloorplanViewportImperatively`
  writes the `viewBox` directly) and only re-render on a 300ms debounce, so a path
  ruled exactly to the view leaves an unruled margin the moment either moves.

  The slack is counted in minor steps, not taken as a multiple of the view. The
  cost in `buildGridPath` is the number of subpaths, and a multiple of the view
  scales that with zoom without bound: a large enough `d` gets geometry dropped by
  the renderer and lines stop crossing the scene. Counted in steps the extra is
  fixed at `2 * GRID_MARGIN_STEPS` per axis at every zoom, while the distance
  covered still scales, because the step itself scales with zoom.

- ca10bf4: Rule the 2D grid from the viewport that's on screen, not the last committed one.

  `gridSteps` and `gridBounds` derived from `viewBox`, the committed viewport,
  while the SVG itself renders `presentationViewBox`, which tracks the imperative
  updates a pan or zoom makes. The two agree outside a gesture. During one they
  don't, so any render that happened for an unrelated reason (a selection, a
  hover) re-ruled the grid for the pre-gesture view and undid the gesture's effect
  on it until the 300ms viewport commit caught up.

  Both now read `presentationViewBox`, which is what the rest of the panel
  already presents from.

  Worth noting what this does not do: it doesn't make the grid live. Nothing
  re-renders per frame during a gesture, by design. It makes the renders that do
  happen correct, which together with the ruled margin is what keeps the grid
  stable through a gesture. Writing the path attribute imperatively per frame
  would be the alternative, and it fights React: the next render puts the
  committed path back.

- 7541b48: Stop the 2D grid flashing at axis-aligned rotations too.

  `crispEdges` was kept for multiples of 90 degrees on the theory that snapping
  lines onto the pixel grid is only harmful when they're diagonal. It isn't. The
  snap is per line, so on every sub-pixel change to the view box each line jumps a
  whole pixel independently of its neighbours. Diagonal lines re-stair-step, which
  reads as a shimmer; axis-aligned lines jitter. Being axis-aligned changes the
  artifact, not whether there is one.

  `crispEdges` only pays off for a grid that is both axis-aligned and still, and
  this one is a moving reference, so the grid now always asks for
  `geometricPrecision`.

- 566ba39: Stop the 2D grid shimmering when the plan is rotated.

  The grid drew with `shapeRendering="crispEdges"`, which turns off anti-aliasing
  so a 1px line lands exactly on the pixel grid. That only holds for axis-aligned
  lines. Rotate the plan and the lines are diagonal, so switching anti-aliasing
  off just stair-steps them, and the stepping pattern changes with every
  sub-pixel change to the view box. Every frame of a pan or zoom re-rasterized the
  whole grid differently, which reads as the grid flashing rather than moving. It
  aliases at rest too, and a 2x device pixel ratio doesn't rescue it, because the
  hint disables anti-aliasing regardless of density.

  `crispEdges` is now used only when the scene rotation is a multiple of 90
  degrees, where it's the right hint, and `geometricPrecision` otherwise.

  Measured on a rotated plan: across a zoom, mean luminance over the grid changed
  345 times with 261 of those reversing direction. A level-of-detail ladder is
  monotonic through a continuous zoom, so a 76% reversal rate is re-rasterization,
  not lines being added and removed.

- c0760d0: Let a host set the 2D grid's line widths.

  They were module constants, so the grid's weight was the one part of its
  appearance a host couldn't reach, while its colours and opacities were already
  overridable.

  `minorGridWidth` and `majorGridWidth` join `FloorplanPanelPalette`, which means
  they come through the existing `floorplanPalette` prop with no new API:

  ```tsx
  <Editor floorplanPalette={{ minorGridWidth: 0.3, majorGridWidth: 0.5 }} />
  ```

  Defaults are the previous constants, so nothing changes unless you set them.

  Worth knowing before you do: the lines are drawn with `non-scaling-stroke`, so
  these are screen pixels and don't follow the zoom, and the defaults are
  sub-pixel. That used to be propped up by `crispEdges` snapping thin lines up to a
  solid pixel. Now that the grid always anti-aliases, these values are what decide
  whether it reads at all.

- 6fcf751: Honour `readOnly` for the 2D guide image and site boundary.

  Both were draggable in a locked scene. The drag even appeared to work: the
  geometry followed the cursor, then snapped back on release when the store
  refused the write.

  `readOnly` was only ever consulted by the registry-driven path
  (`floorplan-registry-layer`, `floorplan-registry-action-menu`), which strips its
  own handles. The guide and site-boundary layers predate that mechanism and
  render their affordances directly, so nothing was checking the flag for them.

  They now gate on it alongside their existing conditions, so a read-only scene
  gets the guide and the boundary as static geometry with no drag targets,
  vertex handles, edge handles or midpoint handles.

  The site polygon itself is untouched by this: the fitted-viewport calculation
  still reads it to size the initial frame, so a locked scene frames the plan
  exactly as an editable one does.

- 5cf544a: Theme the container behind the 2D floor-plan SVG.

  `palette.surface` was already host-settable and already painted the surface rect,
  but the container the SVG sits in was a hardcoded `bg-white`. That isn't always
  covered: the rect lives inside the SVG, and a rotation gesture CSS-rotates the
  SVG, so the rect swings away from the corners and the container shows through.
  On a dark palette it flashed white for the length of every rotation.

  It takes `palette.surface` now, so there's one background colour for the plan
  rather than a themed one in front of an unthemed one.

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
