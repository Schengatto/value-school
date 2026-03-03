import { getIpoCalendar as getPolygonIpos } from '../../services/connectors/polygon'
import { getIpoCalendar as getFinnhubIpos } from '../../services/connectors/finnhub'
import type { IpoCalendarItem } from '~~/shared/types/stock'

defineRouteMeta({
  openAPI: {
    tags: ['Calendars'],
    summary: 'Get IPO calendar',
    description: 'Returns upcoming IPOs from Polygon.io and Finnhub for the specified date range. Includes ticker, company name, price range, and IPO status. Defaults to the current week.',
    parameters: [
      { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start date (YYYY-MM-DD), defaults to current Monday' },
      { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'End date (YYYY-MM-DD), defaults to current Friday' }
    ]
  }
})

/**
 * Parse Finnhub price string like "$18-20", "18.00-20.00", "19.00" into low/high
 */
function parseFinnhubPrice(price: string | null): { low: number | null, high: number | null } {
  if (!price) return { low: null, high: null }
  // Strip dollar signs and spaces
  const cleaned = price.replace(/[$\s]/g, '')
  const parts = cleaned.split('-')
  if (parts.length === 2) {
    const low = parseFloat(parts[0]!)
    const high = parseFloat(parts[1]!)
    return { low: isFinite(low) ? low : null, high: isFinite(high) ? high : null }
  }
  const single = parseFloat(cleaned)
  return { low: isFinite(single) ? single : null, high: isFinite(single) ? single : null }
}

/**
 * Map Finnhub IPO status to our normalized status values
 */
function mapFinnhubStatus(status: string | null): string | null {
  if (!status) return null
  switch (status.toLowerCase()) {
    case 'expected': return 'pending'
    case 'priced': return 'history'
    case 'filed': return 'new'
    case 'withdrawn': return 'withdrawn'
    default: return status
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // Default: current week Monday through Friday
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const defaultStart = new Date(now)
  defaultStart.setDate(now.getDate() + mondayOffset)
  defaultStart.setHours(0, 0, 0, 0)

  const defaultEnd = new Date(defaultStart)
  defaultEnd.setDate(defaultStart.getDate() + 4)

  const startDate = (query.startDate as string) || defaultStart.toISOString().slice(0, 10)
  const endDate = (query.endDate as string) || defaultEnd.toISOString().slice(0, 10)

  // Fetch from both sources in parallel
  const [polygonRaw, finnhubRaw] = await Promise.all([
    getPolygonIpos(startDate, endDate),
    getFinnhubIpos(startDate, endDate)
  ])

  // Map Polygon results
  const polygonItems: IpoCalendarItem[] = polygonRaw.map((ipo: any) => ({
    ticker: ipo.ticker ?? null,
    companyName: ipo.company_name ?? null,
    listingDate: ipo.listing_date ?? null,
    pricingDate: ipo.pricing_date ?? null,
    announcementDate: ipo.announcement_date ?? null,
    priceRangeLow: ipo.price_range_low ?? null,
    priceRangeHigh: ipo.price_range_high ?? null,
    priceFinal: ipo.final_issue_price ?? ipo.price_final ?? null,
    sharesOutstanding: ipo.shares_outstanding ?? null,
    totalAmountRaised: ipo.total_offer_size ?? ipo.total_amount_raised ?? null,
    ipoStatus: ipo.ipo_status ?? null
  }))

  // Map Finnhub results
  const finnhubItems: IpoCalendarItem[] = finnhubRaw.map((ipo) => {
    const { low, high } = parseFinnhubPrice(ipo.price)
    return {
      ticker: ipo.symbol ?? null,
      companyName: ipo.name ?? null,
      listingDate: ipo.date ?? null,
      pricingDate: null,
      announcementDate: null,
      priceRangeLow: low,
      priceRangeHigh: high,
      priceFinal: null,
      sharesOutstanding: ipo.numberOfShares ?? null,
      totalAmountRaised: ipo.totalSharesValue ?? null,
      ipoStatus: mapFinnhubStatus(ipo.status)
    }
  })

  // Merge and deduplicate: prefer Polygon data when same ticker exists (more detail)
  const seen = new Set<string>()
  const merged: IpoCalendarItem[] = []

  // Add Polygon first (richer data)
  for (const item of polygonItems) {
    const key = (item.ticker ?? item.companyName ?? '').toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }

  // Add Finnhub entries that are not already present
  for (const item of finnhubItems) {
    const tickerKey = (item.ticker ?? '').toLowerCase()
    const nameKey = (item.companyName ?? '').toLowerCase()
    if ((tickerKey && seen.has(tickerKey)) || (nameKey && seen.has(nameKey))) continue
    if (tickerKey) seen.add(tickerKey)
    if (nameKey) seen.add(nameKey)
    merged.push(item)
  }

  // Sort by listing date ascending
  merged.sort((a, b) => {
    if (!a.listingDate) return 1
    if (!b.listingDate) return -1
    return a.listingDate.localeCompare(b.listingDate)
  })

  return {
    data: merged,
    startDate,
    endDate
  }
})
