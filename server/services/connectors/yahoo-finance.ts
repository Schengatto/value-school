import YahooFinance from 'yahoo-finance2'
import { parseDate } from '../../utils/date'
import { RateLimiter } from '../../utils/rate-limiter'
import type { CompanySummary, HistoricalPrice, DailyPrice } from '~~/shared/types/stock'
import { getYahooSymbol } from '~~/shared/constants/symbol-maps'

export { getYahooSymbol }

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })
const yahooLimiter = new RateLimiter(2)

export async function getCompanySummary(symbol: string): Promise<CompanySummary | null> {
  const _symbol = getYahooSymbol(symbol)
  try {
    await yahooLimiter.throttle()

    const data = await yahooFinance.quoteSummary(_symbol, {
      modules: ['price', 'assetProfile', 'financialData']
    })

    const profile = data?.assetProfile
    const price = data?.price
    const financial = data?.financialData

    return {
      name: price?.longName ?? price?.shortName ?? '',
      sector: profile?.sector ?? null,
      industry: profile?.industry ?? null,
      longBusinessSummary: profile?.longBusinessSummary ?? null,
      marketcap: price?.marketCap ?? null,
      currentPrice: price?.regularMarketPreviousClose ?? null,
      targetMeanPrice: financial?.targetMeanPrice ?? null
    }
  } catch (error: any) {
    console.error(`Error retrieving company description for ${_symbol}:`, error.message)
    return { name: '', sector: null, industry: null, longBusinessSummary: null, marketcap: null, currentPrice: null, targetMeanPrice: null }
  }
}

export async function getCompanyCountry(symbol: string): Promise<any | null> {
  const _symbol = getYahooSymbol(symbol)
  try {
    const data = await yahooFinance.quoteSummary(_symbol, {
      modules: ['assetProfile']
    })

    return data?.assetProfile ?? null
  } catch (error: any) {
    console.error(`Error retrieving asset profile for ${_symbol}:`, error.message)
    return null
  }
}

async function getMonthlyData(symbol: string, years = 10): Promise<any[]> {
  const _symbol = getYahooSymbol(symbol)
  const to = new Date()
  const from = new Date()
  from.setFullYear(to.getFullYear() - years)

  const result = await yahooFinance.historical(_symbol, {
    period1: parseDate(from),
    period2: parseDate(to),
    interval: '1mo'
  })

  return result.map((row: any) => ({
    date: parseDate(row.date),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close
  }))
}

function aggregateAnnual(data: any[]): HistoricalPrice[] {
  const yearlyData: Record<string, HistoricalPrice> = {}

  data.forEach((d: any) => {
    const year = new Date(d.date).getFullYear().toString()

    if (!yearlyData[year]) {
      yearlyData[year] = {
        date: `${year}-12-31`,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      }
    } else {
      yearlyData[year].high = Math.max(yearlyData[year].high, d.high)
      yearlyData[year].low = Math.min(yearlyData[year].low, d.low)
      yearlyData[year].close = d.close
    }
  })

  return Object.values(yearlyData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export async function getPricesOfLast10Years(symbol: string): Promise<HistoricalPrice[]> {
  const monthlyData = await getMonthlyData(symbol, 10)
  return aggregateAnnual(monthlyData)
}

export async function getYahooQuote(symbol: string): Promise<any> {
  const _symbol = getYahooSymbol(symbol)
  return yahooFinance.quote(_symbol)
}

/**
 * Fallback: fetch financial statements from Yahoo Finance when Polygon fails.
 * Uses fundamentalsTimeSeries API (the replacement for deprecated quoteSummary financial modules).
 * Transforms Yahoo data into the same structure as fetchCompanyDataFromPolygon output.
 */
export async function getYahooFinancials(symbol: string, pricePerShare?: number): Promise<any | null> {
  const _symbol = getYahooSymbol(symbol)
  try {
    await yahooLimiter.throttle()

    // Use fundamentalsTimeSeries (replaces deprecated quoteSummary financial modules since Nov 2024)
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    const allData = await yahooFinance.fundamentalsTimeSeries(_symbol, {
      period1: fiveYearsAgo,
      type: 'annual',
      module: 'all'
    })

    if (!allData || allData.length === 0) {
      console.warn(`Yahoo Finance: no fundamentalsTimeSeries data for ${_symbol}`)
      return null
    }

    // Helper to safely extract numeric values
    const n = (val: any): number => {
      if (val == null) return NaN
      if (typeof val === 'number') return isFinite(val) ? val : NaN
      if (val?.raw != null) return isFinite(val.raw) ? val.raw : NaN
      return NaN
    }

    // Sort by date descending (most recent first)
    const periods = [...allData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Check we have at least some income data
    const hasIncomeData = periods.some((p: any) => p.totalRevenue != null || p.netIncome != null)
    if (!hasIncomeData) {
      console.warn(`Yahoo Finance: fundamentalsTimeSeries returned no income data for ${_symbol}`)
      return null
    }

    // Extract and transform per-period data
    const incomeData = periods.map((p: any) => {
      const date = p.date ? new Date(p.date).toISOString().split('T')[0] : null
      const netIncome = n(p.netIncome)
      const revenue = n(p.totalRevenue)
      const operatingIncome = n(p.operatingIncome)
      const grossProfit = n(p.grossProfit)
      const interestExpense = n(p.interestExpense)
      const eps = n(p.basicEPS)
      const ebitda = n(p.EBITDA)

      return {
        date,
        netIncome: isNaN(netIncome) ? null : netIncome,
        revenue: isNaN(revenue) ? null : revenue,
        totalRevenue: isNaN(revenue) ? null : revenue,
        operatingIncome: isNaN(operatingIncome) ? null : operatingIncome,
        grossProfit: isNaN(grossProfit) ? null : grossProfit,
        interestExpense: isNaN(interestExpense) ? null : interestExpense,
        eps: isNaN(eps) ? null : eps,
        ebitda: isNaN(ebitda) ? null : ebitda
      }
    })

    const balanceData = periods.map((p: any) => {
      const date = p.date ? new Date(p.date).toISOString().split('T')[0] : null
      return {
        date,
        totalAssets: isNaN(n(p.totalAssets)) ? null : n(p.totalAssets),
        totalLiabilities: isNaN(n(p.totalLiabilitiesNetMinorityInterest)) ? null : n(p.totalLiabilitiesNetMinorityInterest),
        totalShareholderEquity: isNaN(n(p.stockholdersEquity)) ? null : n(p.stockholdersEquity),
        currentAssets: isNaN(n(p.currentAssets)) ? null : n(p.currentAssets),
        currentLiabilities: isNaN(n(p.currentLiabilities)) ? null : n(p.currentLiabilities),
        sharesOutstanding: isNaN(n(p.ordinarySharesNumber)) ? null : n(p.ordinarySharesNumber)
      }
    })

    const cashFlowData = periods.map((p: any) => {
      const date = p.date ? new Date(p.date).toISOString().split('T')[0] : null
      const opCashFlow = n(p.operatingCashFlow)
      const capex = n(p.capitalExpenditure)
      const fcf = n(p.freeCashFlow)
      // Use Yahoo's FCF if available, otherwise compute from operatingCashFlow - capex
      const freeCashFlow = !isNaN(fcf) ? fcf : (!isNaN(opCashFlow) ? opCashFlow - (!isNaN(capex) ? Math.abs(capex) : 0) : NaN)
      return {
        date,
        operatingCashFlow: isNaN(opCashFlow) ? null : opCashFlow,
        capitalExpenditure: isNaN(capex) ? null : capex,
        freeCashFlow: isNaN(freeCashFlow) ? null : freeCashFlow
      }
    })

    // Compute derived metrics from most recent period
    const latest = periods[0] as any
    const sharesOutstanding = n(latest?.ordinarySharesNumber) || n(latest?.basicAverageShares)
    const price = pricePerShare ?? NaN
    const latestIncome = incomeData[0] ?? {}
    const latestBalance = balanceData[0] ?? {}
    const latestCashFlow = cashFlowData[0] ?? {}

    const latestEPS = n(latestIncome.eps)
    const latestEquity = n(latestBalance.totalShareholderEquity)
    const latestFCF = n(latestCashFlow.freeCashFlow)
    const latestRevenue = n(latestIncome.revenue)
    const latestGrossProfit = n(latestIncome.grossProfit)
    const latestNetIncome = n(latestIncome.netIncome)
    const latestOpIncome = n(latestIncome.operatingIncome)
    const latestEBITDA = n(latestIncome.ebitda)
    const latestAssets = n(latestBalance.totalAssets)
    const latestLiab = n(latestBalance.totalLiabilities)
    const latestCurrentAssets = n(latestBalance.currentAssets)
    const latestCurrentLiab = n(latestBalance.currentLiabilities)

    // Computed ratios
    const peRatio = !isNaN(price) && !isNaN(latestEPS) && latestEPS > 0 ? price / latestEPS : NaN
    const bookValuePerShare = !isNaN(latestEquity) && !isNaN(sharesOutstanding) && sharesOutstanding > 0 ? latestEquity / sharesOutstanding : NaN
    const pbRatio = !isNaN(price) && !isNaN(bookValuePerShare) && bookValuePerShare > 0 ? price / bookValuePerShare : NaN
    const marketCap = !isNaN(price) && !isNaN(sharesOutstanding) ? price * sharesOutstanding : NaN
    const pfcfRatio = !isNaN(marketCap) && !isNaN(latestFCF) && latestFCF > 0 ? marketCap / latestFCF : NaN
    const roe = !isNaN(latestNetIncome) && !isNaN(latestEquity) && latestEquity !== 0 ? latestNetIncome / latestEquity : NaN
    const grossMargin = !isNaN(latestGrossProfit) && !isNaN(latestRevenue) && latestRevenue > 0 ? latestGrossProfit / latestRevenue : NaN
    const currentRatio = !isNaN(latestCurrentAssets) && !isNaN(latestCurrentLiab) && latestCurrentLiab > 0 ? latestCurrentAssets / latestCurrentLiab : NaN
    const roic = (() => {
      const investedCapital = !isNaN(latestAssets) && !isNaN(latestCurrentLiab) ? latestAssets - latestCurrentLiab : NaN
      const nopat = !isNaN(latestOpIncome) ? latestOpIncome * (1 - 0.21) : NaN
      return !isNaN(nopat) && !isNaN(investedCapital) && investedCapital > 0 ? nopat / investedCapital : NaN
    })()
    const interestExpenseVal = n(latestIncome.interestExpense)
    const interestCoverage = !isNaN(latestOpIncome) && !isNaN(interestExpenseVal) && interestExpenseVal !== 0 ? Math.abs(latestOpIncome / interestExpenseVal) : NaN
    const debtToEBITDA = !isNaN(latestLiab) && !isNaN(latestEBITDA) && latestEBITDA > 0 ? latestLiab / latestEBITDA : NaN
    const grahamNumber = !isNaN(latestEPS) && latestEPS > 0 && !isNaN(bookValuePerShare) && bookValuePerShare > 0 ? Math.sqrt(22.5 * latestEPS * bookValuePerShare) : NaN
    const fcfPerShare = !isNaN(latestFCF) && !isNaN(sharesOutstanding) && sharesOutstanding > 0 ? latestFCF / sharesOutstanding : NaN

    const annualEarnings = incomeData
      .map((r: any) => ({ date: r.date, reportedEPS: r.eps ?? NaN }))
      .filter((e: any) => !isNaN(e.reportedEPS))

    const historicalFCF = cashFlowData
      .map((r: any) => n(r.freeCashFlow))
      .filter((v: number) => !isNaN(v) && v > 0)

    console.log(`Yahoo Finance: fundamentalsTimeSeries for ${_symbol} — ${periods.length} annual periods, ${annualEarnings.length} EPS records`)

    return {
      profile: [{
        symbol: _symbol,
        companyName: '',
        currency: 'USD',
        exchange: '',
        industry: '',
        sector: '',
        description: '',
        ceo: '',
        website: '',
        image: '',
        ipoDate: '',
        marketCap: isNaN(marketCap) ? null : marketCap
      }],
      overview: {
        peNormalizedAnnual: isNaN(peRatio) ? NaN : peRatio,
        roe: isNaN(roe) ? NaN : roe
      },
      earnings: { annualEarnings },
      incomeStatement: {
        annualReports: incomeData.map((r: any) => ({
          date: r.date,
          netIncome: n(r.netIncome),
          totalRevenue: n(r.revenue),
          operatingIncome: n(r.operatingIncome),
          grossProfit: n(r.grossProfit),
          eps: n(r.eps)
        }))
      },
      balanceSheet: {
        annualReports: balanceData.map((r: any) => ({
          date: r.date,
          totalAssets: n(r.totalAssets),
          totalLiabilities: n(r.totalLiabilities),
          totalShareholderEquity: n(r.totalShareholderEquity),
          currentAssets: n(r.currentAssets),
          currentLiabilities: n(r.currentLiabilities)
        }))
      },
      cashFlowStatement: {
        annualReports: cashFlowData.map((r: any) => ({
          date: r.date,
          freeCashFlow: n(r.freeCashFlow),
          operatingCashFlow: n(r.operatingCashFlow),
          capitalExpenditure: n(r.capitalExpenditure)
        }))
      },
      metrics: {
        currentRatio: isNaN(currentRatio) ? NaN : currentRatio,
        interestCoverage: isNaN(interestCoverage) ? NaN : interestCoverage,
        debtToEBITDA: isNaN(debtToEBITDA) ? NaN : debtToEBITDA,
        marketCap: isNaN(marketCap) ? NaN : marketCap,
        sharesOutstanding: isNaN(sharesOutstanding) ? NaN : sharesOutstanding,
        grossProfitMargin: isNaN(grossMargin) ? NaN : grossMargin,
        roic: isNaN(roic) ? NaN : roic,
        dividendPayoutRatio: NaN,
        returnOnTangibleAssets: NaN,
        intangiblesToTotalAssets: NaN,
        grahamNumber: isNaN(grahamNumber) ? NaN : grahamNumber,
        pfcfRatio: isNaN(pfcfRatio) ? NaN : pfcfRatio,
        pbRatio: isNaN(pbRatio) ? NaN : pbRatio,
        roe: isNaN(roe) ? NaN : roe,
        bookValuePerShare: isNaN(bookValuePerShare) ? NaN : bookValuePerShare,
        freeCashFlowPerShare: isNaN(fcfPerShare) ? NaN : fcfPerShare
      },
      latestFCF: isNaN(latestFCF) ? NaN : latestFCF,
      latestRatios: {},
      latestCashFlow: {},
      historicalFCF,
      historicalMarketCap: [],
      _source: 'yahoo-finance'  // Tag to know this came from Yahoo fallback
    }
  } catch (error: any) {
    console.error(`Yahoo Finance fallback error for ${_symbol}:`, error.message)
    return null
  }
}

/**
 * Third-tier fallback: fetch financial data from Yahoo quoteSummary modules.
 * Uses incomeStatementHistory + financialData + defaultKeyStatistics.
 * These modules often work for international ADRs where fundamentalsTimeSeries doesn't.
 */
export async function getYahooFinancialsFromQuoteSummary(symbol: string, pricePerShare?: number): Promise<any | null> {
  const _symbol = getYahooSymbol(symbol)
  try {
    await yahooLimiter.throttle()

    const data = await yahooFinance.quoteSummary(_symbol, {
      modules: ['incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory', 'defaultKeyStatistics', 'financialData']
    })

    const incHistory = data?.incomeStatementHistory?.incomeStatementHistory ?? []
    const fd = data?.financialData
    const ks = data?.defaultKeyStatistics

    // Need at least income data or financial data to be useful
    const hasIncomeData = incHistory.some((r: any) => r.totalRevenue != null || r.netIncome != null)
    if (!hasIncomeData && !fd?.totalRevenue) {
      console.warn(`Yahoo quoteSummary: no financial data for ${_symbol}`)
      return null
    }

    const n = (val: any): number => {
      if (val == null) return NaN
      if (typeof val === 'number') return isFinite(val) ? val : NaN
      return NaN
    }

    const price = pricePerShare ?? NaN
    const sharesOutstanding = n(ks?.sharesOutstanding)

    const incomeData = incHistory.map((r: any) => {
      const date = r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : null
      return {
        date,
        netIncome: isNaN(n(r.netIncome)) ? null : n(r.netIncome),
        totalRevenue: isNaN(n(r.totalRevenue)) ? null : n(r.totalRevenue),
        operatingIncome: isNaN(n(r.operatingIncome)) ? null : n(r.operatingIncome),
        grossProfit: n(r.grossProfit) > 0 ? n(r.grossProfit) : null,
        interestExpense: isNaN(n(r.interestExpense)) ? null : n(r.interestExpense),
        eps: null as number | null
      }
    })

    // Derive EPS for the most recent period from defaultKeyStatistics
    if (incomeData.length > 0 && ks?.trailingEps != null) {
      incomeData[0]!.eps = n(ks.trailingEps)
    }

    const totalDebt = n(fd?.totalDebt)
    const bookValue = n(ks?.bookValue)
    const equity = !isNaN(bookValue) && !isNaN(sharesOutstanding) ? bookValue * sharesOutstanding : NaN
    const currentRatioVal = n(fd?.currentRatio)
    const totalCash = n(fd?.totalCash)
    // Approximate currentLiabilities from currentRatio: CR = currentAssets/currentLiabilities
    const currentLiabilities = !isNaN(totalCash) && !isNaN(currentRatioVal) && currentRatioVal > 0 ? totalCash / currentRatioVal : NaN
    const latestDate = incomeData[0]?.date ?? null

    const balanceData = latestDate ? [{
      date: latestDate,
      totalAssets: NaN,
      totalLiabilities: isNaN(totalDebt) ? null : totalDebt,
      totalShareholderEquity: isNaN(equity) ? null : equity,
      currentAssets: isNaN(totalCash) ? null : totalCash,
      currentLiabilities: isNaN(currentLiabilities) ? null : currentLiabilities
    }] : []

    const opCashFlow = n(fd?.operatingCashflow)
    const freeCashFlow = n(fd?.freeCashflow)
    const capex = !isNaN(opCashFlow) && !isNaN(freeCashFlow) ? opCashFlow - freeCashFlow : NaN

    const cashFlowData = latestDate ? [{
      date: latestDate,
      operatingCashFlow: isNaN(opCashFlow) ? null : opCashFlow,
      capitalExpenditure: isNaN(capex) ? null : -Math.abs(capex),
      freeCashFlow: isNaN(freeCashFlow) ? null : freeCashFlow
    }] : []

    const marketCap = !isNaN(price) && !isNaN(sharesOutstanding) ? price * sharesOutstanding : NaN
    const roe = n(fd?.returnOnEquity)
    const grossMargin = n(fd?.grossMargins)
    const peRatio = !isNaN(price) && !isNaN(n(ks?.trailingEps)) && n(ks?.trailingEps) > 0 ? price / n(ks?.trailingEps) : NaN
    const pbRatio = n(ks?.priceToBook)
    const bookValuePerShare = n(ks?.bookValue)
    const pfcfRatio = !isNaN(marketCap) && !isNaN(freeCashFlow) && freeCashFlow > 0 ? marketCap / freeCashFlow : NaN
    const ebitda = n(fd?.ebitda)
    const debtToEBITDA = !isNaN(totalDebt) && !isNaN(ebitda) && ebitda > 0 ? totalDebt / ebitda : NaN
    const debtToEquityRatio = n(fd?.debtToEquity)
    const interestCoverage = NaN // Not available from these modules
    const operatingMargin = n(fd?.operatingMargins)
    const latestRevenue = n(fd?.totalRevenue)
    const roic = !isNaN(operatingMargin) && !isNaN(latestRevenue) && !isNaN(equity) && !isNaN(totalDebt)
      ? (operatingMargin * latestRevenue * 0.79) / (equity + totalDebt)
      : NaN

    const annualEarnings = incomeData
      .filter((r: any) => r.eps != null && !isNaN(r.eps))
      .map((r: any) => ({ date: r.date, reportedEPS: r.eps }))

    const historicalFCF = !isNaN(freeCashFlow) && freeCashFlow > 0 ? [freeCashFlow] : []

    console.log(`Yahoo quoteSummary: ${_symbol} — ${incomeData.length} income periods, financialData: ${fd ? 'yes' : 'no'}`)

    return {
      profile: [{
        symbol: _symbol,
        companyName: '',
        currency: fd?.financialCurrency ?? 'USD',
        exchange: '',
        industry: '',
        sector: '',
        description: '',
        ceo: '',
        website: '',
        image: '',
        ipoDate: '',
        marketCap: isNaN(marketCap) ? null : marketCap
      }],
      overview: {
        peNormalizedAnnual: isNaN(peRatio) ? NaN : peRatio,
        roe: isNaN(roe) ? NaN : roe
      },
      earnings: { annualEarnings },
      incomeStatement: {
        annualReports: incomeData.map((r: any) => ({
          date: r.date,
          netIncome: r.netIncome != null ? r.netIncome : NaN,
          totalRevenue: r.totalRevenue != null ? r.totalRevenue : NaN,
          operatingIncome: r.operatingIncome != null ? r.operatingIncome : NaN,
          grossProfit: r.grossProfit != null ? r.grossProfit : NaN,
          eps: r.eps != null ? r.eps : NaN
        }))
      },
      balanceSheet: {
        annualReports: balanceData.map((r: any) => ({
          date: r.date,
          totalAssets: r.totalAssets != null && !isNaN(r.totalAssets) ? r.totalAssets : NaN,
          totalLiabilities: r.totalLiabilities != null ? r.totalLiabilities : NaN,
          totalShareholderEquity: r.totalShareholderEquity != null ? r.totalShareholderEquity : NaN,
          currentAssets: r.currentAssets != null ? r.currentAssets : NaN,
          currentLiabilities: r.currentLiabilities != null ? r.currentLiabilities : NaN
        }))
      },
      cashFlowStatement: {
        annualReports: cashFlowData.map((r: any) => ({
          date: r.date,
          freeCashFlow: r.freeCashFlow != null ? r.freeCashFlow : NaN,
          operatingCashFlow: r.operatingCashFlow != null ? r.operatingCashFlow : NaN,
          capitalExpenditure: r.capitalExpenditure != null ? r.capitalExpenditure : NaN
        }))
      },
      metrics: {
        currentRatio: isNaN(currentRatioVal) ? NaN : currentRatioVal,
        interestCoverage: NaN,
        debtToEBITDA: isNaN(debtToEBITDA) ? NaN : debtToEBITDA,
        marketCap: isNaN(marketCap) ? NaN : marketCap,
        sharesOutstanding: isNaN(sharesOutstanding) ? NaN : sharesOutstanding,
        grossProfitMargin: isNaN(grossMargin) ? NaN : grossMargin,
        roic: isNaN(roic) ? NaN : roic,
        dividendPayoutRatio: NaN,
        returnOnTangibleAssets: NaN,
        intangiblesToTotalAssets: NaN,
        grahamNumber: NaN,
        pfcfRatio: isNaN(pfcfRatio) ? NaN : pfcfRatio,
        pbRatio: isNaN(pbRatio) ? NaN : pbRatio,
        roe: isNaN(roe) ? NaN : roe,
        bookValuePerShare: isNaN(bookValuePerShare) ? NaN : bookValuePerShare,
        freeCashFlowPerShare: NaN
      },
      latestFCF: isNaN(freeCashFlow) ? NaN : freeCashFlow,
      latestRatios: {},
      latestCashFlow: {},
      historicalFCF,
      historicalMarketCap: [],
      _source: 'yahoo-quoteSummary'
    }
  } catch (error: any) {
    console.error(`Yahoo quoteSummary fallback error for ${_symbol}:`, error.message)
    return null
  }
}

export async function getRSI(symbol: string, interval: '1d' | '1mo' = '1d'): Promise<{ rsi: number | null, prices: DailyPrice[] }> {
  const _symbol = getYahooSymbol(symbol)
  const { RSI } = await import('technicalindicators')

  const now = new Date()
  const startingDate = new Date()
  startingDate.setFullYear(now.getFullYear() - 2)

  const prices = await yahooFinance.historical(_symbol, {
    period1: parseDate(startingDate),
    period2: new Date(),
    interval
  })

  const closes = prices.map((d: any) => d.close).filter(Boolean)

  const rsiValues = RSI.calculate({ values: closes, period: 14 })
  const rsi = rsiValues.at(-1) ?? null

  const mappedPrices: DailyPrice[] = prices.map((d: any) => ({
    date: parseDate(d.date),
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
    adjClose: d.adjClose
  }))

  return { rsi, prices: mappedPrices }
}
