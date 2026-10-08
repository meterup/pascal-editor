import { describe, expect, it } from 'bun:test'

import { nearestEquivalentRadians } from './floorplan'

const TURN = Math.PI * 2
const degrees = (radians: number) => (radians * 180) / Math.PI

describe('nearestEquivalentRadians', () => {
  it('takes the short way across the wrap point', () => {
    // 350° to 10° is 20° forwards, not 340° back.
    const from = (350 / 180) * Math.PI
    const result = nearestEquivalentRadians(from, (10 / 180) * Math.PI)

    expect(degrees(result - from)).toBeCloseTo(20, 6)
  })

  it('takes the short way backwards too', () => {
    const from = (10 / 180) * Math.PI
    const result = nearestEquivalentRadians(from, (350 / 180) * Math.PI)

    expect(degrees(result - from)).toBeCloseTo(-20, 6)
  })

  it('never travels more than half a turn', () => {
    const samples = [-7, -3.1, -1, 0, 0.4, 2, 3.2, 5, 11]

    for (const from of samples) {
      for (const target of samples) {
        const travelled = Math.abs(nearestEquivalentRadians(from, target) - from)
        expect(travelled).toBeLessThanOrEqual(Math.PI + 1e-9)
      }
    }
  })

  it('lands on an angle equivalent to the target', () => {
    const samples = [-7, -1, 0, 2, 5, 11]

    for (const from of samples) {
      for (const target of samples) {
        const result = nearestEquivalentRadians(from, target)
        const remainder = (((result - target) % TURN) + TURN) % TURN

        // Equivalent means a whole number of turns apart, so the remainder sits
        // at either end of the range rather than somewhere in the middle.
        expect(Math.min(remainder, TURN - remainder)).toBeLessThan(1e-9)
      }
    }
  })

  it('stays put when the target is already the current angle', () => {
    expect(nearestEquivalentRadians(1.25, 1.25)).toBeCloseTo(1.25, 9)
  })

  it('resolves a half turn consistently rather than oscillating', () => {
    const first = nearestEquivalentRadians(0, Math.PI)
    const second = nearestEquivalentRadians(0, Math.PI)

    expect(first).toBe(second)
    expect(Math.abs(first)).toBeCloseTo(Math.PI, 9)
  })
})
