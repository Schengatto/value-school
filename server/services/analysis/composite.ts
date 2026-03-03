export function calculateCompositeScore(fundamentalScore: number, technicalScore: number): number {
  return Math.round(0.7 * fundamentalScore + 0.3 * technicalScore)
}

export function determineOverallSignal(compositeScore: number): string {
  if (compositeScore >= 70) return 'positive'
  if (compositeScore <= 40) return 'negative'
  return 'neutral'
}
