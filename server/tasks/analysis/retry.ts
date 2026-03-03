export default defineTask({
  meta: {
    name: 'analysis:retry',
    description: 'Retry failed tickers from the latest completed pipeline run'
  },
  async run() {
    const { retryFailedTickers } = await import('../../services/pipeline/orchestrator')
    const result = await retryFailedTickers()
    return { result: `Retried ${result.retried} tickers: ${result.resolved} resolved, ${result.stillFailing} still failing` }
  }
})
