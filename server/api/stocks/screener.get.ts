import { desc, asc, ilike, eq, or, and, gte, lte, inArray, sql } from 'drizzle-orm'
import { useDB } from '../../database'
import { stocks } from '../../database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Stocks'],
    summary: 'Stock screener with advanced filters',
    description: 'Returns a paginated list of stocks with extended metrics. Supports filtering by score ranges, category, valuation signal, Piotroski score, margin of safety, and data completeness.'
  }
})

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)

  // Pagination
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 50))
  const offset = (page - 1) * limit
  const sort = (query.sort as string) || 'compositeScore'
  const order = (query.order as string) === 'asc' ? 'asc' : 'desc'

  // Build where conditions
  const conditions = []

  // Text search
  const search = (query.search as string) || ''
  if (search) {
    conditions.push(or(
      ilike(stocks.symbol, `%${search}%`),
      ilike(stocks.name, `%${search}%`)
    ))
  }

  // Sector
  const sector = (query.sector as string) || ''
  if (sector) {
    conditions.push(ilike(stocks.sector, `%${sector}%`))
  }

  // Overall signal
  const signal = (query.signal as string) || ''
  if (signal) {
    conditions.push(eq(stocks.overallSignal, signal))
  }

  // Category (multi-select, comma-separated)
  const category = (query.category as string) || ''
  if (category) {
    const categories = category.split(',').map(c => c.trim()).filter(Boolean)
    if (categories.length > 0) {
      conditions.push(inArray(stocks.stockCategory, categories))
    }
  }

  // Valuation signal
  const valuationSignal = (query.valuationSignal as string) || ''
  if (valuationSignal) {
    conditions.push(eq(stocks.valuationSignal, valuationSignal))
  }

  // Score ranges
  const compositeMin = parseInt(query.compositeScoreMin as string)
  if (!isNaN(compositeMin)) conditions.push(gte(stocks.compositeScore, compositeMin))
  const compositeMax = parseInt(query.compositeScoreMax as string)
  if (!isNaN(compositeMax)) conditions.push(lte(stocks.compositeScore, compositeMax))

  const fundMin = parseInt(query.fundamentalScoreMin as string)
  if (!isNaN(fundMin)) conditions.push(gte(stocks.fundamentalScore, fundMin))
  const fundMax = parseInt(query.fundamentalScoreMax as string)
  if (!isNaN(fundMax)) conditions.push(lte(stocks.fundamentalScore, fundMax))

  const techMin = parseInt(query.technicalScoreMin as string)
  if (!isNaN(techMin)) conditions.push(gte(stocks.technicalScore, techMin))
  const techMax = parseInt(query.technicalScoreMax as string)
  if (!isNaN(techMax)) conditions.push(lte(stocks.technicalScore, techMax))

  // Margin of safety range
  const mosMin = parseFloat(query.marginOfSafetyMin as string)
  if (!isNaN(mosMin)) conditions.push(gte(stocks.marginOfSafety, mosMin))
  const mosMax = parseFloat(query.marginOfSafetyMax as string)
  if (!isNaN(mosMax)) conditions.push(lte(stocks.marginOfSafety, mosMax))

  // Piotroski minimum
  const pioMin = parseInt(query.piotroskiScoreMin as string)
  if (!isNaN(pioMin)) conditions.push(gte(stocks.piotroskiScore, pioMin))

  // Data completeness minimum
  const dcMin = parseInt(query.dataCompletenessMin as string)
  if (!isNaN(dcMin)) conditions.push(gte(stocks.dataCompleteness, dcMin))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Sort column mapping (extended)
  const sortColumns: Record<string, any> = {
    compositeScore: stocks.compositeScore,
    fundamentalScore: stocks.fundamentalScore,
    technicalScore: stocks.technicalScore,
    name: stocks.name,
    symbol: stocks.symbol,
    sector: stocks.sector,
    country: stocks.country,
    marginOfSafety: stocks.marginOfSafety,
    piotroskiScore: stocks.piotroskiScore,
    pe: stocks.pe,
    roe: stocks.roe,
    currentPrice: stocks.currentPrice
  }
  const sortColumn = sortColumns[sort] || stocks.compositeScore
  const orderFn = order === 'asc' ? asc : desc

  // Count
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(stocks)
    .where(whereClause)
  const total = Number(countResult[0]?.count ?? 0)

  // Data — extended projection (no JSONB columns)
  const data = await db.select({
    symbol: stocks.symbol,
    name: stocks.name,
    currentPrice: stocks.currentPrice,
    fundamentalScore: stocks.fundamentalScore,
    fundamentalSignal: stocks.fundamentalSignal,
    technicalScore: stocks.technicalScore,
    technicalSignal: stocks.technicalSignal,
    compositeScore: stocks.compositeScore,
    overallSignal: stocks.overallSignal,
    dataCompleteness: stocks.dataCompleteness,
    stockCategory: stocks.stockCategory,
    sector: stocks.sector,
    country: stocks.country,
    analyzedAt: stocks.analyzedAt,
    // Screener extras
    pe: stocks.pe,
    roe: stocks.roe,
    currentRatio: stocks.currentRatio,
    debtToEbitda: stocks.debtToEbitda,
    piotroskiScore: stocks.piotroskiScore,
    marginOfSafety: stocks.marginOfSafety,
    valuationSignal: stocks.valuationSignal,
    fairValue: stocks.fairValue,
    earningsQuality: stocks.earningsQuality
  })
    .from(stocks)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset)

  return { data, total, page, limit }
})
