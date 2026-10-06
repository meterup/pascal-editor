// Ephemeral store for the 2D floor-plan's in-flight VIEWPORT — the view box a
// pan or zoom is currently showing, before it commits.
//
// It exists for the same reason `useFloorplanDraftPreview` does: pan and zoom
// are applied imperatively (`applyFloorplanViewportImperatively` writes the
// SVG's `viewBox` directly) precisely so they don't `setState` on
// `FloorplanPanel`, whose render costs ~120-220ms. Anything the panel derives in
// React is therefore a gesture behind, which is why the grid's level of detail
// only caught up ~300ms after you stopped zooming.
//
// Publishing here lets the small grid layer subscribe and re-rule itself per
// frame while the panel stays out of the render path entirely.
//
// Editor-only. The producer clears it when the viewport commits.

import { create } from 'zustand'

/** The panel's measured size, in CSS pixels. */
export type FloorplanSurfaceSize = {
  width: number
  height: number
}

/** Scene-space view box, matching the SVG's `viewBox`. */
export type FloorplanLiveViewBox = {
  minX: number
  minY: number
  width: number
  height: number
}

const isSameLiveViewBox = (
  a: FloorplanLiveViewBox | null,
  b: FloorplanLiveViewBox | null,
): boolean => {
  if (a === b) return true
  if (!(a && b)) return false
  return a.minX === b.minX && a.minY === b.minY && a.width === b.width && a.height === b.height
}

type FloorplanViewportState = {
  /**
   * The view box a gesture is currently showing, or `null` when settled.
   *
   * Consumers fall back to the committed viewport when this is `null`, so the
   * settled case behaves exactly as it did before this store existed.
   */
  liveViewBox: FloorplanLiveViewBox | null
  setLiveViewBox: (viewBox: FloorplanLiveViewBox | null) => void
  /**
   * The panel's measured size, in CSS pixels.
   *
   * Published so screen-space deltas can be turned into scene units without
   * measuring the panel again. A navigation pose carries its width in metres
   * and nothing else, so on its own nobody but the panel can convert it back
   * to pixels.
   */
  surfaceSize: FloorplanSurfaceSize
  setSurfaceSize: (size: FloorplanSurfaceSize) => void
}

const useFloorplanViewport = create<FloorplanViewportState>()((set) => ({
  liveViewBox: null,
  setLiveViewBox: (liveViewBox) =>
    // Publishing an equal-but-new object would still re-render every
    // subscriber, and the grid's memo chain is keyed on this object's
    // identity. A rotation is the case that makes it obvious: it moves the
    // view with a CSS transform and writes the *same* view box every frame,
    // so without this the grid re-rules 60 times a second to redraw what it
    // already had. It also defeats `quantizeGridBounds`, which exists so a pan
    // rebuilds the path once per few steps rather than per frame.
    set((state) => (isSameLiveViewBox(state.liveViewBox, liveViewBox) ? {} : { liveViewBox })),
  // Mirrors the panel's own initial state, so a consumer dividing by the width
  // before the first measurement gets 1 rather than 0.
  surfaceSize: { width: 1, height: 1 },
  setSurfaceSize: (surfaceSize) => set({ surfaceSize }),
}))

export default useFloorplanViewport
