import { eq, desc, or, and, gt } from 'drizzle-orm'
import { useDB } from '../../database'
import { analysisRuns } from '../../database/schema'
import { NASDAQ_LARGE_CAPS } from '~~/shared/constants/tickers'
import { getIndustriesPe } from '../connectors/polygon'
import { sendViaTelegram } from '../connectors/telegram'
import { processOneTicker } from './ticker-processor'
import { sleep } from '../../utils/date'
import { pipelineEventBus } from '../../utils/pipeline-events'
import type { RunError, PipelineProgressEvent } from '~~/shared/types/analysis'

function emitProgress(
  type: PipelineProgressEvent['type'],
  runId: number,
  totalTickers: number,
  processedTickers: number,
  successCount: number,
  errorCount: number,
  currentSymbol: string | null,
  errorDetail?: { symbol: string; error: string }
) {
  pipelineEventBus.emitProgress({
    type,
    runId,
    status: type === 'completed' ? 'completed' : 'running',
    totalTickers,
    processedTickers,
    successCount,
    errorCount,
    currentSymbol,
    progressPercent: totalTickers > 0 ? Math.round((processedTickers / totalTickers) * 100) : 0,
    errorDetail
  })
}

const DELAY_BETWEEN_TICKERS_MS = 15_000
const TICKER_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes per ticker

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms / 1000}s processing ${label}`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!))
}

export async function orchestratePipeline(): Promise<void> {
  const db = useDB()
  const tickers = NASDAQ_LARGE_CAPS

  // Check for an existing running OR recently-failed (watchdog-killed) pipeline to resume
  const recentThreshold = new Date(Date.now() - 60 * 60 * 1000) // last hour
  const [existingRun] = await db.select()
    .from(analysisRuns)
    .where(
      or(
        eq(analysisRuns.status, 'running'),
        and(
          eq(analysisRuns.status, 'failed'),
          gt(analysisRuns.updatedAt, recentThreshold)
        )
      )
    )
    .orderBy(desc(analysisRuns.createdAt))
    .limit(1)

  let run = existingRun
  let startIndex = 0

  if (run) {
    console.log(`Resuming pipeline run #${run.id} (status: ${run.status}) from ${run.lastProcessedSymbol}`)
    if (run.lastProcessedSymbol) {
      const idx = tickers.findIndex(t => t.symbol === run!.lastProcessedSymbol)
      if (idx >= 0) startIndex = idx + 1
    }
    // Reset status to running (may have been set to 'failed' by watchdog)
    await db.update(analysisRuns)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(analysisRuns.id, run.id))
  } else {
    // Create a new run
    const [newRun] = await db.insert(analysisRuns).values({
      status: 'running',
      totalTickers: tickers.length,
      processedTickers: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      startedAt: new Date()
    }).returning()
    run = newRun!
    console.log(`Starting new pipeline run #${run.id} with ${tickers.length} tickers`)
  }

  emitProgress('started', run.id, tickers.length, run.processedTickers ?? 0, run.successCount ?? 0, run.errorCount ?? 0, run.lastProcessedSymbol ?? null)

  const industriesPe = await getIndustriesPe()
  const errors: RunError[] = (run.errors as RunError[] || [])

  for (let i = startIndex; i < tickers.length; i++) {
    const { symbol, name } = tickers[i]!
    const counter = i + 1
    console.log(`${counter}/${tickers.length} | Processing ${name} (${symbol})`)

    const result = await withTimeout(
      processOneTicker(symbol, name, industriesPe, run.id),
      TICKER_TIMEOUT_MS,
      symbol
    ).catch((err: Error) => ({ success: false as const, error: err.message }))

    // Update run progress
    const updates: Record<string, unknown> = {
      processedTickers: counter,
      lastProcessedSymbol: symbol,
      updatedAt: new Date()
    }

    if (result.success) {
      updates.successCount = (run.successCount ?? 0) + (i === startIndex ? 1 : 1)
    } else {
      errors.push({ symbol, error: result.error || 'Unknown error' })
      updates.errorCount = errors.length
      updates.errors = errors
    }

    await db.update(analysisRuns)
      .set(updates)
      .where(eq(analysisRuns.id, run.id))

    // Update local run state for accurate counts
    run = { ...run, ...updates } as typeof run

    emitProgress(
      result.success ? 'progress' : 'error',
      run.id,
      tickers.length,
      counter,
      run.successCount ?? 0,
      errors.length,
      symbol,
      result.success ? undefined : { symbol, error: result.error || 'Unknown error' }
    )

    // Wait between tickers to respect rate limits
    if (i < tickers.length - 1) {
      await sleep(DELAY_BETWEEN_TICKERS_MS)
    }
  }

  // Mark pipeline as completed
  await db.update(analysisRuns)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(analysisRuns.id, run.id))

  emitProgress('completed', run.id, tickers.length, tickers.length, run.successCount ?? 0, errors.length, null)

  console.log(`Pipeline run #${run.id} completed. Success: ${run.successCount}, Errors: ${errors.length}`)

  // Send Telegram summary with error details
  await sendPipelineSummary(run.id, tickers.length, run.successCount ?? 0, errors)
}

export async function retryFailedTickers(): Promise<{ retried: number, resolved: number, stillFailing: number }> {
  const db = useDB()

  // Find the latest completed run that has errors
  const [latestRun] = await db.select()
    .from(analysisRuns)
    .where(eq(analysisRuns.status, 'completed'))
    .orderBy(desc(analysisRuns.createdAt))
    .limit(1)

  if (!latestRun) {
    console.log('[retry] No completed run found')
    return { retried: 0, resolved: 0, stillFailing: 0 }
  }

  const errors = (latestRun.errors as RunError[] || [])
  if (errors.length === 0) {
    console.log(`[retry] Run #${latestRun.id} has no errors to retry`)
    return { retried: 0, resolved: 0, stillFailing: 0 }
  }

  const failedSymbols = errors.map(e => e.symbol)
  const tickers = NASDAQ_LARGE_CAPS.filter(t => failedSymbols.includes(t.symbol))

  console.log(`[retry] Retrying ${tickers.length} failed tickers from run #${latestRun.id}`)

  const industriesPe = await getIndustriesPe()
  const remainingErrors: RunError[] = []
  let resolved = 0

  for (let i = 0; i < tickers.length; i++) {
    const { symbol, name } = tickers[i]!
    console.log(`[retry] ${i + 1}/${tickers.length} | Retrying ${name} (${symbol})`)

    const result = await processOneTicker(symbol, name, industriesPe, latestRun.id)

    if (result.success) {
      resolved++
    } else {
      remainingErrors.push({ symbol, error: result.error || 'Unknown error' })
    }

    if (i < tickers.length - 1) {
      await sleep(DELAY_BETWEEN_TICKERS_MS)
    }
  }

  // Update the run record with remaining errors
  await db.update(analysisRuns)
    .set({
      successCount: (latestRun.successCount ?? 0) + resolved,
      errorCount: remainingErrors.length,
      errors: remainingErrors
    })
    .where(eq(analysisRuns.id, latestRun.id))

  console.log(`[retry] Done. Resolved: ${resolved}, Still failing: ${remainingErrors.length}`)
  return { retried: tickers.length, resolved, stillFailing: remainingErrors.length }
}

async function sendPipelineSummary(
  runId: number,
  total: number,
  success: number,
  runErrors: RunError[]
): Promise<void> {
  try {
    const db = useDB()
    const { stocks } = await import('../../database/schema')

    // Get top 5 stocks by composite score
    const topStocks = await db.select({
      symbol: stocks.symbol,
      name: stocks.name,
      compositeScore: stocks.compositeScore,
      overallSignal: stocks.overallSignal
    })
      .from(stocks)
      .orderBy(desc(stocks.compositeScore))
      .limit(5)

    const topList = topStocks
      .map((s, i) => `${i + 1}. *${s.name}* (${s.symbol}) - Score: ${s.compositeScore} [${s.overallSignal}]`)
      .join('\n')

    const lines = [
      `*Value Investing Analysis Complete*`,
      `Run #${runId}`,
      ``,
      `Total: ${total} | Success: ${success} | Errors: ${runErrors.length}`,
      ``,
      `*Top 5 Stocks:*`,
      topList
    ]

    // Append error details (max 15 to avoid message too long)
    if (runErrors.length > 0) {
      lines.push(``)
      lines.push(`*Failed Tickers (${runErrors.length}):*`)
      const shown = runErrors.slice(0, 15)
      for (const e of shown) {
        // Truncate long error messages
        const shortErr = e.error.length > 60 ? e.error.substring(0, 60) + '...' : e.error
        lines.push(`- ${e.symbol}: ${shortErr}`)
      }
      if (runErrors.length > 15) {
        lines.push(`_...and ${runErrors.length - 15} more_`)
      }
    }

    await sendViaTelegram(lines.join('\n'))
  } catch (error: any) {
    console.error('Error sending Telegram summary:', error.message)
  }
}
