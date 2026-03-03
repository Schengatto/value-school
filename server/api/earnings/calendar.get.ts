import { asc, and, gte, lte, isNotNull } from 'drizzle-orm'
import { useDB } from '../../database'
import { stocks } from '../../database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Calendars'],
    summary: 'Get earnings calendar',
    description: 'Returns tracked stocks with upcoming earnings dates in the specified range. Defaults to the current week (Monday-Friday).',
    parameters: [
      { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start date (YYYY-MM-DD), defaults to current Monday' },
      { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'End date (YYYY-MM-DD), defaults to current Friday' }
    ]
  }
})

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)

  // Default: current week Monday through Friday
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const defaultStart = new Date(now)
  defaultStart.setDate(now.getDate() + mondayOffset)
  defaultStart.setHours(0, 0, 0, 0)

  const defaultEnd = new Date(defaultStart)
  defaultEnd.setDate(defaultStart.getDate() + 4)
  defaultEnd.setHours(23, 59, 59, 999)

  const startDate = query.startDate
    ? new Date(query.startDate as string)
    : defaultStart
  const endDate = query.endDate
    ? new Date(query.endDate as string)
    : defaultEnd

  // Ensure endDate covers the full day
  endDate.setHours(23, 59, 59, 999)

  const data = await db.select({
    symbol: stocks.symbol,
    name: stocks.name,
    sector: stocks.sector,
    industry: stocks.industry,
    currentPrice: stocks.currentPrice,
    compositeScore: stocks.compositeScore,
    overallSignal: stocks.overallSignal,
    fundamentalScore: stocks.fundamentalScore,
    technicalScore: stocks.technicalScore,
    earningsDate: stocks.earningsDate
  })
    .from(stocks)
    .where(
      and(
        isNotNull(stocks.earningsDate),
        gte(stocks.earningsDate, startDate),
        lte(stocks.earningsDate, endDate)
      )
    )
    .orderBy(asc(stocks.earningsDate))

  return {
    data: data.map(d => ({
      ...d,
      earningsDate: d.earningsDate!.toISOString()
    })),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }
})
