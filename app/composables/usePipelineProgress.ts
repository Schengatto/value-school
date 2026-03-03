import type { PipelineProgressEvent, AnalysisRunStatus } from '~~/shared/types/analysis'

interface PipelineState {
  isRunning: boolean
  runId: number | null
  status: string | null
  totalTickers: number
  processedTickers: number
  successCount: number
  errorCount: number
  currentSymbol: string | null
  progressPercent: number
}

const defaultState = (): PipelineState => ({
  isRunning: false,
  runId: null,
  status: null,
  totalTickers: 0,
  processedTickers: 0,
  successCount: 0,
  errorCount: 0,
  currentSymbol: null,
  progressPercent: 0
})

export function usePipelineProgress() {
  const state = useState<PipelineState>('pipeline-progress', defaultState)
  const eventSource = useState<EventSource | null>('pipeline-es', () => null)
  const isConnected = useState('pipeline-connected', () => false)

  function applyEvent(data: PipelineProgressEvent) {
    state.value = {
      isRunning: data.type !== 'completed',
      runId: data.runId,
      status: data.status,
      totalTickers: data.totalTickers,
      processedTickers: data.processedTickers,
      successCount: data.successCount,
      errorCount: data.errorCount,
      currentSymbol: data.currentSymbol,
      progressPercent: data.progressPercent
    }
  }

  function connect() {
    if (import.meta.server) return
    if (eventSource.value) return

    const es = new EventSource('/api/analysis/stream')
    eventSource.value = es

    es.onopen = () => {
      isConnected.value = true
    }

    es.onmessage = (event) => {
      try {
        const data: PipelineProgressEvent = JSON.parse(event.data)
        applyEvent(data)

        // Auto-disconnect when pipeline completes
        if (data.type === 'completed') {
          disconnect()
        }
      } catch {
        // Ignore malformed messages
      }
    }

    es.onerror = () => {
      isConnected.value = false
      disconnect()
      // Reconnect after 5 seconds if pipeline was running
      setTimeout(() => {
        if (state.value.isRunning) {
          connect()
        }
      }, 5000)
    }
  }

  function disconnect() {
    eventSource.value?.close()
    eventSource.value = null
    isConnected.value = false
  }

  async function init() {
    if (import.meta.server) return

    try {
      const status = await $fetch<AnalysisRunStatus | null>('/api/analysis/status')
      if (status && status.status === 'running') {
        state.value = {
          isRunning: true,
          runId: status.id,
          status: status.status,
          totalTickers: status.totalTickers,
          processedTickers: status.processedTickers,
          successCount: status.successCount,
          errorCount: status.errorCount,
          currentSymbol: status.lastProcessedSymbol,
          progressPercent: status.progressPercent
        }
        connect()
      }
    } catch {
      // Status endpoint failed; pipeline likely not running
    }
  }

  return {
    state: readonly(state),
    isConnected: readonly(isConnected),
    init,
    connect,
    disconnect
  }
}
