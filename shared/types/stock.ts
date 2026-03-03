export type StockCategory = 'value' | 'growth' | 'garp' | 'speculative'

export interface ClassificationData {
  category: StockCategory
  reasons: string[]
}

export interface Ticker {
  name: string
  symbol: string
}

export interface CompanySummary {
  name: string
  sector: string | null
  industry: string | null
  longBusinessSummary: string | null
  marketcap: number | null
  currentPrice: number | null
  targetMeanPrice: number | null
}

export interface EpsEntry {
  year: string
  value: number
}

export interface FundamentalReasons {
  passed: string[]
  failed: string[]
  unavailable: string[]
  error?: string
}

export interface FundamentalResult {
  signal: string
  score: number
  reasons: FundamentalReasons
  dataCompleteness: number
}

export interface MacdData {
  value: number
  signal: number
  histogram: number
}

export interface TechnicalResult {
  sma50: number
  sma200: number
  rsi14: number | null
  macd: MacdData
  roc1m: number
  roc12m: number
  volatility: number
  signal: string
  score: number
  signalExplanation: string
}

export interface HistoricalPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface DailyPrice {
  date: string | Date
  open: number
  high: number
  low: number
  close: number
  volume?: number
  adjClose?: number
}

export interface FairValueEstimate {
  method: string
  value: number | null
}

export interface FairValueData {
  fairValue: number | null
  fairValueLow: number | null
  fairValueHigh: number | null
  marginOfSafety: number | null
  valuationSignal: 'undervalued' | 'fairly_valued' | 'overvalued' | null
  estimates: FairValueEstimate[]
  analystConsensus: {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  } | null
  latestEarningsSurprise: number | null
}

export interface PiotroskiCriterion {
  name: string
  passed: boolean
  description: string
}

export interface PiotroskiDetails {
  score: number
  criteria: PiotroskiCriterion[]
}

export interface StockRecord {
  symbol: string
  name: string
  companySummary: CompanySummary | null
  assetProfile: Record<string, unknown> | null
  yahooQuote: Record<string, unknown> | null
  fmpData: Record<string, unknown> | null
  finnhubData: Record<string, unknown> | null
  currentPrice: number | null
  rsiMonthly: number | null
  fundamentalScore: number | null
  fundamentalSignal: string | null
  fundamentalReasons: FundamentalReasons | null
  pe: number | null
  roe: number | null
  revenue: number | null
  netIncome: number | null
  freeCashFlow: number | null
  totalLiabilities: number | null
  totalEquity: number | null
  currentRatio: number | null
  interestCoverage: number | null
  debtToEbitda: number | null
  fairValue: number | null
  fairValueLow: number | null
  fairValueHigh: number | null
  marginOfSafety: number | null
  valuationSignal: string | null
  fairValueData: FairValueData | null
  stockCategory: StockCategory | null
  classificationData: ClassificationData | null
  piotroskiScore: number | null
  piotroskiDetails: PiotroskiDetails | null
  earningsQuality: number | null
  shareDilution: number | null
  technicalScore: number | null
  technicalSignal: string | null
  technicalData: TechnicalResult | null
  compositeScore: number | null
  overallSignal: string | null
  dataCompleteness: number | null
  epsHistory: EpsEntry[] | null
  sector: string | null
  industry: string | null
  country: string | null
}

export interface InsiderTransaction {
  name: string
  share: number
  change: number
  filingDate: string
  transactionDate: string
  transactionPrice: number
  transactionCode: string
  symbol: string
}

export interface InsiderSentiment {
  symbol: string
  year: number
  month: number
  change: number
  mspr: number
}

export interface EarningsCalendarItem {
  symbol: string
  name: string
  sector: string | null
  industry: string | null
  currentPrice: number | null
  compositeScore: number | null
  overallSignal: string | null
  fundamentalScore: number | null
  technicalScore: number | null
  earningsDate: string
}

export interface IpoCalendarItem {
  ticker: string | null
  companyName: string | null
  listingDate: string | null
  pricingDate: string | null
  announcementDate: string | null
  priceRangeLow: number | null
  priceRangeHigh: number | null
  priceFinal: number | null
  sharesOutstanding: number | null
  totalAmountRaised: number | null
  ipoStatus: string | null
}

export interface DividendCalendarItem {
  ticker: string
  companyName: string | null
  exDividendDate: string
  recordDate: string | null
  payDate: string | null
  cashAmount: number
  frequency: string | null
  dividendType: string | null
  currentPrice: number | null
  compositeScore: number | null
  overallSignal: string | null
}

export interface StockListItem {
  symbol: string
  name: string
  currentPrice: number | null
  fundamentalScore: number | null
  fundamentalSignal: string | null
  technicalScore: number | null
  technicalSignal: string | null
  compositeScore: number | null
  overallSignal: string | null
  dataCompleteness: number | null
  stockCategory: StockCategory | null
  sector: string | null
  country: string | null
  analyzedAt: string | null
}

export interface ScreenerItem extends StockListItem {
  pe: number | null
  roe: number | null
  currentRatio: number | null
  debtToEbitda: number | null
  piotroskiScore: number | null
  marginOfSafety: number | null
  valuationSignal: string | null
  fairValue: number | null
  earningsQuality: number | null
}
