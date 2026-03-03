import { sql } from 'drizzle-orm'
import { useDB } from '../../database'
import { stocks } from '../../database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Stocks'],
    summary: 'List distinct sectors',
    description: 'Returns an alphabetically sorted list of distinct sectors from the stocks table.'
  }
})

export default defineEventHandler(async () => {
  const db = useDB()

  const rows = await db
    .selectDistinct({ sector: stocks.sector })
    .from(stocks)
    .where(sql`${stocks.sector} IS NOT NULL AND ${stocks.sector} != ''`)
    .orderBy(stocks.sector)

  return rows.map(r => r.sector!)
})
