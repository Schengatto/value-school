import type { FinnhubData } from '../connectors/finnhub'

export type StockCategory = 'value' | 'growth' | 'garp' | 'speculative'

export interface ClassificationResult {
  category: StockCategory
  reasons: string[]
}

export interface ClassificationInput {
  // Valuation (from Finnhub metric)
  peTTM: number | null
  forwardPE: number | null
  pbAnnual: number | null
  pfcfTTM: number | null

  // Growth (from Finnhub metric, percentage: 15 = 15%)
  epsGrowth5Y: number | null
  revenueGrowth5Y: number | null

  // Profitability
  eps: number | null              // Yahoo TTM EPS
  fcfPerShareTTM: number | null   // Finnhub
  roeTTM: number | null           // Finnhub percentage

  // Size (Finnhub marketCapitalization, in millions)
  marketCap: number | null

  // Revenue (from Polygon income statement, absolute)
  revenue: number | null
}

/**
 * Build ClassificationInput from available data sources.
 * Zero extra API calls — uses data already fetched by the pipeline.
 */
export function buildClassificationInput(
  finnhubData: FinnhubData | null,
  yahooEpsTTM: number | null,
  revenue: number | null,
  marketCap: number | null
): ClassificationInput {
  const m = finnhubData?.metric ?? null
  return {
    peTTM: m?.peTTM ?? null,
    forwardPE: m?.forwardPE ?? null,
    pbAnnual: m?.pbAnnual ?? null,
    pfcfTTM: m?.pfcfTTM ?? null,
    epsGrowth5Y: m?.epsGrowth5Y ?? null,
    revenueGrowth5Y: m?.revenueGrowth5Y ?? null,
    eps: yahooEpsTTM,
    fcfPerShareTTM: m?.fcfPerShareTTM ?? null,
    roeTTM: m?.roeTTM ?? null,
    marketCap,
    revenue
  }
}

/**
 * Classify a stock into one of 4 categories.
 *
 * Decision tree (evaluated top-to-bottom, first match wins):
 *
 * 1. SPECULATIVE — pre-profit with no revenue, extreme PE, or micro-cap with losses
 * 2. GROWTH — high EPS or revenue growth combined with rich valuations
 * 3. VALUE — low PE, low PB, positive cash flow, modest growth
 * 4. GARP — default bucket (Growth At Reasonable Price)
 */
export function classifyStock(input: ClassificationInput): ClassificationResult {
  const {
    peTTM, forwardPE, pbAnnual, pfcfTTM,
    epsGrowth5Y, revenueGrowth5Y,
    eps, fcfPerShareTTM, roeTTM,
    marketCap, revenue
  } = input

  const reasons: string[] = []

  const pe = peTTM ?? forwardPE

  // Pre-profit AND pre-revenue (or very low revenue)
  if (eps != null && eps <= 0 && (revenue == null || revenue <= 0)) {
    reasons.push('Negative EPS with no/negative revenue')
    return { category: 'speculative', reasons }
  }

  // Extreme PE: market pricing in moonshot scenario
  if (pe != null && pe > 200) {
    reasons.push(`Extreme P/E: ${pe.toFixed(0)}`)
    return { category: 'speculative', reasons }
  }

  // Micro-cap with losses
  if (marketCap != null && marketCap < 500 && eps != null && eps <= 0) {
    reasons.push(`Micro-cap ($${marketCap.toFixed(0)}M) with negative EPS`)
    return { category: 'speculative', reasons }
  }

  const epsGrowthHigh = epsGrowth5Y != null && epsGrowth5Y > 20
  const revGrowthHigh = revenueGrowth5Y != null && revenueGrowth5Y > 20
  const hasHighGrowth = epsGrowthHigh || revGrowthHigh
  const peRich = pe == null || pe < 0 || pe > 30

  if (hasHighGrowth && peRich) {
    if (epsGrowthHigh) reasons.push(`High EPS growth: ${epsGrowth5Y!.toFixed(1)}%`)
    if (revGrowthHigh) reasons.push(`High revenue growth: ${revenueGrowth5Y!.toFixed(1)}%`)
    if (pe != null && pe > 0) reasons.push(`Elevated P/E: ${pe.toFixed(1)}`)
    else reasons.push('No meaningful P/E (negative/unavailable)')
    return { category: 'growth', reasons }
  }

  if (revenueGrowth5Y != null && revenueGrowth5Y > 30) {
    reasons.push(`Very high revenue growth: ${revenueGrowth5Y.toFixed(1)}%`)
    return { category: 'growth', reasons }
  }

  if (eps != null && eps <= 0 && revGrowthHigh) {
    reasons.push('Pre-profit with high revenue growth')
    return { category: 'growth', reasons }
  }

  const isLowPE = pe != null && pe > 0 && pe < 18
  const isLowPB = pbAnnual != null && pbAnnual > 0 && pbAnnual < 3
  const hasPositiveFCF = fcfPerShareTTM != null && fcfPerShareTTM > 0
  const isLowGrowth = epsGrowth5Y == null || epsGrowth5Y < 10

  if (isLowPE && isLowPB) {
    reasons.push(`Low P/E: ${pe!.toFixed(1)}`)
    reasons.push(`Low P/B: ${pbAnnual!.toFixed(2)}`)
    return { category: 'value', reasons }
  }

  if (isLowPE && hasPositiveFCF && isLowGrowth) {
    reasons.push(`Low P/E: ${pe!.toFixed(1)}`)
    reasons.push('Positive FCF')
    reasons.push('Moderate/low growth')
    return { category: 'value', reasons }
  }

  if (pe != null && pe > 0 && pe < 10) {
    reasons.push(`Deep value P/E: ${pe.toFixed(1)}`)
    return { category: 'value', reasons }
  }

  reasons.push('Moderate growth and valuation metrics')
  if (pe != null && pe > 0) reasons.push(`P/E: ${pe.toFixed(1)}`)
  if (epsGrowth5Y != null) reasons.push(`EPS Growth 5Y: ${epsGrowth5Y.toFixed(1)}%`)
  if (revenueGrowth5Y != null) reasons.push(`Revenue Growth 5Y: ${revenueGrowth5Y.toFixed(1)}%`)

  return { category: 'garp', reasons }
}

export const FAIR_VALUE_WEIGHTS: Record<StockCategory, Record<string, number>> = {
  value: {
    'Analyst Target': 3,
    'DCF': 2,
    'PE-based': 3,
    'Graham Growth': 2,
    'EPV': 2
  },
  growth: {
    'Analyst Target': 5,
    'DCF': 4,
    'PE-based': 2,
    'Graham Growth': 1,
    'EPV': 0  // No-growth model is meaningless for growth stocks
  },
  garp: {
    'Analyst Target': 4,
    'DCF': 3,
    'PE-based': 3,
    'Graham Growth': 1,
    'EPV': 1
  },
  speculative: {
    'Analyst Target': 5,
    'DCF': 2,
    'PE-based': 1,
    'Graham Growth': 0,
    'EPV': 0
  }
}

export const DCF_GROWTH_CAPS: Record<StockCategory, number> = {
  value: 0.20,       // Max 20% for value stocks
  growth: 0.35,      // Max 35% — growth stocks can sustain higher rates
  garp: 0.25,        // Max 25% — standard
  speculative: 0.35  // Max 35% — high growth potential
}
