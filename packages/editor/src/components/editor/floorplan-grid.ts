import { WALL_GRID_STEP } from '../tools/wall/wall-drafting'

/** Minimum on-screen spacing for the fine lines before they coarsen. */
export const MIN_GRID_SCREEN_SPACING = 12

/**
 * Minimum on-screen spacing for the emphasised lines, kept well clear of
 * `MIN_GRID_SCREEN_SPACING` so the two ladders step at different zooms. The
 * coarse frame reads as a frame at roughly this spacing; below it the majors
 * crowd and stop being distinguishable from the minors.
 */
export const MIN_MAJOR_GRID_SCREEN_SPACING = 60

export const MAJOR_GRID_STEP = WALL_GRID_STEP * 2

/**
 * Decimal places grid coordinates are rounded to.
 *
 * Grid positions are computed as `index * step`, so a step like 0.1 accumulates
 * binary error (`3 * 0.1 === 0.30000000000000004`). Rounding keeps the emitted
 * path text stable and, more importantly, keeps `isGridAligned` from missing an
 * exclusion because a coordinate landed a few ULPs off the major line.
 */
export const GRID_COORDINATE_PRECISION = 6

/**
 * Extra rows and columns ruled beyond the view, counted in minor steps.
 *
 * Pan and zoom are applied imperatively and only re-render on a 300ms debounce,
 * so a path ruled to the view exactly leaves an unruled margin the moment
 * either moves. This is the slack that covers a gesture.
 *
 * Counted in steps, not as a multiple of the view, because the cost in
 * `buildGridPath` is the number of subpaths. A multiple of the view scales that
 * with zoom without bound, and a large enough `d` gets geometry dropped by the
 * renderer: lines stop crossing the scene. In steps the extra count is fixed
 * (`2 * GRID_MARGIN_STEPS` per axis) while the distance covered still scales,
 * since the step scales with zoom. At the 12px floor that's ~576px of slack.
 */
export const GRID_MARGIN_STEPS = 48

/**
 * Granularity the ruled area snaps to, in minor steps.
 *
 * The grid re-rules per frame during a gesture, and `buildGridPath` walks the
 * whole ruled area, so rebuilding on every pointer move is wasteful when the
 * result barely differs. Snapping the bounds to this means a pan rebuilds once
 * per `GRID_QUANTUM_STEPS` of travel; `GRID_MARGIN_STEPS` covers the drift in
 * between, which is why it has to be the larger of the two.
 */
export const GRID_QUANTUM_STEPS = 8

export type GridBounds = { minX: number; maxX: number; minY: number; maxY: number }
export type GridViewBox = { minX: number; minY: number; width: number; height: number }

/**
 * How to rasterize the grid at a given scene rotation.
 *
 * `crispEdges` turns off anti-aliasing so a 1px line lands exactly on the pixel
 * grid. That only holds for axis-aligned lines. Rotate the scene and the lines
 * are diagonal, so switching it off just stair-steps them, and the stepping
 * changes with every sub-pixel change to the view box. A pan or zoom then
 * re-rasterizes the whole grid differently each frame, which reads as the grid
 * shimmering rather than moving.
 */
export function getGridShapeRendering(
  rotationDegrees: number,
): 'crispEdges' | 'geometricPrecision' {
  const offAxis = Math.abs(((rotationDegrees % 90) + 90) % 90)

  return offAxis < 1e-6 || offAxis > 90 - 1e-6 ? 'crispEdges' : 'geometricPrecision'
}

/**
 * Snap bounds outward to a multiple of `quantum`.
 *
 * Only ever enlarges, so coverage is never reduced. The point is to stop the
 * ruled area changing on every frame of a pan: quantized, the path is rebuilt
 * once per `quantum` of travel instead of per pointer move, and the ruled
 * margin absorbs the difference in between.
 */
export function quantizeGridBounds(bounds: GridBounds, quantum: number): GridBounds {
  if (!(Number.isFinite(quantum) && quantum > 0)) {
    return bounds
  }

  return {
    minX: Math.floor(bounds.minX / quantum) * quantum,
    maxX: Math.ceil(bounds.maxX / quantum) * quantum,
    minY: Math.floor(bounds.minY / quantum) * quantum,
    maxY: Math.ceil(bounds.maxY / quantum) * quantum,
  }
}

/** Grow bounds outward by `margin` plan units on every side. */
export function expandGridBounds(bounds: GridBounds, margin: number): GridBounds {
  if (!(Number.isFinite(margin) && margin > 0)) {
    return bounds
  }

  return {
    minX: bounds.minX - margin,
    maxX: bounds.maxX + margin,
    minY: bounds.minY - margin,
    maxY: bounds.maxY + margin,
  }
}

export function normalizeGridCoordinate(value: number): number {
  return Number(value.toFixed(GRID_COORDINATE_PRECISION))
}

export function isGridAligned(value: number, step: number): boolean {
  if (!(Number.isFinite(step) && step > 0)) {
    return false
  }

  const normalizedValue = normalizeGridCoordinate(value / step)
  return Math.abs(normalizedValue - Math.round(normalizedValue)) < 1e-4
}

/**
 * The fine and coarse spacings to rule at, for a given zoom.
 *
 * `pixelsPerUnit` decides both, but the two run on their own ladders. The
 * majors used to be pinned at `minorStep * 2`, so they inherited every minor
 * doubling: each time the fine lines coarsened, half the major lines demoted to
 * minor and the emphasis swapped across the whole grid at once. Separate
 * thresholds mean the ladders step at different zooms, so the common case
 * refines the fine lines and leaves the coarse frame where it is.
 *
 * Both ladders double, so `majorStep / minorStep` is always a power of two.
 * That matters: `buildGridPath` drops whatever lands on a major line via an
 * alignment test, and a ratio like 2.5 would leave the two lattices
 * incommensurate, drawing fine lines under coarse ones and missing exclusions.
 */
export function getVisibleGridSteps(
  viewportWidth: number,
  surfaceWidth: number,
): {
  minorStep: number
  majorStep: number
} {
  const pixelsPerUnit = surfaceWidth / Math.max(viewportWidth, Number.EPSILON)
  let minorStep = WALL_GRID_STEP

  while (minorStep * pixelsPerUnit < MIN_GRID_SCREEN_SPACING) {
    minorStep *= 2
  }

  let majorStep = Math.max(MAJOR_GRID_STEP, minorStep * 2)

  while (majorStep * pixelsPerUnit < MIN_MAJOR_GRID_SCREEN_SPACING) {
    majorStep *= 2
  }

  return { minorStep, majorStep }
}

/** Axis-aligned bounds of a view box after the scene rotation is applied. */
export function getRotatedViewBoxBounds(viewBox: GridViewBox, rotationDegrees: number): GridBounds {
  const radians = (-rotationDegrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const corners = [
    { x: viewBox.minX, y: viewBox.minY },
    { x: viewBox.minX + viewBox.width, y: viewBox.minY },
    { x: viewBox.minX + viewBox.width, y: viewBox.minY + viewBox.height },
    { x: viewBox.minX, y: viewBox.minY + viewBox.height },
  ]

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const corner of corners) {
    const x = corner.x * cos - corner.y * sin
    const y = corner.x * sin + corner.y * cos
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  return { minX, maxX, minY, maxY }
}

export function buildGridPath(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  step: number,
  options?: {
    excludeStep?: number
  },
): string {
  if (!(Number.isFinite(step) && step > 0)) {
    return ''
  }

  const commands: string[] = []
  const startXIndex = Math.floor(minX / step)
  const endXIndex = Math.ceil(maxX / step)
  const startYIndex = Math.floor(minY / step)
  const endYIndex = Math.ceil(maxY / step)
  const gridMinX = normalizeGridCoordinate(minX)
  const gridMaxX = normalizeGridCoordinate(maxX)
  const gridMinY = normalizeGridCoordinate(minY)
  const gridMaxY = normalizeGridCoordinate(maxY)

  for (let index = startXIndex; index <= endXIndex; index += 1) {
    const x = index * step
    if (options?.excludeStep && isGridAligned(x, options.excludeStep)) {
      continue
    }

    const gridX = normalizeGridCoordinate(x)
    commands.push(`M ${gridX} ${gridMinY} L ${gridX} ${gridMaxY}`)
  }

  for (let index = startYIndex; index <= endYIndex; index += 1) {
    const y = index * step
    if (options?.excludeStep && isGridAligned(y, options.excludeStep)) {
      continue
    }

    const gridY = normalizeGridCoordinate(y)
    commands.push(`M ${gridMinX} ${gridY} L ${gridMaxX} ${gridY}`)
  }

  return commands.join(' ')
}
