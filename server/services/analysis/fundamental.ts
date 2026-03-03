import { Signal } from '~~/shared/types/analysis'
import type { FundamentalResult, FundamentalReasons } from '~~/shared/types/stock'
import type { FinnhubData } from '../connectors/finnhub'

/** Safely parse a numeric value, returning null if invalid */
function safeFloat(val: any): number | null {
  if (val == null) return null
  const n = typeof val === 'number' ? val : parseFloat(val)
  return isFinite(n) ? n : null
}

interface DCFOptions {
  growthRate?: number
  discountRate?: number
  terminalGrowth?: number
  years?: number
  maxTerminalWeight?: number
}

interface DCFResult {
  intrinsicValuePerShare?: number
  marketPricePerShare?: number
  marginOfSafety?: number
  signal: string
  value?: number
  message?: string
}

function estimateIntrinsicValue(
  { historicalFCF = [], metrics, pricePerShare }: { historicalFCF: number[], metrics: any, pricePerShare?: number },
  options: DCFOptions = {}
): DCFResult {
  const {
    growthRate = 0.08,
    discountRate = 0.10,
    terminalGrowth = 0.02,
    years = 5,
    maxTerminalWeight = 0.8
  } = options

  const { sharesOutstanding, marketCap } = metrics

  if (!Array.isArray(historicalFCF) || historicalFCF.length === 0) {
    return { value: NaN, message: 'No valid FCF data', signal: 'Unknown' }
  }

  const validFCF = historicalFCF.map(v => parseFloat(String(v))).filter(v => !isNaN(v) && v > 0)
  if (validFCF.length === 0) {
    return { value: NaN, message: 'All FCF values are invalid or non-positive', signal: 'Unknown' }
  }

  const avgFCF = validFCF.reduce((sum, val) => sum + val, 0) / validFCF.length
  if (!sharesOutstanding || sharesOutstanding <= 0 || discountRate <= terminalGrowth) {
    return { value: NaN, message: 'Invalid input data or unrealistic DCF parameters', signal: 'Unknown' }
  }

  let dcfSum = 0
  for (let year = 1; year <= years; year++) {
    const projectedFCF = avgFCF * Math.pow(1 + growthRate, year)
    dcfSum += projectedFCF / Math.pow(1 + discountRate, year)
  }

  const finalYearFCF = avgFCF * Math.pow(1 + growthRate, years)
  const terminalValue = (finalYearFCF * (1 + terminalGrowth)) / (discountRate - terminalGrowth)
  const discountedTerminal = terminalValue / Math.pow(1 + discountRate, years)

  const totalDCF = dcfSum + discountedTerminal

  const terminalShare = discountedTerminal / totalDCF
  if (terminalShare > maxTerminalWeight) {
    return { value: NaN, message: 'Terminal value dominates the DCF (> 70%)', signal: 'Unknown' }
  }

  const intrinsicValuePerShare = totalDCF / sharesOutstanding

  const marketPricePerShare = pricePerShare !== undefined
    ? pricePerShare
    : marketCap && sharesOutstanding
      ? marketCap / sharesOutstanding
      : NaN

  const marginOfSafety = isNaN(marketPricePerShare)
    ? NaN
    : (1 - marketPricePerShare / intrinsicValuePerShare) * 100

  return {
    intrinsicValuePerShare,
    marketPricePerShare,
    marginOfSafety,
    signal: isNaN(marginOfSafety)
      ? 'Unknown'
      : marginOfSafety >= 30
        ? 'Undervalued'
        : marginOfSafety <= -20
          ? 'Overvalued'
          : 'Fairly valued'
  }
}

function calculateCAGR(start: number, end: number, years: number): number {
  if (start <= 0 || end <= 0 || years <= 0) return NaN
  return Math.pow(end / start, 1 / years) - 1
}

export interface PiotroskiCriterion {
  name: string
  passed: boolean
  description: string
}

export interface PiotroskiResult {
  score: number // 0-9
  criteria: PiotroskiCriterion[]
}

export function calculatePiotroskiFScore(data: any): PiotroskiResult {
  const criteria: PiotroskiCriterion[] = []

  const inc0 = data.incomeStatement?.annualReports?.[0]
  const inc1 = data.incomeStatement?.annualReports?.[1]
  const bs0 = data.balanceSheet?.annualReports?.[0]
  const bs1 = data.balanceSheet?.annualReports?.[1]
  const cf0 = data.cashFlowStatement?.annualReports?.[0]
  const cf1 = data.cashFlowStatement?.annualReports?.[1]

  // Helper to safely parse values
  const p = (v: any): number => {
    if (v == null) return NaN
    const n = typeof v === 'number' ? v : parseFloat(v)
    return isFinite(n) ? n : NaN
  }

  // Current year values
  const netIncome0 = p(inc0?.netIncome)
  const totalAssets0 = p(bs0?.totalAssets)
  const totalAssets1 = p(bs1?.totalAssets)
  const ocf0 = p(cf0?.operatingCashFlow)
  const totalLiab0 = p(bs0?.totalLiabilities)
  const totalLiab1 = p(bs1?.totalLiabilities)
  const currentRatio0 = (!isNaN(p(bs0?.currentAssets)) && !isNaN(p(bs0?.currentLiabilities)) && p(bs0?.currentLiabilities) !== 0)
    ? p(bs0?.currentAssets) / p(bs0?.currentLiabilities) : NaN
  const currentRatio1 = (!isNaN(p(bs1?.currentAssets)) && !isNaN(p(bs1?.currentLiabilities)) && p(bs1?.currentLiabilities) !== 0)
    ? p(bs1?.currentAssets) / p(bs1?.currentLiabilities) : NaN
  const grossProfit0 = p(inc0?.grossProfit)
  const revenue0 = p(inc0?.totalRevenue)
  const grossProfit1 = p(inc1?.grossProfit)
  const revenue1 = p(inc1?.totalRevenue)
  const netIncome1 = p(inc1?.netIncome)

  // Derived shares from net income / EPS (for share issuance check)
  const eps0 = p(inc0?.eps)
  const eps1 = p(inc1?.eps)
  const shares0 = (!isNaN(netIncome0) && !isNaN(eps0) && eps0 !== 0) ? netIncome0 / eps0 : NaN
  const shares1 = (!isNaN(netIncome1) && !isNaN(eps1) && eps1 !== 0) ? netIncome1 / eps1 : NaN

  // ROA
  const roa0 = (!isNaN(netIncome0) && !isNaN(totalAssets0) && totalAssets0 !== 0) ? netIncome0 / totalAssets0 : NaN
  const roa1 = (!isNaN(netIncome1) && !isNaN(totalAssets1) && totalAssets1 !== 0) ? netIncome1 / totalAssets1 : NaN

  // Asset turnover
  const assetTurnover0 = (!isNaN(revenue0) && !isNaN(totalAssets0) && totalAssets0 !== 0) ? revenue0 / totalAssets0 : NaN
  const assetTurnover1 = (!isNaN(revenue1) && !isNaN(totalAssets1) && totalAssets1 !== 0) ? revenue1 / totalAssets1 : NaN

  // Leverage (long-term debt / total assets)
  const leverage0 = (!isNaN(totalLiab0) && !isNaN(totalAssets0) && totalAssets0 !== 0) ? totalLiab0 / totalAssets0 : NaN
  const leverage1 = (!isNaN(totalLiab1) && !isNaN(totalAssets1) && totalAssets1 !== 0) ? totalLiab1 / totalAssets1 : NaN

  // Gross margin
  const grossMargin0 = (!isNaN(grossProfit0) && !isNaN(revenue0) && revenue0 !== 0) ? grossProfit0 / revenue0 : NaN
  const grossMargin1 = (!isNaN(grossProfit1) && !isNaN(revenue1) && revenue1 !== 0) ? grossProfit1 / revenue1 : NaN


  // 1. ROA > 0
  const roaPositive = !isNaN(roa0) && roa0 > 0
  criteria.push({ name: 'ROA > 0', passed: roaPositive, description: `ROA: ${!isNaN(roa0) ? (roa0 * 100).toFixed(1) + '%' : 'N/A'}` })

  // 2. Operating Cash Flow > 0
  const ocfPositive = !isNaN(ocf0) && ocf0 > 0
  criteria.push({ name: 'OCF > 0', passed: ocfPositive, description: `OCF: ${!isNaN(ocf0) ? (ocf0 > 0 ? 'Positive' : 'Negative') : 'N/A'}` })

  // 3. Change in ROA > 0 (improving)
  const roaImproving = !isNaN(roa0) && !isNaN(roa1) && roa0 > roa1
  criteria.push({ name: 'ΔROA > 0', passed: roaImproving, description: `ROA: ${!isNaN(roa0) ? (roa0 * 100).toFixed(1) : '?'}% vs ${!isNaN(roa1) ? (roa1 * 100).toFixed(1) : '?'}%` })

  // 4. Accruals: OCF > Net Income (quality of earnings)
  const accruals = !isNaN(ocf0) && !isNaN(netIncome0) && ocf0 > netIncome0
  criteria.push({ name: 'OCF > Net Income', passed: accruals, description: 'Cash earnings exceed accounting earnings' })


  // 5. Decrease in leverage (debt/assets)
  const leverageDecreased = !isNaN(leverage0) && !isNaN(leverage1) && leverage0 <= leverage1
  criteria.push({ name: 'Leverage ↓', passed: leverageDecreased, description: `Debt/Assets: ${!isNaN(leverage0) ? (leverage0 * 100).toFixed(1) : '?'}% vs ${!isNaN(leverage1) ? (leverage1 * 100).toFixed(1) : '?'}%` })

  // 6. Current ratio improved
  const currentRatioImproved = !isNaN(currentRatio0) && !isNaN(currentRatio1) && currentRatio0 >= currentRatio1
  criteria.push({ name: 'Current Ratio ↑', passed: currentRatioImproved, description: `CR: ${!isNaN(currentRatio0) ? currentRatio0.toFixed(2) : '?'} vs ${!isNaN(currentRatio1) ? currentRatio1.toFixed(2) : '?'}` })

  // 7. No share dilution
  const noDilution = !isNaN(shares0) && !isNaN(shares1) && shares0 <= shares1 * 1.01 // Allow 1% tolerance
  criteria.push({ name: 'No Dilution', passed: noDilution, description: `Shares: ${!isNaN(shares0) && !isNaN(shares1) ? ((shares0 / shares1 - 1) * 100).toFixed(1) + '% change' : 'N/A'}` })


  // 8. Gross margin improved
  const grossMarginImproved = !isNaN(grossMargin0) && !isNaN(grossMargin1) && grossMargin0 >= grossMargin1
  criteria.push({ name: 'Gross Margin ↑', passed: grossMarginImproved, description: `GM: ${!isNaN(grossMargin0) ? (grossMargin0 * 100).toFixed(1) : '?'}% vs ${!isNaN(grossMargin1) ? (grossMargin1 * 100).toFixed(1) : '?'}%` })

  // 9. Asset turnover improved
  const assetTurnoverImproved = !isNaN(assetTurnover0) && !isNaN(assetTurnover1) && assetTurnover0 > assetTurnover1
  criteria.push({ name: 'Asset Turnover ↑', passed: assetTurnoverImproved, description: `Turnover: ${!isNaN(assetTurnover0) ? assetTurnover0.toFixed(2) : '?'} vs ${!isNaN(assetTurnover1) ? assetTurnover1.toFixed(2) : '?'}` })

  const score = criteria.filter(c => c.passed).length

  return { score, criteria }
}

export function calculateEarningsQuality(data: any): number | null {
  const cf = data.cashFlowStatement?.annualReports?.[0]
  const inc = data.incomeStatement?.annualReports?.[0]
  const ocf = parseFloat(cf?.operatingCashFlow ?? 'NaN')
  const netIncome = parseFloat(inc?.netIncome ?? 'NaN')
  if (isNaN(ocf) || isNaN(netIncome) || netIncome <= 0) return null
  return parseFloat((ocf / netIncome).toFixed(2))
}

export function calculateShareDilution(data: any): number | null {
  const incReports = data.incomeStatement?.annualReports
  if (!Array.isArray(incReports) || incReports.length < 2) return null

  // Derive shares outstanding from netIncome / EPS for each period
  const ni0 = parseFloat(incReports[0]?.netIncome ?? 'NaN')
  const eps0 = parseFloat(incReports[0]?.eps ?? 'NaN')
  const ni1 = parseFloat(incReports[1]?.netIncome ?? 'NaN')
  const eps1 = parseFloat(incReports[1]?.eps ?? 'NaN')

  if (isNaN(ni0) || isNaN(eps0) || eps0 === 0 || isNaN(ni1) || isNaN(eps1) || eps1 === 0) return null

  const shares0 = ni0 / eps0
  const shares1 = ni1 / eps1
  if (shares1 <= 0) return null

  return parseFloat(((shares0 - shares1) / shares1 * 100).toFixed(1))
}

export function analyzeFundamentals(data: any, _industryPe?: number, finnhubData?: FinnhubData | null): FundamentalResult {
  const {
    overview,
    earnings,
    balanceSheet,
    incomeStatement,
    cashFlowStatement,
    metrics,
    pricePerShare,
    historicalFCF,
    historicalPrices
  } = data

  // Extract Finnhub metric for enriched scoring
  const fhMetric = finnhubData?.metric ?? null

  const reasons: FundamentalReasons = { passed: [], failed: [], unavailable: [] }
  let score = 0
  let maxScore = 0

  const addScore = (value: number | null, weight: number, reason: string) => {
    if (value === null || isNaN(value)) {
      reasons.unavailable.push(reason)
      return
    }
    const clamped = Math.min(Math.max(value, 0), 1)
    score += clamped * weight
    maxScore += weight
    if (clamped >= 0.5) reasons.passed.push(reason)
    else reasons.failed.push(reason)
  }

  try {
    const epsList = (earnings?.annualEarnings || [])
      .map((e: any) => parseFloat(e.reportedEPS))
      .filter((eps: number) => !isNaN(eps))

    if (epsList.length >= 3) {
      const first = epsList[epsList.length - 1]
      const last = epsList[0]
      addScore(last > first ? 1 : 0, 1.5, 'EPS shows upward trend')

      const epsCAGR = calculateCAGR(first, last, epsList.length - 1)
      if (!isNaN(epsCAGR)) {
        addScore(epsCAGR / 0.10, 2, `EPS CAGR ${(epsCAGR * 100).toFixed(2)}%`)
      }
    } else {
      reasons.unavailable.push('EPS data insufficient')
    }

    if (Array.isArray(historicalPrices) && historicalPrices.length >= 2) {
      const sorted = [...historicalPrices].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const start = parseFloat(sorted[0].close)
      const end = parseFloat(sorted[sorted.length - 1].close)
      const years = (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      const priceCAGR = calculateCAGR(start, end, years)
      if (!isNaN(priceCAGR)) {
        addScore(priceCAGR / 0.10, 1, `Price CAGR ${(priceCAGR * 100).toFixed(2)}%`)
      }
    } else {
      reasons.unavailable.push('Historical price data insufficient')
    }

    const roic = parseFloat(metrics?.roic ?? 'NaN')
    addScore(roic / 0.10, 2, `ROIC ${(roic * 100).toFixed(1)}%`)

    const gm = parseFloat(metrics?.grossProfitMargin ?? 'NaN')
    addScore(gm / 0.60, 1, `Gross Margin ${(gm * 100).toFixed(1)}%`)

    const pfcf = parseFloat(metrics?.pfcfRatio ?? 'NaN')
    addScore(pfcf > 0 ? (15 / pfcf) : null, 2, `P/FCF ${pfcf?.toFixed?.(2)}`)

    const pb = parseFloat(metrics?.pbRatio ?? 'NaN')
    const pbScore = !isNaN(pb) ? Math.max(0, 1 - (pb - 1) / 4) : null
    addScore(pbScore, 1.5, `P/B Ratio ${pb?.toFixed(2)}`)

    const payout = parseFloat(metrics?.dividendPayoutRatio ?? 'NaN')
    addScore(payout > 0 ? (1 - Math.min(payout / 60, 1)) : null, 1, `Dividend Payout ${payout?.toFixed?.(2)}%`)

    const bs = balanceSheet?.annualReports?.[0]
    const debt = bs ? parseFloat(bs.totalLiabilities) : NaN
    const equity = bs ? parseFloat(bs.totalShareholderEquity) : NaN
    addScore(debt > 0 && equity > 0 ? (2 / (debt / equity)) : null, 1, 'Debt/Equity ratio')

    const inc = incomeStatement?.annualReports?.[0]
    const opIncome = inc ? parseFloat(inc.operatingIncome) : NaN
    const revenue = inc ? parseFloat(inc.totalRevenue) : NaN
    const opMargin = opIncome / revenue
    addScore(opMargin / 0.10, 1, `Operating Margin ${(opMargin * 100).toFixed(1)}%`)

    const cf = cashFlowStatement?.annualReports?.[0]
    const fcf = cf ? parseFloat(cf.freeCashFlow) : NaN
    const capex = cf ? parseFloat(cf.capitalExpenditure) : NaN
    addScore(fcf > 0 ? 1 : 0, 1, 'Positive Free Cash Flow')
    addScore(!isNaN(fcf) && !isNaN(capex) && fcf > 0 ? (1 - Math.min(Math.abs(capex / fcf) / 0.5, 1)) : null, 1, 'CapEx intensity')

    addScore(parseFloat(metrics?.currentRatio ?? 'NaN') / 1.5, 1, 'Current Ratio')
    addScore(parseFloat(metrics?.interestCoverage ?? 'NaN') / 3, 1, 'Interest Coverage')
    addScore(3 / parseFloat(metrics?.debtToEBITDA ?? 'NaN'), 1, 'Debt/EBITDA')

    addScore(parseFloat(metrics?.returnOnTangibleAssets ?? 'NaN') / 0.05, 1, 'Return on Tangible Assets')
    addScore(1 - Math.min(parseFloat(metrics?.intangiblesToTotalAssets ?? 'NaN') / 0.2, 1), 1, 'Low reliance on intangibles')

    const graham = parseFloat(metrics?.grahamNumber ?? 'NaN')
    addScore(!isNaN(pricePerShare) && !isNaN(graham) ? (pricePerShare < graham ? 1 : 0) : null, 1, 'Price below Graham Number')

    const valuation = estimateIntrinsicValue({ historicalFCF, metrics, pricePerShare })
    addScore(valuation?.signal === 'Undervalued' ? 1 : 0, 2, `DCF valuation (${valuation.signal})`)

    // Finnhub returns percentages (e.g. 159.94 = 159.94%)
    const fhRoe = safeFloat(fhMetric?.roeTTM)
    if (fhRoe != null) {
      const roeDecimal = fhRoe / 100 // Convert percentage to decimal
      addScore(roeDecimal > 0 ? roeDecimal / 0.15 : 0, 2, `ROE ${fhRoe.toFixed(1)}%`)
    } else {
      reasons.unavailable.push('ROE (Finnhub)')
    }

    const fhRevGrowth = safeFloat(fhMetric?.revenueGrowth5Y)
    if (fhRevGrowth != null) {
      const growthDecimal = fhRevGrowth / 100
      addScore(growthDecimal > 0 ? growthDecimal / 0.10 : 0, 1.5, `Revenue Growth 5Y ${fhRevGrowth.toFixed(1)}%`)
    } else {
      reasons.unavailable.push('Revenue Growth 5Y (Finnhub)')
    }

    const recs = finnhubData?.recommendations
    if (recs && recs.length > 0) {
      const latest = recs[0]!
      const total = (latest.strongBuy ?? 0) + (latest.buy ?? 0) + (latest.hold ?? 0) + (latest.sell ?? 0) + (latest.strongSell ?? 0)
      if (total > 0) {
        const bullishRatio = ((latest.strongBuy ?? 0) + (latest.buy ?? 0)) / total
        addScore(bullishRatio, 1.5, `Analyst Consensus ${(bullishRatio * 100).toFixed(0)}% Buy`)
      } else {
        reasons.unavailable.push('Analyst Consensus (no data)')
      }
    } else {
      reasons.unavailable.push('Analyst Consensus (Finnhub)')
    }

    // Average surprise% across last 4 quarters; consistently beating estimates is positive
    const earningsSurprises = finnhubData?.earnings
    if (earningsSurprises && earningsSurprises.length > 0) {
      const recentSurprises = earningsSurprises.slice(0, 4)
        .map(e => safeFloat(e.surprisePercent))
        .filter((v): v is number => v != null)
      if (recentSurprises.length > 0) {
        const avgSurprise = recentSurprises.reduce((s, v) => s + v, 0) / recentSurprises.length
        // Score: avg surprise of 5% = perfect score; negative surprise = 0
        addScore(avgSurprise > 0 ? avgSurprise / 5 : 0, 1, `Earnings Surprise avg ${avgSurprise.toFixed(1)}%`)
      } else {
        reasons.unavailable.push('Earnings Surprise (no valid data)')
      }
    } else {
      reasons.unavailable.push('Earnings Surprise (Finnhub)')
    }

    const fhPe = safeFloat(fhMetric?.peTTM)
    const fhEpsGrowth = safeFloat(fhMetric?.epsGrowth5Y)
    if (fhPe != null && fhPe > 0 && fhEpsGrowth != null && fhEpsGrowth > 0) {
      const peg = fhPe / fhEpsGrowth // Both are raw numbers: PE=33, growth=17.9 → PEG=1.84
      // PEG 1 = fairly valued, < 1 = undervalued, > 2 = expensive
      const pegScore = Math.max(0, 1 - (peg - 1) / 2)
      addScore(pegScore, 1.5, `PEG Ratio ${peg.toFixed(2)}`)
    } else {
      reasons.unavailable.push('PEG Ratio (need PE > 0 and growth > 0)')
    }

    const latestCf = cashFlowStatement?.annualReports?.[0]
    const latestInc = incomeStatement?.annualReports?.[0]
    const ocf = latestCf ? parseFloat(latestCf.operatingCashflow ?? latestCf.operatingCashFlow ?? 'NaN') : NaN
    const netIncome = latestInc ? parseFloat(latestInc.netIncome ?? 'NaN') : NaN
    if (!isNaN(ocf) && !isNaN(netIncome) && netIncome > 0) {
      // OCF should be >= net income for quality earnings. Ratio > 1 is excellent.
      const qualityRatio = ocf / netIncome
      addScore(Math.min(qualityRatio, 1.5) / 1.5, 1.5, `Earnings Quality (OCF/NI) ${qualityRatio.toFixed(2)}`)
    } else {
      reasons.unavailable.push('Earnings Quality (OCF/Net Income)')
    }

    const incReportsForDilution = incomeStatement?.annualReports
    if (Array.isArray(incReportsForDilution) && incReportsForDilution.length >= 2) {
      const ni0d = parseFloat(incReportsForDilution[0]?.netIncome ?? 'NaN')
      const eps0d = parseFloat(incReportsForDilution[0]?.eps ?? 'NaN')
      const ni1d = parseFloat(incReportsForDilution[1]?.netIncome ?? 'NaN')
      const eps1d = parseFloat(incReportsForDilution[1]?.eps ?? 'NaN')
      const sharesRecent = (!isNaN(ni0d) && !isNaN(eps0d) && eps0d !== 0) ? ni0d / eps0d : NaN
      const sharesPrior = (!isNaN(ni1d) && !isNaN(eps1d) && eps1d !== 0) ? ni1d / eps1d : NaN
      if (!isNaN(sharesRecent) && !isNaN(sharesPrior) && sharesPrior > 0) {
        const dilution = (sharesRecent - sharesPrior) / sharesPrior
        // No dilution or buyback = 1, >5% dilution = 0
        addScore(dilution <= 0 ? 1 : Math.max(0, 1 - dilution / 0.05), 1, `Share Dilution ${(dilution * 100).toFixed(1)}%`)
      } else {
        reasons.unavailable.push('Share Dilution (missing shares data)')
      }
    } else {
      reasons.unavailable.push('Share Dilution (need 2+ years)')
    }

    const incReports = incomeStatement?.annualReports
    if (Array.isArray(incReports) && incReports.length >= 2) {
      const rev0 = parseFloat(incReports[0]?.totalRevenue ?? 'NaN')
      const ni0 = parseFloat(incReports[0]?.netIncome ?? 'NaN')
      const rev1 = parseFloat(incReports[1]?.totalRevenue ?? 'NaN')
      const ni1 = parseFloat(incReports[1]?.netIncome ?? 'NaN')
      if (rev0 > 0 && rev1 > 0 && !isNaN(ni0) && !isNaN(ni1)) {
        const margin0 = ni0 / rev0
        const margin1 = ni1 / rev1
        addScore(margin0 > margin1 ? 1 : 0, 1, `Net Margin Trend ${(margin0 * 100).toFixed(1)}% vs ${(margin1 * 100).toFixed(1)}%`)
      } else {
        reasons.unavailable.push('Net Margin Trend (invalid data)')
      }
    } else {
      reasons.unavailable.push('Net Margin Trend (need 2+ years)')
    }

    const piotroski = calculatePiotroskiFScore(data)
    if (piotroski.score >= 0) {
      // Score 7-9 = strong (1.0), 5-6 = average (0.5), 0-4 = weak (score/9)
      addScore(piotroski.score / 9, 2, `Piotroski F-Score ${piotroski.score}/9`)
    }

    const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    let signal = Signal.None
    if (normalizedScore >= 70) signal = Signal.Positive
    else if (normalizedScore <= 30) signal = Signal.Negative

    const totalMetrics = reasons.passed.length + reasons.failed.length + reasons.unavailable.length
    const availableMetrics = reasons.passed.length + reasons.failed.length
    const dataCompleteness = totalMetrics > 0 ? Math.round((availableMetrics / totalMetrics) * 100) : 0

    return { signal, score: normalizedScore, reasons, dataCompleteness }
  } catch (error: any) {
    console.error('Error during fundamental analysis:', error)
    return { signal: Signal.None, reasons: { passed: [], failed: [], unavailable: [], error: error.message }, score: 0, dataCompleteness: 0 }
  }
}
