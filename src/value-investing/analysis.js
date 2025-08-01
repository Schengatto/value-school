import { Signal } from "./index.js";

const estimateIntrinsicValue = ({ historicalFCF = [], metrics, pricePerShare }, options = {}) => {
    const {
        growthRate = 0.08,
        discountRate = 0.10,
        terminalGrowth = 0.02,
        years = 5,
        maxTerminalWeight = 0.8
    } = options;

    const { sharesOutstanding, marketCap } = metrics;

    if (!Array.isArray(historicalFCF) || historicalFCF.length === 0) {
        return { value: NaN, message: "No valid FCF data" };
    }

    const validFCF = historicalFCF.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
    if (validFCF.length === 0) {
        return { value: NaN, message: "All FCF values are invalid or non-positive" };
    }

    const avgFCF = validFCF.reduce((sum, val) => sum + val, 0) / validFCF.length;
    if (!sharesOutstanding || sharesOutstanding <= 0 || discountRate <= terminalGrowth) {
        return { value: NaN, message: "Invalid input data or unrealistic DCF parameters" };
    }

    let dcfSum = 0;
    for (let year = 1; year <= years; year++) {
        const projectedFCF = avgFCF * Math.pow(1 + growthRate, year);
        dcfSum += projectedFCF / Math.pow(1 + discountRate, year);
    }

    const finalYearFCF = avgFCF * Math.pow(1 + growthRate, years);
    const terminalValue = (finalYearFCF * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
    const discountedTerminal = terminalValue / Math.pow(1 + discountRate, years);

    const totalDCF = dcfSum + discountedTerminal;

    const terminalShare = discountedTerminal / totalDCF;
    if (terminalShare > maxTerminalWeight) {
        return { value: NaN, message: "Terminal value dominates the DCF (> 70%)" };
    }

    const intrinsicValuePerShare = totalDCF / sharesOutstanding;

    const marketPricePerShare = pricePerShare !== undefined
        ? pricePerShare
        : marketCap && sharesOutstanding
            ? marketCap / sharesOutstanding
            : NaN;

    const marginOfSafety = isNaN(marketPricePerShare)
        ? NaN
        : (1 - marketPricePerShare / intrinsicValuePerShare) * 100;

    return {
        intrinsicValuePerShare,
        marketPricePerShare,
        marginOfSafety,
        signal: isNaN(marginOfSafety)
            ? 'Unknown'
            : marginOfSafety >= 30
                ? 'Undervalued'
                : marginOfSafety <= -20
                    ? 'Overvalued'
                    : 'Fairly valued'
    };
};

const calculateCAGR = (start, end, years) => {
    if (start <= 0 || end <= 0 || years <= 0) return NaN;
    return Math.pow(end / start, 1 / years) - 1;
};

export function analyzeFundamentals(data) {
    const {
        overview,
        earnings,
        balanceSheet,
        incomeStatement,
        cashFlowStatement,
        metrics,
        pricePerShare,
        historicalFCF,
        historicalPrices,
    } = data;

    const reasons = {
        passed: [],
        failed: [],
        unavailable: []
    };

    let score = 0;
    const maxScore = 18;

    const addScore = (passed, reason) => {
        if (passed) {
            reasons.passed.push(reason);
            score++;
        } else {
            reasons.failed.push(reason);
        }
    };

    try {
        const epsList = (earnings?.annualEarnings || [])
            .map(e => parseFloat(e.reportedEPS))
            .filter(eps => !isNaN(eps));
        const hasEPS = epsList.length >= 3;
        if (!hasEPS) {
            reasons.unavailable.push("EPS data insufficient");
        } else {
            const first = epsList[epsList.length - 1];
            const last = epsList[0];
            addScore(last > first, "EPS shows upward trend");

            const epsCAGR = calculateCAGR(first, last, epsList.length - 1);
            if (!isNaN(epsCAGR)) addScore(epsCAGR > 0.10, `EPS CAGR > 10% (${(epsCAGR * 100).toFixed(2)}%)`);
        }

        // Analyze historical price CAGR
        if (Array.isArray(historicalPrices) && historicalPrices.length >= 2) {
            const sorted = [...historicalPrices].sort((a, b) => new Date(a.date) - new Date(b.date));
            const startPrice = parseFloat(sorted[0].close);
            const endPrice = parseFloat(sorted[sorted.length - 1].close);
            const years = (new Date(sorted[sorted.length - 1].date) - new Date(sorted[0].date)) / (365.25 * 24 * 60 * 60 * 1000);
            const priceCAGR = calculateCAGR(startPrice, endPrice, years);
            if (!isNaN(priceCAGR)) {
                const isPositive = priceCAGR > 0.10;
                const percentage = `${(priceCAGR * 100).toFixed(2)}%`;
                addScore(isPositive, isPositive ? `Price CAGR > 10% (${percentage})` : `Price CAGR < 10% (${percentage})`);
            }
        } else {
            reasons.unavailable.push("Historical price data insufficient");
        }

        const roic = parseFloat(metrics?.roic ?? "NaN");
        if (isNaN(roic)) reasons.unavailable.push("ROIC not available");
        else addScore(roic > 0.10, `ROIC ${roic.toFixed(2)}`);

        const grossMargin = parseFloat(metrics?.grossProfitMargin ?? "NaN");
        if (!isNaN(grossMargin)) addScore(grossMargin > 0.60, `Gross Margin ${(grossMargin * 100).toFixed(1)}%`);

        const pfcf = parseFloat(metrics?.pfcfRatio ?? "NaN");
        if (isNaN(pfcf)) reasons.unavailable.push("P/FCF ratio not available");
        else addScore(pfcf < 15, `P/FCF ${pfcf.toFixed(2)}`);

        const dividendPayout = parseFloat(metrics?.dividendPayoutRatio ?? "NaN");
        if (!isNaN(dividendPayout)) addScore(dividendPayout > 0 && dividendPayout < 60, `Dividend Payout ${dividendPayout.toFixed(2)}%`);

        const bs = balanceSheet?.annualReports?.[0];
        const debt = bs ? parseFloat(bs.totalLiabilities) : NaN;
        const equity = bs ? parseFloat(bs.totalShareholderEquity) : NaN;
        if (!bs || isNaN(debt) || isNaN(equity) || equity === 0) {
            reasons.unavailable.push("Debt or equity not available or invalid");
        } else {
            addScore(debt / equity < 2, "Debt < 2x Equity");
        }

        const inc = incomeStatement?.annualReports?.[0];
        const operatingIncome = inc ? parseFloat(inc.operatingIncome) : NaN;
        const revenue = inc ? parseFloat(inc.totalRevenue) : NaN;
        if (!inc || isNaN(operatingIncome) || isNaN(revenue) || revenue <= 0) {
            reasons.unavailable.push("Operating income or revenue not available");
        } else {
            const operatingMargin = operatingIncome / revenue;
            addScore(operatingMargin > 0.10, `Operating margin ${(operatingMargin * 100).toFixed(1)}%`);
        }

        const cf = cashFlowStatement?.annualReports?.[0];
        const fcf = cf ? parseFloat(cf.freeCashFlow) : NaN;
        const capex = cf ? parseFloat(cf.capitalExpenditure) : NaN;
        if (isNaN(fcf)) {
            reasons.unavailable.push("Free Cash Flow not available");
        } else {
            addScore(fcf > 0, "Free Cash Flow is positive");
            if (!isNaN(capex) && capex !== 0) addScore(Math.abs(capex / fcf) < 0.5, "CapEx intensity is low");
        }

        const currentRatio = parseFloat(metrics?.currentRatio ?? "NaN");
        if (isNaN(currentRatio)) reasons.unavailable.push("Current Ratio not available");
        else addScore(currentRatio > 1.5, `Current Ratio ${currentRatio.toFixed(2)}`);

        const interestCoverage = parseFloat(metrics?.interestCoverage ?? "NaN");
        if (isNaN(interestCoverage)) reasons.unavailable.push("Interest Coverage not available");
        else addScore(interestCoverage > 3, `Interest Coverage ${interestCoverage.toFixed(2)}`);

        const debtToEBITDA = parseFloat(metrics?.debtToEBITDA ?? "NaN");
        if (isNaN(debtToEBITDA)) reasons.unavailable.push("Debt/EBITDA not available");
        else addScore(debtToEBITDA < 3, `Debt/EBITDA ${debtToEBITDA.toFixed(2)}`);

        const rota = parseFloat(metrics?.returnOnTangibleAssets ?? "NaN");
        if (!isNaN(rota)) addScore(rota > 0.05, `Return on Tangible Assets ${(rota * 100).toFixed(2)}%`);

        const intangiblesRatio = parseFloat(metrics?.intangiblesToTotalAssets ?? "NaN");
        if (!isNaN(intangiblesRatio)) addScore(intangiblesRatio < 0.2, "Low reliance on intangibles");

        const grahamNumber = parseFloat(metrics?.grahamNumber ?? "NaN");
        if (!isNaN(grahamNumber) && pricePerShare !== undefined) addScore(pricePerShare < grahamNumber, "Price is below Graham Number");

        const valuation = estimateIntrinsicValue({ historicalFCF, metrics, pricePerShare });
        if (!isNaN(valuation.intrinsicValuePerShare)) {
            addScore(valuation.signal === 'Undervalued', `Discounted Cash Flow: $${valuation.intrinsicValuePerShare.toFixed(2)} (${valuation.signal})`);
        } else {
            reasons.unavailable.push(valuation.message || "Could not estimate intrinsic value");
        }

        if (reasons.unavailable.length >= 5) return { signal: Signal.None, reasons };
        if (score >= 14) return { signal: Signal.Positive, reasons, score };
        if (score <= 5) return { signal: Signal.Negative, reasons, score };
        return { signal: Signal.None, reasons, score };

    } catch (error) {
        console.error("Error during fundamental analysis:", error);
        return {
            signal: Signal.None,
            reasons: { error: error.message },
            score: 0
        };
    }
}
