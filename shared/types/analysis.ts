export const Signal = {
  Positive: 'positive',
  Negative: 'negative',
  None: 'neutral'
} as const

export type SignalValue = typeof Signal[keyof typeof Signal]

export interface AnalysisRunStatus {
  id: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  totalTickers: number
  processedTickers: number
  successCount: number
  errorCount: number
  lastProcessedSymbol: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  progressPercent: number
}

export interface RunError {
  symbol: string
  error: string
}

export interface PipelineProgressEvent {
  type: 'started' | 'progress' | 'completed' | 'error' | 'stalled'
  runId: number
  status: string
  totalTickers: number
  processedTickers: number
  successCount: number
  errorCount: number
  currentSymbol: string | null
  progressPercent: number
  errorDetail?: { symbol: string; error: string }
}
