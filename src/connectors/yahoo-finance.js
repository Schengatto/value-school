import yahooFinance from 'yahoo-finance2';
import { parseDate } from '../utility/date.js';

export const fetchCompanyDataFromYahoo = async (symbol) => {
    try {
        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: [
                'financialData',
                'defaultKeyStatistics',
                'earnings',
                'earningsHistory',
                'incomeStatementHistory',
                'balanceSheetHistory'
            ]
        });

        const overview = {
            peNormalizedAnnual: summary?.defaultKeyStatistics?.forwardPE ?? null,
            roe: summary?.financialData?.returnOnEquity ?? null
        };

        const earningsData = {
            annualEarnings: (summary.earningsHistory?.history || []).map(e => ({
                reportedEPS: parseFloat(e.epsActual ?? NaN)
            }))
        };

        const incomeStatement = {
            annualReports: summary.incomeStatementHistory?.incomeStatementHistory?.map((r) => ({
                netIncome: r.netIncome ?? null,
                totalRevenue: r.totalRevenue ?? null
            })) || []
        };

        const balanceSheet = {
            annualReports: summary.balanceSheetHistory?.balanceSheetStatements?.map((r) => ({
                totalLiabilities: r.totalLiab ?? null,
                totalShareholderEquity: r.totalStockholderEquity ?? null
            })) || []
        };

        return { overview, earnings: earningsData, incomeStatement, balanceSheet };

    } catch (err) {
        console.error(`❌ Yahoo Finance error for ${symbol}:`, err.message);
        return null;
    }
};


/**
 * Returns the company description for a given stock symbol.
 * @param {string} symbol - The stock symbol (e.g., 'AAPL')
 * @returns {Promise<string|null>} - The company description, or null if not found
 */
export async function getCompanySummary(symbol) {
    try {
        const data = await yahooFinance.quoteSummary(symbol, {
            modules: ['price', 'assetProfile']
        });

        const profile = data?.assetProfile;
        const price = data?.price;

        return {
            name: price?.longName ?? price?.shortName ?? "",
            sector: profile?.sector ?? null,
            industry: profile?.industry ?? null,
            longBusinessSummary: profile?.longBusinessSummary ?? null,
            marketcap: price?.marketCap ?? null,
            currentPrice: price?.regularMarketPreviousClose ?? null,
        };
    } catch (error) {
        console.error(`Error retrieving company description for ${symbol}:`, error.message);
        return { sector: null, industry: null, longBusinessSummary: null };
    }
};

async function getMonthlyData(symbol, years = 10) {
    const to = new Date();
    const from = new Date();
    from.setFullYear(to.getFullYear() - years);

    const result = await yahooFinance.historical(symbol, {
        period1: parseDate(from),
        period2: parseDate(to),
        interval: '1mo',
    });

    return result.map(row => ({
        date: parseDate(row.date),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close
    }));
}

function aggregateAnnual(data) {
    const yearlyData = {};

    data.forEach(d => {
        const year = new Date(d.date).getFullYear();

        if (!yearlyData[year]) {
            yearlyData[year] = {
                date: `${year}-12-31`,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            };
        } else {
            yearlyData[year].high = Math.max(yearlyData[year].high, d.high);
            yearlyData[year].low = Math.min(yearlyData[year].low, d.low);
            yearlyData[year].close = d.close;
        }
    });

    return Object.values(yearlyData).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export const getPricesOfLast10Years = async (ticker) => {
    const monthlyData = await getMonthlyData(ticker, 10);
    return aggregateAnnual(monthlyData);
};