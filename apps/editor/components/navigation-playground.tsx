'use client'

import type { CameraPose } from '@pascal-app/core'
import {
  type FloorplanNavigationInput,
  type NavigationSyncPoseInput,
  subscribeCameraPose,
  useEditor,
} from '@pascal-app/editor'
import { useCallback, useEffect, useState } from 'react'

export type NavigationPlaygroundState = {
  appearance: 'light' | 'dark' | 'inherit'
  navigationInput: FloorplanNavigationInput
  navigationLink: boolean
  tintPalette: boolean
}

export const NAVIGATION_PLAYGROUND_DEFAULTS: NavigationPlaygroundState = {
  appearance: 'dark',
  navigationInput: 'builtin',
  navigationLink: true,
  tintPalette: false,
}

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

/**
 * Host-side 2D navigation, for exercising `floorplanNavigationInput="host"`.
 *
 * Deliberately uses the conventions the built-in bindings don't: plain wheel
 * pans on both axes, ctrl or meta wheel zooms at the pointer, shift wheel
 * rotates. Everything goes through `publishNavigationSyncPose`, so this is
 * also a check that a `'host'` pose alone is enough to drive the view.
 */
const useHostFloorplanNavigation = (enabled: boolean) => {
  const publishNavigationSyncPose = useEditor((state) => state.publishNavigationSyncPose)

  const publishRelativePose = useCallback(
    (
      change: (pose: NavigationSyncPoseInput, metersPerPixel: number) => NavigationSyncPoseInput,
    ) => {
      const pose = useEditor.getState().navigationSyncPose
      if (!pose) return
      // The plan fills the window in this demo, so its width is a good enough
      // stand-in for the panel's own measurement.
      const metersPerPixel = pose.viewWidth / Math.max(window.innerWidth, 1)
      const next = change(
        {
          source: 'host',
          target: [...pose.target],
          azimuth: pose.azimuth,
          viewWidth: pose.viewWidth,
        },
        metersPerPixel,
      )
      publishNavigationSyncPose(next)
    },
    [publishNavigationSyncPose],
  )

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

  return (
    <div className="pointer-events-auto absolute bottom-3 left-24 z-40 rounded-lg border border-border/60 bg-background/95 p-2 text-xs shadow-lg backdrop-blur">
      <div className="flex flex-col gap-1.5">
        <div className={ROW}>
          <span className={LABEL}>Appearance</span>
          <div className="flex gap-1">
            {(['dark', 'light', 'inherit'] as const).map((value) => (
              <button
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
            onClick={() => onChange({ ...state, navigationLink: !state.navigationLink })}
            type="button"
          >
            {state.navigationLink ? 'linked' : 'independent'}
          </button>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Palette</span>
          <button
            className={`${BUTTON} ${state.tintPalette ? BUTTON_ON : BUTTON_OFF}`}
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
