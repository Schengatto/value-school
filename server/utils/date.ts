export function parseDate(input: number | Date | string): string {
  let date: Date

  if (typeof input === 'number') {
    date = input < 1e12 ? new Date(input * 1000) : new Date(input)
  } else if (input instanceof Date) {
    date = new Date(input.getTime())
  } else if (typeof input === 'string') {
    const parsed = Date.parse(input)
    if (isNaN(parsed)) throw new Error('Invalid date string')
    date = new Date(parsed)
  } else {
    throw new Error('Unsupported input type')
  }

  if (isNaN(date.getTime())) throw new Error('Invalid date')

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const today = parseDate(new Date())

export function dateOfPast({ years, months, isParsed }: { years?: number, months?: number, isParsed?: boolean }): string | Date {
  const result = new Date()
  if (years !== undefined) {
    result.setFullYear(new Date().getFullYear() - years)
  }
  if (months !== undefined) {
    result.setMonth(new Date().getMonth() - months)
  }
  return isParsed ? parseDate(result) : result
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
