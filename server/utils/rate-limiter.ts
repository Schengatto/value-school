function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class RateLimiter {
  private minInterval: number
  private lastCallTime: number

  constructor(requestsPerSecond = 2) {
    this.minInterval = 1000 / requestsPerSecond
    this.lastCallTime = 0
  }

  async throttle(): Promise<void> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCallTime

    if (timeSinceLastCall < this.minInterval) {
      await delay(this.minInterval - timeSinceLastCall)
    }

    this.lastCallTime = Date.now()
  }
}
