import { desc } from 'drizzle-orm'
import { useDB } from '../../database'
import { stocks } from '../../database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Meta'],
    summary: 'Get last data update timestamp',
    description: 'Returns the ISO timestamp of the most recently analyzed stock.'
  }
})

export default defineEventHandler(async () => {
  const db = useDB()

  const [latest] = await db.select({ analyzedAt: stocks.analyzedAt })
    .from(stocks)
    .orderBy(desc(stocks.analyzedAt))
    .limit(1)

  return {
    lastUpdated: latest?.analyzedAt?.toISOString() ?? null
  }
})
