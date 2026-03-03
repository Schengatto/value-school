import axios from 'axios'
import type { InsiderTransaction, InsiderSentiment } from '~~/shared/types/stock'

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

let currentKeyIndex = 0

function getFinnhubKeys(): string[] {
  const config = useRuntimeConfig()
  return [
    config.finnhubApiKey1,
    config.finnhubApiKey2,
    config.finnhubApiKey3,
    config.finnhubApiKey4,
    config.finnhubApiKey5,
    config.finnhubApiKey6
  ].filter(Boolean) as string[]
}

function getCurrentKey(): string {
  const keys = getFinnhubKeys()
  if (keys.length === 0) throw new Error('No Finnhub API keys configured')
  return keys[currentKeyIndex % keys.length]!
}

function rotateKey(): string {
  const keys = getFinnhubKeys()
  currentKeyIndex = (currentKeyIndex + 1) % keys.length
  const newKey = keys[currentKeyIndex]!
  console.log(`Finnhub: rotated to key #${currentKeyIndex + 1}/${keys.length}`)
  return newKey
}

function isRateLimitError(err: any): boolean {
  return err?.response?.status === 429 || err?.response?.status === 403
}

async function finnhubFetch<T = any>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
  const keys = getFinnhubKeys()
  if (keys.length === 0) throw new Error('No Finnhub API keys configured')

  for (let attempt = 0; attempt < keys.length; attempt++) {
    try {
      const response = await axios.get(`${FINNHUB_BASE}${endpoint}`, {
        params: { ...params, token: getCurrentKey() }
      })
      return response.data
    } catch (err: any) {
      if (isRateLimitError(err) && attempt < keys.length - 1) {
        console.warn(`Finnhub: key #${currentKeyIndex + 1} rate-limited, rotating...`)
        rotateKey()
        continue
      }
      throw err
    }
  }
  throw new Error('All Finnhub keys exhausted')
}

export interface FinnhubMetric {
  // Growth
  epsGrowth5Y: number | null
  epsGrowthTTMYoy: number | null
  epsGrowth3Y: number | null
  revenueGrowth5Y: number | null
  revenueGrowthTTMYoy: number | null
  // Valuation
  peExclExtraTTM: number | null
  peInclExtraTTM: number | null
  peTTM: number | null
  forwardPE: number | null
  pbAnnual: number | null
  psAnnual: number | null
  pfcfTTM: number | null
  evToEbitda: number | null
  // Profitability
  roeTTM: number | null
  roaTTM: number | null
  grossMarginTTM: number | null
  operatingMarginTTM: number | null
  netProfitMarginTTM: number | null
  // Per share
  bookValuePerShareAnnual: number | null
  fcfPerShareTTM: number | null
  revenuePerShareTTM: number | null
  // Risk
  beta: number | null
  currentRatioAnnual: number | null
  debtEquityAnnual: number | null
  // Dividends
  dividendYieldIndicatedAnnual: number | null
  dividendPerShareAnnual: number | null
  payoutRatioAnnual: number | null
  // Other
  marketCapitalization: number | null
  '52WeekHigh': number | null
  '52WeekLow': number | null
}

export interface FinnhubRecommendation {
  buy: number
  hold: number
  sell: number
  strongBuy: number
  strongSell: number
  period: string
  symbol: string
}

export interface FinnhubEarningsSurprise {
  actual: number | null
  estimate: number | null
  surprise: number | null
  surprisePercent: number | null
  period: string
  symbol: string
}

export interface FinnhubData {
  metric: FinnhubMetric | null
  recommendations: FinnhubRecommendation[] | null
  earnings: FinnhubEarningsSurprise[] | null
}

/**
 * Fetch basic financial metrics for a symbol.
 * Endpoint: /stock/metric?symbol=X&metric=all
 */
async function getBasicFinancials(symbol: string): Promise<FinnhubMetric | null> {
  try {
    const data = await finnhubFetch<{ metric: Record<string, any> }>('/stock/metric', {
      symbol,
      metric: 'all'
    })
    return (data?.metric as FinnhubMetric) ?? null
  } catch (err: any) {
    console.warn(`Finnhub: getBasicFinancials(${symbol}) failed:`, err.message)
    return null
  }
}

/**
 * Fetch analyst recommendation trends.
 * Endpoint: /stock/recommendation?symbol=X
 */
async function getRecommendations(symbol: string): Promise<FinnhubRecommendation[] | null> {
  try {
    const data = await finnhubFetch<FinnhubRecommendation[]>('/stock/recommendation', { symbol })
    return Array.isArray(data) ? data : null
  } catch (err: any) {
    console.warn(`Finnhub: getRecommendations(${symbol}) failed:`, err.message)
    return null
  }
}

/**
 * Fetch earnings surprises.
 * Endpoint: /stock/earnings?symbol=X
 */
async function getEarningsSurprises(symbol: string): Promise<FinnhubEarningsSurprise[] | null> {
  try {
    const data = await finnhubFetch<FinnhubEarningsSurprise[]>('/stock/earnings', { symbol })
    return Array.isArray(data) ? data : null
  } catch (err: any) {
    console.warn(`Finnhub: getEarningsSurprises(${symbol}) failed:`, err.message)
    return null
  }
}

/**
 * Fetch IPO calendar events.
 * Endpoint: /calendar/ipo?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export interface FinnhubIpoEvent {
  date: string | null
  exchange: string | null
  name: string | null
  numberOfShares: number | null
  price: string | null // e.g. "$18-20" or "19.00"
  status: string | null // "expected", "priced", "withdrawn", "filed"
  symbol: string | null
  totalSharesValue: number | null
}

export async function getIpoCalendar(from: string, to: string): Promise<FinnhubIpoEvent[]> {
  try {
    const keys = getFinnhubKeys()
    if (keys.length === 0) return []
    const data = await finnhubFetch<{ ipoCalendar?: FinnhubIpoEvent[] }>('/calendar/ipo', { from, to })
    return Array.isArray(data?.ipoCalendar) ? data.ipoCalendar : []
  } catch (err: any) {
    console.warn('Finnhub: getIpoCalendar failed:', err.message)
    return []
  }
}

/**
 * Fetch insider transactions for a symbol.
 * Endpoint: /stock/insider-transactions?symbol=X
 */
export async function getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
  try {
    const keys = getFinnhubKeys()
    if (keys.length === 0) return []
    const data = await finnhubFetch<{ data?: any[] }>('/stock/insider-transactions', { symbol })
    const raw = Array.isArray(data?.data) ? data.data : []
    return raw.map((t: any) => ({
      name: t.name ?? '',
      share: t.share ?? 0,
      change: t.change ?? 0,
      filingDate: t.filingDate ?? '',
      transactionDate: t.transactionDate ?? '',
      transactionPrice: t.transactionPrice ?? 0,
      transactionCode: t.transactionCode ?? '',
      symbol: t.symbol ?? symbol
    }))
  } catch (err: any) {
    console.warn(`Finnhub: getInsiderTransactions(${symbol}) failed:`, err.message)
    return []
  }
}

/**
 * Fetch insider sentiment (aggregated monthly).
 * Endpoint: /stock/insider-sentiment?symbol=X&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getInsiderSentiment(symbol: string, from: string, to: string): Promise<InsiderSentiment[]> {
  try {
    const keys = getFinnhubKeys()
    if (keys.length === 0) return []
    const data = await finnhubFetch<{ data?: any[] }>('/stock/insider-sentiment', { symbol, from, to })
    const raw = Array.isArray(data?.data) ? data.data : []
    return raw.map((s: any) => ({
      symbol: s.symbol ?? symbol,
      year: s.year ?? 0,
      month: s.month ?? 0,
      change: s.change ?? 0,
      mspr: s.mspr ?? 0
    }))
  } catch (err: any) {
    console.warn(`Finnhub: getInsiderSentiment(${symbol}) failed:`, err.message)
    return []
  }
}

/**
 * Fetch all Finnhub free-tier data for a ticker in one go.
 * Returns metric, recommendations and earnings surprises.
 */
export async function fetchFinnhubData(symbol: string): Promise<FinnhubData | null> {
  const keys = getFinnhubKeys()
  if (keys.length === 0) {
    console.warn('Finnhub: no API keys configured, skipping')
    return null
  }

  try {
    const [metric, recommendations, earnings] = await Promise.all([
      getBasicFinancials(symbol),
      getRecommendations(symbol),
      getEarningsSurprises(symbol)
    ])

    return { metric, recommendations, earnings }
  } catch (err: any) {
    console.error(`Finnhub: fetchFinnhubData(${symbol}) failed:`, err.message)
    return null
  }
}
