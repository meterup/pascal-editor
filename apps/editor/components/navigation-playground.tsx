'use client'

import type { CameraPose } from '@pascal-app/core'
import {
  type FloorplanCompassSlot,
  type FloorplanNavigationInput,
  type NavigationSyncPoseInput,
  subscribeCameraPose,
  useEditor,
} from '@pascal-app/editor'
import { useCallback, useEffect, useRef, useState } from 'react'

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
 * gets. Reads the heading as a number, takes the needle ref so it stays smooth
 * while the plan is hidden, and calls `alignToNorth` on click.
 */
export const hostCompassSlot: FloorplanCompassSlot = ({
  northRotationDeg,
  alignToNorth,
  needleRef,
}) => (
  <button
    aria-label="Align view to north"
    className="pointer-events-auto absolute right-3 bottom-3 z-30 flex items-center gap-2 rounded-md border border-sky-400/40 bg-sky-950/80 px-2 py-1 font-mono text-[10px] text-sky-200 shadow-lg backdrop-blur transition hover:bg-sky-900/80"
    onClick={alignToNorth}
    onPointerDown={(event) => event.stopPropagation()}
    type="button"
  >
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      ref={needleRef}
      style={{ transform: `rotate(${northRotationDeg}deg)` }}
      viewBox="0 0 48 48"
    >
      <path d="M24 5 33 27 24 22 15 27Z" fill="currentColor" />
    </svg>
    <span>{Math.round(northRotationDeg)}°</span>
  </button>
)

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
const ROTATE_RADIANS_PER_PIXEL = 0.005
const QUARTER_TURN = Math.PI / 2

/**
 * Publishes a `'host'` pose derived from the plan's current one.
 *
 * Host poses apply to the plan whatever `floorplanNavigationInput` is set to,
 * so a host can take over one gesture (this one) and leave the built-in pan
 * and zoom alone.
 */
const useHostPlanPose = () => {
  const publishNavigationSyncPose = useEditor((state) => state.publishNavigationSyncPose)

  return useCallback(
    (
      change: (pose: NavigationSyncPoseInput, metersPerPixel: number) => NavigationSyncPoseInput,
    ) => {
      const pose = useEditor.getState().navigationSyncPose
      if (!pose) return
      // The plan fills the window in this demo, so its width is a good enough
      // stand-in for the panel's own measurement.
      const metersPerPixel = pose.viewWidth / Math.max(window.innerWidth, 1)
      publishNavigationSyncPose(
        change(
          {
            source: 'host',
            target: [...pose.target],
            azimuth: pose.azimuth,
            viewWidth: pose.viewWidth,
          },
          metersPerPixel,
        ),
      )
    },
    [publishNavigationSyncPose],
  )
}

const QUARTER_TURN_DURATION_MS = 260
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * Turns the plan a quarter at a time, leaving the 3D camera alone.
 *
 * Tweened host-side rather than published as one jump. The panel applies each
 * incoming pose immediately, since its receive path is built for the 60fps
 * camera stream, so a stream is also how you animate: the host owns the
 * duration and easing and no editor change is needed.
 */
const useQuarterTurnPlan = (animated: boolean) => {
  const publishRelativePose = useHostPlanPose()
  const frameRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    },
    [],
  )

  return useCallback(
    (direction: 1 | -1) => {
      const pose = useEditor.getState().navigationSyncPose
      if (!pose) return
      const from = pose.azimuth
      const to = (Math.round(from / QUARTER_TURN) + direction) * QUARTER_TURN

      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (!animated) {
        publishRelativePose((current) => ({ ...current, azimuth: to }))
        return
      }

      const startedAt = performance.now()
      const step = () => {
        const progress = Math.min(1, (performance.now() - startedAt) / QUARTER_TURN_DURATION_MS)
        const azimuth = from + (to - from) * easeOutCubic(progress)
        publishRelativePose((current) => ({ ...current, azimuth }))
        frameRef.current = progress < 1 ? requestAnimationFrame(step) : null
      }
      step()
    },
    [animated, publishRelativePose],
  )
}

/**
 * Host-side 2D navigation, for exercising `floorplanNavigationInput="host"`.
 *
 * Deliberately uses the conventions the built-in bindings don't: plain wheel
 * pans on both axes, ctrl or meta wheel zooms at the pointer, shift wheel
 * rotates. Everything goes through `publishNavigationSyncPose`, so this is
 * also a check that a `'host'` pose alone is enough to drive the view.
 */
const useHostFloorplanNavigation = (enabled: boolean) => {
  const publishRelativePose = useHostPlanPose()

  useEffect(() => {
    if (!enabled) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()

      if (event.shiftKey) {
        publishRelativePose((pose) => ({
          ...pose,
          azimuth: pose.azimuth + event.deltaY * ROTATE_RADIANS_PER_PIXEL,
        }))
        return
      }

      if (event.ctrlKey || event.metaKey) {
        publishRelativePose((pose) => ({
          ...pose,
          viewWidth: Math.max(0.5, pose.viewWidth * Math.exp(event.deltaY * ZOOM_PER_WHEEL_UNIT)),
        }))
        return
      }

      publishRelativePose((pose, metersPerPixel) => {
        // Screen deltas are in view space, so they rotate into the plan by the
        // view's own azimuth before they can move the target.
        const cos = Math.cos(pose.azimuth)
        const sin = Math.sin(pose.azimuth)
        const right = event.deltaX * metersPerPixel
        const down = event.deltaY * metersPerPixel
        return {
          ...pose,
          target: [
            pose.target[0] + right * cos + down * sin,
            pose.target[1],
            pose.target[2] - right * sin + down * cos,
          ],
        }
      })
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [enabled, publishRelativePose])
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
