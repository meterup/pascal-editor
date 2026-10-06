'use client'

/**
 * Host-facing control of the 3D camera: how its gestures are bound, and the
 * commands a toolbar drives it with.
 *
 * The counterpart to `useFloorplanNavigation`. The two don't have the same
 * shape, because the camera already implements its gestures and the plan does
 * not: here a host declares which gesture does what, there it writes the
 * handlers itself.
 *
 * Imports nothing from the editor's components, so it can move or be dropped
 * without touching anything else.
 */

import { type AnyNode, emitter, useScene } from '@pascal-app/core'
import { type CameraInputConfig, useViewer } from '@pascal-app/viewer'
import { useCallback, useEffect, useMemo } from 'react'

import { computeSceneBoundsXZ } from './scene-bounds'

export type CameraNavigationOptions = {
  /**
   * Which gesture drives which camera action, merged over the defaults so an
   * unset entry keeps whatever the current mode asked for.
   *
   * Hoist or memoize this: a fresh object each render reapplies the bindings
   * every render. Applied while this hook is mounted and restored when it
   * unmounts, so bindings don't outlive the screen that asked for them.
   */
  bindings?: CameraInputConfig
}

export type CameraNavigationControls = {
  /**
   * Frames the camera on the scene's extent.
   *
   * Measures the scene itself rather than taking bounds, because the camera's
   * fallback pose is a fixed `setLookAt(20, 20, 20, …)` that lands inside
   * anything wider than about 20m.
   */
  fitScene: () => void
  /** Looks straight down. */
  topView: () => void
  /** Orbits a step clockwise. */
  orbitClockwise: () => void
  /** Orbits a step counter-clockwise. */
  orbitCounterClockwise: () => void
  /** Frames a single node. */
  focusOn: (nodeId: AnyNode['id']) => void
  /** Moves to a head-on view of a single node. */
  viewFromFront: (nodeId: AnyNode['id']) => void
}

/**
 * Bind the 3D camera's gestures, and drive it from a host toolbar.
 *
 * ```tsx
 * const CAMERA_BINDINGS = { mouseButtons: { left: 'pan' }, touches: { one: 'pan' } } as const
 *
 * const camera = useCameraNavigation({ bindings: CAMERA_BINDINGS })
 * <button onClick={camera.fitScene}>Fit</button>
 * ```
 *
 * The commands go over the same event channel the editor's own camera UI uses,
 * so they work from outside the 3D canvas, where the camera's imperative
 * handle isn't reachable.
 *
 * @returns The camera commands
 */
export const useCameraNavigation = (
  options?: CameraNavigationOptions,
): CameraNavigationControls => {
  const bindings = options?.bindings

  useEffect(() => {
    if (!bindings) return undefined

    useViewer.getState().setCameraInput(bindings)

    return () => {
      useViewer.getState().setCameraInput(null)
    }
  }, [bindings])

  const fitScene = useCallback(() => {
    const bounds = computeSceneBoundsXZ(useScene.getState().nodes)

    emitter.emit('camera-controls:fit-scene', bounds ? { bounds } : {})
  }, [])

  const topView = useCallback(() => emitter.emit('camera-controls:top-view'), [])
  const orbitClockwise = useCallback(() => emitter.emit('camera-controls:orbit-cw'), [])
  const orbitCounterClockwise = useCallback(() => emitter.emit('camera-controls:orbit-ccw'), [])

  const focusOn = useCallback(
    (nodeId: AnyNode['id']) => emitter.emit('camera-controls:focus', { nodeId }),
    [],
  )

  const viewFromFront = useCallback(
    (nodeId: AnyNode['id']) => emitter.emit('camera-controls:view', { nodeId }),
    [],
  )

  return useMemo(
    () => ({
      fitScene,
      topView,
      orbitClockwise,
      orbitCounterClockwise,
      focusOn,
      viewFromFront,
    }),
    [fitScene, topView, orbitClockwise, orbitCounterClockwise, focusOn, viewFromFront],
  )
}
