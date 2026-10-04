'use client'

import type React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/primitives/tooltip'

export type FloorplanCompassButtonProps = {
  northRotationDeg: number
  onAlignNorth: () => void
  needleRef?: React.RefObject<SVGSVGElement | null>
}

/** Everything the built-in compass is given, for hosts rendering their own. */
export type FloorplanCompassContext = {
  /** Heading of the view the compass describes, in degrees, 0 with north up. */
  northRotationDeg: number
  /** Turns the view to put north up. */
  alignToNorth: () => void
  /**
   * Attach to the element that visually rotates, if you want the needle to
   * stay smooth while the 2D panel is hidden. The live camera stream writes
   * that element's transform directly, because re-rendering the floor plan
   * every camera frame to move a needle is too expensive. Ignoring this ref
   * still leaves a correct compass, just one that updates per commit rather
   * than per frame.
   *
   * Only usable by a host whose rotating element is an `<svg>` it owns. If it
   * composes an existing icon component instead, use `onHeadingChange`.
   */
  needleRef: React.RefObject<SVGSVGElement | null>
  /**
   * The same per-frame heading as `needleRef`, as a subscription, for hosts
   * that can't attach the ref. Fires immediately with the current heading.
   *
   * Drive whatever you like from it, an animation library's value or a style
   * write by hand:
   *
   * ```tsx
   * const heading = useMotionValue(0)
   * useEffect(() => onHeadingChange((deg) => heading.set(deg)), [onHeadingChange])
   * return <motion.div style={{ rotate: heading }}>{glyph}</motion.div>
   * ```
   *
   * @returns An unsubscribe function
   */
  onHeadingChange: (listener: (northRotationDeg: number) => void) => () => void
}

/**
 * Replaces the built-in compass. Return `null` for no compass at all.
 *
 * Receives the same values the built-in one renders from, so a host control
 * can match its behaviour rather than approximate it.
 */
export type FloorplanCompassSlot = (context: FloorplanCompassContext) => React.ReactNode

export function FloorplanCompassButton({
  northRotationDeg,
  onAlignNorth,
  needleRef,
}: FloorplanCompassButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label="Align view to north"
          className="group pointer-events-auto absolute bottom-3 left-3 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/85 shadow-sm backdrop-blur-md transition hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-neutral-900/85 dark:hover:bg-neutral-900"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onAlignNorth()
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          type="button"
        >
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#b8b8b8] shadow-inner dark:bg-neutral-700">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              ref={needleRef}
              style={{ transform: `rotate(${northRotationDeg}deg)` }}
              viewBox="0 0 48 48"
            >
              <path d="M24 4.5 31.5 25 24 21.5 16.5 25Z" fill="#f15b5b" />
              <path d="M24 43.5 16.5 23 24 26.5 31.5 23Z" fill="#ffffff" />
            </svg>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Align view to north</TooltipContent>
    </Tooltip>
  )
}
