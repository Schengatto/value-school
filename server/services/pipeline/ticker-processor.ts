import { eq } from 'drizzle-orm'
import { useDB } from '../../database'
import { stocks, historicalPrices, dailyPrices } from '../../database/schema'
import { fetchCompanyDataFromPolygon } from '../connectors/polygon'
import { fetchFinnhubData } from '../connectors/finnhub'
import { getCompanySummary, getCompanyCountry, getPricesOfLast10Years, getYahooQuote, getRSI, getYahooFinancials, getYahooFinancialsFromQuoteSummary } from '../connectors/yahoo-finance'
import { analyzeFundamentals, calculatePiotroskiFScore, calculateEarningsQuality, calculateShareDilution } from '../analysis/fundamental'
import { analyzeTechnical } from '../analysis/technical'
import { calculateCompositeScore, determineOverallSignal } from '../analysis/composite'
import { calculateFairValue } from '../analysis/fair-value'
import { classifyStock, buildClassificationInput } from '../analysis/classification'
import { Signal } from '~~/shared/types/analysis'

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

export async function processOneTicker(
  symbol: string,
  name: string,
  industriesPe: Record<string, number>,
  runId: number
): Promise<{ success: boolean, error?: string }> {
  const db = useDB()

  try {
    // 1 - Fetch data from APIs (Yahoo quote first to get current price for ratio calculations)
    const companySummary = await getCompanySummary(symbol)
    const assetProfile = await getCompanyCountry(symbol)
    const yahooQuote = await getYahooQuote(symbol)
    const pricePerShare = yahooQuote?.regularMarketPrice

    // Check if financial data has meaningful content (not just empty arrays)
    const hasUsableData = (data: any): boolean => {
      if (!data) return false
      const incomeReports = data.incomeStatement?.annualReports ?? []
      return incomeReports.some((r: any) => r.totalRevenue != null || r.netIncome != null)
    }

    // Try Polygon first, fall back to Yahoo Finance for financial statements
    let fmpData = await fetchCompanyDataFromPolygon(symbol, pricePerShare)
    if (!hasUsableData(fmpData)) {
      if (fmpData) console.warn(`${symbol}: Polygon returned empty data, trying Yahoo Finance fundamentalsTimeSeries...`)
      else console.warn(`${symbol}: Polygon failed, trying Yahoo Finance fundamentalsTimeSeries...`)
      fmpData = await getYahooFinancials(symbol, pricePerShare)
    }
    if (!hasUsableData(fmpData)) {
      if (fmpData) console.warn(`${symbol}: fundamentalsTimeSeries returned empty data, trying Yahoo quoteSummary fallback...`)
      else console.warn(`${symbol}: fundamentalsTimeSeries failed, trying Yahoo quoteSummary fallback...`)
      fmpData = await getYahooFinancialsFromQuoteSummary(symbol, pricePerShare)
    }

    // Fetch Finnhub enrichment data (parallel with other fetches where possible)
    const finnhubData = await fetchFinnhubData(symbol)

    // Extract earnings date from Yahoo quote
    const earningsDate = (() => {
      const raw = yahooQuote?.earningsTimestampStart
        ?? yahooQuote?.earningsTimestamp
      if (!raw) return null
      const d = raw instanceof Date ? raw
        : (raw as any)?.date instanceof Date ? (raw as any).date
        : new Date(typeof raw === 'number' ? raw * 1000 : raw)
      return isNaN(d.getTime()) ? null : d
    })()
    const historicalPricesData = await getPricesOfLast10Years(symbol)
    const { rsi: rsiMonth } = await getRSI(symbol, '1mo')
    const { rsi: rsiDaily, prices: pricesDaily } = await getRSI(symbol, '1d')

    // 2 - Fundamental analysis
    const industryPe = fmpData?.profile?.[0]?.industry && industriesPe[fmpData.profile[0].industry]
    const stockResult = fmpData
      ? analyzeFundamentals({ ...fmpData, historicalPrices: historicalPricesData, pricePerShare, industryPe }, undefined, finnhubData)
      : { signal: Signal.None, reasons: { passed: [], failed: [], unavailable: ['Error fetching data'] }, score: 0, dataCompleteness: 0 }

    // 3 - Technical analysis
    const technical = analyzeTechnical(pricesDaily, rsiDaily)

    // 4 - Composite score
    const fundamentalScore = stockResult.score ?? 0
    const technicalScore = technical.score ?? 0
    const compositeScore = calculateCompositeScore(fundamentalScore, technicalScore)
    const overallSignal = determineOverallSignal(compositeScore)

    // 5 - Fair value estimation
    // Use Yahoo TTM EPS (reliable, trailing 12 months) instead of Polygon's
    // basic EPS which may be quarterly due to mixed filing types
    const yahooEpsTTM = parseFloat(yahooQuote?.epsTrailingTwelveMonths ?? 'NaN') || null

    const latestIncome = fmpData?.incomeStatement?.annualReports?.[0]
    const latestRevenue = parseFloat(latestIncome?.totalRevenue ?? 'NaN') || null
    const operatingMargin = (() => {
      const opInc = parseFloat(latestIncome?.operatingIncome ?? 'NaN')
      const rev = parseFloat(latestIncome?.totalRevenue ?? 'NaN')
      return !isNaN(opInc) && !isNaN(rev) && rev > 0 ? opInc / rev : null
    })()

    // 5a - Classify stock (Value/Growth/GARP/Speculative) before fair value
    const marketCap = finnhubData?.metric?.marketCapitalization
      ?? (companySummary?.marketcap ? companySummary.marketcap / 1_000_000 : null) // Yahoo returns in absolute, Finnhub in millions
    const classificationInput = buildClassificationInput(finnhubData, yahooEpsTTM, latestRevenue, marketCap)
    const classification = classifyStock(classificationInput)

    // Extract Yahoo Finance analyst consensus price target from financialData module
    const yahooTargetPrice = companySummary?.targetMeanPrice ?? null

    const fairValueResult = calculateFairValue({
      currentPrice: pricePerShare ?? null,
      historicalFCF: fmpData?.historicalFCF ?? [],
      sharesOutstanding: fmpData?.metrics?.sharesOutstanding ?? null,
      eps: yahooEpsTTM,
      bookValuePerShare: fmpData?.metrics?.bookValuePerShare ?? null,
      revenue: latestRevenue,
      operatingMargin,
      finnhubData,
      analystTargetPrice: yahooTargetPrice,
      stockCategory: classification.category
    })

    // 6 - Quality metrics (Piotroski, Earnings Quality, Share Dilution)
    const piotroski = fmpData ? calculatePiotroskiFScore(fmpData) : null
    const earningsQuality = fmpData ? calculateEarningsQuality(fmpData) : null
    const shareDilution = fmpData ? calculateShareDilution(fmpData) : null

    // 7 - Upsert stock to database
    const epsHistory = (fmpData?.earnings?.annualEarnings || []).map((e: any) => ({
      year: e.date,
      value: parseFloat(e.reportedEPS)
    }))

    // Extract values from primary data sources
    let peVal = parseFloat(fmpData?.overview?.peNormalizedAnnual ?? 'NaN') || null
    let roeVal = parseFloat(fmpData?.overview?.roe ?? 'NaN') || null
    let revenueVal = parseFloat(fmpData?.incomeStatement?.annualReports?.[0]?.totalRevenue ?? 'NaN') || null
    let netIncomeVal = parseFloat(fmpData?.incomeStatement?.annualReports?.[0]?.netIncome ?? 'NaN') || null
    let freeCashFlowVal = parseFloat(fmpData?.cashFlowStatement?.annualReports?.[0]?.freeCashFlow ?? 'NaN') || null
    let totalLiabilitiesVal = parseFloat(fmpData?.balanceSheet?.annualReports?.[0]?.totalLiabilities ?? 'NaN') || null
    let totalEquityVal = parseFloat(fmpData?.balanceSheet?.annualReports?.[0]?.totalShareholderEquity ?? 'NaN') || null
    let currentRatioVal = parseFloat(fmpData?.metrics?.currentRatio ?? 'NaN') || null
    let interestCoverageVal = parseFloat(fmpData?.metrics?.interestCoverage ?? 'NaN') || null
    let debtToEbitdaVal = parseFloat(fmpData?.metrics?.debtToEBITDA ?? 'NaN') || null

    // Finnhub hydration: fill remaining null fields from Finnhub metrics
    const fhMetric = finnhubData?.metric
    const sharesOut = yahooQuote?.sharesOutstanding
    if (fhMetric) {
      const fh = (v: any): number | null => (v != null && isFinite(v)) ? v : null

      if (!peVal) peVal = fh(fhMetric.peTTM)
      if (!roeVal && fhMetric.roeTTM != null) roeVal = fhMetric.roeTTM / 100
      if (!currentRatioVal) currentRatioVal = fh(fhMetric.currentRatioAnnual)

      if (sharesOut && isFinite(sharesOut)) {
        if (!revenueVal && fhMetric.revenuePerShareTTM != null)
          revenueVal = fhMetric.revenuePerShareTTM * sharesOut
        if (!freeCashFlowVal && fhMetric.fcfPerShareTTM != null)
          freeCashFlowVal = fhMetric.fcfPerShareTTM * sharesOut
        if (!totalEquityVal && fhMetric.bookValuePerShareAnnual != null)
          totalEquityVal = fhMetric.bookValuePerShareAnnual * sharesOut
      }
      if (!netIncomeVal && revenueVal && fhMetric.netProfitMarginTTM != null)
        netIncomeVal = (fhMetric.netProfitMarginTTM / 100) * revenueVal
    }

    const stockValues = {
      symbol,
      name,
      companySummary: companySummary as any,
      assetProfile: assetProfile as any,
      yahooQuote: yahooQuote as any,
      fmpData: fmpData as any,
      finnhubData: finnhubData as any,
      currentPrice: pricePerShare ?? null,
      rsiMonthly: rsiMonth,
      earningsDate,
      fundamentalScore,
      fundamentalSignal: stockResult.signal,
      fundamentalReasons: stockResult.reasons as any,
      pe: peVal,
      roe: roeVal,
      revenue: revenueVal,
      netIncome: netIncomeVal,
      freeCashFlow: freeCashFlowVal,
      totalLiabilities: totalLiabilitiesVal,
      totalEquity: totalEquityVal,
      currentRatio: currentRatioVal,
      interestCoverage: interestCoverageVal,
      debtToEbitda: debtToEbitdaVal,
      stockCategory: classification.category,
      classificationData: classification as any,
      fairValue: fairValueResult.fairValue,
      fairValueLow: fairValueResult.fairValueLow,
      fairValueHigh: fairValueResult.fairValueHigh,
      marginOfSafety: fairValueResult.marginOfSafety,
      valuationSignal: fairValueResult.valuationSignal,
      fairValueData: fairValueResult as any,
      piotroskiScore: piotroski?.score ?? null,
      piotroskiDetails: piotroski as any,
      earningsQuality,
      shareDilution,
      technicalScore,
      technicalSignal: technical.signal,
      technicalData: technical as any,
      compositeScore,
      overallSignal,
      dataCompleteness: stockResult.dataCompleteness ?? null,
      epsHistory: epsHistory as any,
      sector: companySummary?.sector ?? null,
      industry: companySummary?.industry ?? null,
      country: assetProfile?.country ?? null,
      analysisRunId: runId,
      analyzedAt: new Date(),
      updatedAt: new Date()
    }

    await db.insert(stocks).values(stockValues).onConflictDoUpdate({
      target: stocks.symbol,
      set: stockValues
    })

    // 8 - Replace historical prices
    await db.delete(historicalPrices).where(eq(historicalPrices.symbol, symbol))
    if (historicalPricesData?.length) {
      await db.insert(historicalPrices).values(
        historicalPricesData.map(p => ({
          symbol,
          date: p.date,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close
        }))
      )
    }

    // 9 - Replace daily prices (in chunks to avoid query size limits)
    await db.delete(dailyPrices).where(eq(dailyPrices.symbol, symbol))
    if (pricesDaily?.length) {
      const chunks = chunkArray(pricesDaily, 100)
      for (const chunk of chunks) {
        await db.insert(dailyPrices).values(
          chunk.map(p => ({
            symbol,
            date: new Date(p.date),
            open: p.open,
            high: p.high,
            low: p.low,
            close: p.close,
            volume: p.volume ?? null,
            adjClose: p.adjClose ?? null
          }))
        )
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error(`Error processing ${symbol}:`, error.message)
    return { success: false, error: error.message }
  }
}
