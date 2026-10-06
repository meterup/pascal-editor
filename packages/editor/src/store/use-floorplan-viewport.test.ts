import { beforeEach, describe, expect, it } from 'bun:test'

import useFloorplanViewport from './use-floorplan-viewport'

const viewBox = (minX: number, minY: number, width: number, height: number) => ({
  minX,
  minY,
  width,
  height,
})

describe('live view box', () => {
  beforeEach(() => {
    useFloorplanViewport.getState().setLiveViewBox(null)
  })

  it('keeps the same reference when the values are unchanged', () => {
    const { setLiveViewBox } = useFloorplanViewport.getState()

    setLiveViewBox(viewBox(0, 0, 10, 10))
    const first = useFloorplanViewport.getState().liveViewBox

    // A rotation presentation moves the view with a CSS transform and writes
    // the same view box every frame. Handing back a new object would re-render
    // every subscriber and rebuild the grid path for geometry that didn't move.
    setLiveViewBox(viewBox(0, 0, 10, 10))

    expect(useFloorplanViewport.getState().liveViewBox).toBe(first)
  })

  it('publishes when any single field changes', () => {
    const { setLiveViewBox } = useFloorplanViewport.getState()

    const cases = [viewBox(1, 0, 10, 10), viewBox(0, 1, 10, 10), viewBox(0, 0, 11, 10)]

    for (const next of cases) {
      setLiveViewBox(viewBox(0, 0, 10, 10))
      const before = useFloorplanViewport.getState().liveViewBox

      setLiveViewBox(next)

      expect(useFloorplanViewport.getState().liveViewBox).not.toBe(before)
      expect(useFloorplanViewport.getState().liveViewBox).toEqual(next)
    }
  })

  it('round-trips through null without collapsing it into a value', () => {
    const { setLiveViewBox } = useFloorplanViewport.getState()

    setLiveViewBox(viewBox(0, 0, 10, 10))
    setLiveViewBox(null)
    expect(useFloorplanViewport.getState().liveViewBox).toBeNull()

    setLiveViewBox(null)
    expect(useFloorplanViewport.getState().liveViewBox).toBeNull()

    setLiveViewBox(viewBox(0, 0, 10, 10))
    expect(useFloorplanViewport.getState().liveViewBox).toEqual(viewBox(0, 0, 10, 10))
  })
})
