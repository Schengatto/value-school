import finnhub from "finnhub";
import dotenv from "dotenv";
import { readDataFromFile, saveDataToFile } from "../utility/file.js";
import { FINNHUB_SYMBOLS } from "../symbols/finnhub.js";

dotenv.config();

const AUTH_KEYS = [
    process.env.FINNHUB_API_KEY1,
    process.env.FINNHUB_API_KEY2,
    process.env.FINNHUB_API_KEY3,
    process.env.FINNHUB_API_KEY4,
    process.env.FINNHUB_API_KEY5,
    process.env.FINNHUB_API_KEY6
].filter(Boolean);

if (AUTH_KEYS.length === 0) {
    console.warn("⚠️ No API keys defined for FINNHUB_API!");
}

let currentKeyIndex = 0;
const finnhubClient = new finnhub.DefaultApi();
const apiKeyAuth = finnhub.ApiClient.instance.authentications['api_key'];
apiKeyAuth.apiKey = AUTH_KEYS[currentKeyIndex];

function setApiKey(index) {
    const key = AUTH_KEYS[index];
    apiKeyAuth.apiKey = key;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function promisify(method, ...args) {
    const maxAttempts = AUTH_KEYS.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        setApiKey(currentKeyIndex);
        try {
            return await new Promise((resolve, reject) => {
                method(...args, (error, data, response) => {
                    if (error) {
                        const status = error.status || error.response?.statusCode;
                        if (status === 429) return reject({ type: "RATE_LIMIT", error });
                        return reject({ type: "OTHER", error });
                    }
                    resolve(data);
                });
            });
        } catch (err) {
            if (err.type === "RATE_LIMIT") {
                console.warn(`⚠️ Rate limit hit for key #${currentKeyIndex + 1}. Rotating...`);
                currentKeyIndex = (currentKeyIndex + 1) % AUTH_KEYS.length;
                await sleep(1000);
            } else {
                throw err.error;
            }
        }
    }

    throw new Error("❌ All API keys exhausted due to rate limits.");
}

export const fetchCompanyData = async (symbol) => {
    try {
        // 1. Fundamental metrics
        const fundamentals = await promisify(finnhubClient.companyBasicFinancials.bind(finnhubClient), symbol, 'all');
        if (!fundamentals?.metric) throw new Error('Fundamental metrics not available');
        const overview = fundamentals.metric;

        // 2. Historical EPS
        const earningsData = await promisify(finnhubClient.companyEarnings.bind(finnhubClient), symbol, {});
        const earnings = {
            annualEarnings: (earningsData || []).map(e => ({ reportedEPS: e.eps }))
        };

        // 3. Annual report
        const annualReport = await new Promise((resolve, reject) => {
            finnhubClient.financialsReported({ symbol }, (error, data, response) => {
                if (error) return reject(error);
                const report = data?.data.find(r => r.form === '10-K' || r.form === '20-F');
                resolve(report);
            });
        });

        if (!annualReport) {
            console.warn(`No annual report found for ${symbol}. Trying fallback with 'financials'...`);

            const finData = await new Promise((resolve, reject) => {
                finnhubClient.financials(symbol, "ic", "annual", (error, data, response) => {
                    if (error) return reject(error);
                    resolve(data);
                });
            });

            if (!finData?.financials?.length) return { overview, earnings };

            const last = finData.financials[0]; // più recente

            const incomeStatement = {
                annualReports: [{
                    netIncome: parseFloat(last.netIncome || 0),
                    totalRevenue: parseFloat(last.revenue || 0)
                }]
            };
            const balanceSheet = {
                annualReports: [{
                    totalLiabilities: parseFloat(last.totalLiabilities || 0),
                    totalShareholderEquity: parseFloat(last.totalEquity || 0)
                }]
            };

            return { overview, earnings, incomeStatement, balanceSheet };
        } else {
            const bs = annualReport.report.bs;
            const ic = annualReport.report.ic;

            const incomeStatement = {
                annualReports: [{
                    netIncome: ic ? parseFloat(ic['NetIncome']?.value || 0) : 0,
                    totalRevenue: ic ? parseFloat(ic['Revenue']?.value || 0) : 0,
                }]
            };

            const balanceSheet = {
                annualReports: [{
                    totalLiabilities: bs ? parseFloat(bs['TotalLiabilities']?.value || 0) : 0,
                    totalShareholderEquity: bs ? parseFloat(bs['TotalEquity']?.value || 0) : 0,
                }]
            };

            return { overview, earnings, incomeStatement, balanceSheet };
        }
    } catch (err) {
        console.error(`❌ Error while fetching data for ${symbol}:`, err.message);
        return null;
    }
};

export const getEventCalendars = async (from, to) => {
    return await new Promise((resolve, reject) => {
        finnhubClient.earningsCalendar({ from, to }, (error, data, response) => {
            if (error) {
                console.error('Errore:', error);
            } else {
                resolve(data.earningsCalendar);
            }
        })
    });
};

const getClassification = (marketCap) => {
    let category = null;
    if (marketCap > 10_000) category = 'LARGE';
    else if (marketCap > 2_000) category = 'MID';
    else if (marketCap > 300) category = 'SMALL';
    else category = 'MICRO';
    return category;
};

/**
 * The value of classification can be "LARGE", "MID", "SMALL", "MICRO"
 * @param {*} classification
 */
export const getTickersByCapitalization = async (classification) => {
    return FINNHUB_SYMBOLS
        .map(t => ({ ...t, cap: getClassification(t.marketCap) }))
        .filter(t => t.cap === classification);
};

export const getTickerInfoFromSymbol = (symbol) => {
    const ticker = FINNHUB_SYMBOLS.find(s => s.symbol === symbol);
    return {
        ...ticker,
        cap: ticker && getClassification(ticker.marketCap)
    }
};

export const fixMissingMarketCaps = async () => {
    const backupData = await readDataFromFile("fixed.json");
    const result = [];
    const size = FINNHUB_SYMBOLS.length;
    let count = 0;
    for (const ticker of FINNHUB_SYMBOLS) {
        try {
            count += 1;
            console.log(`${count}/${size} Processing ${ticker.symbol}`);
            if (ticker.marketCap && ticker.cap) {
                result.push(ticker);
            } else if (ticker.marketCap) {
                const cap = getClassification(ticker.marketCap);
                result.push({ ...ticker, cap });
            } else {
                const bk = backupData.find(b => b.symbol === ticker.symbol);
                if (!bk) {
                    const profile = await promisify(finnhubClient.companyProfile2.bind(finnhubClient), { symbol: ticker.symbol });
                    const marketCap = profile?.marketCapitalization;
                    const cap = getClassification(marketCap);
                    result.push({ ...ticker, ...profile, marketCap, cap });
                    // await sleep(500);
                } else {
                    result.push(bk);
                }
            }
        } catch (e) {
            console.error(e);
            result.push(ticker)
        }
        saveDataToFile("fixed2.json", result);
    }
}

export const getEarnings = async (symbol) => {
    try {
        const earningsData = await promisify(finnhubClient.companyEarnings.bind(finnhubClient), symbol, {});
        return (earningsData || []).map(e => ({
            period: e.period,
            actual: e.actual,
            estimate: e.estimate,
            surprise: e.surprise,
            surprisePercent: e.surprisePercent
        }));
    } catch (error) {
        console.error(`❌ Error fetching earnings for ${symbol}:`, error?.message);
        return [];
    }
};

function unixTimestampDaysAgo(days) {
    const now = Math.floor(Date.now() / 1000);
    return now - days * 86400;
}

export async function getWeeklyPriceChange(symbol) {
    const now = Math.floor(Date.now() / 1000);
    const aWeekAgo = unixTimestampDaysAgo(7);

    return await new Promise((resolve, reject) => {
        finnhubClient.stockCandles(symbol, 'D', aWeekAgo, now, (error, data) => {
            if (error) return reject(error);
            if (!data || data.s !== "ok" || data.c.length < 2) return resolve(null);

            const closeStart = data.c[0];
            const closeEnd = data.c.at(-1);
            const change = ((closeEnd - closeStart) / closeStart) * 100;

            resolve({
                start: closeStart,
                end: closeEnd,
                change
            });
        });
    });
}

export default finnhubClient;
