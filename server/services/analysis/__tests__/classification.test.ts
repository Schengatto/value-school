import { describe, it, expect } from 'vitest'
import {
  classifyStock,
  buildClassificationInput,
  FAIR_VALUE_WEIGHTS,
  DCF_GROWTH_CAPS
} from '../classification'
import { makeClassificationInput, makeFinnhubData } from './fixtures'

describe('classifyStock', () => {
  describe('speculative classification', () => {
    it('classifies as speculative when EPS <= 0 and no revenue', () => {
      const result = classifyStock(makeClassificationInput({ eps: -1, revenue: null }))
      expect(result.category).toBe('speculative')
      expect(result.reasons).toContain('Negative EPS with no/negative revenue')
    })

    it('classifies as speculative when EPS <= 0 and revenue <= 0', () => {
      const result = classifyStock(makeClassificationInput({ eps: -0.5, revenue: -100 }))
      expect(result.category).toBe('speculative')
    })

    it('classifies as speculative when PE > 200', () => {
      const result = classifyStock(makeClassificationInput({ peTTM: 250 }))
      expect(result.category).toBe('speculative')
      expect(result.reasons[0]).toContain('Extreme P/E')
    })

    it('classifies as speculative when micro-cap with negative EPS', () => {
      // Must have positive revenue to not trigger the first speculative rule
      const result = classifyStock(makeClassificationInput({ marketCap: 300, eps: -2, revenue: 1000000 }))
      expect(result.category).toBe('speculative')
      expect(result.reasons[0]).toContain('Micro-cap')
    })

    it('does NOT classify as speculative for micro-cap with positive EPS', () => {
      const result = classifyStock(makeClassificationInput({ marketCap: 300, eps: 2, peTTM: 15, pbAnnual: 1.5 }))
      expect(result.category).not.toBe('speculative')
    })
  })

  describe('growth classification', () => {
    it('classifies as growth when high EPS growth + rich PE', () => {
      const result = classifyStock(makeClassificationInput({ epsGrowth5Y: 25, peTTM: 35 }))
      expect(result.category).toBe('growth')
    })

    it('classifies as growth when high revenue growth + null PE (pe null is rich)', () => {
      const result = classifyStock(makeClassificationInput({ revenueGrowth5Y: 25, peTTM: null }))
      expect(result.category).toBe('growth')
    })

    it('classifies as growth when very high revenue growth alone (>30%)', () => {
      const result = classifyStock(makeClassificationInput({ revenueGrowth5Y: 35, peTTM: 20 }))
      expect(result.category).toBe('growth')
    })

    it('classifies as growth when EPS <= 0 with high revenue growth', () => {
      const result = classifyStock(makeClassificationInput({
        eps: -1,
        revenue: 5000000000, // has revenue so not speculative
        revenueGrowth5Y: 25,
        peTTM: null
      }))
      expect(result.category).toBe('growth')
    })

    it('does NOT classify as growth when high EPS growth but moderate PE (0-30)', () => {
      const result = classifyStock(makeClassificationInput({ epsGrowth5Y: 25, peTTM: 20 }))
      // Not growth because peRich requires pe > 30 or pe < 0 or pe == null
      expect(result.category).not.toBe('growth')
    })
  })

  describe('value classification', () => {
    it('classifies as value when low PE + low PB', () => {
      const result = classifyStock(makeClassificationInput({ peTTM: 12, pbAnnual: 1.5 }))
      expect(result.category).toBe('value')
    })

    it('classifies as value when low PE + positive FCF + low growth', () => {
      const result = classifyStock(makeClassificationInput({
        peTTM: 14,
        fcfPerShareTTM: 5,
        epsGrowth5Y: 5
      }))
      expect(result.category).toBe('value')
    })

    it('classifies as value with deep value PE < 10', () => {
      const result = classifyStock(makeClassificationInput({ peTTM: 8 }))
      expect(result.category).toBe('value')
    })

    it('does NOT classify as value when PE > 18 even with low PB', () => {
      const result = classifyStock(makeClassificationInput({ peTTM: 22, pbAnnual: 0.8 }))
      expect(result.category).not.toBe('value')
    })
  })

  describe('GARP classification (default)', () => {
    it('classifies as GARP with moderate metrics', () => {
      const result = classifyStock(makeClassificationInput({ peTTM: 22, epsGrowth5Y: 15 }))
      expect(result.category).toBe('garp')
    })

    it('classifies as GARP when all inputs are null', () => {
      const result = classifyStock(makeClassificationInput())
      expect(result.category).toBe('garp')
      expect(result.reasons).toContain('Moderate growth and valuation metrics')
    })

    it('includes PE and growth details in reasons', () => {
      const result = classifyStock(makeClassificationInput({ peTTM: 22, epsGrowth5Y: 12 }))
      expect(result.reasons.some(r => r.includes('P/E'))).toBe(true)
      expect(result.reasons.some(r => r.includes('EPS Growth'))).toBe(true)
    })
  })

  it('evaluates speculative before growth', () => {
    // Negative EPS + no revenue should be speculative even with high growth
    const result = classifyStock(makeClassificationInput({
      eps: -1,
      revenue: null,
      epsGrowth5Y: 30,
      peTTM: null
    }))
    expect(result.category).toBe('speculative')
  })
})

describe('buildClassificationInput', () => {
  it('extracts all fields from FinnhubData metric', () => {
    const finnhub = makeFinnhubData({
      metric: {
        peTTM: 25,
        forwardPE: 22,
        pbAnnual: 3.5,
        pfcfTTM: 18,
        epsGrowth5Y: 15,
        revenueGrowth5Y: 12,
        fcfPerShareTTM: 4.5,
        roeTTM: 20
      }
    })
    const result = buildClassificationInput(finnhub as any, 6.5, 100e9, 500e3)
    expect(result.peTTM).toBe(25)
    expect(result.forwardPE).toBe(22)
    expect(result.pbAnnual).toBe(3.5)
    expect(result.pfcfTTM).toBe(18)
    expect(result.epsGrowth5Y).toBe(15)
    expect(result.revenueGrowth5Y).toBe(12)
    expect(result.eps).toBe(6.5)
    expect(result.fcfPerShareTTM).toBe(4.5)
    expect(result.roeTTM).toBe(20)
    expect(result.revenue).toBe(100e9)
    expect(result.marketCap).toBe(500e3)
  })

  it('returns all nulls when finnhubData is null', () => {
    const result = buildClassificationInput(null, null, null, null)
    expect(result.peTTM).toBeNull()
    expect(result.forwardPE).toBeNull()
    expect(result.eps).toBeNull()
    expect(result.marketCap).toBeNull()
  })
})

describe('FAIR_VALUE_WEIGHTS', () => {
  it('has entries for all 4 categories', () => {
    expect(FAIR_VALUE_WEIGHTS).toHaveProperty('value')
    expect(FAIR_VALUE_WEIGHTS).toHaveProperty('growth')
    expect(FAIR_VALUE_WEIGHTS).toHaveProperty('garp')
    expect(FAIR_VALUE_WEIGHTS).toHaveProperty('speculative')
  })

  it('has EPV weight of 0 for growth stocks', () => {
    expect(FAIR_VALUE_WEIGHTS.growth.EPV).toBe(0)
  })

  it('has EPV weight of 0 for speculative stocks', () => {
    expect(FAIR_VALUE_WEIGHTS.speculative.EPV).toBe(0)
  })

  it('each category has all 5 methods', () => {
    const methods = ['Analyst Target', 'DCF', 'PE-based', 'Graham Growth', 'EPV']
    for (const cat of ['value', 'growth', 'garp', 'speculative'] as const) {
      for (const method of methods) {
        expect(FAIR_VALUE_WEIGHTS[cat]).toHaveProperty(method)
      }
    }
  })
})

describe('DCF_GROWTH_CAPS', () => {
  it('has correct caps per category', () => {
    expect(DCF_GROWTH_CAPS.value).toBe(0.20)
    expect(DCF_GROWTH_CAPS.growth).toBe(0.35)
    expect(DCF_GROWTH_CAPS.garp).toBe(0.25)
    expect(DCF_GROWTH_CAPS.speculative).toBe(0.35)
  })
})
