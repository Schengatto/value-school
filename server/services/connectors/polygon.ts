import axios from 'axios'
import { restClient } from '@polygon.io/client-js'
import { parseDate, dateOfPast } from '../../utils/date'
import { getPolygonSymbol } from '~~/shared/constants/symbol-maps'

let currentKeyIndex = 0

function getPolygonKeys(): string[] {
  const config = useRuntimeConfig()
  return [
    config.polygonApiKey1,
    config.polygonApiKey2,
    config.polygonApiKey3,
    config.polygonApiKey4,
    config.polygonApiKey5
  ].filter(Boolean) as string[]
}

function getCurrentKey(): string {
  const keys = getPolygonKeys()
  return keys[currentKeyIndex % keys.length]!
}

function rotateKey(): string {
  const keys = getPolygonKeys()
  currentKeyIndex = (currentKeyIndex + 1) % keys.length
  const newKey = keys[currentKeyIndex]!
  console.log(`Polygon: rotated to key #${currentKeyIndex + 1}/${keys.length}`)
  return newKey
}

function isRateLimitError(err: any): boolean {
  return err?.response?.status === 429 || err?.response?.status === 403
}

function getBasePath(): string {
  const client = restClient(getCurrentKey())
  return (client as any).basePath ?? 'https://api.polygon.io'
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function polygonFetch(endpoint: string, params: Record<string, unknown> = {}): Promise<any> {
  const keys = getPolygonKeys()
  const basePath = getBasePath()

  for (let attempt = 0; attempt < keys.length; attempt++) {
    try {
      const response = await axios.get(`${basePath}${endpoint}`, {
        params: { ...params, apikey: getCurrentKey() }
      })
      return response.data
    } catch (err: any) {
      if (isRateLimitError(err) && attempt < keys.length - 1) {
        console.warn(`Polygon: key #${currentKeyIndex + 1} rate-limited, rotating...`)
        rotateKey()
        await sleep(1000) // Brief pause after rotation
        continue
      }
      throw err
    }
  }
}

async function getTickerDetails(symbol: string): Promise<any> {
  const data = await polygonFetch(`/v3/reference/tickers/${symbol}`)
  return data.results
}

async function getFinancials(symbol: string, limit = 5): Promise<any[]> {
  const data = await polygonFetch('/vX/reference/financials', {
    ticker: symbol,
    limit,
    sort: 'filing_date',
    order: 'desc'
  })
  return data.results
}

async function getAggregates(symbol: string, from: string, to: string): Promise<any[]> {
  const data = await polygonFetch(`/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`)
  return data.results
}

/** Safe parseFloat that returns NaN for null/undefined instead of 0 */
function safeFloat(val: any): number {
  if (val == null) return NaN
  const n = typeof val === 'number' ? val : parseFloat(val)
  return isFinite(n) ? n : NaN
}

function transformPolygonToFMP(polygonData: any, profile: any, aggregates: any[]) {
  const { financials = [] } = polygonData

  const incomeData: any[] = []
  const balanceData: any[] = []
  const cashFlowData: any[] = []
  const ratiosData: any[] = []
  const keyMetricsData: any[] = []

  financials.forEach((report: any) => {
    const fin = report.financials
    const date = report.end_date || report.filing_date

    if (!fin) return

    const income = fin.income_statement || {}
    const balance = fin.balance_sheet || {}
    const cashFlow = fin.cash_flow_statement || {}

    const eps = safeFloat(income.basic_earnings_per_share?.value)
    const netIncome = safeFloat(income.net_income_loss?.value)
    const revenue = safeFloat(income.revenues?.value)
    const operatingIncome = safeFloat(income.operating_income_loss?.value)
    const grossProfit = safeFloat(income.gross_profit?.value)
    const interestExpense = safeFloat(income.interest_expense_operating?.value)
    const costOfRevenue = safeFloat(income.cost_of_revenue?.value)

    const totalAssets = safeFloat(balance.assets?.value)
    const totalLiabilities = safeFloat(balance.liabilities?.value)
    const totalEquity = safeFloat(balance.equity?.value)
    const currentAssets = safeFloat(balance.current_assets?.value)
    const currentLiabilities = safeFloat(balance.current_liabilities?.value)
    const intangibleAssets = safeFloat(balance.intangible_assets?.value)
    const goodwill = safeFloat(balance.goodwill?.value)

    const operatingCashFlow = safeFloat(cashFlow.net_cash_flow_from_operating_activities?.value)
    const investingCashFlow = safeFloat(cashFlow.net_cash_flow_from_investing_activities?.value)
    const freeCashFlow = !isNaN(operatingCashFlow) ? operatingCashFlow + (isNaN(investingCashFlow) ? 0 : investingCashFlow) : NaN

    const roe = !isNaN(netIncome) && !isNaN(totalEquity) && totalEquity !== 0 ? netIncome / totalEquity : NaN
    const roa = !isNaN(netIncome) && !isNaN(totalAssets) && totalAssets !== 0 ? netIncome / totalAssets : NaN
    const grossProfitMargin = !isNaN(grossProfit) && !isNaN(revenue) && revenue !== 0 ? grossProfit / revenue : NaN
    const currentRatio = !isNaN(currentAssets) && !isNaN(currentLiabilities) && currentLiabilities !== 0 ? currentAssets / currentLiabilities : NaN
    const interestCoverage = !isNaN(operatingIncome) && !isNaN(interestExpense) && interestExpense !== 0 ? Math.abs(operatingIncome / interestExpense) : NaN

    // ROIC = NOPAT / Invested Capital (approx: totalAssets - currentLiabilities)
    const investedCapital = !isNaN(totalAssets) && !isNaN(currentLiabilities) ? totalAssets - currentLiabilities : NaN
    const nopat = !isNaN(operatingIncome) ? operatingIncome * (1 - 0.21) : NaN
    const roic = !isNaN(nopat) && !isNaN(investedCapital) && investedCapital !== 0 ? nopat / investedCapital : NaN

    // Return on tangible assets
    const totalIntangibles = (!isNaN(intangibleAssets) ? intangibleAssets : 0) + (!isNaN(goodwill) ? goodwill : 0)
    const tangibleAssets = !isNaN(totalAssets) ? totalAssets - totalIntangibles : NaN
    const returnOnTangibleAssets = !isNaN(netIncome) && !isNaN(tangibleAssets) && tangibleAssets !== 0 ? netIncome / tangibleAssets : NaN

    // Intangibles to total assets
    const intangiblesToTotalAssets = !isNaN(totalAssets) && totalAssets !== 0 ? totalIntangibles / totalAssets : NaN

    incomeData.push({
      date,
      fiscalDateEnding: date,
      reportedCurrency: report.cik || 'USD',
      eps: isNaN(eps) ? null : eps,
      netIncome: isNaN(netIncome) ? null : netIncome,
      revenue: isNaN(revenue) ? null : revenue,
      operatingIncome: isNaN(operatingIncome) ? null : operatingIncome,
      ebitda: isNaN(operatingIncome) ? null : operatingIncome,
      grossProfit: isNaN(grossProfit) ? null : grossProfit,
      interestExpense: isNaN(interestExpense) ? null : interestExpense
    })

    balanceData.push({
      date,
      fiscalDateEnding: date,
      totalAssets: isNaN(totalAssets) ? null : totalAssets,
      totalLiabilities: isNaN(totalLiabilities) ? null : totalLiabilities,
      totalStockholdersEquity: isNaN(totalEquity) ? null : totalEquity,
      currentAssets: isNaN(currentAssets) ? null : currentAssets,
      currentLiabilities: isNaN(currentLiabilities) ? null : currentLiabilities,
      intangibleAssets: isNaN(intangibleAssets) ? null : intangibleAssets,
      goodwill: isNaN(goodwill) ? null : goodwill
    })

    cashFlowData.push({
      date,
      fiscalDateEnding: date,
      operatingCashFlow: isNaN(operatingCashFlow) ? null : operatingCashFlow,
      capitalExpenditure: isNaN(investingCashFlow) ? null : investingCashFlow,
      freeCashFlow: isNaN(freeCashFlow) ? null : freeCashFlow
    })

    ratiosData.push({
      date,
      returnOnEquity: isNaN(roe) ? null : roe,
      returnOnAssets: isNaN(roa) ? null : roa,
      grossProfitMargin: isNaN(grossProfitMargin) ? null : grossProfitMargin,
      currentRatio: isNaN(currentRatio) ? null : currentRatio,
      interestCoverage: isNaN(interestCoverage) ? null : interestCoverage,
      roic: isNaN(roic) ? null : roic,
      returnOnTangibleAssets: isNaN(returnOnTangibleAssets) ? null : returnOnTangibleAssets,
      intangiblesToTotalAssets: isNaN(intangiblesToTotalAssets) ? null : intangiblesToTotalAssets,
      priceEarningsRatio: null // will be computed later with pricePerShare
    })

    keyMetricsData.push({
      date,
      marketCap: null,
      freeCashFlowPerShare: null, // will be computed later with shares outstanding
      netIncomePerShare: isNaN(eps) ? null : eps,
      currentRatio: isNaN(currentRatio) ? null : currentRatio,
      roic: isNaN(roic) ? null : roic,
      totalDebt: isNaN(totalLiabilities) ? null : totalLiabilities,
      interestCoverage: isNaN(interestCoverage) ? null : interestCoverage,
      returnOnTangibleAssets: isNaN(returnOnTangibleAssets) ? null : returnOnTangibleAssets,
      intangiblesToTotalAssets: isNaN(intangiblesToTotalAssets) ? null : intangiblesToTotalAssets
    })
  })

  const historicalMarketCap = (aggregates || []).map((agg: any) => ({
    date: new Date(agg.t).toISOString().split('T')[0],
    marketCap: agg.c * (profile?.weighted_shares_outstanding || agg.n || 0)
  }))

  const transformedProfile = [{
    symbol: profile?.ticker || '',
    companyName: profile?.name || '',
    currency: profile?.currency_name || 'USD',
    exchange: profile?.primary_exchange || '',
    industry: profile?.sic_description || '',
    sector: profile?.sic_description || '',
    description: profile?.description || '',
    ceo: '',
    website: profile?.homepage_url || '',
    image: profile?.branding?.icon_url || '',
    ipoDate: profile?.list_date || '',
    marketCap: profile?.market_cap || null
  }]

  return {
    profile: transformedProfile,
    historicalMarketCap,
    incomeData,
    balanceData,
    ratiosData,
    cashFlowData,
    keyMetricsData
  }
}

export async function fetchCompanyDataFromPolygon(symbol: string, pricePerShare?: number) {
  const MAX_RETRIES = 2
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    const result = await _fetchCompanyDataFromPolygon(symbol, pricePerShare)
    if (result != null) return result
    if (retry < MAX_RETRIES) {
      console.warn(`Polygon: retrying ${symbol} (attempt ${retry + 2}/${MAX_RETRIES + 1}) after 3s...`)
      await sleep(3000)
    }
  }
  console.error(`Polygon: all ${MAX_RETRIES + 1} attempts failed for ${symbol}`)
  return null
}

async function _fetchCompanyDataFromPolygon(symbol: string, pricePerShare?: number) {
  try {
    const _symbol = getPolygonSymbol(symbol)
    const twoYearsAgo = dateOfPast({ years: 2, isParsed: true }) as string
    const today = parseDate(new Date())

    const profile = await getTickerDetails(_symbol)
    const financials = await getFinancials(_symbol, 5)
    const aggregates = await getAggregates(_symbol, twoYearsAgo, today)

    const data = transformPolygonToFMP({ financials, profile }, profile, aggregates)
    const { incomeData, balanceData, ratiosData, cashFlowData, keyMetricsData, historicalMarketCap } = data

    const annualEarnings = incomeData.map((report: any) => ({
      date: report.date,
      reportedEPS: report.eps ?? NaN
    })).filter((e: any) => !isNaN(e.reportedEPS))

    // Prefer profile data from Polygon for shares outstanding
    let sharesOutstanding = safeFloat(profile?.weighted_shares_outstanding)
    if (isNaN(sharesOutstanding)) {
      sharesOutstanding = safeFloat(profile?.share_class_shares_outstanding)
    }
    // Fallback: compute from net income / EPS
    if (isNaN(sharesOutstanding)) {
      const incomeTotal = safeFloat(incomeData?.[0]?.netIncome)
      const epsVal = safeFloat(incomeData?.[0]?.eps)
      if (!isNaN(incomeTotal) && !isNaN(epsVal) && epsVal !== 0) {
        sharesOutstanding = incomeTotal / epsVal
      }
    }

    const latestRatios = ratiosData[0] || {}
    const latestMetrics = keyMetricsData[0] || {}
    const latestCashFlow = cashFlowData[0] || {}
    const latestBalance = balanceData[0] || {}
    const latestIncome = incomeData[0] || {}

    const latestFCF = safeFloat(latestCashFlow.freeCashFlow ?? latestCashFlow.operatingCashFlow)

    const price = safeFloat(pricePerShare)
    const latestEPS = safeFloat(latestIncome.eps)
    const latestEquity = safeFloat(latestBalance.totalStockholdersEquity)
    const latestFCFVal = safeFloat(latestCashFlow.freeCashFlow)

    // P/E = price / EPS
    const peRatio = !isNaN(price) && !isNaN(latestEPS) && latestEPS > 0 ? price / latestEPS : NaN

    // Book value per share = equity / shares
    const bookValuePerShare = !isNaN(latestEquity) && !isNaN(sharesOutstanding) && sharesOutstanding > 0
      ? latestEquity / sharesOutstanding : NaN

    // P/B = price / book value per share
    const pbRatio = !isNaN(price) && !isNaN(bookValuePerShare) && bookValuePerShare > 0
      ? price / bookValuePerShare : NaN

    // P/FCF = market cap / FCF
    const marketCap = !isNaN(price) && !isNaN(sharesOutstanding) ? price * sharesOutstanding : NaN
    const pfcfRatio = !isNaN(marketCap) && !isNaN(latestFCFVal) && latestFCFVal > 0
      ? marketCap / latestFCFVal : NaN

    // Graham Number = sqrt(22.5 * EPS * BVPS)
    const grahamNumber = !isNaN(latestEPS) && latestEPS > 0 && !isNaN(bookValuePerShare) && bookValuePerShare > 0
      ? Math.sqrt(22.5 * latestEPS * bookValuePerShare) : NaN

    // FCF per share
    const fcfPerShare = !isNaN(latestFCFVal) && !isNaN(sharesOutstanding) && sharesOutstanding > 0
      ? latestFCFVal / sharesOutstanding : NaN

    // Dividend payout ratio — not available from Polygon
    const dividendPayoutRatio = NaN

    const overview = {
      peNormalizedAnnual: isNaN(peRatio) ? NaN : peRatio,
      roe: safeFloat(latestRatios.returnOnEquity)
    }

    const incomeStatement = {
      annualReports: incomeData.map((r: any) => ({
        date: r.date,
        netIncome: safeFloat(r.netIncome),
        totalRevenue: safeFloat(r.revenue),
        operatingIncome: safeFloat(r.operatingIncome),
        grossProfit: safeFloat(r.grossProfit),
        eps: safeFloat(r.eps)
      }))
    }

    const balanceSheet = {
      annualReports: balanceData.map((r: any) => ({
        date: r.date,
        totalAssets: safeFloat(r.totalAssets),
        totalLiabilities: safeFloat(r.totalLiabilities),
        totalShareholderEquity: safeFloat(r.totalStockholdersEquity),
        currentAssets: safeFloat(r.currentAssets),
        currentLiabilities: safeFloat(r.currentLiabilities)
      }))
    }

    const cashFlowStatement = {
      annualReports: cashFlowData.map((r: any) => ({
        date: r.date,
        freeCashFlow: safeFloat(r.freeCashFlow ?? r.operatingCashFlow),
        operatingCashFlow: safeFloat(r.operatingCashFlow),
        capitalExpenditure: safeFloat(r.capitalExpenditure)
      }))
    }

    const historicalFCF = (cashFlowStatement?.annualReports ?? [])
      .map((r: any) => r.freeCashFlow)
      .filter((v: number) => !isNaN(v) && v > 0)

    const fallbackDebtToEBITDA = (() => {
      const totalDebt = safeFloat(latestMetrics.totalDebt)
      const ebitda = safeFloat(incomeData?.[0]?.ebitda)
      return (!isNaN(totalDebt) && !isNaN(ebitda) && ebitda !== 0)
        ? totalDebt / ebitda
        : NaN
    })()

    const metrics = {
      ...latestMetrics,
      currentRatio: safeFloat(latestMetrics.currentRatio),
      interestCoverage: safeFloat(latestRatios.interestCoverage ?? latestMetrics.interestCoverage),
      debtToEBITDA: safeFloat(
        latestMetrics.debtToEBITDA
        ?? latestMetrics.netDebtToEBITDA
        ?? latestMetrics.debtEBITDARatio
        ?? fallbackDebtToEBITDA
      ),
      marketCap: isNaN(marketCap) ? safeFloat(latestMetrics.marketCap) : marketCap,
      sharesOutstanding,
      grossProfitMargin: safeFloat(latestRatios.grossProfitMargin ?? latestMetrics.grossProfitMargin),
      roic: safeFloat(latestRatios.roic ?? latestMetrics.roic),
      dividendPayoutRatio,
      returnOnTangibleAssets: safeFloat(latestRatios.returnOnTangibleAssets ?? latestMetrics.returnOnTangibleAssets),
      intangiblesToTotalAssets: safeFloat(latestRatios.intangiblesToTotalAssets ?? latestMetrics.intangiblesToTotalAssets),
      grahamNumber: isNaN(grahamNumber) ? NaN : grahamNumber,
      pfcfRatio: isNaN(pfcfRatio) ? NaN : pfcfRatio,
      pbRatio: isNaN(pbRatio) ? NaN : pbRatio,
      roe: safeFloat(latestRatios.returnOnEquity),
      bookValuePerShare: isNaN(bookValuePerShare) ? NaN : bookValuePerShare,
      freeCashFlowPerShare: isNaN(fcfPerShare) ? NaN : fcfPerShare
    }

    return {
      profile: data.profile,
      overview,
      earnings: { annualEarnings },
      incomeStatement,
      balanceSheet,
      cashFlowStatement,
      metrics,
      latestFCF,
      latestRatios,
      latestCashFlow,
      historicalFCF,
      historicalMarketCap
    }
  } catch (err: any) {
    console.error(`Polygon error for ${symbol}:`, err.message)
    return null
  }
}

export async function getIpoCalendar(startDate: string, endDate: string): Promise<any[]> {
  try {
    const data = await polygonFetch('/vX/reference/ipos', {
      'listing_date.gte': startDate,
      'listing_date.lte': endDate,
      order: 'asc',
      sort: 'listing_date',
      limit: 100
    })
    return data.results ?? []
  } catch (err: any) {
    console.error('Polygon IPO calendar error:', err.message)
    return []
  }
}

export async function getDividendCalendar(startDate: string, endDate: string): Promise<any[]> {
  try {
    const results: any[] = []
    let nextUrl: string | null = null

    // First request
    const data = await polygonFetch('/v3/reference/dividends', {
      'ex_dividend_date.gte': startDate,
      'ex_dividend_date.lte': endDate,
      order: 'asc',
      sort: 'ex_dividend_date',
      limit: 1000
    })
    results.push(...(data.results ?? []))
    nextUrl = data.next_url ?? null

    // Follow pagination if needed
    while (nextUrl) {
      const url = new URL(nextUrl)
      url.searchParams.set('apikey', getCurrentKey())
      const resp = await axios.get(url.toString())
      results.push(...(resp.data.results ?? []))
      nextUrl = resp.data.next_url ?? null
    }

    return results
  } catch (err: any) {
    console.error('Polygon dividend calendar error:', err.message)
    return []
  }
}

export async function getIndustriesPe(): Promise<Record<string, number>> {
  // Polygon.io does not provide industry P/E ratios
  return {}
}
