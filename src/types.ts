export interface KLine {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  ma20Prev: number;
  volume5MA: number;
  macdDiff: number;
  macdDea: number;
  macdOsc: number;
  macdOscPrev: number;
  bias20: number; // 20MA bias
}

export interface Stock {
  symbol: string;
  name: string;
  industry: string;
  history: KLine[]; // 100 days sorted oldest to newest (index 99 is today)
  indicators: TechnicalIndicators; // Prepared indicators for 'today' (index 99)
  changePercentage: number; // Simulated session change vs yesterday's close
  todayVolume: number;
  todayClose: number;
  todayOpen: number;
  todayHigh: number;
  todayLow: number;
  isYahooSynced?: boolean;
}

export interface FilterResult {
  stock: Stock;
  isMatch: boolean;
  reasons: {
    maLong: boolean;      // 5MA > 10MA > 20MA > 60MA && 20MA up/flat
    shakeout: boolean;    // Past 5-10 days fell below 20MA
    contraction: boolean; // Past 2-3 days volume < Vol 5MA
    breakout: boolean;    // Today stands above 20MA && Vol >= 1.5 * past few days average
    macdImprove: boolean; // MACD improvement
    biasOk: boolean;      // 0% < Bias <= 3%
    industryMatch: boolean;
  };
}
