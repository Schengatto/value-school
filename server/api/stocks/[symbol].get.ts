import { eq, asc } from 'drizzle-orm'
import { useDB } from '../../database'
import { stocks, historicalPrices, dailyPrices } from '../../database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Stocks'],
    summary: 'Get stock detail by symbol',
    description: 'Returns full stock data including scores, fundamental/technical analysis, company info, and historical/daily price series for charts.',
    parameters: [
      { name: 'symbol', in: 'path', required: true, schema: { type: 'string' }, description: 'Stock ticker symbol (e.g. AAPL, MSFT)' }
    ]
  }
})

export default defineEventHandler(async (event) => {
  const db = useDB()
  const symbol = getRouterParam(event, 'symbol')?.toUpperCase()

  if (!symbol) {
    throw createError({ statusCode: 400, statusMessage: 'Symbol is required' })
  }

  // Fetch stock data
  const [stock] = await db.select()
    .from(stocks)
    .where(eq(stocks.symbol, symbol))
    .limit(1)

  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `Stock ${symbol} not found` })
  }

  // Fetch historical prices (annual)
  const histPrices = await db.select()
    .from(historicalPrices)
    .where(eq(historicalPrices.symbol, symbol))
    .orderBy(asc(historicalPrices.date))

  // Fetch daily prices (for charts)
  const daily = await db.select()
    .from(dailyPrices)
    .where(eq(dailyPrices.symbol, symbol))
    .orderBy(asc(dailyPrices.date))

  return {
    ...stock,
    historicalPrices: histPrices,
    pricesDaily: daily
  }
})
