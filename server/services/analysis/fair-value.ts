import type { FinnhubData } from '../connectors/finnhub'
import type { StockCategory } from './classification'
import { FAIR_VALUE_WEIGHTS, DCF_GROWTH_CAPS } from './classification'

export interface FairValueEstimate {
  method: string
  value: number | null
}

export interface FairValueResult {
  /** Best single estimate (weighted average of valid methods) */
  fairValue: number | null
  /** Conservative lower bound */
  fairValueLow: number | null
  /** Optimistic upper bound */
  fairValueHigh: number | null
  /** Percentage margin of safety vs current price: positive = undervalued */
  marginOfSafety: number | null
  /** Valuation signal */
  valuationSignal: 'undervalued' | 'fairly_valued' | 'overvalued' | null
  /** Individual method estimates */
  estimates: FairValueEstimate[]
  /** Analyst consensus data */
  analystConsensus: {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  } | null
  /** Latest earnings surprise percentage */
  latestEarningsSurprise: number | null
}

function safeNum(val: any): number | null {
  if (val == null) return null
  const n = typeof val === 'number' ? val : parseFloat(val)
  return isFinite(n) ? n : null
}

function getCAPMDiscount(beta: number | null): number {
  // Risk-free ~4.5% + beta * equity risk premium ~5.5%
  if (beta != null) {
    return Math.min(Math.max(0.045 + beta * 0.055, 0.08), 0.18) // Clamp 8-18%
  }
  return 0.10
}

/**
 * DCF Valuation (10-year, 2-stage).
 * Stage 1: 5 years at company's growth rate.
 * Stage 2: 5 years at fading growth (linear decline to terminal rate).
 * Terminal value calculated on year-10 cash flow.
 */
//
// Key improvements over prior version:
// - 10-year horizon (was 5) — standard for institutional DCF
// - 2-stage growth (high → fade) — more realistic than constant growth
// - Falls back to EPS if FCF unavailable/negative (some growth companies reinvest heavily)
// - Relaxed terminal dominance check to 90% (was 85%) for growth companies

function estimateDCF(
  historicalFCF: number[],
  sharesOutstanding: number | null,
  eps: number | null,
  finnhubMetric: any | null,
  growthCap: number = 0.25
): number | null {
  if (!sharesOutstanding || sharesOutstanding <= 0) return null

  // Determine base annual cash flow per share
  let baseCFPerShare: number | null = null

  // Priority 1: Finnhub FCF per share (TTM, most reliable)
  const finnhubFcfPS = safeNum(finnhubMetric?.fcfPerShareTTM)
  if (finnhubFcfPS != null && finnhubFcfPS > 0) {
    baseCFPerShare = finnhubFcfPS
  }

  // Priority 2: MAX of historical FCF / shares
  if (baseCFPerShare == null) {
    const validFCF = (historicalFCF || []).filter(v => isFinite(v) && v > 0)
    if (validFCF.length > 0) {
      baseCFPerShare = Math.max(...validFCF) / sharesOutstanding
    }
  }

  // Priority 3: Use EPS as proxy for cash flow (growth companies with negative FCF)
  if (baseCFPerShare == null && eps != null && eps > 0) {
    baseCFPerShare = eps
  }

  if (baseCFPerShare == null || baseCFPerShare <= 0) return null

  // Growth rate from Finnhub, clamped based on stock category
  const finnhubGrowth = safeNum(finnhubMetric?.epsGrowth5Y)
  const stage1Growth = finnhubGrowth != null
    ? Math.min(Math.max(finnhubGrowth / 100, 0.02), growthCap)
    : 0.08

  const beta = safeNum(finnhubMetric?.beta)
  const discountRate = getCAPMDiscount(beta)
  const terminalGrowth = 0.025

  if (discountRate <= terminalGrowth) return null

  // Stage 1: Years 1-5 at full growth rate
  let dcfSum = 0
  let cf = baseCFPerShare
  for (let y = 1; y <= 5; y++) {
    cf *= (1 + stage1Growth)
    dcfSum += cf / Math.pow(1 + discountRate, y)
  }

  // Stage 2: Years 6-10 at fading growth (linear decline from stage1Growth to terminalGrowth)
  for (let y = 6; y <= 10; y++) {
    const fadeProgress = (y - 5) / 5 // 0.2, 0.4, 0.6, 0.8, 1.0
    const fadedGrowth = stage1Growth + (terminalGrowth - stage1Growth) * fadeProgress
    cf *= (1 + fadedGrowth)
    dcfSum += cf / Math.pow(1 + discountRate, y)
  }

  // Terminal value on year-10 cash flow
  const terminalValue = (cf * (1 + terminalGrowth)) / (discountRate - terminalGrowth)
  const discountedTerminal = terminalValue / Math.pow(1 + discountRate, 10)

  const totalDCF = dcfSum + discountedTerminal

  // Sanity: terminal value shouldn't dominate > 90%
  if (discountedTerminal / totalDCF > 0.90) return null

  return totalDCF > 0 ? totalDCF : null
}

/**
 * Graham Growth Formula: V = EPS × (8.5 + 2g).
 * From "The Intelligent Investor" Chapter 11 — this is the *growth* formula,
 * not the Graham Number (sqrt(22.5 * EPS * BVPS)) which fails for modern
 * tech stocks that have low book values due to buybacks & intangibles.
 *
 * The 8.5 represents a no-growth P/E, and 2g adds a growth premium.
 * Adjusted with a safety factor: multiply by 4.4/Y where Y = current AAA bond yield.
 * We use a simplified version with Y ≈ 5% (current environment).
 */

function estimateGrahamGrowth(
  eps: number | null,
  growthRate: number | null
): number | null {
  if (eps == null || eps <= 0) return null

  // Growth rate in percentage terms (e.g., 10 for 10%)
  const g = growthRate != null ? Math.min(Math.max(growthRate, 0), 25) : 5

  // V = EPS × (8.5 + 2g) × (4.4 / Y)
  // With Y = 5% (approximate AAA yield), 4.4/5 = 0.88
  const bondYield = 5.0
  const value = eps * (8.5 + 2 * g) * (4.4 / bondYield)
  return value > 0 ? value : null
}

/**
 * EPV (Earnings Power Value): normalized earnings / cost of capital, per share.
 * This is a NO-GROWTH model — it values the company as if it will never grow.
 * Useful as a conservative floor but should have low weight.
 */
function estimateEPV(
  params: {
    revenue: number | null
    operatingMargin: number | null
    sharesOutstanding: number | null
    beta: number | null
    finnhubMetric: any | null
  }
): number | null {
  const { revenue, operatingMargin, sharesOutstanding, beta, finnhubMetric } = params

  const revenuePS = safeNum(finnhubMetric?.revenuePerShareTTM)
  const opMarginTTM = safeNum(finnhubMetric?.operatingMarginTTM)
  const netMarginTTM = safeNum(finnhubMetric?.netProfitMarginTTM)

  const costOfCapital = getCAPMDiscount(beta)

  // Option A: Finnhub TTM per-share data (most reliable)
  // Finnhub returns margins as percentages (35.69 = 35.69%), divide by 100
  if (revenuePS != null && revenuePS > 0) {
    const marginPct = opMarginTTM ?? netMarginTTM
    if (marginPct != null && marginPct > 0) {
      const margin = marginPct / 100
      const normalizedEarningsPS = revenuePS * margin * (1 - 0.21)
      const epvPerShare = normalizedEarningsPS / costOfCapital
      return epvPerShare > 0 ? epvPerShare : null
    }
  }

  // Option B: Polygon data (might be quarterly, less reliable)
  if (revenue == null || operatingMargin == null || !sharesOutstanding || sharesOutstanding <= 0) return null
  if (revenue <= 0 || operatingMargin <= 0) return null

  const normalizedEarnings = revenue * operatingMargin * (1 - 0.21)
  const epv = normalizedEarnings / costOfCapital
  const perShare = epv / sharesOutstanding
  return perShare > 0 ? perShare : null
}

/** Uses EPS × forward P/E to derive fair value. */
function estimatePEBased(
  eps: number | null,
  forwardPE: number | null,
  sectorMedianPE?: number | null
): number | null {
  if (eps == null || eps <= 0) return null
  const targetPE = forwardPE ?? sectorMedianPE ?? 15
  if (targetPE <= 0 || targetPE > 100) return null
  return eps * targetPE
}

export function calculateFairValue(
  params: {
    currentPrice: number | null
    historicalFCF: number[]
    sharesOutstanding: number | null
    /** EPS: should come from Yahoo TTM (epsTrailingTwelveMonths), not Polygon */
    eps: number | null
    bookValuePerShare: number | null
    revenue: number | null
    operatingMargin: number | null
    finnhubData: FinnhubData | null
    /** Analyst consensus price target from Yahoo Finance (targetMeanPrice) */
    analystTargetPrice: number | null
    /** Stock classification — drives weight profiles and DCF growth caps */
    stockCategory?: StockCategory | null
  }
): FairValueResult {
  const {
    currentPrice,
    historicalFCF,
    sharesOutstanding,
    eps,
    bookValuePerShare,
    revenue,
    operatingMargin,
    finnhubData,
    analystTargetPrice,
    stockCategory
  } = params

  const category: StockCategory = stockCategory ?? 'garp'

  const metric = finnhubData?.metric ?? null
  const beta = safeNum(metric?.beta)
  const forwardPE = safeNum(metric?.forwardPE)

  // Get EPS growth rate for Graham Growth Formula (Finnhub returns percentage: 15 = 15%)
  const epsGrowth5Y = safeNum(metric?.epsGrowth5Y)
  const growthForGraham = epsGrowth5Y != null ? epsGrowth5Y : null // already in % form

  // DCF uses category-specific growth cap
  const growthCap = DCF_GROWTH_CAPS[category]

  // Compute estimates from each method
  const analystTargetValue = (analystTargetPrice != null && analystTargetPrice > 0) ? analystTargetPrice : null
  const dcfValue = estimateDCF(historicalFCF, sharesOutstanding, eps, metric, growthCap)
  const peBasedValue = estimatePEBased(eps, forwardPE)
  const grahamGrowthValue = estimateGrahamGrowth(eps, growthForGraham)
  const epvValue = estimateEPV({ revenue, operatingMargin, sharesOutstanding, beta, finnhubMetric: metric })

  const estimates: FairValueEstimate[] = [
    { method: 'Analyst Target', value: analystTargetValue },
    { method: 'DCF', value: dcfValue },
    { method: 'PE-based', value: peBasedValue },
    { method: 'Graham Growth', value: grahamGrowthValue },
    { method: 'EPV', value: epvValue }
  ]

  // Category-adaptive weights from classification system
  // Value: balanced across all methods (EPV/Graham are meaningful)
  // Growth: heavy on Analyst Target + DCF, drop EPV (no-growth model meaningless)
  // GARP: balanced with slight forward-looking bias
  // Speculative: rely on Analyst Target, drop asset-based methods
  const weights = FAIR_VALUE_WEIGHTS[category]

  let weightedSum = 0
  let totalWeight = 0
  const validValues: number[] = []

  for (const est of estimates) {
    if (est.value != null && est.value > 0) {
      const w = weights[est.method] ?? 1
      weightedSum += est.value * w
      totalWeight += w
      validValues.push(est.value)
    }
  }

  if (validValues.length === 0) {
    return {
      fairValue: null,
      fairValueLow: null,
      fairValueHigh: null,
      marginOfSafety: null,
      valuationSignal: null,
      estimates,
      analystConsensus: extractConsensus(finnhubData),
      latestEarningsSurprise: extractLatestSurprise(finnhubData)
    }
  }

  const fairValue = weightedSum / totalWeight

  // Confidence range using weighted CV (coefficient of variation)
  let weightedVarianceSum = 0
  for (const est of estimates) {
    if (est.value != null && est.value > 0) {
      const w = weights[est.method] ?? 1
      weightedVarianceSum += w * Math.pow(est.value - fairValue, 2)
    }
  }
  const weightedStdDev = Math.sqrt(weightedVarianceSum / totalWeight)
  const cv = fairValue > 0 ? weightedStdDev / fairValue : 0
  const rangeFactor = Math.min(Math.max(cv, 0.05), 0.35) // floor 5%, cap 35%
  const fairValueLow = fairValue * (1 - rangeFactor)
  const fairValueHigh = fairValue * (1 + rangeFactor)

  // Margin of safety: positive = undervalued (fair value > price)
  const price = safeNum(currentPrice)
  const marginOfSafety = price != null && price > 0
    ? ((fairValue - price) / fairValue) * 100
    : null

  // Determine signal
  let valuationSignal: FairValueResult['valuationSignal'] = null
  if (marginOfSafety != null) {
    if (marginOfSafety >= 25) valuationSignal = 'undervalued'
    else if (marginOfSafety <= -20) valuationSignal = 'overvalued'
    else valuationSignal = 'fairly_valued'
  }

  return {
    fairValue: round2(fairValue),
    fairValueLow: round2(fairValueLow),
    fairValueHigh: round2(fairValueHigh),
    marginOfSafety: marginOfSafety != null ? Math.round(marginOfSafety * 10) / 10 : null,
    valuationSignal,
    estimates: estimates.map(e => ({ ...e, value: e.value != null ? round2(e.value) : null })),
    analystConsensus: extractConsensus(finnhubData),
    latestEarningsSurprise: extractLatestSurprise(finnhubData)
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function extractConsensus(finnhubData: FinnhubData | null) {
  const recs = finnhubData?.recommendations
  if (!recs || recs.length === 0) return null
  const latest = recs[0]!
  return {
    strongBuy: latest.strongBuy ?? 0,
    buy: latest.buy ?? 0,
    hold: latest.hold ?? 0,
    sell: latest.sell ?? 0,
    strongSell: latest.strongSell ?? 0
  }
}

function extractLatestSurprise(finnhubData: FinnhubData | null): number | null {
  const earnings = finnhubData?.earnings
  if (!earnings || earnings.length === 0) return null
  return safeNum(earnings[0]?.surprisePercent)
}
