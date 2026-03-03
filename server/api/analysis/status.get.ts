import { desc } from 'drizzle-orm'
import { useDB } from '../../database'
import { analysisRuns } from '../../database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Analysis Pipeline'],
    summary: 'Get pipeline status',
    description: 'Returns the status of the latest analysis pipeline run, including progress percentage, processed tickers count, and error details.'
  }
})

export default defineEventHandler(async () => {
  const db = useDB()

  const [latestRun] = await db.select()
    .from(analysisRuns)
    .orderBy(desc(analysisRuns.createdAt))
    .limit(1)

  if (!latestRun) return null

  return {
    ...latestRun,
    progressPercent: latestRun.totalTickers > 0
      ? Math.round((latestRun.processedTickers / latestRun.totalTickers) * 100)
      : 0
  }
})
