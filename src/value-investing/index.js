import { parseDate } from "../utility/parsers.js";
import { analyzeFundamentals } from "./analysis.js";
import { generateReport } from "./report.js";
import { saveDataToFile } from "../utility/file.js";
import { fetchCompanyDataFromFMP } from "../connectors/fmp.js";
import { getCompanySummary, getPricesOfLast10Years } from "../connectors/yahoo-finance.js";
import yahooFinance from "yahoo-finance2";
import { sleep } from "../utility/promise.js";
import { getNews } from "../utility/news.js";
import { getRSI } from "../tech-indicators/rsi.js";

const FUNDAMENTALS_CONFIG = {
    dataFilePath: `./output/report-buffet-analysis-${parseDate(new Date())}.json`,
    reportFilePath: `./output/${parseDate(new Date())}_fundamentals_report.pdf`,
};

const Signal = {
    Positive: "positive",
    Negative: "negative",
    None: "neutral",
}

const saveToFile = async (results) => saveDataToFile(FUNDAMENTALS_CONFIG.dataFilePath, results);

export {
    FUNDAMENTALS_CONFIG,
    Signal,
    analyzeFundamentals,
    generateReport,
    saveToFile,
};

export const processTickers = async (tickers) => {
    const results = [];
    const elementToProcess = tickers.length;
    let counter = 1;

    for (let { symbol, name, description } of tickers) {
        const tickerName = name ?? description;
        console.log(`${counter}/${elementToProcess}| Processing ${tickerName} (${symbol})`);

        try {
            const fmpData = await fetchCompanyDataFromFMP(symbol);
            const companySummary = await getCompanySummary(symbol);
            const yahooQuote = await yahooFinance.quote(symbol);
            const pricePerShare = yahooQuote.regularMarketPrice;
            const historicalPrices = await getPricesOfLast10Years(symbol);

            const stockResult = fmpData
                ? analyzeFundamentals({ ...fmpData, historicalPrices, pricePerShare })
                : { signal: Signal.None, reasons: { unavailable: "Error fetching data" }, score: 0 };
            const rsi = await getRSI(symbol, undefined, "1mo");

            let newsList = [];
            if (stockResult.signal === Signal.Positive) {
                newsList = await getNews(symbol, 3) || [];
            }

            results.push({
                symbol,
                name: tickerName,
                companySummary,
                ...stockResult,
                fmpData,
                yahooQuote,
                rsi,
                currentPrice: pricePerShare,
                news: newsList,
                fundamentals: {
                    pe: parseFloat(fmpData.overview?.peNormalizedAnnual ?? "NaN"),
                    roe: parseFloat(fmpData.overview?.roe ?? "NaN"),
                    eps: (fmpData.earnings?.annualEarnings || []).map((e, i) => ({
                        year: e.date,
                        value: parseFloat(e.reportedEPS)
                    })),
                    revenue: parseFloat(fmpData.incomeStatement?.annualReports?.[0]?.totalRevenue ?? "NaN"),
                    netIncome: parseFloat(fmpData.incomeStatement?.annualReports?.[0]?.netIncome ?? "NaN"),
                    freeCashFlow: parseFloat(fmpData.cashFlowStatement?.annualReports?.[0]?.freeCashFlow ?? "NaN"),
                    totalLiabilities: parseFloat(fmpData.balanceSheet?.annualReports?.[0]?.totalLiabilities ?? "NaN"),
                    totalEquity: parseFloat(fmpData.balanceSheet?.annualReports?.[0]?.totalShareholderEquity ?? "NaN"),
                    currentRatio: parseFloat(fmpData.metrics?.currentRatio ?? "NaN"),
                    interestCoverage: parseFloat(fmpData.metrics?.interestCoverage ?? "NaN"),
                    debtToEBITDA: parseFloat(fmpData.metrics?.debtToEBITDA ?? "NaN")
                }
            });
        } catch (e) {
            console.error(`Errore su ${tickerName} (${symbol}):`, e.message);
        }
        counter += 1;
        sleep(1000);
    }
    return results;
};