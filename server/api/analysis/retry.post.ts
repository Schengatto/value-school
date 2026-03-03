defineRouteMeta({
  openAPI: {
    tags: ['Analysis Pipeline'],
    summary: 'Retry failed tickers',
    description: 'Manually triggers a retry of all tickers that failed in the latest completed pipeline run. Each ticker is reprocessed with the same analysis pipeline and rate-limited to one every 15 seconds.',
    responses: {
      200: {
        description: 'Retry triggered successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Retry of failed tickers triggered' }
              }
            }
          }
        }
      }
    }
  }
})

export default defineEventHandler(async () => {
  await runTask('analysis:retry')
  return { message: 'Retry of failed tickers triggered' }
})
