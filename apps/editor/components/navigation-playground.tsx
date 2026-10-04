'use client'

import type { CameraPose } from '@pascal-app/core'
import {
  type FloorplanCompassContext,
  type FloorplanCompassSlot,
  type FloorplanNavigationInput,
  subscribeCameraPose,
  useEditor,
  useFloorplanNavigationControls,
} from '@pascal-app/editor'
import { motion, useMotionValue } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'

export type NavigationPlaygroundState = {
  appearance: 'light' | 'dark' | 'inherit'
  navigationInput: FloorplanNavigationInput
  navigationLink: boolean
  tintPalette: boolean
  compass: 'builtin' | 'host' | 'none'
  animateRotation: boolean
}

export const NAVIGATION_PLAYGROUND_DEFAULTS: NavigationPlaygroundState = {
  appearance: 'dark',
  navigationInput: 'builtin',
  navigationLink: true,
  tintPalette: false,
  compass: 'builtin',
  animateRotation: true,
}

/**
 * A host compass, to check the slot hands over everything the built-in one
 * gets.
 *
 * Drives the needle from `onHeadingChange` rather than `needleRef`, which is
 * the path open to a host whose rotating element isn't an `<svg>` it owns. A
 * `MotionValue` takes the per-frame updates, so they never reach React.
 */
function HostCompass({ northRotationDeg, alignToNorth, onHeadingChange }: FloorplanCompassContext) {
  const heading = useMotionValue(northRotationDeg)

  useEffect(() => onHeadingChange((deg) => heading.set(deg)), [heading, onHeadingChange])

  return (
    <button
      aria-label="Align view to north"
      className="pointer-events-auto absolute right-3 bottom-3 z-30 flex items-center gap-2 rounded-md border border-sky-400/40 bg-sky-950/80 px-2 py-1 font-mono text-[10px] text-sky-200 shadow-lg backdrop-blur transition hover:bg-sky-900/80"
      onClick={alignToNorth}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      <motion.svg
        aria-hidden="true"
        className="h-4 w-4"
        style={{ rotate: heading }}
        viewBox="0 0 48 48"
      >
        <path d="M24 5 33 27 24 22 15 27Z" fill="currentColor" />
      </motion.svg>
      {/* Per commit, not per frame. The needle has to be smooth; a number
          nobody can read at 60fps does not, and rendering it that often would
          put the panel back in the render path this slot exists to avoid. */}
      <span>{Math.round(northRotationDeg)}°</span>
    </button>
  )
}

// A component rather than inline JSX because the slot is called during the
// panel's render, so hooks written here would join the panel's hook order.
export const hostCompassSlot: FloorplanCompassSlot = (context) => <HostCompass {...context} />

/** Stands in for a host design system, to prove the override reaches everything. */
export const TINTED_FLOORPLAN_PALETTE = {
  surface: '#faf5ff',
  minorGrid: '#e9d5ff',
  majorGrid: '#c084fc',
  selectedStroke: '#7e22ce',
  selectedFill: '#f3e8ff',
  wallFill: '#ede9fe',
  wallStroke: '#6b21a8',
  alignmentGuideStroke: '#0ea5e9',
} as const

const ZOOM_PER_WHEEL_UNIT = 0.0015
const ROTATE_DEGREES_PER_PIXEL = 0.3
const QUARTER_TURN_DEGREES = 90

const QUARTER_TURN_DURATION_MS = 260

/**
 * Turns the plan a quarter at a time, snapping to the nearest quarter first.
 *
 * The tween is the editor's: `rotateByDegrees` publishes a stream of poses,
 * because the plan's receive path is built for the camera's 60fps stream and a
 * stream is therefore also how you animate.
 */
const useQuarterTurnPlan = (animated: boolean) => {
  const plan = useFloorplanNavigationControls()

  return useCallback(
    (direction: 1 | -1) => {
      const pose = plan.getPose()
      if (!pose) return

      const headingDegrees = (pose.azimuth * 180) / Math.PI
      const quarters = Math.round(headingDegrees / QUARTER_TURN_DEGREES) + direction

      plan.rotateToDegrees(quarters * QUARTER_TURN_DEGREES, {
        durationMs: animated ? QUARTER_TURN_DURATION_MS : 0,
      })
    },
    [animated, plan],
  )
}

/**
 * Host-side 2D navigation, for exercising `floorplanNavigationInput="host"`.
 *
 * Deliberately uses the conventions the built-in bindings don't: plain wheel
 * pans on both axes, ctrl or meta wheel zooms, shift wheel rotates.
 *
 * Every binding is a wheel delta handed over as-is. Turning screen pixels into
 * a pose, including rotating them by the plan's own heading, belongs to
 * `useFloorplanNavigationControls` rather than to each host that wants to bind
 * a gesture.
 */
const useHostFloorplanNavigation = (enabled: boolean) => {
  const plan = useFloorplanNavigationControls()

  useEffect(() => {
    if (!enabled) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()

      if (event.shiftKey) {
        plan.rotateByDegrees(event.deltaY * ROTATE_DEGREES_PER_PIXEL)
        return
      }

      if (event.ctrlKey || event.metaKey) {
        plan.zoomBy(Math.exp(event.deltaY * ZOOM_PER_WHEEL_UNIT))
        return
      }

      plan.panByPixels(event.deltaX, event.deltaY)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [enabled, plan])
}

const degrees = (radians: number) => `${(((radians * 180) / Math.PI) % 360).toFixed(1)}°`

/**
 * Live heading of each view, which is the quickest way to see whether the two
 * are actually linked.
 */
const PoseReadout = () => {
  const planPose = useEditor((state) => state.navigationSyncPose)
  const [cameraPose, setCameraPose] = useState<CameraPose | null>(null)

  useEffect(() => subscribeCameraPose(setCameraPose), [])

  const cameraAzimuth = cameraPose
    ? Math.atan2(
        cameraPose.position[0] - cameraPose.target[0],
        cameraPose.position[2] - cameraPose.target[2],
      )
    : null

  return (
    <div className="flex gap-3 border-border/60 border-t pt-1.5 font-mono text-[10px] text-muted-foreground">
      <span data-testid="readout-plan">
        plan {planPose ? degrees(planPose.azimuth) : '—'} / w
        {planPose ? planPose.viewWidth.toFixed(1) : '—'}
      </span>
      <span data-testid="readout-camera">
        cam {cameraAzimuth === null ? '—' : degrees(cameraAzimuth)}
      </span>
    </div>
  )
}

const ROW = 'flex items-center justify-between gap-3'
const LABEL = 'text-[11px] text-muted-foreground'
const BUTTON = 'rounded px-1.5 py-0.5 text-[11px] transition'
const BUTTON_ON = 'bg-foreground text-background'
const BUTTON_OFF = 'bg-muted text-muted-foreground hover:bg-muted/70'

/**
 * Floating control panel for the host-integration props. Development aid, not
 * part of the editor surface.
 */
export function NavigationPlayground({
  state,
  onChange,
}: {
  state: NavigationPlaygroundState
  onChange: (next: NavigationPlaygroundState) => void
}) {
  useHostFloorplanNavigation(state.navigationInput === 'host')
  const quarterTurnPlan = useQuarterTurnPlan(state.animateRotation)

  return (
    <div className="pointer-events-auto absolute bottom-3 left-24 z-40 rounded-lg border border-border/60 bg-background/95 p-2 text-xs shadow-lg backdrop-blur">
      <div className="flex flex-col gap-1.5">
        <div className={ROW}>
          <span className={LABEL}>Appearance</span>
          <div className="flex gap-1">
            {(['dark', 'light', 'inherit'] as const).map((value) => (
              <button
                data-testid={`pg-appearance-${value}`}
                className={`${BUTTON} ${state.appearance === value ? BUTTON_ON : BUTTON_OFF}`}
                key={value}
                onClick={() => onChange({ ...state, appearance: value })}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>2D navigation</span>
          <div className="flex gap-1">
            {(['builtin', 'host'] as const).map((value) => (
              <button
                data-testid={`pg-nav-${value}`}
                className={`${BUTTON} ${state.navigationInput === value ? BUTTON_ON : BUTTON_OFF}`}
                key={value}
                onClick={() => onChange({ ...state, navigationInput: value })}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Link 2D/3D</span>
          <button
            className={`${BUTTON} ${state.navigationLink ? BUTTON_ON : BUTTON_OFF}`}
            data-testid="pg-navlink"
            onClick={() => onChange({ ...state, navigationLink: !state.navigationLink })}
            type="button"
          >
            {state.navigationLink ? 'linked' : 'independent'}
          </button>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Rotate plan</span>
          <div className="flex gap-1">
            <button
              className={`${BUTTON} ${state.animateRotation ? BUTTON_ON : BUTTON_OFF}`}
              data-testid="pg-animate"
              onClick={() => onChange({ ...state, animateRotation: !state.animateRotation })}
              type="button"
            >
              {state.animateRotation ? 'eased' : 'snap'}
            </button>
            <button
              className={`${BUTTON} ${BUTTON_OFF}`}
              data-testid="pg-plan-ccw"
              onClick={() => quarterTurnPlan(-1)}
              type="button"
            >
              ↺ 90°
            </button>
            <button
              className={`${BUTTON} ${BUTTON_OFF}`}
              data-testid="pg-plan-cw"
              onClick={() => quarterTurnPlan(1)}
              type="button"
            >
              ↻ 90°
            </button>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Compass</span>
          <div className="flex gap-1">
            {(['builtin', 'host', 'none'] as const).map((value) => (
              <button
                data-testid={`pg-compass-${value}`}
                className={`${BUTTON} ${state.compass === value ? BUTTON_ON : BUTTON_OFF}`}
                key={value}
                onClick={() => onChange({ ...state, compass: value })}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Palette</span>
          <button
            className={`${BUTTON} ${state.tintPalette ? BUTTON_ON : BUTTON_OFF}`}
            data-testid="pg-palette"
            onClick={() => onChange({ ...state, tintPalette: !state.tintPalette })}
            type="button"
          >
            {state.tintPalette ? 'host tint' : 'default'}
          </button>
        </div>

        {state.navigationInput === 'host' && (
          <p className="max-w-[15rem] text-[10px] text-muted-foreground leading-snug">
            Host bindings: wheel pans, ctrl or meta wheel zooms, shift wheel rotates.
          </p>
        )}

        <PoseReadout />
      </div>
    </div>
  )
}
