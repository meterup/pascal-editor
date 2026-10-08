/**
 * Which camera action a gesture performs.
 *
 * A deliberately small vocabulary, named for what the user sees rather than
 * for the underlying camera library's enum, so the binding API doesn't tie a
 * host to that dependency.
 */
export type CameraMouseAction = 'none' | 'pan' | 'rotate' | 'zoom' | 'dolly'

/**
 * Which camera action the wheel performs.
 *
 * Narrower than a button's, because a wheel has one axis: there is no sensible
 * reading of "rotate" or "pan" for it.
 */
export type CameraWheelAction = 'none' | 'zoom' | 'dolly'

/**
 * Which camera action a one-finger drag performs.
 *
 * Narrower than a multi-finger gesture's: zooming and dollying need two
 * fingers to express a distance.
 */
export type CameraSingleTouchAction = 'none' | 'pan' | 'rotate'

/**
 * Which camera action a multi-finger gesture performs.
 *
 * `zoomPan` and `dollyPan` are the combined gestures: pinch while dragging,
 * which is what a trackpad or a phone produces naturally.
 */
export type CameraTouchAction = CameraSingleTouchAction | 'zoom' | 'dolly' | 'zoomPan' | 'dollyPan'

/**
 * Who handles the 3D camera's gestures.
 *
 * `'host'` stands the built-in ones down so a host can bind its own, and is
 * the camera's counterpart to the floor plan's `floorplanNavigationInput`.
 * Distinct from the bindings below, which reconfigure the built-in handling
 * rather than turning it off.
 */
export type CameraNavigationInput = 'builtin' | 'host'

/**
 * Host overrides for the 3D camera's input bindings.
 *
 * Merged over whatever the current mode asked for, so an unset entry keeps its
 * default. That matters because the defaults aren't constant: they already vary
 * with preview mode, the camera projection, and whether space is held.
 */
export type CameraInputConfig = {
  mouseButtons?: Partial<{
    left: CameraMouseAction
    middle: CameraMouseAction
    right: CameraMouseAction
    wheel: CameraWheelAction
  }>
  touches?: Partial<{
    one: CameraSingleTouchAction
    two: CameraTouchAction
    three: CameraTouchAction
  }>
}
