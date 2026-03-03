import { pipelineEventBus } from '../../utils/pipeline-events'
import type { PipelineProgressEvent } from '~~/shared/types/analysis'

defineRouteMeta({
  openAPI: {
    tags: ['Analysis Pipeline'],
    summary: 'Pipeline progress SSE stream',
    description: 'Server-Sent Events stream for real-time pipeline progress updates.'
  }
})

export default defineEventHandler(async (event) => {
  const eventStream = createEventStream(event)

  const handler = async (data: PipelineProgressEvent) => {
    await eventStream.push(JSON.stringify(data))
  }

  const unsubscribe = pipelineEventBus.onProgress(handler)

  eventStream.onClosed(() => {
    unsubscribe()
  })

  return eventStream.send()
})
