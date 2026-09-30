import { describe, expect, test } from 'bun:test'
import {
  buildGridPath,
  getVisibleGridSteps,
  isGridAligned,
  MIN_GRID_SCREEN_SPACING,
  MIN_MAJOR_GRID_SCREEN_SPACING,
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
