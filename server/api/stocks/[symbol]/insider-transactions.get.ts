import { getInsiderTransactions, getInsiderSentiment } from '../../../services/connectors/finnhub'

defineRouteMeta({
  openAPI: {
    tags: ['Stocks'],
    summary: 'Get insider transactions and sentiment for a stock',
    description: 'Returns recent insider transactions and monthly insider sentiment from Finnhub.',
    parameters: [
      { name: 'symbol', in: 'path', required: true, schema: { type: 'string' }, description: 'Stock ticker symbol (e.g. AAPL, MSFT)' }
    ]
  }
})

const RELEVANT_CODES = new Set(['P', 'S', 'A', 'M', 'F'])

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')?.toUpperCase()

  if (!symbol) {
    throw createError({ statusCode: 400, statusMessage: 'Symbol is required' })
  }

  try {
    // 12 months ago
    const now = new Date()
    const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      .toISOString().slice(0, 10)
    const to = now.toISOString().slice(0, 10)

    const [rawTransactions, sentiment] = await Promise.all([
      getInsiderTransactions(symbol),
      getInsiderSentiment(symbol, from, to)
    ])

    // Filter to relevant transaction types and limit to 50
    const transactions = rawTransactions
      .filter(t => RELEVANT_CODES.has(t.transactionCode))
      .slice(0, 50)

    return { transactions, sentiment }
  } catch (err: any) {
    console.error(`Insider transactions error for ${symbol}:`, err.message)
    return { transactions: [], sentiment: [] }
  }
})
