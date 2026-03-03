import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseDate, dateOfPast, sleep } from '../date'

describe('parseDate', () => {
  it('parses a Date object to YYYY-MM-DD string', () => {
    const date = new Date(2024, 5, 15) // June 15, 2024
    const result = parseDate(date)
    expect(result).toBe('2024-06-15')
  })

  it('parses a date string', () => {
    expect(parseDate('2024-06-15')).toBe('2024-06-15')
  })

  it('parses a Unix timestamp in seconds (< 1e12)', () => {
    // 1718400000 seconds = 2024-06-15 UTC
    const result = parseDate(1718400000)
    expect(result).toMatch(/^2024-06-1[45]$/) // timezone-dependent
  })

  it('parses a Unix timestamp in milliseconds (>= 1e12)', () => {
    const result = parseDate(1718400000000)
    expect(result).toMatch(/^2024-06-1[45]$/) // timezone-dependent
  })

  it('pads month and day with leading zeros', () => {
    const date = new Date(2024, 0, 5) // January 5
    expect(parseDate(date)).toBe('2024-01-05')
  })

  it('throws Error for invalid date string', () => {
    expect(() => parseDate('not-a-date')).toThrow()
  })

  it('throws Error for unsupported input type', () => {
    expect(() => parseDate(true as any)).toThrow('Unsupported input type')
  })
})

describe('dateOfPast', () => {
  it('returns a Date object when isParsed is falsy', () => {
    const result = dateOfPast({ years: 1 })
    expect(result).toBeInstanceOf(Date)
  })

  it('returns a string when isParsed is true', () => {
    const result = dateOfPast({ years: 1, isParsed: true })
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('subtracts years correctly', () => {
    const currentYear = new Date().getFullYear()
    const result = dateOfPast({ years: 2, isParsed: true }) as string
    expect(result).toContain(String(currentYear - 2))
  })

  it('subtracts months correctly', () => {
    const result = dateOfPast({ months: 6 }) as Date
    const expected = new Date()
    expected.setMonth(expected.getMonth() - 6)
    // Allow 1 second difference
    expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000)
  })

  it('handles both years and months simultaneously', () => {
    const result = dateOfPast({ years: 1, months: 3, isParsed: true }) as string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves after the specified delay', async () => {
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await expect(promise).resolves.toBeUndefined()
  })
})
