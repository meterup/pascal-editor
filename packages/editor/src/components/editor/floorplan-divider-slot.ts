'use client'

import type React from 'react'

/** Everything the built-in split-view divider is given, for hosts rendering their own. */
export type FloorplanDividerContext = {
  /**
   * Starts the pane drag. Put it on whatever the user grabs to resize.
   *
   * The divider that wraps the slot also starts a drag on pointer down, so a
   * control that isn't the grab handle needs to stop propagation or clicking it
   * will resize the panes.
   */
  startResize: (event: React.PointerEvent) => void
}

/**
 * Replaces the pill on the split-view divider. Return `null` for a bare divider.
 *
 * Only rendered in split view, since that is the only time there are two panes
 * to size against each other.
 */
export type FloorplanDividerSlot = (context: FloorplanDividerContext) => React.ReactNode
