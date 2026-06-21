/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KLine, Stock, TechnicalIndicators } from "../types";
import { computeIndicators } from "./indicators";

// List of Taiwanese OTC symbols in the app which require `.TWO` on Yahoo Finance
const OTC_SYMBOLS = new Set([
  "5347", "3529", "3264", "3324", "2636"
]);

// Export a dynamic real name cache for on-demand resolved stocks
export const tickerNamesCache = new Map<string, string>();

/**
 * Get the accurate Yahoo Finance ticker for Taiwan stocks.
 */
export function getYahooTicker(symbol: string): string {
  // Extract number if there are letters or spaces
  const clean = symbol.trim().replace(/\D/g, "");
  if (OTC_SYMBOLS.has(clean)) {
    return `${clean}.TWO`;
  }
  return `${clean}.TW`;
}

/**
 * Fetch historical data for a Taiwanese stock from Yahoo Finance.
 * Uses robust fail-over CORS proxying. Supports automatic TW (listed) and TWO (OTC) fallbacks.
 */
export async function fetchYahooStockHistory(symbol: string): Promise<KLine[]> {
  const cleanSymbol = symbol.trim().replace(/\D/g, "");
  if (!cleanSymbol) {
    throw new Error("個股代號不能為空");
  }

  // Dual-Market candidates list (TW and TWO) to ensure we scan absolutely all Taiwan stocks
  const suffixes = OTC_SYMBOLS.has(cleanSymbol) ? [".TWO", ".TW"] : [".TW", ".TWO"];
  let lastErrorMsg = "";

  for (const suffix of suffixes) {
    const ticker = `${cleanSymbol}${suffix}`;
    const yahooAPI = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=150d&interval=1d`;

    const proxies = [
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    ];

    for (const proxyFn of proxies) {
      try {
        const proxyUrl = proxyFn(yahooAPI);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP status ${res.status}`);
        }

        const resJson = await res.json();
        let rawDataText = "";

        if (resJson && typeof resJson === "object" && "contents" in resJson) {
          rawDataText = resJson.contents;
        } else {
          rawDataText = JSON.stringify(resJson);
        }

        if (rawDataText && rawDataText.trim().startsWith("{")) {
          const parsed = JSON.parse(rawDataText);
          const result = parsed?.chart?.result?.[0];
          
          if (result && result.timestamp && result.timestamp.length > 0) {
            // Extract company name and add to name lookup dictionary
            const displayName = result.meta?.shortName || result.meta?.longName || `台股 ${cleanSymbol}`;
            tickerNamesCache.set(cleanSymbol, displayName);

            const timestamps: number[] = result.timestamp || [];
            const indicatorsObj = result.indicators?.quote?.[0];

            if (indicatorsObj && timestamps.length > 0) {
              const opens: (number | null)[] = indicatorsObj.open || [];
              const highs: (number | null)[] = indicatorsObj.high || [];
              const lows: (number | null)[] = indicatorsObj.low || [];
              const closes: (number | null)[] = indicatorsObj.close || [];
              const volumes: (number | null)[] = indicatorsObj.volume || [];

              const klines: KLine[] = [];

              for (let i = 0; i < timestamps.length; i++) {
                const open = opens[i];
                const high = highs[i];
                const low = lows[i];
                const close = closes[i];
                const volume = volumes[i];

                if (
                  open === null || open === undefined ||
                  high === null || high === undefined ||
                  low === null || low === undefined ||
                  close === null || close === undefined ||
                  volume === null || volume === undefined
                ) {
                  continue;
                }

                const dateStr = new Date(timestamps[i] * 1000).toISOString().split("T")[0];

                klines.push({
                  time: dateStr,
                  open: Math.round(open * 100) / 100,
                  high: Math.round(high * 100) / 100,
                  low: Math.round(low * 100) / 100,
                  close: Math.round(close * 100) / 100,
                  volume: Math.round(volume / 1000) // Convert shares block to lots
                });
              }

              // Sort oldest to newest
              klines.sort((a, b) => a.time.localeCompare(b.time));

              if (klines.length > 0) {
                if (klines.length > 100) {
                  return klines.slice(klines.length - 100);
                }
                return klines;
              }
            }
          }
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || String(err);
        console.warn(`Attempt failed for Yahoo query ${ticker} via proxy:`, err.message || err);
      }
    }
  }

  throw new Error(`在 TWSE 及 OTC 市場均無法查到代號 ${cleanSymbol} 股價歷史 (原因: ${lastErrorMsg})`);
}

/**
 * Fetch real-time tick from Yahoo Finance to simulate interactive live-updating price.
 */
export async function fetchYahooRealTimeTick(symbol: string): Promise<{
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
} | null> {
  try {
    const ticker = getYahooTicker(symbol);
    const yahooAPI = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1m`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(yahooAPI)}`;

    const res = await fetch(proxyUrl);
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    if (!meta) return null;

    const currentPrice = meta.regularMarketPrice;
    const todayVolumeStr = meta.regularMarketVolume || 0;
    const todayVolume = Math.round(todayVolumeStr / 1000); // converting to lots

    // Yahoo meta has chartPrevClose, but regularMarketOpen is what we need
    const indicatorsObj = result.indicators?.quote?.[0] || {};
    const open = meta.regularMarketOpen || currentPrice;
    const high = meta.regularMarketDayHigh || currentPrice;
    const low = meta.regularMarketDayLow || currentPrice;

    return {
      price: currentPrice,
      open,
      high: Math.max(high, currentPrice),
      low: Math.min(low, currentPrice),
      volume: todayVolume
    };
  } catch (e) {
    console.warn("Real-time ticker failed:", e);
    return null;
  }
}
