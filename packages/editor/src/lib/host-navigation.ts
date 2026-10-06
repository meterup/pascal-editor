'use client'

/**
 * Host-facing commands for moving the 2D plan.
 *
 * Everything here goes through `publishNavigationSyncPose`, so this adds no
 * capability a host didn't already have. What it adds is not having to know
 * how: that a pose is `{ target, azimuth, viewWidth }`, that `'host'` is the
 * one source that always reaches the plan, that azimuth is radians, that screen
 * deltas have to be rotated into the plan before they can move the target, and
 * that animating means publishing a stream rather than a single pose.
 *
 * Imports nothing from the editor's components, so it can move or be dropped
 * without touching anything else.
 */

import { animate } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import useEditor, {
  type NavigationSyncPose,
  type NavigationSyncPoseInput,
} from '../store/use-editor'
import useFloorplanViewport from '../store/use-floorplan-viewport'

/** Smallest view width we'll zoom to, in metres. Matches the playground. */
const MIN_VIEW_WIDTH = 0.5

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/**
 * The rotation equivalent to `target` that is nearest `from`.
 *
 * Turning from 350° to 10° should travel 20° forwards, not 340° back.
 */
export const nearestEquivalentRadians = (from: number, target: number): number => {
  const fullTurn = Math.PI * 2
  const delta = ((((target - from) % fullTurn) + fullTurn * 1.5) % fullTurn) - Math.PI
  return from + delta
}

export type FloorplanAnimationOptions = {
  /**
   * Tween duration in milliseconds. Omitted or `0` jumps straight there.
   *
   * The plan applies every pose it receives, because its receive path is built
   * for the camera's 60fps stream, so a stream is also how you animate.
   */
  durationMs?: number
}

export type FloorplanNavigation = {
  /**
   * The plan's current pose, or `null` before it has published one.
   *
   * A getter rather than a value on purpose. The pose changes every frame while
   * anything is moving, so subscribing to it would re-render this hook's caller
   * at that rate, which for a caller that renders the editor is the whole cost
   * the imperative viewport exists to avoid.
   */
  getPose: () => NavigationSyncPose | null
  /**
   * Scene metres per CSS pixel, or `null` before the plan has published a pose.
   *
   * The conversion screen-space input needs, and the reason `panByPixels`
   * exists rather than leaving every host to work it out.
   */
  getMetersPerPixel: () => number | null
  /**
   * Moves the view by a screen-space delta, in CSS pixels.
   *
   * Signed like a wheel event: positive `dxPx` moves the view right, which
   * slides the plan left under it. Drag-to-pan wants the negated delta.
   *
   * Rotation is handled here, so the delta is always in the host's own screen
   * space whatever heading the plan is at.
   */
  panByPixels: (dxPx: number, dyPx: number) => void
  /** Moves the view by a scene-space delta, in metres. */
  panByMeters: (dx: number, dz: number) => void
  /** Centres the view on a scene-space point, `[x, z]` in metres. */
  centerOn: (x: number, z: number) => void
  /** Scales the view width. Above 1 zooms out, below 1 zooms in. */
  zoomBy: (factor: number) => void
  /** Sets the view width directly, in metres. */
  zoomTo: (viewWidth: number) => void
  /** Turns the view by a relative angle, in degrees. Positive is clockwise. */
  rotateByDegrees: (degrees: number, options?: FloorplanAnimationOptions) => void
  /** Turns the view to an absolute heading, in degrees, 0 with north up. */
  rotateToDegrees: (degrees: number, options?: FloorplanAnimationOptions) => void
  /** Stops an in-flight rotation tween where it is. */
  stopAnimation: () => void
}

/**
 * Commands for moving the 2D plan, for hosts binding their own input.
 *
 * Pairs with a gesture library without any pose arithmetic at the call site:
 *
 * ```tsx
 * const plan = useFloorplanNavigation()
 * useGesture({
 *   onDrag: ({ delta: [dx, dy] }) => plan.panByPixels(-dx, -dy),
 *   onPinch: ({ offset: [scale] }) => plan.zoomTo(scale),
 * })
 * ```
 *
 * Whether a command moves the 3D camera too is the link's business, not this
 * hook's: these publish as `'host'`, which always drives the plan, and the
 * camera follows only while `floorplanNavigationLink` is on.
 *
 * @returns The current pose, the pixel conversion, and the commands
 */
export const useFloorplanNavigation = (): FloorplanNavigation => {
  const animationRef = useRef<{ stop: () => void } | null>(null)

  const getPose = useCallback(() => useEditor.getState().navigationSyncPose, [])

  const getMetersPerPixel = useCallback(() => {
    const pose = useEditor.getState().navigationSyncPose
    if (!pose) return null
    return pose.viewWidth / Math.max(useFloorplanViewport.getState().surfaceSize.width, 1)
  }, [])

  const stopAnimation = useCallback(() => {
    animationRef.current?.stop()
    animationRef.current = null
  }, [])

  useEffect(() => stopAnimation, [stopAnimation])

  // Reads the pose at call time rather than closing over it, so a command fired
  // from a gesture handler doesn't act on a pose from an earlier render.
  const publish = useCallback(
    (change: (pose: NavigationSyncPose) => Partial<NavigationSyncPoseInput>) => {
      const current = useEditor.getState().navigationSyncPose
      if (!current) return

      useEditor.getState().publishNavigationSyncPose({
        source: 'host',
        target: [...current.target],
        azimuth: current.azimuth,
        viewWidth: current.viewWidth,
        ...change(current),
      })
    },
    [],
  )

  const panByMeters = useCallback(
    (dx: number, dz: number) => {
      publish((current) => ({
        target: [current.target[0] + dx, current.target[1], current.target[2] + dz],
      }))
    },
    [publish],
  )

  const panByPixels = useCallback(
    (dxPx: number, dyPx: number) => {
      publish((current) => {
        const scale =
          current.viewWidth / Math.max(useFloorplanViewport.getState().surfaceSize.width, 1)
        // Screen deltas are in view space, so they rotate into the plan by the
        // view's own azimuth before they can move the target.
        const cos = Math.cos(current.azimuth)
        const sin = Math.sin(current.azimuth)
        const right = dxPx * scale
        const down = dyPx * scale

        return {
          target: [
            current.target[0] + right * cos + down * sin,
            current.target[1],
            current.target[2] - right * sin + down * cos,
          ],
        }
      })
    },
    [publish],
  )

  const centerOn = useCallback(
    (x: number, z: number) => {
      publish((current) => ({ target: [x, current.target[1], z] }))
    },
    [publish],
  )

  const zoomTo = useCallback(
    (viewWidth: number) => {
      publish(() => ({ viewWidth: Math.max(MIN_VIEW_WIDTH, viewWidth) }))
    },
    [publish],
  )

  const zoomBy = useCallback(
    (factor: number) => {
      publish((current) => ({
        viewWidth: Math.max(MIN_VIEW_WIDTH, current.viewWidth * factor),
      }))
    },
    [publish],
  )

  const rotateToRadians = useCallback(
    (targetAzimuth: number, { durationMs = 0 }: FloorplanAnimationOptions = {}) => {
      stopAnimation()

      const current = useEditor.getState().navigationSyncPose
      if (!current) return

      const destination = nearestEquivalentRadians(current.azimuth, targetAzimuth)

      if (durationMs <= 0) {
        publish(() => ({ azimuth: destination }))
        return
      }

      animationRef.current = animate(current.azimuth, destination, {
        duration: durationMs / 1000,
        ease: 'easeOut',
        onUpdate: (azimuth) => publish(() => ({ azimuth })),
        onComplete: () => {
          animationRef.current = null
        },
      })
    },
    [publish, stopAnimation],
  )

  const rotateToDegrees = useCallback(
    (degrees: number, options?: FloorplanAnimationOptions) => {
      rotateToRadians(toRadians(degrees), options)
    },
    [rotateToRadians],
  )

  const rotateByDegrees = useCallback(
    (degrees: number, options?: FloorplanAnimationOptions) => {
      const current = useEditor.getState().navigationSyncPose
      if (!current) return
      rotateToRadians(current.azimuth + toRadians(degrees), options)
    },
    [rotateToRadians],
  )

  // Stable identity, so a caller can put this straight in an effect's
  // dependencies without rebinding its listeners on every render.
  return useMemo(
    () => ({
      getPose,
      getMetersPerPixel,
      panByPixels,
      panByMeters,
      centerOn,
      zoomBy,
      zoomTo,
      rotateByDegrees,
      rotateToDegrees,
      stopAnimation,
    }),
    [
      getPose,
      getMetersPerPixel,
      panByPixels,
      panByMeters,
      centerOn,
      zoomBy,
      zoomTo,
      rotateByDegrees,
      rotateToDegrees,
      stopAnimation,
    ],
  )
}
