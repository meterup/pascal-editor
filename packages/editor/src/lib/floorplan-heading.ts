/**
 * The 2D plan's heading, as a stream.
 *
 * The built-in compass gets this by having its needle's element written to
 * directly, which is why `FloorplanCompassContext` hands out an
 * `SVGSVGElement` ref. That only works for a host whose rotating element *is*
 * an `<svg>` it owns; one composing an existing icon component has nowhere to
 * put the ref and falls back to re-rendering per commit.
 *
 * Publishing the same values as a subscription gives those hosts the per-frame
 * stream without the element constraint, and without putting an animation
 * library's types in the slot contract.
 */

type HeadingListener = (northRotationDeg: number) => void

const listeners = new Set<HeadingListener>()

let latestHeadingDeg = 0

/**
 * Publish the plan's heading.
 *
 * Called from `setFloorplanCompassRotation`, so every write to the built-in
 * needle reaches subscribers whether or not that needle is mounted.
 */
export function publishFloorplanHeading(northRotationDeg: number): void {
  latestHeadingDeg = northRotationDeg
  for (const listener of listeners) listener(northRotationDeg)
}

/** The most recently published heading, in degrees, 0 with north up. */
export function getFloorplanHeading(): number {
  return latestHeadingDeg
}

/**
 * Subscribe to the plan's heading, in degrees, 0 with north up.
 *
 * Fires immediately with the current value, because each source only writes on
 * its own updates and a still view sends nothing, so a subscriber that waited
 * would show north until the first movement.
 *
 * @returns An unsubscribe function
 */
export function subscribeFloorplanHeading(listener: HeadingListener): () => void {
  listeners.add(listener)
  listener(latestHeadingDeg)
  return () => {
    listeners.delete(listener)
  }
}
