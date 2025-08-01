import { sendFileViaTelegram } from "./connectors/telegram.js";
import { NASDAQ_LARGE_CAPS } from './symbols/nasdaq.js';
import { sleep } from "./utility/promise.js";
import { Signal, generateReport, processTickers, saveToFile } from './value-investing/index.js';

const TICKERS = [
    ...NASDAQ_LARGE_CAPS,
    // ...NASDAQ_MID_CAPS,
].sort();

(async () => {
    const fullReport = true;
    const tickers = TICKERS;

    const results = await processTickers(tickers);
    await saveToFile(results);

    const toSell = results.filter(x => x.signal === Signal.Negative);
    const toBuy = results.filter(x => x.signal === Signal.Positive);

    if (!results.length) {
        console.warn("No results!");
        return;
    }

    if (toSell.length || toBuy.length) {
        // Short Version
        const shortReportPath = await generateReport([...toBuy, ...toSell]);
        await sleep(5000);
        await sendFileViaTelegram(shortReportPath, `Value Investing Report\nPositive Outlook: ${toBuy.length}\nNegative Outlook: ${toSell.length}`);
    }

    if (fullReport) {
        // Full Version
        const reportPath = await generateReport(results);
        await sleep(5000);
        await sendFileViaTelegram(reportPath, `Value Investing Report - Full Version`);
    }
})();
