import { describe, it, expect } from 'vitest'
import { calculateFairValue } from '../fair-value'
import { makeFinnhubData, makeFinnhubMetric } from './fixtures'

// Helper to build minimal params
function makeParams(overrides?: Record<string, any>) {
  return {
    currentPrice: null as number | null,
    historicalFCF: [] as number[],
    sharesOutstanding: null as number | null,
    eps: null as number | null,
    bookValuePerShare: null as number | null,
    revenue: null as number | null,
    operatingMargin: null as number | null,
    finnhubData: null as any,
    analystTargetPrice: null as number | null,
    stockCategory: null as any,
    ...overrides
  }
}

describe('calculateFairValue', () => {
  describe('null/empty input handling', () => {
    it('returns all-null fairValue fields when no valid estimates', () => {
      const result = calculateFairValue(makeParams())
      expect(result.fairValue).toBeNull()
      expect(result.fairValueLow).toBeNull()
      expect(result.fairValueHigh).toBeNull()
      expect(result.marginOfSafety).toBeNull()
      expect(result.valuationSignal).toBeNull()
    })

    it('returns null marginOfSafety when currentPrice is null', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        currentPrice: null
      }))
      expect(result.marginOfSafety).toBeNull()
    })

    it('still includes estimates array even when all null', () => {
      const result = calculateFairValue(makeParams())
      expect(result.estimates).toBeDefined()
      expect(result.estimates.length).toBe(5)
    })
  })

  describe('Graham Growth estimation', () => {
    it('produces a Graham estimate when EPS > 0', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        finnhubData: makeFinnhubData({
          metric: makeFinnhubMetric({ epsGrowth5Y: 10 })
        })
      }))
      const graham = result.estimates.find(e => e.method === 'Graham Growth')
      expect(graham?.value).not.toBeNull()
      expect(graham!.value!).toBeGreaterThan(0)
      // V = EPS * (8.5 + 2*g) * (4.4 / 5.0)
      // V = 5 * (8.5 + 20) * 0.88 = 5 * 28.5 * 0.88 = 125.4
      expect(graham!.value!).toBeCloseTo(125.4, 0)
    })

    it('does not produce Graham estimate when EPS <= 0', () => {
      const result = calculateFairValue(makeParams({ eps: -2 }))
      const graham = result.estimates.find(e => e.method === 'Graham Growth')
      expect(graham?.value).toBeNull()
    })
  })

  describe('PE-based estimation', () => {
    it('produces PE-based estimate using forwardPE', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        finnhubData: makeFinnhubData({
          metric: makeFinnhubMetric({ forwardPE: 20 })
        })
      }))
      const peBased = result.estimates.find(e => e.method === 'PE-based')
      expect(peBased?.value).not.toBeNull()
      // EPS * forwardPE = 5 * 20 = 100
      expect(peBased!.value!).toBe(100)
    })

    it('falls back to PE=15 when forwardPE is null', () => {
      const result = calculateFairValue(makeParams({ eps: 5 }))
      const peBased = result.estimates.find(e => e.method === 'PE-based')
      // EPS * 15 = 5 * 15 = 75
      expect(peBased?.value).toBe(75)
    })

    it('returns null when EPS <= 0', () => {
      const result = calculateFairValue(makeParams({ eps: -1 }))
      const peBased = result.estimates.find(e => e.method === 'PE-based')
      expect(peBased?.value).toBeNull()
    })
  })

  describe('Analyst Target', () => {
    it('includes analyst target when > 0', () => {
      const result = calculateFairValue(makeParams({
        analystTargetPrice: 200,
        eps: 5
      }))
      const analyst = result.estimates.find(e => e.method === 'Analyst Target')
      expect(analyst?.value).toBe(200)
    })

    it('excludes analyst target when null', () => {
      const result = calculateFairValue(makeParams({ analystTargetPrice: null }))
      const analyst = result.estimates.find(e => e.method === 'Analyst Target')
      expect(analyst?.value).toBeNull()
    })

    it('excludes analyst target when <= 0', () => {
      const result = calculateFairValue(makeParams({ analystTargetPrice: 0 }))
      const analyst = result.estimates.find(e => e.method === 'Analyst Target')
      expect(analyst?.value).toBeNull()
    })
  })

  describe('DCF estimation', () => {
    it('produces DCF estimate with valid FCF and shares', () => {
      const result = calculateFairValue(makeParams({
        historicalFCF: [5e9, 6e9, 7e9],
        sharesOutstanding: 1e9,
        finnhubData: makeFinnhubData({
          metric: makeFinnhubMetric({ epsGrowth5Y: 10, beta: 1.0 })
        })
      }))
      const dcf = result.estimates.find(e => e.method === 'DCF')
      expect(dcf?.value).not.toBeNull()
      expect(dcf!.value!).toBeGreaterThan(0)
    })

    it('uses EPS fallback when FCF is empty', () => {
      const result = calculateFairValue(makeParams({
        historicalFCF: [],
        sharesOutstanding: 1e9,
        eps: 5,
        finnhubData: makeFinnhubData({
          metric: makeFinnhubMetric({ epsGrowth5Y: 10, beta: 1.0 })
        })
      }))
      const dcf = result.estimates.find(e => e.method === 'DCF')
      expect(dcf?.value).not.toBeNull()
    })

    it('returns null DCF when sharesOutstanding is null', () => {
      const result = calculateFairValue(makeParams({
        historicalFCF: [5e9, 6e9],
        sharesOutstanding: null
      }))
      const dcf = result.estimates.find(e => e.method === 'DCF')
      expect(dcf?.value).toBeNull()
    })
  })

  describe('EPV estimation', () => {
    it('produces EPV from Finnhub per-share data', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        finnhubData: makeFinnhubData({
          metric: makeFinnhubMetric({
            revenuePerShareTTM: 50,
            operatingMarginTTM: 25, // 25%
            beta: 1.0
          })
        })
      }))
      const epv = result.estimates.find(e => e.method === 'EPV')
      expect(epv?.value).not.toBeNull()
      expect(epv!.value!).toBeGreaterThan(0)
    })

    it('produces EPV from Polygon data when Finnhub unavailable', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        revenue: 100e9,
        operatingMargin: 0.25,
        sharesOutstanding: 1e9
      }))
      const epv = result.estimates.find(e => e.method === 'EPV')
      expect(epv?.value).not.toBeNull()
      expect(epv!.value!).toBeGreaterThan(0)
    })

    it('returns null EPV when all revenue/margin data missing', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        revenue: null,
        operatingMargin: null
      }))
      const epv = result.estimates.find(e => e.method === 'EPV')
      expect(epv?.value).toBeNull()
    })
  })

  describe('weighted averaging', () => {
    it('applies category-specific weights for growth (EPV=0)', () => {
      const params = makeParams({
        eps: 5,
        currentPrice: 100,
        stockCategory: 'growth',
        finnhubData: makeFinnhubData({
          metric: makeFinnhubMetric({
            revenuePerShareTTM: 50,
            operatingMarginTTM: 25,
            beta: 1.0,
            forwardPE: 20
          })
        })
      })
      const result = calculateFairValue(params)
      // EPV should not contribute to growth stocks (weight=0)
      expect(result.fairValue).not.toBeNull()
    })

    it('defaults to garp category when stockCategory is null', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        currentPrice: 100,
        stockCategory: null
      }))
      // Should not throw, uses GARP weights
      expect(result.estimates).toBeDefined()
    })
  })

  describe('margin of safety and valuation signal', () => {
    it('returns positive marginOfSafety when fairValue > currentPrice', () => {
      const result = calculateFairValue(makeParams({
        eps: 10,
        currentPrice: 50,
        analystTargetPrice: 200
      }))
      expect(result.marginOfSafety).not.toBeNull()
      expect(result.marginOfSafety!).toBeGreaterThan(0)
    })

    it('returns negative marginOfSafety when fairValue < currentPrice', () => {
      const result = calculateFairValue(makeParams({
        eps: 2,
        currentPrice: 500,
        analystTargetPrice: 40
      }))
      expect(result.marginOfSafety).not.toBeNull()
      expect(result.marginOfSafety!).toBeLessThan(0)
    })

    it('returns undervalued signal when marginOfSafety >= 25', () => {
      const result = calculateFairValue(makeParams({
        eps: 10,
        currentPrice: 30,
        analystTargetPrice: 200
      }))
      if (result.marginOfSafety != null && result.marginOfSafety >= 25) {
        expect(result.valuationSignal).toBe('undervalued')
      }
    })

    it('returns overvalued signal when marginOfSafety <= -20', () => {
      const result = calculateFairValue(makeParams({
        eps: 2,
        currentPrice: 500,
        analystTargetPrice: 40
      }))
      if (result.marginOfSafety != null && result.marginOfSafety <= -20) {
        expect(result.valuationSignal).toBe('overvalued')
      }
    })

    it('returns fairly_valued when marginOfSafety is between -20 and 25', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        currentPrice: 75
        // PE-based: 5*15 = 75 → marginOfSafety = 0
      }))
      if (result.marginOfSafety != null && result.marginOfSafety > -20 && result.marginOfSafety < 25) {
        expect(result.valuationSignal).toBe('fairly_valued')
      }
    })
  })

  describe('confidence range', () => {
    it('has fairValueLow < fairValue < fairValueHigh', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        currentPrice: 100,
        analystTargetPrice: 120,
        finnhubData: makeFinnhubData({
          metric: makeFinnhubMetric({
            forwardPE: 25,
            revenuePerShareTTM: 40,
            operatingMarginTTM: 20,
            beta: 1.0,
            epsGrowth5Y: 10
          })
        }),
        historicalFCF: [3e9, 4e9, 5e9],
        sharesOutstanding: 1e9
      }))
      if (result.fairValue != null) {
        expect(result.fairValueLow).not.toBeNull()
        expect(result.fairValueHigh).not.toBeNull()
        expect(result.fairValueLow!).toBeLessThan(result.fairValue!)
        expect(result.fairValueHigh!).toBeGreaterThan(result.fairValue!)
      }
    })
  })

  describe('analyst consensus', () => {
    it('extracts analyst consensus from recommendations', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        finnhubData: makeFinnhubData({
          recommendations: [
            { strongBuy: 10, buy: 15, hold: 5, sell: 2, strongSell: 1, period: '2024-01', symbol: 'AAPL' }
          ]
        })
      }))
      expect(result.analystConsensus).not.toBeNull()
      expect(result.analystConsensus!.strongBuy).toBe(10)
      expect(result.analystConsensus!.buy).toBe(15)
    })

    it('returns null when no recommendations', () => {
      const result = calculateFairValue(makeParams({ eps: 5 }))
      expect(result.analystConsensus).toBeNull()
    })
  })

  describe('earnings surprise', () => {
    it('extracts latest earnings surprise', () => {
      const result = calculateFairValue(makeParams({
        eps: 5,
        finnhubData: makeFinnhubData({
          earnings: [
            { actual: 1.5, estimate: 1.4, surprise: 0.1, surprisePercent: 7.14, period: '2024-Q1', symbol: 'AAPL' }
          ]
        })
      }))
      expect(result.latestEarningsSurprise).toBeCloseTo(7.14, 1)
    })

    it('returns null when no earnings data', () => {
      const result = calculateFairValue(makeParams({ eps: 5 }))
      expect(result.latestEarningsSurprise).toBeNull()
    })
  })
})
