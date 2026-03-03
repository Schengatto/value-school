import type { TechnicalResult, DailyPrice } from '~~/shared/types/stock'

function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period
      avgLoss = (avgLoss * (period - 1)) / period
    } else {
      avgGain = (avgGain * (period - 1)) / period
      avgLoss = (avgLoss * (period - 1) - change) / period
    }
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

export function analyzeTechnical(prices: DailyPrice[] = [], rsiValue: number | null = null): TechnicalResult {
  if (!Array.isArray(prices) || prices.length < 50) {
    return {
      signal: 'neutral',
      score: 50,
      sma50: NaN,
      sma200: NaN,
      rsi14: null,
      macd: { value: NaN, signal: NaN, histogram: NaN },
      roc1m: NaN,
      roc12m: NaN,
      volatility: NaN,
      signalExplanation: 'Insufficient price data'
    }
  }

  const sorted = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const closes = sorted.map(p => parseFloat(String(p.close))).filter(v => !isNaN(v))

  const sma = (arr: number[], n: number) => arr.slice(-n).reduce((s, v) => s + v, 0) / n

  const sma50 = closes.length >= 50 ? sma(closes, 50) : NaN
  const sma200 = closes.length >= 200 ? sma(closes, 200) : NaN

  const ema = (arr: number[], n: number): number[] => {
    const k = 2 / (n + 1)
    return arr.reduce<number[]>((acc, val, i) => {
      if (i === 0) return [val]
      acc.push(val * k + acc[i - 1]! * (1 - k))
      return acc
    }, [])
  }

  const ema12 = ema(closes, 12)
  const ema26 = ema(closes, 26)
  const macdLine = ema12.slice(-ema26.length).map((v, i) => v - ema26[i]!)
  const signalLine = ema(macdLine, 9)
  const macdHist = macdLine.at(-1)! - signalLine.at(-1)!

  const roc = (n: number) => closes.length > n ? (closes.at(-1)! - closes.at(-n)!) / closes.at(-n)! : NaN
  const roc1m = roc(22)
  const roc12m = roc(252)

  const dailyReturns = closes.slice(1).map((p, i) => (p - closes[i]!) / closes[i]!)
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
  const volatility = Math.sqrt(dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / dailyReturns.length)

  const rsi14 = rsiValue ?? computeRSI(closes, 14)

  let score = 50
  if (sma50 > sma200) score += 15
  if (macdHist > 0) score += 10
  if (rsi14 !== null && rsi14 < 30) score += 10
  if (rsi14 !== null && rsi14 > 70) score -= 10
  if (roc12m > 0.15) score += 10
  if (volatility > 0.4) score -= 10

  let signal = 'neutral'
  if (score >= 70) signal = 'bullish'
  else if (score <= 40) signal = 'bearish'

  return {
    sma50,
    sma200,
    rsi14,
    macd: {
      value: macdLine.at(-1) ?? NaN,
      signal: signalLine.at(-1) ?? NaN,
      histogram: macdHist
    },
    roc1m,
    roc12m,
    volatility,
    signal,
    score: Math.min(Math.max(score, 0), 100),
    signalExplanation: `RSI ${rsi14?.toFixed?.(1)}, SMA trend ${sma50 > sma200 ? 'bullish' : 'bearish'}, momentum ${(roc12m * 100).toFixed(1)}%.`
  }
}
