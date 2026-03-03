import { EventEmitter } from 'node:events'
import type { PipelineProgressEvent } from '~~/shared/types/analysis'

class PipelineEventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(50)
  }

  emitProgress(data: PipelineProgressEvent) {
    this.emit('progress', data)
  }

  onProgress(handler: (data: PipelineProgressEvent) => void): () => void {
    this.on('progress', handler)
    return () => this.off('progress', handler)
  }
}

export const pipelineEventBus = new PipelineEventBus()
