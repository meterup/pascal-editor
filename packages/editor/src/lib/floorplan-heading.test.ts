import { describe, expect, it } from 'bun:test'

import {
  getFloorplanHeading,
  publishFloorplanHeading,
  subscribeFloorplanHeading,
} from './floorplan-heading'

describe('floorplan heading', () => {
  it('delivers the current heading on subscribe, before anything moves', () => {
    publishFloorplanHeading(42)

    const seen: number[] = []
    const unsubscribe = subscribeFloorplanHeading((deg) => seen.push(deg))

    // A still view publishes nothing, so a subscriber that waited for the first
    // update would render north until the user moved.
    expect(seen).toEqual([42])
    unsubscribe()
  })

  it('delivers every publish to every subscriber', () => {
    publishFloorplanHeading(0)

    const first: number[] = []
    const second: number[] = []
    const unsubscribeFirst = subscribeFloorplanHeading((deg) => first.push(deg))
    const unsubscribeSecond = subscribeFloorplanHeading((deg) => second.push(deg))

    publishFloorplanHeading(90)
    publishFloorplanHeading(180)

    expect(first).toEqual([0, 90, 180])
    expect(second).toEqual([0, 90, 180])

    unsubscribeFirst()
    unsubscribeSecond()
  })

  it('stops delivering after unsubscribe', () => {
    publishFloorplanHeading(0)

    const seen: number[] = []
    const unsubscribe = subscribeFloorplanHeading((deg) => seen.push(deg))
    unsubscribe()

    publishFloorplanHeading(90)

    expect(seen).toEqual([0])
  })

  it('keeps the latest heading readable without subscribing', () => {
    publishFloorplanHeading(123)
    expect(getFloorplanHeading()).toBe(123)
  })
})
