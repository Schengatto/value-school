import { pgTable, varchar, integer, real, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

export const stocks = pgTable('stocks', {
  symbol: varchar('symbol', { length: 10 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),

  // Company profile (JSONB, display-only)
  companySummary: jsonb('company_summary'),
  assetProfile: jsonb('asset_profile'),
  yahooQuote: jsonb('yahoo_quote'),

  // Current pricing
  currentPrice: real('current_price'),
  rsiMonthly: real('rsi_monthly'),

  // Earnings
  earningsDate: timestamp('earnings_date', { withTimezone: true }),

  // Fundamental analysis
  fundamentalScore: integer('fundamental_score'),
  fundamentalSignal: varchar('fundamental_signal', { length: 20 }),
  fundamentalReasons: jsonb('fundamental_reasons'),

  // Queryable fundamental metrics
  pe: real('pe'),
  roe: real('roe'),
  revenue: real('revenue'),
  netIncome: real('net_income'),
  freeCashFlow: real('free_cash_flow'),
  totalLiabilities: real('total_liabilities'),
  totalEquity: real('total_equity'),
  currentRatio: real('current_ratio'),
  interestCoverage: real('interest_coverage'),
  debtToEbitda: real('debt_to_ebitda'),

  // Technical analysis
  technicalScore: integer('technical_score'),
  technicalSignal: varchar('technical_signal', { length: 20 }),
  technicalData: jsonb('technical_data'),

  // Composite
  compositeScore: integer('composite_score'),
  overallSignal: varchar('overall_signal', { length: 20 }),

  // Data quality
  dataCompleteness: integer('data_completeness'),

  // Fair value estimation
  fairValue: real('fair_value'),
  fairValueLow: real('fair_value_low'),
  fairValueHigh: real('fair_value_high'),
  marginOfSafety: real('margin_of_safety'),
  valuationSignal: varchar('valuation_signal', { length: 20 }),
  fairValueData: jsonb('fair_value_data'),

  // Stock classification
  stockCategory: varchar('stock_category', { length: 20 }),
  classificationData: jsonb('classification_data'),

  // Quality metrics
  piotroskiScore: integer('piotroski_score'),
  piotroskiDetails: jsonb('piotroski_details'),
  earningsQuality: real('earnings_quality'),
  shareDilution: real('share_dilution'),

  // Finnhub enrichment data
  finnhubData: jsonb('finnhub_data'),

  // Raw connector data (JSONB, detail page only)
  fmpData: jsonb('fmp_data'),

  // EPS history
  epsHistory: jsonb('eps_history'),

  // Metadata
  sector: varchar('sector', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
  country: varchar('country', { length: 100 }),
  analysisRunId: integer('analysis_run_id'),
  analyzedAt: timestamp('analyzed_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_stocks_composite_score').on(table.compositeScore),
  index('idx_stocks_fundamental_score').on(table.fundamentalScore),
  index('idx_stocks_technical_score').on(table.technicalScore),
  index('idx_stocks_sector').on(table.sector),
  index('idx_stocks_country').on(table.country),
  index('idx_stocks_overall_signal').on(table.overallSignal),
  index('idx_stocks_earnings_date').on(table.earningsDate)
])
