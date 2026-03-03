import { getDividendCalendar as getPolygonDividends } from '../../services/connectors/polygon'
import { useDB } from '../../database'
import { stocks } from '../../database/schema'
import type { DividendCalendarItem } from '~~/shared/types/stock'

defineRouteMeta({
  openAPI: {
    tags: ['Calendars'],
    summary: 'Get dividend calendar',
    description: 'Returns ex-dividend dates from Polygon.io filtered to stocks tracked by the platform. Includes ticker, company name, dividend amount, pay date, and platform scores.',
    parameters: [
      { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start date (YYYY-MM-DD), defaults to first day of current month' },
      { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'End date (YYYY-MM-DD), defaults to last day of current month' }
    ]
  }
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // Default: current month
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const startDate = (query.startDate as string) || firstOfMonth.toISOString().slice(0, 10)
  const endDate = (query.endDate as string) || lastOfMonth.toISOString().slice(0, 10)

  // Fetch all tracked stock symbols from database
  const db = useDB()
  const trackedStocks = await db
    .select({ symbol: stocks.symbol, name: stocks.name, currentPrice: stocks.currentPrice, compositeScore: stocks.compositeScore, overallSignal: stocks.overallSignal })
    .from(stocks)

  const trackedMap = new Map<string, { name: string, currentPrice: number | null, compositeScore: number | null, overallSignal: string | null }>()
  for (const s of trackedStocks) {
    trackedMap.set(s.symbol.toUpperCase(), {
      name: s.name,
      currentPrice: s.currentPrice,
      compositeScore: s.compositeScore,
      overallSignal: s.overallSignal
    })
  }

  // Fetch dividends from Polygon
  const polygonDividends = await getPolygonDividends(startDate, endDate)

  // Filter to only tracked stocks and map to our type
  const items: DividendCalendarItem[] = []

  for (const div of polygonDividends) {
    const ticker = (div.ticker ?? '').toUpperCase()
    const tracked = trackedMap.get(ticker)
    if (!tracked) continue

    items.push({
      ticker,
      companyName: tracked.name,
      exDividendDate: div.ex_dividend_date ?? '',
      recordDate: div.record_date ?? null,
      payDate: div.pay_date ?? null,
      cashAmount: div.cash_amount ?? 0,
      frequency: div.frequency != null ? String(div.frequency) : null,
      dividendType: div.dividend_type ?? null,
      currentPrice: tracked.currentPrice,
      compositeScore: tracked.compositeScore,
      overallSignal: tracked.overallSignal
    })
  }

  // Filter out dividends with impossible yields (currency mismatch for OTC/ADR tickers)
  const MAX_YIELD_PER_DISTRIBUTION = 0.15 // 15% per single distribution
  const filtered = items.filter(item => {
    if (!item.currentPrice || item.currentPrice <= 0) return true // keep items without price data
    const yieldRatio = item.cashAmount / item.currentPrice
    return yieldRatio <= MAX_YIELD_PER_DISTRIBUTION
  })

  // Sort by ex-dividend date
  filtered.sort((a, b) => a.exDividendDate.localeCompare(b.exDividendDate))

  return {
    data: filtered,
    startDate,
    endDate
  }
})
