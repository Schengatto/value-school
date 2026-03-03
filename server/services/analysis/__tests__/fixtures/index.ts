import type { ClassificationInput } from '../../classification'
import type { DailyPrice } from '~~/shared/types/stock'


export function makeClassificationInput(overrides?: Partial<ClassificationInput>): ClassificationInput {
  return {
    peTTM: null,
    forwardPE: null,
    pbAnnual: null,
    pfcfTTM: null,
    epsGrowth5Y: null,
    revenueGrowth5Y: null,
    eps: null,
    fcfPerShareTTM: null,
    roeTTM: null,
    marketCap: null,
    revenue: null,
    ...overrides
  }
}

export function makeFinnhubMetric(overrides?: Record<string, any>) {
  return {
    epsGrowth5Y: null,
    epsGrowthTTMYoy: null,
    epsGrowth3Y: null,
    revenueGrowth5Y: null,
    revenueGrowthTTMYoy: null,
    peExclExtraTTM: null,
    peInclExtraTTM: null,
    peTTM: null,
    forwardPE: null,
    pbAnnual: null,
    psAnnual: null,
    pfcfTTM: null,
    evToEbitda: null,
    roeTTM: null,
    roaTTM: null,
    grossMarginTTM: null,
    operatingMarginTTM: null,
    netProfitMarginTTM: null,
    bookValuePerShareAnnual: null,
    fcfPerShareTTM: null,
    revenuePerShareTTM: null,
    beta: null,
    currentRatioAnnual: null,
    debtEquityAnnual: null,
    dividendYieldIndicatedAnnual: null,
    dividendPerShareAnnual: null,
    payoutRatioAnnual: null,
    marketCapitalization: null,
    '52WeekHigh': null,
    '52WeekLow': null,
    ...overrides
  }
}

export function makeFinnhubData(overrides?: {
  metric?: Record<string, any> | null
  recommendations?: any[] | null
  earnings?: any[] | null
}) {
  return {
    metric: overrides?.metric !== undefined ? overrides.metric : makeFinnhubMetric(),
    recommendations: overrides?.recommendations ?? null,
    earnings: overrides?.earnings ?? null
  }
}

export function makePriceHistory(
  length: number,
  options?: {
    trend?: 'up' | 'down' | 'flat'
    basePrice?: number
    volatility?: number
    startDate?: string
  }
): DailyPrice[] {
  const { trend = 'flat', basePrice = 100, volatility = 0.01, startDate = '2023-01-01' } = options ?? {}

  const prices: DailyPrice[] = []
  let price = basePrice
  const start = new Date(startDate)

  for (let i = 0; i < length; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)

    // Apply trend
    let trendFactor = 0
    if (trend === 'up') trendFactor = 0.001
    else if (trend === 'down') trendFactor = -0.001

    // Deterministic "random" based on index (no true randomness for reproducibility)
    const noise = Math.sin(i * 0.5) * volatility
    price = price * (1 + trendFactor + noise)

    const dayVolatility = price * 0.02
    prices.push({
      date: date.toISOString().split('T')[0]!,
      open: price - dayVolatility * 0.3,
      high: price + dayVolatility,
      low: price - dayVolatility,
      close: price,
      volume: 1000000 + i * 10000
    })
  }

  return prices
}

export function makeFundamentalData(overrides?: Record<string, any>) {
  return {
    overview: { sector: 'Technology', industry: 'Software' },
    earnings: {
      annualEarnings: [
        { fiscalDateEnding: '2024-12-31', reportedEPS: '6.50' },
        { fiscalDateEnding: '2023-12-31', reportedEPS: '5.80' },
        { fiscalDateEnding: '2022-12-31', reportedEPS: '5.10' },
        { fiscalDateEnding: '2021-12-31', reportedEPS: '4.50' }
      ]
    },
    balanceSheet: {
      annualReports: [
        {
          totalAssets: '350000000000',
          totalLiabilities: '250000000000',
          totalShareholderEquity: '100000000000',
          currentAssets: '150000000000',
          currentLiabilities: '100000000000'
        },
        {
          totalAssets: '320000000000',
          totalLiabilities: '240000000000',
          totalShareholderEquity: '80000000000',
          currentAssets: '130000000000',
          currentLiabilities: '95000000000'
        }
      ]
    },
    incomeStatement: {
      annualReports: [
        {
          totalRevenue: '380000000000',
          netIncome: '95000000000',
          grossProfit: '170000000000',
          operatingIncome: '110000000000',
          eps: '6.50'
        },
        {
          totalRevenue: '350000000000',
          netIncome: '85000000000',
          grossProfit: '155000000000',
          operatingIncome: '100000000000',
          eps: '5.80'
        }
      ]
    },
    cashFlowStatement: {
      annualReports: [
        {
          operatingCashFlow: '105000000000',
          freeCashFlow: '80000000000',
          capitalExpenditure: '-25000000000'
        },
        {
          operatingCashFlow: '95000000000',
          freeCashFlow: '70000000000',
          capitalExpenditure: '-25000000000'
        }
      ]
    },
    metrics: {
      roic: '0.25',
      grossProfitMargin: '0.45',
      pfcfRatio: '12',
      pbRatio: '1.8',
      dividendPayoutRatio: '15',
      currentRatio: '1.5',
      interestCoverage: '10',
      debtToEBITDA: '1.5',
      returnOnTangibleAssets: '0.08',
      intangiblesToTotalAssets: '0.10',
      grahamNumber: '200',
      sharesOutstanding: 15000000000,
      marketCap: 2800000000000
    },
    pricePerShare: 180,
    historicalFCF: [80000000000, 70000000000, 65000000000],
    historicalPrices: [
      { date: '2022-01-01', close: '130' },
      { date: '2023-01-01', close: '150' },
      { date: '2024-01-01', close: '180' }
    ],
    ...overrides
  }
}

export const PIOTROSKI_PERFECT = {
  incomeStatement: {
    annualReports: [
      { netIncome: '1000', totalRevenue: '5000', grossProfit: '3000', eps: '10' },
      { netIncome: '800', totalRevenue: '4500', grossProfit: '2500', eps: '8' }
    ]
  },
  balanceSheet: {
    annualReports: [
      { totalAssets: '10000', totalLiabilities: '3000', currentAssets: '5000', currentLiabilities: '2000' },
      { totalAssets: '10000', totalLiabilities: '3500', currentAssets: '4500', currentLiabilities: '2500' }
    ]
  },
  cashFlowStatement: {
    annualReports: [
      { operatingCashFlow: '1200' },
      { operatingCashFlow: '900' }
    ]
  }
}

export const PIOTROSKI_FAILING = {
  incomeStatement: {
    annualReports: [
      { netIncome: '-500', totalRevenue: '3000', grossProfit: '800', eps: '-5' },
      { netIncome: '200', totalRevenue: '3500', grossProfit: '1200', eps: '2' }
    ]
  },
  balanceSheet: {
    annualReports: [
      { totalAssets: '10000', totalLiabilities: '7000', currentAssets: '2000', currentLiabilities: '3000' },
      { totalAssets: '9000', totalLiabilities: '5000', currentAssets: '2500', currentLiabilities: '2000' }
    ]
  },
  cashFlowStatement: {
    annualReports: [
      { operatingCashFlow: '-300' },
      { operatingCashFlow: '100' }
    ]
  }
}
