defineRouteMeta({
  openAPI: {
    tags: ['Analysis Pipeline'],
    summary: 'Trigger analysis pipeline',
    description: 'Manually triggers the full analysis pipeline that processes all NASDAQ large-cap stocks. The pipeline fetches financial data from Polygon.io and Yahoo Finance, runs fundamental and technical analysis, and updates the database.',
    responses: {
      200: {
        description: 'Pipeline triggered successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Analysis pipeline triggered' }
              }
            }
          }
        }
      }
    }
  }
})

export default defineEventHandler(async () => {
  // Trigger the analysis pipeline manually
  await runTask('analysis:run')
  return { message: 'Analysis pipeline triggered' }
})
