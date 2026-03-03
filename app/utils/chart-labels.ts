/**
 * Formats financial period dates for chart X-axis labels.
 * If all dates are in different years → shows just "2023", "2024", "2025"
 * If multiple dates share the same year → shows "2024 Q3", "2025 Q1", "2025 Q2"
 */
export function formatPeriodLabels(dates: (string | undefined)[]): string[] {
  const parsed = dates.map(d => {
    if (!d) return { year: '?', quarter: 0 }
    const year = d.substring(0, 4)
    const month = parseInt(d.substring(5, 7) || '1', 10)
    const quarter = Math.ceil(month / 3)
    return { year, quarter }
  })

  // Check if any year appears more than once
  const yearCounts = new Map<string, number>()
  for (const { year } of parsed) {
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1)
  }
  const hasDuplicateYears = [...yearCounts.values()].some(c => c > 1)

  if (hasDuplicateYears) {
    return parsed.map(({ year, quarter }) => `${year} Q${quarter}`)
  }
  return parsed.map(({ year }) => year)
}
