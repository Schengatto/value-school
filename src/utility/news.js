import { askAi } from "../connectors/hugging-ai.js";
import finnhub from "../connectors/finnhub.js";
import { parseDate } from "./date.js";

export const Sentiment = {
    Negative: "negative",
    Neutral: "neutral",
    Positive: "positive",
};

const analyzeSentiment = async (text) => {
    const result = await askAi(text);

    const labelMap = {
        'LABEL_0': 'negative',
        'LABEL_1': 'neutral',
        'LABEL_2': 'positive'
    };
    const sentiment = labelMap[result[0].label];
    const score = result[0].score;

    return { sentiment, score };
};

const generateSignalFromNews = (sentiment, score, threshold = 0.85) => {
    if (sentiment === 'positive' && score > threshold) {
        return Sentiment.Positive;
    } else if (sentiment === 'negative' && score > threshold) {
        return Sentiment.Negative;
    }
    return Sentiment.Neutral;
};

export const getNews = async (symbol, last = 3, startingDate = undefined, endingDate = undefined) => {
    const getFromDate = () => {
        const _fromDate = new Date();
        _fromDate.setMonth(new Date().getMonth() - 1);
        return _fromDate;
    };

    const fromDate = startingDate
        ? parseDate(startingDate)
        : parseDate(getFromDate());

    const toDate = endingDate
        ? parseDate(endingDate)
        : parseDate(new Date());

    try {
        const data = await new Promise((resolve, reject) => {
            finnhub.companyNews(symbol, fromDate, toDate, (error, data, response) => {
                if (error) {
                    return reject(error);
                }
                resolve(data);
            });
        });

        if (data && data.length > 0) {
            return Promise.all(data.slice(0, last).map(async (news) => {
                const text = news.headline + '. ' + (news.summary || '');
                const { sentiment, score } = await analyzeSentiment(text);
                const signal = generateSignalFromNews(sentiment, score);
                return { ...news, sentiment: signal };
            }));
        } else {
            console.log(`${symbol} - No news found`);
            return [];
        }
    } catch (e) {
        console.error(`Error while fetching news for "${symbol}"`, e);
        return [];
    }
};

export const newsParser = (n) => `${parseDate(n.datetime)} - ${String(n.sentiment).toUpperCase()} - ${n.headline}\n${n.summary ? n.summary + "\n" : ""}${n.url}\n`;
export const newsTelegramParser = (n) => `${parseDate(n.datetime)} - *${String(n.sentiment).toUpperCase()}* - ${n.headline}\n${n.summary ? n.summary + "\n" : ""}${n.url}\n`;