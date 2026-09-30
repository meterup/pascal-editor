import { describe, expect, test } from 'bun:test'
import {
  buildGridPath,
  expandGridBounds,
  GRID_MARGIN_STEPS,
  GRID_QUANTUM_STEPS,
  getGridShapeRendering,
  getRotatedViewBoxBounds,
  getVisibleGridSteps,
  isGridAligned,
  MIN_GRID_SCREEN_SPACING,
  MIN_MAJOR_GRID_SCREEN_SPACING,
  quantizeGridBounds,
} from './floorplan-grid'

const SURFACE_WIDTH = 800

/** Steps at a given zoom, expressed as pixels per plan unit. */
const stepsAt = (pixelsPerUnit: number) =>
  getVisibleGridSteps(SURFACE_WIDTH / pixelsPerUnit, SURFACE_WIDTH)

describe('floorplan grid steps', () => {
  test('never coarsens both ladders at the same zoom', () => {
    // The regression this guards: `majorStep` was pinned at `minorStep * 2`, so
    // every minor doubling took the majors with it and half the emphasised
    // lines demoted to minor in one jump. Sweeping a zoom-out, no single step
    // may move both.
    let previous = stepsAt(60)
    const bothChanged: number[] = []

    for (let pixelsPerUnit = 60; pixelsPerUnit >= 1; pixelsPerUnit -= 0.25) {
      const current = stepsAt(pixelsPerUnit)
      if (current.minorStep !== previous.minorStep && current.majorStep !== previous.majorStep) {
        bothChanged.push(pixelsPerUnit)
      }
      previous = current
    }

    expect(bothChanged).toEqual([])
  })

  test('keeps the major/minor ratio a power of two', () => {
    // `buildGridPath` drops minor lines that land on a major one via an
    // alignment test. A non-integer ratio leaves the lattices incommensurate:
    // minors draw under majors and the exclusions silently stop matching.
    for (let pixelsPerUnit = 60; pixelsPerUnit >= 1; pixelsPerUnit -= 0.25) {
      const { minorStep, majorStep } = stepsAt(pixelsPerUnit)
      const ratio = Math.log2(majorStep / minorStep)

      expect(Math.abs(ratio - Math.round(ratio))).toBeLessThan(1e-9)
      expect(majorStep).toBeGreaterThan(minorStep)
    }
  })

  test('honours both minimum screen spacings', () => {
    for (let pixelsPerUnit = 60; pixelsPerUnit >= 1; pixelsPerUnit -= 0.25) {
      const { minorStep, majorStep } = stepsAt(pixelsPerUnit)

      expect(minorStep * pixelsPerUnit).toBeGreaterThanOrEqual(MIN_GRID_SCREEN_SPACING)
      expect(majorStep * pixelsPerUnit).toBeGreaterThanOrEqual(MIN_MAJOR_GRID_SCREEN_SPACING)
    }
  })

  test('coarsens monotonically as the view widens', () => {
    let previous = stepsAt(60)

    for (let pixelsPerUnit = 60; pixelsPerUnit >= 1; pixelsPerUnit -= 0.25) {
      const current = stepsAt(pixelsPerUnit)

      expect(current.minorStep).toBeGreaterThanOrEqual(previous.minorStep)
      expect(current.majorStep).toBeGreaterThanOrEqual(previous.majorStep)
      previous = current
    }
  })
})

describe('floorplan grid path', () => {
  test('rules every line across the full bounds', () => {
    const path = buildGridPath(-4, 4, -2, 2, 1)
    const verticals = path.match(/M -?[\d.]+ -2 L -?[\d.]+ 2/g) ?? []
    const horizontals = path.match(/M -4 -?[\d.]+ L 4 -?[\d.]+/g) ?? []

    expect(verticals).toHaveLength(9)
    expect(horizontals).toHaveLength(5)
  })

  test('omits the lines the major grid already draws', () => {
    const minor = buildGridPath(-4, 4, -4, 4, 1, { excludeStep: 2 })

    // Odd multiples stay, even ones are the major grid's to draw.
    expect(minor).toContain('M 1 -4 L 1 4')
    expect(minor).not.toContain('M 2 -4 L 2 4')
  })

  test('treats a coordinate off a major line by floating-point noise as aligned', () => {
    // Positions come from `index * step`, so 0.1 steps drift: `3 * 0.1` is
    // 0.30000000000000004. Without rounding, the exclusion misses and a minor
    // line draws underneath a major one.
    expect(isGridAligned(3 * 0.1, 0.1)).toBe(true)
    expect(isGridAligned(0.15, 0.1)).toBe(false)
  })

  test('returns nothing for a degenerate step', () => {
    expect(buildGridPath(-1, 1, -1, 1, 0)).toBe('')
    expect(buildGridPath(-1, 1, -1, 1, Number.NaN)).toBe('')
  })
})

describe('floorplan grid rasterization', () => {
  test('only turns off anti-aliasing when the grid is axis-aligned', () => {
    // `crispEdges` snaps lines to the pixel grid, which only helps when they're
    // axis-aligned. Rotated, it stair-steps them instead, and the stepping
    // changes with every sub-pixel view-box change, so a pan or zoom shimmers.
    for (const rotation of [0, 90, 180, 270, -90, 360]) {
      expect(getGridShapeRendering(rotation)).toBe('crispEdges')
    }

    for (const rotation of [45, 1, -1, 44.9, 89.5, 135, 0.5]) {
      expect(getGridShapeRendering(rotation)).toBe('geometricPrecision')
    }
  })
})

describe('floorplan grid margin', () => {
  const subpaths = (path: string) => (path.match(/M /g) ?? []).length

  test('adds a fixed number of lines whatever the zoom', () => {
    // The regression this guards: the slack was once taken as a multiple of the
    // view, so the subpath count scaled with zoom until the `d` grew large
    // enough that the renderer dropped geometry and lines stopped crossing the
    // scene. In steps the extra count is the same at every zoom.
    const counts = [60, 24, 12, 4, 1].map((pixelsPerUnit) => {
      const { minorStep } = stepsAt(pixelsPerUnit)
      const view = getRotatedViewBoxBounds(
        {
          minX: -400 / pixelsPerUnit,
          minY: -300 / pixelsPerUnit,
          width: 800 / pixelsPerUnit,
          height: 600 / pixelsPerUnit,
        },
        0,
      )
      const bare = buildGridPath(view.minX, view.maxX, view.minY, view.maxY, minorStep)
      const expanded = expandGridBounds(view, minorStep * GRID_MARGIN_STEPS)
      const ruled = buildGridPath(
        expanded.minX,
        expanded.maxX,
        expanded.minY,
        expanded.maxY,
        minorStep,
      )

      return subpaths(ruled) - subpaths(bare)
    })

    // Two axes, `GRID_MARGIN_STEPS` either side of each.
    for (const added of counts) {
      expect(added).toBe(4 * GRID_MARGIN_STEPS)
    }
  })

  test('covers more distance the further out you zoom', () => {
    const near = stepsAt(60).minorStep * GRID_MARGIN_STEPS
    const far = stepsAt(1).minorStep * GRID_MARGIN_STEPS

    expect(far).toBeGreaterThan(near)
  })

  test('leaves bounds alone for a degenerate margin', () => {
    const bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 }

    expect(expandGridBounds(bounds, 0)).toEqual(bounds)
    expect(expandGridBounds(bounds, Number.NaN)).toEqual(bounds)
  })

  test('quantizing only ever enlarges, so coverage is never lost', () => {
    const bounds = { minX: -3.3, maxX: 4.1, minY: -0.2, maxY: 7.9 }
    const quantized = quantizeGridBounds(bounds, 2)

    expect(quantized.minX).toBeLessThanOrEqual(bounds.minX)
    expect(quantized.maxX).toBeGreaterThanOrEqual(bounds.maxX)
    expect(quantized.minY).toBeLessThanOrEqual(bounds.minY)
    expect(quantized.maxY).toBeGreaterThanOrEqual(bounds.maxY)
  })

  test('quantizing holds the bounds steady across a sub-quantum pan', () => {
    // This is what stops the path rebuilding on every pointer move: drifting by
    // less than a quantum has to land on the same ruled area.
    const first = quantizeGridBounds({ minX: 0, maxX: 10, minY: 0, maxY: 10 }, 4)
    const nudged = quantizeGridBounds({ minX: 0.5, maxX: 10.5, minY: 0.5, maxY: 10.5 }, 4)

    expect(nudged).toEqual(first)
  })

  test('the margin outlasts the quantum, so drift stays covered', () => {
    expect(GRID_MARGIN_STEPS).toBeGreaterThan(GRID_QUANTUM_STEPS)
  })

  test('leaves bounds alone for a degenerate quantum', () => {
    const bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 }

    expect(quantizeGridBounds(bounds, 0)).toEqual(bounds)
    expect(quantizeGridBounds(bounds, Number.NaN)).toEqual(bounds)
  })
})
