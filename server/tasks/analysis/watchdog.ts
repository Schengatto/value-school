import { eq, desc, and, lt } from 'drizzle-orm'
import type { RunError } from '~~/shared/types/analysis'

const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes without progress = stalled

export default defineTask({
  meta: {
    name: 'analysis:watchdog',
    description: 'Detect stalled pipeline runs, alert via Telegram, and restart'
  },
  async run() {
    const { useDB } = await import('../../database')
    const { analysisRuns } = await import('../../database/schema')
    const { sendViaTelegram } = await import('../../services/connectors/telegram')
    const { pipelineEventBus } = await import('../../utils/pipeline-events')
    const { NASDAQ_LARGE_CAPS } = await import('~~/shared/constants/tickers')

    const db = useDB()

    // Find running pipelines that haven't been updated recently
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS)

    const [stalledRun] = await db.select()
      .from(analysisRuns)
      .where(
        and(
          eq(analysisRuns.status, 'running'),
          lt(analysisRuns.updatedAt, staleThreshold)
        )
      )
      .orderBy(desc(analysisRuns.createdAt))
      .limit(1)

    if (!stalledRun) {
      return { result: 'No stalled pipelines detected' }
    }

    const minutesStuck = Math.round((Date.now() - new Date(stalledRun.updatedAt!).getTime()) / 60_000)
    const percent = stalledRun.totalTickers > 0
      ? Math.round((stalledRun.processedTickers / stalledRun.totalTickers) * 100)
      : 0

    // Identify the STUCK ticker (the one AFTER lastProcessedSymbol)
    const lastSymbol = stalledRun.lastProcessedSymbol
    let stuckTicker = '?'
    if (lastSymbol) {
      const idx = NASDAQ_LARGE_CAPS.findIndex(t => t.symbol === lastSymbol)
      if (idx >= 0 && idx + 1 < NASDAQ_LARGE_CAPS.length) {
        const next = NASDAQ_LARGE_CAPS[idx + 1]!
        stuckTicker = `${next.name} (${next.symbol})`
      }
    } else if (NASDAQ_LARGE_CAPS.length > 0) {
      const first = NASDAQ_LARGE_CAPS[0]!
      stuckTicker = `${first.name} (${first.symbol})`
    }

    console.warn(
      `[watchdog] Pipeline #${stalledRun.id} stuck on ${stuckTicker} `
      + `for ${minutesStuck}min (${stalledRun.processedTickers}/${stalledRun.totalTickers})`
    )

    // 1. Send Telegram alert with diagnostic info
    try {
      const errors = (stalledRun.errors as RunError[] || [])

      const lines = [
        `\u26a0\ufe0f *Pipeline Bloccata*`,
        ``,
        `Run #${stalledRun.id}`,
        `Ticker bloccato: *${stuckTicker}*`,
        `Ultimo completato: ${lastSymbol || 'nessuno'}`,
        `Progresso: ${stalledRun.processedTickers}/${stalledRun.totalTickers} (${percent}%)`,
        `Bloccata da: ${minutesStuck} minuti`,
        ``,
        `Causa probabile: chiamata API in hang (nessuna risposta da Yahoo/Polygon/Finnhub per >${minutesStuck}min)`
      ]

      if (errors.length > 0) {
        lines.push(``)
        lines.push(`*Errori precedenti (${errors.length}):*`)
        const shown = errors.slice(-10)
        for (const e of shown) {
          const shortErr = e.error.length > 60 ? e.error.substring(0, 60) + '...' : e.error
          lines.push(`\u2022 ${e.symbol}: ${shortErr}`)
        }
        if (errors.length > 10) {
          lines.push(`_...e altri ${errors.length - 10}_`)
        }
      } else {
        lines.push(`Nessun errore precedente in questa run`)
      }

      lines.push(``)
      lines.push(`_Azione: ${stuckTicker} skippato, pipeline riprende dal ticker successivo_`)

      await sendViaTelegram(lines.join('\n'))
    } catch (err: any) {
      console.error('[watchdog] Failed to send Telegram alert:', err.message)
    }

    // 2. Emit stalled SSE event
    pipelineEventBus.emitProgress({
      type: 'stalled',
      runId: stalledRun.id,
      status: 'failed',
      totalTickers: stalledRun.totalTickers,
      processedTickers: stalledRun.processedTickers,
      successCount: stalledRun.successCount,
      errorCount: stalledRun.errorCount,
      currentSymbol: stalledRun.lastProcessedSymbol,
      progressPercent: percent
    })

    // 3. Mark stalled run as failed + add stuck ticker to errors
    const stuckSymbol = lastSymbol
      ? NASDAQ_LARGE_CAPS[NASDAQ_LARGE_CAPS.findIndex(t => t.symbol === lastSymbol) + 1]?.symbol
      : NASDAQ_LARGE_CAPS[0]?.symbol
    const updatedErrors = [...(stalledRun.errors as RunError[] || [])]
    if (stuckSymbol) {
      updatedErrors.push({ symbol: stuckSymbol, error: `Stalled: no response for ${minutesStuck}min (killed by watchdog)` })
    }

    await db.update(analysisRuns)
      .set({
        status: 'failed',
        errorCount: updatedErrors.length,
        errors: updatedErrors,
        updatedAt: new Date()
      })
      .where(eq(analysisRuns.id, stalledRun.id))

    // 4. Restart pipeline — it will resume from where this run left off
    console.log(`[watchdog] Restarting pipeline (skipping ${stuckTicker})...`)
    await runTask('analysis:run')

    return { result: `Pipeline #${stalledRun.id} stuck on ${stuckTicker} for ${minutesStuck}min — skipped and resumed` }
  }
})
