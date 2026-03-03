export default defineTask({
  meta: {
    name: 'ipo:notify',
    description: 'Fetch upcoming IPOs and send a summary via Telegram'
  },
  async run() {
    const { getIpoCalendar } = await import('../../services/connectors/polygon')
    const { sendViaTelegram } = await import('../../services/connectors/telegram')
    const { parseDate } = await import('../../utils/date')

    const fromDate = parseDate(new Date())
    const toDate = new Date()
    toDate.setMonth(toDate.getMonth() + 3)
    const toDateStr = parseDate(toDate)

    console.log(`[ipo:notify] Fetching IPOs from ${fromDate} to ${toDateStr}`)

    const ipos = await getIpoCalendar(fromDate, toDateStr)

    if (!ipos.length) {
      console.log('[ipo:notify] No upcoming IPOs found')
      return { result: 'No upcoming IPOs' }
    }

    const lines = ipos.map((ipo: any) => {
      const date = ipo.listing_date ?? ipo.listingDate ?? 'N/A'
      const name = ipo.company_name ?? ipo.name ?? 'N/A'
      const ticker = ipo.ticker ?? ''
      const exchange = ipo.primary_exchange ?? ipo.exchange ?? ''
      const status = ipo.ipo_status ?? ipo.ipoStatus ?? ''
      const priceLow = ipo.price_range_low ?? ipo.priceRangeLow
      const priceHigh = ipo.price_range_high ?? ipo.priceRangeHigh
      const priceFinal = ipo.final_issue_price ?? ipo.priceFinal

      let priceStr = ''
      if (priceFinal) {
        priceStr = `$${priceFinal}`
      } else if (priceLow && priceHigh) {
        priceStr = `$${priceLow}-$${priceHigh}`
      }

      const parts = [`*${date}*`, `${name}${ticker ? ` (${ticker})` : ''}`]
      if (exchange) parts.push(`Exchange: ${exchange}`)
      if (priceStr) parts.push(`Price: ${priceStr}`)
      if (status) parts.push(`Status: ${status}`)

      return parts.join(' | ')
    })

    const message = `*IPO NEXT 3 MONTHS (${ipos.length} listings)*:\n\n${lines.join('\n\n')}`

    await sendViaTelegram(message)
    console.log(`[ipo:notify] Sent ${ipos.length} IPOs via Telegram`)

    return { result: `Sent ${ipos.length} IPOs via Telegram` }
  }
})
