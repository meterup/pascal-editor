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

/** Scene-space view box, matching the SVG's `viewBox`. */
export type FloorplanLiveViewBox = {
  minX: number
  minY: number
  width: number
  height: number
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
}

const useFloorplanViewport = create<FloorplanViewportState>()((set) => ({
  liveViewBox: null,
  setLiveViewBox: (liveViewBox) => set({ liveViewBox }),
}))

export default useFloorplanViewport
