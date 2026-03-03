import { describe, it, expect } from 'vitest'
import {
  analyzeFundamentals,
  calculatePiotroskiFScore,
  calculateEarningsQuality,
  calculateShareDilution
} from '../fundamental'
import { makeFundamentalData, makeFinnhubData, makeFinnhubMetric, PIOTROSKI_PERFECT, PIOTROSKI_FAILING } from './fixtures'

describe('analyzeFundamentals', () => {
  describe('empty data handling', () => {
    it('returns score 0 and negative signal for empty data', () => {
      const result = analyzeFundamentals({
        overview: {},
        earnings: {},
        balanceSheet: {},
        incomeStatement: {},
        cashFlowStatement: {},
        metrics: {},
        pricePerShare: NaN,
        historicalFCF: [],
        historicalPrices: []
      })
      expect(result.score).toBe(0)
      // Score 0 is ≤ 30, so signal is 'negative'
      expect(result.signal).toBe('negative')
    })

    it('returns low dataCompleteness when few metrics available', () => {
      const result = analyzeFundamentals({
        overview: {},
        earnings: {},
        balanceSheet: {},
        incomeStatement: {},
        cashFlowStatement: {},
        metrics: {},
        pricePerShare: NaN,
        historicalFCF: [],
        historicalPrices: []
      })
      // Some metrics can still be scored from empty structures, so completeness is low but not necessarily 0
      expect(result.dataCompleteness).toBeLessThan(20)
    })

    it('populates unavailable reasons for missing data', () => {
      const result = analyzeFundamentals({
        overview: {},
        earnings: {},
        balanceSheet: {},
        incomeStatement: {},
        cashFlowStatement: {},
        metrics: {},
        pricePerShare: NaN,
        historicalFCF: [],
        historicalPrices: []
      })
      expect(result.reasons.unavailable.length).toBeGreaterThan(0)
    })
  })

  describe('scoring with realistic data', () => {
    it('produces a positive signal for a healthy company', () => {
      const data = makeFundamentalData()
      const finnhub = makeFinnhubData({
        metric: makeFinnhubMetric({
          roeTTM: 30,
          revenueGrowth5Y: 15,
          peTTM: 22,
          epsGrowth5Y: 18,
          fcfPerShareTTM: 5,
          beta: 1.0
        }),
        recommendations: [
          { strongBuy: 15, buy: 10, hold: 5, sell: 1, strongSell: 0, period: '2024-01', symbol: 'TEST' }
        ],
        earnings: [
          { actual: 1.5, estimate: 1.3, surprise: 0.2, surprisePercent: 15.4, period: '2024-Q1', symbol: 'TEST' },
          { actual: 1.4, estimate: 1.3, surprise: 0.1, surprisePercent: 7.7, period: '2023-Q4', symbol: 'TEST' }
        ]
      })
      const result = analyzeFundamentals(data, undefined, finnhub as any)
      expect(result.score).toBeGreaterThan(0)
      expect(result.reasons.passed.length).toBeGreaterThan(0)
    })

    it('produces higher dataCompleteness with more data available', () => {
      const data = makeFundamentalData()
      const finnhub = makeFinnhubData({
        metric: makeFinnhubMetric({
          roeTTM: 30,
          revenueGrowth5Y: 15,
          peTTM: 22,
          epsGrowth5Y: 18
        }),
        recommendations: [
          { strongBuy: 10, buy: 10, hold: 5, sell: 1, strongSell: 0, period: '2024-01', symbol: 'TEST' }
        ],
        earnings: [
          { actual: 1.5, estimate: 1.3, surprise: 0.2, surprisePercent: 15.4, period: '2024-Q1', symbol: 'TEST' }
        ]
      })
      const resultWithData = analyzeFundamentals(data, undefined, finnhub as any)
      const resultWithoutData = analyzeFundamentals({
        overview: {}, earnings: {}, balanceSheet: {}, incomeStatement: {},
        cashFlowStatement: {}, metrics: {}, pricePerShare: NaN, historicalFCF: [], historicalPrices: []
      })
      expect(resultWithData.dataCompleteness).toBeGreaterThan(resultWithoutData.dataCompleteness)
    })
  })

  describe('EPS scoring', () => {
    it('scores EPS upward trend as positive', () => {
      const data = makeFundamentalData({
        earnings: {
          annualEarnings: [
            { reportedEPS: '8.00' }, // most recent
            { reportedEPS: '6.00' },
            { reportedEPS: '4.00' }  // oldest
          ]
        }
      })
      const result = analyzeFundamentals(data)
      expect(result.reasons.passed.some(r => r.includes('EPS shows upward trend'))).toBe(true)
    })

    it('scores EPS downward trend as failed', () => {
      const data = makeFundamentalData({
        earnings: {
          annualEarnings: [
            { reportedEPS: '2.00' }, // most recent (lower)
            { reportedEPS: '4.00' },
            { reportedEPS: '6.00' }  // oldest (higher)
          ]
        }
      })
      const result = analyzeFundamentals(data)
      expect(result.reasons.failed.some(r => r.includes('EPS shows upward trend'))).toBe(true)
    })

    it('marks EPS as unavailable with insufficient data', () => {
      const data = makeFundamentalData({
        earnings: { annualEarnings: [{ reportedEPS: '5.00' }] }
      })
      const result = analyzeFundamentals(data)
      expect(result.reasons.unavailable.some(r => r.includes('EPS data insufficient'))).toBe(true)
    })
  })

  describe('profitability metrics', () => {
    it('scores positive FCF correctly', () => {
      const data = makeFundamentalData({
        cashFlowStatement: {
          annualReports: [
            { operatingCashFlow: '100000', freeCashFlow: '80000', capitalExpenditure: '-20000' },
            { operatingCashFlow: '90000', freeCashFlow: '70000', capitalExpenditure: '-20000' }
          ]
        }
      })
      const result = analyzeFundamentals(data)
      expect(result.reasons.passed.some(r => r.includes('Positive Free Cash Flow'))).toBe(true)
    })
  })

  describe('Finnhub enrichment', () => {
    it('scores ROE from Finnhub (divides by 100)', () => {
      const data = makeFundamentalData()
      const finnhub = makeFinnhubData({
        metric: makeFinnhubMetric({ roeTTM: 25 }) // 25%
      })
      const result = analyzeFundamentals(data, undefined, finnhub as any)
      expect(result.reasons.passed.some(r => r.includes('ROE'))).toBe(true)
    })

    it('marks ROE as unavailable when Finnhub has no data', () => {
      const data = makeFundamentalData()
      const result = analyzeFundamentals(data, undefined, null)
      expect(result.reasons.unavailable.some(r => r.includes('ROE'))).toBe(true)
    })

    it('scores analyst consensus', () => {
      const data = makeFundamentalData()
      const finnhub = makeFinnhubData({
        recommendations: [
          { strongBuy: 20, buy: 10, hold: 3, sell: 0, strongSell: 0, period: '2024-01', symbol: 'TEST' }
        ]
      })
      const result = analyzeFundamentals(data, undefined, finnhub as any)
      expect(result.reasons.passed.some(r => r.includes('Analyst Consensus'))).toBe(true)
    })

    it('scores earnings surprise', () => {
      const data = makeFundamentalData()
      const finnhub = makeFinnhubData({
        earnings: [
          { actual: 2, estimate: 1.5, surprise: 0.5, surprisePercent: 33, period: '2024-Q1', symbol: 'TEST' },
          { actual: 1.8, estimate: 1.5, surprise: 0.3, surprisePercent: 20, period: '2023-Q4', symbol: 'TEST' }
        ]
      })
      const result = analyzeFundamentals(data, undefined, finnhub as any)
      expect(result.reasons.passed.some(r => r.includes('Earnings Surprise'))).toBe(true)
    })

    it('scores PEG ratio when PE and growth available', () => {
      const data = makeFundamentalData()
      const finnhub = makeFinnhubData({
        metric: makeFinnhubMetric({ peTTM: 20, epsGrowth5Y: 20 })
      })
      const result = analyzeFundamentals(data, undefined, finnhub as any)
      expect(result.reasons.passed.some(r => r.includes('PEG Ratio'))).toBe(true)
    })
  })

  describe('data completeness', () => {
    it('computes completeness as ratio of available to total metrics', () => {
      const data = makeFundamentalData()
      const result = analyzeFundamentals(data)
      const total = result.reasons.passed.length + result.reasons.failed.length + result.reasons.unavailable.length
      const available = result.reasons.passed.length + result.reasons.failed.length
      const expected = total > 0 ? Math.round((available / total) * 100) : 0
      expect(result.dataCompleteness).toBe(expected)
    })
  })

  describe('signal determination', () => {
    it('returns neutral for moderate scores', () => {
      const data = makeFundamentalData()
      const result = analyzeFundamentals(data)
      // Most realistic data produces scores in the neutral range
      if (result.score > 30 && result.score < 70) {
        expect(result.signal).toBe('neutral')
      }
    })
  })

  describe('error handling', () => {
    it('handles data with missing sub-objects gracefully', () => {
      // The try-catch is inside the function but after destructuring,
      // so we test with an object that has the top-level keys but causes
      // errors deeper in the scoring logic
      const result = analyzeFundamentals({
        overview: {},
        earnings: { annualEarnings: 'not-an-array' },
        balanceSheet: { annualReports: 'invalid' },
        incomeStatement: { annualReports: 'invalid' },
        cashFlowStatement: { annualReports: 'invalid' },
        metrics: {},
        pricePerShare: NaN,
        historicalFCF: [],
        historicalPrices: []
      })
      // Should not throw, returns a valid result
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('signal')
      expect(result).toHaveProperty('reasons')
    })
  })
})

describe('calculatePiotroskiFScore', () => {
  it('returns high score for company passing all criteria', () => {
    const result = calculatePiotroskiFScore(PIOTROSKI_PERFECT)
    // ROA>0 (1), OCF>0 (1), ΔROA>0 (1), OCF>NI (1), Leverage↓ (1),
    // CR↑ (1), No Dilution (1), GM↑ (1), AT↑ (1) = 9
    expect(result.score).toBeGreaterThanOrEqual(7)
    expect(result.criteria.length).toBe(9)
  })

  it('returns low score for company failing most criteria', () => {
    const result = calculatePiotroskiFScore(PIOTROSKI_FAILING)
    expect(result.score).toBeLessThanOrEqual(4)
  })

  it('returns all 9 criteria', () => {
    const result = calculatePiotroskiFScore(PIOTROSKI_PERFECT)
    expect(result.criteria.length).toBe(9)
    const names = result.criteria.map(c => c.name)
    expect(names).toContain('ROA > 0')
    expect(names).toContain('OCF > 0')
    expect(names).toContain('ΔROA > 0')
    expect(names).toContain('OCF > Net Income')
    expect(names).toContain('Leverage ↓')
    expect(names).toContain('Current Ratio ↑')
    expect(names).toContain('No Dilution')
    expect(names).toContain('Gross Margin ↑')
    expect(names).toContain('Asset Turnover ↑')
  })

  it('handles all-NaN values gracefully', () => {
    const emptyData = {
      incomeStatement: { annualReports: [{}, {}] },
      balanceSheet: { annualReports: [{}, {}] },
      cashFlowStatement: { annualReports: [{}, {}] }
    }
    const result = calculatePiotroskiFScore(emptyData)
    expect(result.score).toBe(0) // All criteria fail
    expect(result.criteria.length).toBe(9)
  })

  it('handles missing data gracefully', () => {
    const result = calculatePiotroskiFScore({})
    expect(result.score).toBe(0)
    expect(result.criteria.length).toBe(9)
  })

  it('passes ROA > 0 when netIncome/totalAssets > 0', () => {
    const result = calculatePiotroskiFScore(PIOTROSKI_PERFECT)
    const roa = result.criteria.find(c => c.name === 'ROA > 0')
    expect(roa?.passed).toBe(true)
  })

  it('passes OCF > 0 when operatingCashFlow > 0', () => {
    const result = calculatePiotroskiFScore(PIOTROSKI_PERFECT)
    const ocf = result.criteria.find(c => c.name === 'OCF > 0')
    expect(ocf?.passed).toBe(true)
  })

  it('passes OCF > Net Income for quality earnings', () => {
    const result = calculatePiotroskiFScore(PIOTROSKI_PERFECT)
    const accruals = result.criteria.find(c => c.name === 'OCF > Net Income')
    expect(accruals?.passed).toBe(true)
  })

  it('passes Leverage down when debt/assets decreased', () => {
    const result = calculatePiotroskiFScore(PIOTROSKI_PERFECT)
    const leverage = result.criteria.find(c => c.name === 'Leverage ↓')
    expect(leverage?.passed).toBe(true)
  })
})

describe('calculateEarningsQuality', () => {
  it('returns OCF/NetIncome ratio when both valid', () => {
    const data = {
      cashFlowStatement: { annualReports: [{ operatingCashFlow: '120' }] },
      incomeStatement: { annualReports: [{ netIncome: '100' }] }
    }
    const result = calculateEarningsQuality(data)
    expect(result).toBe(1.2)
  })

  it('returns null when OCF is NaN', () => {
    const data = {
      cashFlowStatement: { annualReports: [{ operatingCashFlow: 'invalid' }] },
      incomeStatement: { annualReports: [{ netIncome: '100' }] }
    }
    const result = calculateEarningsQuality(data)
    expect(result).toBeNull()
  })

  it('returns null when netIncome <= 0', () => {
    const data = {
      cashFlowStatement: { annualReports: [{ operatingCashFlow: '120' }] },
      incomeStatement: { annualReports: [{ netIncome: '-50' }] }
    }
    const result = calculateEarningsQuality(data)
    expect(result).toBeNull()
  })

  it('returns null when data is missing', () => {
    const result = calculateEarningsQuality({})
    expect(result).toBeNull()
  })
})

describe('calculateShareDilution', () => {
  it('returns positive percentage for share increase (dilution)', () => {
    const data = {
      incomeStatement: {
        annualReports: [
          { netIncome: '1100', eps: '10' }, // 110 shares
          { netIncome: '1000', eps: '10' }  // 100 shares
        ]
      }
    }
    const result = calculateShareDilution(data)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
    expect(result!).toBe(10) // (110-100)/100 * 100 = 10%
  })

  it('returns negative percentage for share decrease (buyback)', () => {
    const data = {
      incomeStatement: {
        annualReports: [
          { netIncome: '900', eps: '10' },  // 90 shares
          { netIncome: '1000', eps: '10' }  // 100 shares
        ]
      }
    }
    const result = calculateShareDilution(data)
    expect(result).not.toBeNull()
    expect(result!).toBeLessThan(0)
    expect(result!).toBe(-10) // (90-100)/100 * 100 = -10%
  })

  it('returns null when fewer than 2 income reports', () => {
    const data = {
      incomeStatement: {
        annualReports: [{ netIncome: '1000', eps: '10' }]
      }
    }
    const result = calculateShareDilution(data)
    expect(result).toBeNull()
  })

  it('returns null when EPS is 0 (division by zero)', () => {
    const data = {
      incomeStatement: {
        annualReports: [
          { netIncome: '1000', eps: '0' },
          { netIncome: '900', eps: '0' }
        ]
      }
    }
    const result = calculateShareDilution(data)
    expect(result).toBeNull()
  })

  it('returns null when data is missing', () => {
    const result = calculateShareDilution({})
    expect(result).toBeNull()
  })
})
