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
 * Uses robust fail-over CORS proxying.
 */
export async function fetchYahooStockHistory(symbol: string): Promise<KLine[]> {
  const ticker = getYahooTicker(symbol);
  // Request 150 days to ensure we have at least 100 trading days
  const yahooAPI = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=150d&interval=1d`;

  const proxies = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  ];

  let rawDataText = "";
  let success = false;
  let lastErrorMsg = "";

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
      
      // AllOrigins returns it wrapper inside { contents: "..." }
      if (resJson && typeof resJson === "object" && "contents" in resJson) {
        rawDataText = resJson.contents;
      } else {
        rawDataText = JSON.stringify(resJson);
      }

      if (rawDataText && rawDataText.trim().startsWith("{")) {
        success = true;
        break;
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      console.warn(`Proxy failed for Yahoo query ${ticker}:`, err);
    }
  }

  if (!success) {
    throw new Error(`CORS 代理均載入失敗 (${lastErrorMsg || "連線逾時"})`);
  }

  const parsed = JSON.parse(rawDataText);
  const result = parsed?.chart?.result?.[0];
  
  if (!result) {
    throw new Error("Yahoo Finance 返回資料結構異常，或找不到此代號之行情資料。");
  }

  const timestamps: number[] = result.timestamp || [];
  const indicatorsObj = result.indicators?.quote?.[0];

  if (!indicatorsObj || timestamps.length === 0) {
    throw new Error("Yahoo 交易行情數據為空，此時段可能尚無可用資料。");
  }

  const opens: (number | null)[] = indicatorsObj.open || [];
  const highs: (number | null)[] = indicatorsObj.high || [];
  const lows: (number | null)[] = indicatorsObj.low || [];
  const closes: (number | null)[] = indicatorsObj.close || [];
  const volumes: (number | null)[] = indicatorsObj.volume || [];

  const klines: KLine[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const open = opens[i];
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];
    const volume = volumes[i];

    // Filter out rows missing core prices
    if (
      open === null || open === undefined ||
      high === null || high === undefined ||
      low === null || low === undefined ||
      close === null || close === undefined ||
      volume === null || volume === undefined
    ) {
      continue;
    }

    const dateStr = new Date(timestamp * 1000).toISOString().split("T")[0];

    klines.push({
      time: dateStr,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 105, // Slight adjustment if calibration required, but let's just keep close
      volume: Math.round(volume / 1000) // Convert shares to "張" (台灣股常用單位)
    });
  }

  // Ensure sorting oldest to newest
  klines.sort((a, b) => a.time.localeCompare(b.time));

  // If we have more than 100 days, take the newest 100
  if (klines.length > 100) {
    return klines.slice(klines.length - 100);
  }

  return klines;
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
