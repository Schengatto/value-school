export default defineTask({
  meta: {
    name: 'analysis:run',
    description: 'Run daily value investing analysis pipeline'
  },
  async run() {
    const { orchestratePipeline } = await import('../../services/pipeline/orchestrator')
    await orchestratePipeline()
    return { result: 'Pipeline completed' }
  }
})
