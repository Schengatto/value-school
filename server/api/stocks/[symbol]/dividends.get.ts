import { polygonFetch } from '../../../services/connectors/polygon'

defineRouteMeta({
  openAPI: {
    tags: ['Stocks'],
    summary: 'Get dividend history for a stock',
    description: 'Returns annual dividend history aggregated from Polygon.io dividend data. Includes per-year totals, growth rates, and CAGR.',
    parameters: [
      { name: 'symbol', in: 'path', required: true, schema: { type: 'string' }, description: 'Stock ticker symbol (e.g. AAPL, MSFT)' }
    ]
  }
})

interface AnnualDividend {
  year: number
  totalPerShare: number
  payments: number
  growthYoY: number | null
}

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')?.toUpperCase()

  if (!symbol) {
    throw createError({ statusCode: 400, statusMessage: 'Symbol is required' })
  }

  try {
    // Fetch all dividends for this ticker from Polygon (up to 10 years)
    const data = await polygonFetch('/v3/reference/dividends', {
      ticker: symbol,
      limit: 200,
      order: 'asc',
      sort: 'ex_dividend_date'
    })

    const results: Array<{ ex_dividend_date: string, cash_amount: number, frequency: number | null }> = data.results ?? []

    if (results.length === 0) {
      return { annualDividends: [], cagr5y: null, consecutiveYears: 0 }
    }

    // Aggregate by year
    const yearMap = new Map<number, { total: number, payments: number }>()

    for (const div of results) {
      if (!div.ex_dividend_date || !div.cash_amount || div.cash_amount <= 0) continue
      const year = parseInt(div.ex_dividend_date.substring(0, 4), 10)
      if (isNaN(year)) continue

      const existing = yearMap.get(year) ?? { total: 0, payments: 0 }
      existing.total += div.cash_amount
      existing.payments += 1
      yearMap.set(year, existing)
    }

    // Sort by year and build annual dividends with YoY growth
    const years = [...yearMap.keys()].sort((a, b) => a - b)
    const annualDividends: AnnualDividend[] = []

    for (let i = 0; i < years.length; i++) {
      const year = years[i]!
      const entry = yearMap.get(year)!
      const prevEntry = i > 0 ? yearMap.get(years[i - 1]!) : null

      let growthYoY: number | null = null
      if (prevEntry && prevEntry.total > 0) {
        growthYoY = ((entry.total - prevEntry.total) / prevEntry.total) * 100
      }

      annualDividends.push({
        year,
        totalPerShare: Math.round(entry.total * 1000) / 1000,
        payments: entry.payments,
        growthYoY: growthYoY != null ? Math.round(growthYoY * 10) / 10 : null
      })
    }

    // Calculate 5-year CAGR
    let cagr5y: number | null = null
    if (annualDividends.length >= 2) {
      // Find entries ~5 years apart (or use earliest if less than 5 years)
      const latest = annualDividends[annualDividends.length - 1]!
      const fiveYearsAgoIdx = annualDividends.findIndex(d => d.year >= latest.year - 5)
      const earliest = annualDividends[fiveYearsAgoIdx >= 0 ? fiveYearsAgoIdx : 0]!

      if (earliest.totalPerShare > 0 && latest.totalPerShare > 0 && latest.year > earliest.year) {
        const n = latest.year - earliest.year
        cagr5y = Math.round(((Math.pow(latest.totalPerShare / earliest.totalPerShare, 1 / n) - 1) * 100) * 10) / 10
      }
    }

    // Calculate consecutive years of dividend payments (from most recent going back)
    const currentYear = new Date().getFullYear()
    let consecutiveYears = 0
    for (let y = currentYear; y >= currentYear - 30; y--) {
      if (yearMap.has(y)) {
        consecutiveYears++
      } else if (y < currentYear) {
        // Allow current year to be missing (not yet paid)
        break
      }
    }

    return { annualDividends, cagr5y, consecutiveYears }
  } catch (err: any) {
    console.error(`Dividend history error for ${symbol}:`, err.message)
    return { annualDividends: [], cagr5y: null, consecutiveYears: 0 }
  }
})
