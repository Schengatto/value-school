
import { getEarnings, getEventCalendars } from "./connectors/finnhub.js";
import { sendFileViaTelegram, sendViaTelegram } from "./connectors/telegram.js";
import { readDataFromFile, saveDataToFile } from "./utility/file.js";
import { getNews, Sentiment } from "./utility/news.js";
import { sleep } from "./utility/promise.js";
import { generateReport, processTickers } from "./value-investing/index.js";

const Signal = {
    Buy: "buy",
    Sell: "sell",
    None: "none",
}

function getNextEvents(before, after) {
    const today = new Date();
    const firstDay = new Date(today);
    const lastDay = new Date(today);

    firstDay.setDate(today.getDate() - before)
    lastDay.setDate(today.getDate() + after);

    const format = (d) => d.toISOString().split('T')[0];
    return { from: format(firstDay), to: format(lastDay) };
}

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

async function analyzeEarnings(symbol) {
    const earnings = await getEarnings(symbol);
    const beats = earnings.filter(e => e.actual > e.estimate);
    const total = earnings.length;
    const lastEstimates = earnings.slice(0, 5).map(e => e.estimate); // EPS stimati, da più recente

    return {
        beatCount: beats.length,
        total,
        beatRate: beats.length / total,
        lastResult: earnings[0].actual > earnings[0].estimate ? 'beat' : 'miss',
        epsEstimates: lastEstimates
    };
}

function scoreEpsEstimate(estimates) {
    if (!Array.isArray(estimates) || estimates.length < 2) return 0;

    const [current, prev, ...rest] = estimates;
    const avg = rest.length > 0 ? rest.reduce((a, b) => a + b, 0) / rest.length : prev;

    let score = 0;
    if (current > prev) score += 1;
    if (current > estimates.at(-1)) score += 1; // YoY
    if (current > avg) score += 1;

    if (current < 0 && current > prev) score += 1; // perdita in calo

    if (Math.abs(current - prev) < 0.01) score += 0;
    if (current < prev) score -= 1;
    if (current < prev && current < avg) score -= 1;

    return score;
}

async function fetchEvents() {
    const { from, to } = getNextEvents(0, 0);
    const events = await getEventCalendars(from, to);

    const db = await readDataFromFile("./database/finnhub.json");

    const getTickerFromSymbol = (symbol) => db.find(t => t.symbol === symbol);

    const largeCapEvents = events
        .map(e => ({ ...e, ...getTickerFromSymbol(e.symbol) }))
        .filter(e => e.cap === "LARGE")
        .map(({ date, symbol, epsEstimate, revenueEstimate, currency, description, finnhubIndustry }) => ({
            date: date.toISOString().split("T")[0],
            symbol,
            epsEstimate,
            revenueEstimate,
            currency,
            description,
            finnhubIndustry
        }))
        .reverse();

    const tickersFundamentals = await processTickers(largeCapEvents);

    const messages = [];

    for (const e of largeCapEvents) {
        const pastEarnings = await analyzeEarnings(e.symbol);
        const epsScore = scoreEpsEstimate(pastEarnings.epsEstimates);

        const newsList = await getNews(e.symbol, 5) || [];
        const newsScore = newsList
            .map(n => n.sentiment)
            .reduce((output, s) => {
                if (s === Sentiment.Positive) return output + 1;
                if (s === Sentiment.Negative) return output - 1;
                return output;
            }, 0);

        const fundamentals = tickersFundamentals.find(t => t.symbol === e.symbol);

        const newsSentiment = newsScore > 0 ? Sentiment.Positive : newsScore < 0 ? Sentiment.Negative : Sentiment.Neutral;
        const isHighlighted = newsSentiment === Sentiment.Positive
            && pastEarnings.lastResult === "beat"
            && epsScore >= 1
            && fundamentals?.score >= 9;

        const message = `${isHighlighted ? "↗️" : ""} ${e.date} ${e.description} (${e.symbol}) - Estimated EPS: ${e.epsEstimate} | EPS Score: ${epsScore} | ${e.finnhubIndustry} | Past earnings beat rate: ${pastEarnings.beatRate.toFixed(2)} | Last score: ${pastEarnings.lastResult} | Sentiment: ${newsSentiment} | Fundamentals: ${fundamentals.signal.toUpperCase()} (${fundamentals.score})`;
        messages.push(message);
        console.log(message);
    }

    const chunks = chunkArray(messages, 10);
    let i = 1;
    for (const chunk of chunks) {
        const message = `📅 Earnings from ${from} to ${to} - page ${i}\n${chunk.join("\n\n")}`;
        await sendViaTelegram(message);
        i++;
    }

    saveDataToFile("calendars.json", messages);

    const reportPath = await generateReport(tickersFundamentals);
    await sleep(5000);
    await sendFileViaTelegram(reportPath, `Value Investing Report - Earnings`);
}

fetchEvents();
