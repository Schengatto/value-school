import { describe, it, expect } from 'vitest'
import { calculateCompositeScore, determineOverallSignal } from '../composite'

describe('calculateCompositeScore', () => {
  it('returns weighted 70/30 average', () => {
    expect(calculateCompositeScore(80, 60)).toBe(Math.round(0.7 * 80 + 0.3 * 60))
  })

  it('returns 0 when both inputs are 0', () => {
    expect(calculateCompositeScore(0, 0)).toBe(0)
  })

  it('returns 100 when both inputs are 100', () => {
    expect(calculateCompositeScore(100, 100)).toBe(100)
  })

  it('returns 70 when fundamental=100, technical=0', () => {
    expect(calculateCompositeScore(100, 0)).toBe(70)
  })

  it('returns 30 when fundamental=0, technical=100', () => {
    expect(calculateCompositeScore(0, 100)).toBe(30)
  })

  it('rounds correctly', () => {
    // 0.7 * 75 + 0.3 * 75 = 75
    expect(calculateCompositeScore(75, 75)).toBe(75)
    // 0.7 * 73 + 0.3 * 62 = 51.1 + 18.6 = 69.7 → 70
    expect(calculateCompositeScore(73, 62)).toBe(70)
  })
})

describe('determineOverallSignal', () => {
  it('returns "positive" for score >= 70', () => {
    expect(determineOverallSignal(70)).toBe('positive')
    expect(determineOverallSignal(85)).toBe('positive')
    expect(determineOverallSignal(100)).toBe('positive')
  })

  it('returns "negative" for score <= 40', () => {
    expect(determineOverallSignal(40)).toBe('negative')
    expect(determineOverallSignal(25)).toBe('negative')
    expect(determineOverallSignal(0)).toBe('negative')
  })

  it('returns "neutral" for scores between 41 and 69', () => {
    expect(determineOverallSignal(41)).toBe('neutral')
    expect(determineOverallSignal(50)).toBe('neutral')
    expect(determineOverallSignal(69)).toBe('neutral')
  })
})
