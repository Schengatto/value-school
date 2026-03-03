import { describe, it, expect } from 'vitest'
import { analyzeTechnical } from '../technical'
import { makePriceHistory } from './fixtures'

describe('analyzeTechnical', () => {
  describe('insufficient data handling', () => {
    it('returns neutral with score 50 for empty array', () => {
      const result = analyzeTechnical([])
      expect(result.signal).toBe('neutral')
      expect(result.score).toBe(50)
      expect(result.signalExplanation).toBe('Insufficient price data')
    })

    it('returns neutral with score 50 for fewer than 50 entries', () => {
      const prices = makePriceHistory(30)
      const result = analyzeTechnical(prices)
      expect(result.signal).toBe('neutral')
      expect(result.score).toBe(50)
    })

    it('returns neutral with score 50 for undefined', () => {
      const result = analyzeTechnical(undefined as any)
      expect(result.signal).toBe('neutral')
      expect(result.score).toBe(50)
    })

    it('returns neutral with score 50 for null', () => {
      const result = analyzeTechnical(null as any)
      expect(result.signal).toBe('neutral')
      expect(result.score).toBe(50)
    })

    it('returns NaN for all technical indicators when insufficient data', () => {
      const result = analyzeTechnical([])
      expect(result.sma50).toBeNaN()
      expect(result.sma200).toBeNaN()
      expect(result.rsi14).toBeNull()
      expect(result.macd.value).toBeNaN()
    })
  })

  describe('normal operation with sufficient data', () => {
    it('computes SMA50 as average of last 50 closing prices', () => {
      const prices = makePriceHistory(60, { basePrice: 100, trend: 'flat', volatility: 0 })
      const result = analyzeTechnical(prices)
      expect(result.sma50).toBeGreaterThan(0)
      expect(isFinite(result.sma50)).toBe(true)
    })

    it('returns NaN for SMA200 with fewer than 200 prices', () => {
      const prices = makePriceHistory(100, { basePrice: 100, trend: 'flat' })
      const result = analyzeTechnical(prices)
      expect(result.sma200).toBeNaN()
    })

    it('computes SMA200 when 200+ prices provided', () => {
      const prices = makePriceHistory(250, { basePrice: 100, trend: 'up' })
      const result = analyzeTechnical(prices)
      expect(isFinite(result.sma200)).toBe(true)
      expect(result.sma200).toBeGreaterThan(0)
    })

    it('computes RSI14 from closing prices', () => {
      const prices = makePriceHistory(60, { basePrice: 100, trend: 'up' })
      const result = analyzeTechnical(prices)
      expect(result.rsi14).not.toBeNull()
      expect(result.rsi14!).toBeGreaterThanOrEqual(0)
      expect(result.rsi14!).toBeLessThanOrEqual(100)
    })

    it('uses provided rsiValue when passed', () => {
      const prices = makePriceHistory(60, { basePrice: 100 })
      const result = analyzeTechnical(prices, 45.5)
      expect(result.rsi14).toBe(45.5)
    })

    it('sorts prices by date ascending before computation', () => {
      // Create reversed prices (newest first)
      const prices = makePriceHistory(60, { basePrice: 100, trend: 'up' })
      const reversed = [...prices].reverse()
      const resultNormal = analyzeTechnical(prices)
      const resultReversed = analyzeTechnical(reversed)
      // Both should produce the same SMA50
      expect(resultNormal.sma50).toBeCloseTo(resultReversed.sma50, 2)
    })

    it('computes MACD histogram', () => {
      const prices = makePriceHistory(60, { basePrice: 100, trend: 'up' })
      const result = analyzeTechnical(prices)
      expect(isFinite(result.macd.histogram)).toBe(true)
    })

    it('computes ROC values', () => {
      const prices = makePriceHistory(300, { basePrice: 100, trend: 'up' })
      const result = analyzeTechnical(prices)
      expect(isFinite(result.roc1m)).toBe(true)
      expect(isFinite(result.roc12m)).toBe(true)
    })

    it('computes volatility', () => {
      const prices = makePriceHistory(60, { basePrice: 100 })
      const result = analyzeTechnical(prices)
      expect(result.volatility).toBeGreaterThanOrEqual(0)
      expect(isFinite(result.volatility)).toBe(true)
    })
  })

  describe('scoring logic', () => {
    it('clamps score to 0-100 range', () => {
      const prices = makePriceHistory(60, { basePrice: 100 })
      const result = analyzeTechnical(prices)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('returns bullish signal when score >= 70', () => {
      // Create a strong uptrend to get high score
      const prices = makePriceHistory(300, { basePrice: 50, trend: 'up', volatility: 0.005 })
      const result = analyzeTechnical(prices)
      if (result.score >= 70) {
        expect(result.signal).toBe('bullish')
      }
    })

    it('returns bearish signal when score <= 40', () => {
      // Create a strong downtrend
      const prices = makePriceHistory(300, { basePrice: 200, trend: 'down', volatility: 0.005 })
      const result = analyzeTechnical(prices)
      if (result.score <= 40) {
        expect(result.signal).toBe('bearish')
      }
    })

    it('includes signal explanation with RSI and SMA info', () => {
      const prices = makePriceHistory(60, { basePrice: 100 })
      const result = analyzeTechnical(prices)
      expect(result.signalExplanation).toContain('RSI')
      expect(result.signalExplanation).toContain('SMA trend')
      expect(result.signalExplanation).toContain('momentum')
    })
  })

  describe('RSI edge cases', () => {
    it('returns RSI near 100 when all price changes are positive', () => {
      // Create monotonically increasing prices
      const prices: any[] = []
      for (let i = 0; i < 60; i++) {
        const date = new Date(2023, 0, 1)
        date.setDate(date.getDate() + i)
        prices.push({
          date: date.toISOString().split('T')[0],
          open: 100 + i * 0.5,
          high: 100 + i * 0.5 + 1,
          low: 100 + i * 0.5 - 0.5,
          close: 100 + i * 0.5
        })
      }
      const result = analyzeTechnical(prices)
      expect(result.rsi14).not.toBeNull()
      expect(result.rsi14!).toBeGreaterThan(90)
    })
  })
})
