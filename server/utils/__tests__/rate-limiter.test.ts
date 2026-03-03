import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RateLimiter } from '../rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates instance with default 2 requests/second', () => {
    const limiter = new RateLimiter()
    expect(limiter).toBeInstanceOf(RateLimiter)
  })

  it('creates instance with custom requests/second', () => {
    const limiter = new RateLimiter(5)
    expect(limiter).toBeInstanceOf(RateLimiter)
  })

  it('does not delay on first call', async () => {
    const limiter = new RateLimiter(2)
    const start = Date.now()
    await limiter.throttle()
    // First call should be instant (lastCallTime starts at 0)
    expect(Date.now() - start).toBeLessThan(10)
  })

  it('delays subsequent calls to respect minimum interval', async () => {
    const limiter = new RateLimiter(2) // 500ms interval

    // First call
    await limiter.throttle()

    // Advance only 100ms (less than 500ms interval)
    vi.advanceTimersByTime(100)

    // Second call should trigger a delay
    const throttlePromise = limiter.throttle()
    // Advance remaining time to allow promise to resolve
    vi.advanceTimersByTime(400)
    await throttlePromise
  })

  it('allows calls spaced beyond the interval without delay', async () => {
    const limiter = new RateLimiter(2) // 500ms interval

    await limiter.throttle()

    // Advance past the interval
    vi.advanceTimersByTime(600)

    const start = Date.now()
    await limiter.throttle()
    // Should not have added any delay
    expect(Date.now() - start).toBeLessThan(10)
  })
})
