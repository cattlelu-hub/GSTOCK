import { KLine, TechnicalIndicators, Stock, FilterResult } from "../types";

/**
 * Calculates Simple Moving Average (SMA) of an array of numbers
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(0); // Not enough data
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * Calculates Exponential Moving Average (EMA) of an array of numbers
 */
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  if (prices.length === 0) return ema;

  const k = 2 / (period + 1);
  
  // Seed with simple average for first 'period' elements
  let firstSum = 0;
  for (let i = 0; i < Math.min(period, prices.length); i++) {
    firstSum += prices[i];
  }
  const firstSMA = firstSum / Math.min(period, prices.length);

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ema.push(firstSMA); // Pad initially
    } else if (i === period - 1) {
      ema.push(firstSMA);
    } else {
      const nextEma = prices[i] * k + ema[i - 1] * (1 - k);
      ema.push(nextEma);
    }
  }
  return ema;
}

/**
 * Calculates MACD (DIF, DEA, Oscillator) for a series
 * DIF = EMA(12) - EMA(26)
 * DEA = EMA(9) of DIF
 * MACD Oscillator = 2 * (DIF - DEA)
 */
export function calculateMACD(prices: number[]): { dif: number[]; dea: number[]; osc: number[] } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const dif: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    dif.push(ema12[i] - ema26[i]);
  }

  const dea = calculateEMA(dif, 9);
  
  const osc: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    osc.push(2 * (dif[i] - dea[i]));
  }

  return { dif, dea, osc };
}

/**
 * Computes the technical indicators for a given stock history
 * returns the full calculation for the last element (today, day index 99)
 */
export function computeIndicators(history: KLine[]): TechnicalIndicators {
  const closes = history.map(h => h.close);
  const volumes = history.map(h => h.volume);

  const sma5 = calculateSMA(closes, 5);
  const sma10 = calculateSMA(closes, 10);
  const sma20 = calculateSMA(closes, 20);
  const sma60 = calculateSMA(closes, 60);

  const volSMA5 = calculateSMA(volumes, 5);

  const { dif, dea, osc } = calculateMACD(closes);

  const lastIndex = history.length - 1;
  const prevIndex = lastIndex - 1;

  const currentClose = closes[lastIndex];
  const currentMA20 = sma20[lastIndex];
  const prevMA20 = sma20[prevIndex] || currentMA20;

  // Calculate 20MA bias percentage: (Close - 20MA) / 20MA
  const bias20 = currentMA20 > 0 ? (currentClose - currentMA20) / currentMA20 : 0;

  return {
    ma5: sma5[lastIndex] || 0,
    ma10: sma10[lastIndex] || 0,
    ma20: currentMA20 || 0,
    ma60: sma60[lastIndex] || 0,
    ma20Prev: prevMA20,
    volume5MA: volSMA5[lastIndex] || 0,
    macdDiff: dif[lastIndex] || 0,
    macdDea: dea[lastIndex] || 0,
    macdOsc: osc[lastIndex] || 0,
    macdOscPrev: osc[prevIndex] || 0,
    bias20: bias20
  };
}

/**
 * Detailed technical analyzer validating a stock against conditions
 */
export function evaluateScreener(stock: Stock, industryKeyword: string = ""): FilterResult {
  const history = stock.history;
  const len = history.length;
  const todayIndex = len - 1;

  if (len < 61) {
    // Need at least 60-100 bars for 60MA
    return {
      stock,
      isMatch: false,
      reasons: { maLong: false, shakeout: false, contraction: false, breakout: false, macdImprove: false, biasOk: false, industryMatch: false }
    };
  }

  // Pre-calculate full arrays of SMAs for checking history
  const closes = history.map(h => h.close);
  const volumes = history.map(h => h.volume);

  const sma5 = calculateSMA(closes, 5);
  const sma10 = calculateSMA(closes, 10);
  const sma20 = calculateSMA(closes, 20);
  const sma60 = calculateSMA(closes, 60);
  const volSMA5 = calculateSMA(volumes, 5);

  const ind = stock.indicators;

  // 1. MA Long Alignment (均線多頭格局)
  // 5MA > 10MA > 20MA > 60MA on today.
  // 20MA today >= 20MA yesterday.
  const maLong = (ind.ma5 > ind.ma10) && 
                 (ind.ma10 > ind.ma20) && 
                 (ind.ma20 > ind.ma60) && 
                 (ind.ma20 >= ind.ma20Prev);

  // 2. Shakeout track (歷史洗盤軌跡)
  // In past 5 to 10 trading days (today-10 to today-5), had close < 20MA
  let shakeout = false;
  const startShake = Math.max(0, todayIndex - 10);
  const endShake = Math.max(0, todayIndex - 5);
  for (let i = startShake; i <= endShake; i++) {
    if (closes[i] < sma20[i]) {
      shakeout = true;
      break;
    }
  }

  // 3. Volume Contraction (量縮整理)
  // For past 2 to 3 days (today-1, today-2, today-3), volume was less than 5-day average volume
  let contraction = true;
  const startCont = Math.max(0, todayIndex - 3);
  const endCont = Math.max(0, todayIndex - 1);
  for (let i = startCont; i <= endCont; i++) {
    if (volumes[i] >= volSMA5[i]) {
      contraction = false;
      break;
    }
  }

  // 4. Volume Breakout (今日放量突破)
  // Today's close successfully stands over 20MA
  // Today volume exceeds 1.5x average volume of previous 3 days (today-3, today-2, today-1)
  const standOverMA20 = closes[todayIndex] > sma20[todayIndex];
  const avgVolPast3Days = (volumes[todayIndex - 1] + volumes[todayIndex - 2] + volumes[todayIndex - 3]) / 3;
  const breakoutVolume = volumes[todayIndex] >= 1.5 * avgVolPast3Days;
  const breakout = standOverMA20 && breakoutVolume;

  // 5. MACD Improvement (MACD轉佳)
  // Today OSC satisfies "negative is shrinking" or "turned positive"
  // Negative shrinking: macdOsc < 0 && macdOsc > macdOscPrev
  // Tumed positive: macdOsc >= 0 && macdOscPrev < 0
  const macdOsc = ind.macdOsc;
  const macdOscPrev = ind.macdOscPrev;
  const negativeShrinking = (macdOsc < 0 && macdOsc > macdOscPrev);
  const turnedPositive = (macdOsc >= 0 && macdOscPrev < 0);
  const macdImprove = negativeShrinking || turnedPositive;

  // 6. Bias controller (乖離率控制)
  // 20MA bias: 0% < bias <= 3%
  const biasOk = (ind.bias20 > 0 && ind.bias20 <= 0.03);

  // 7. Industry Matching
  let industryMatch = true;
  if (industryKeyword.trim() !== "") {
    industryMatch = stock.industry.toLowerCase().includes(industryKeyword.toLowerCase().trim()) ||
                    stock.symbol.includes(industryKeyword.trim()) ||
                    stock.name.includes(industryKeyword.trim());
  }

  const isMatch = maLong && shakeout && contraction && breakout && macdImprove && biasOk && industryMatch;

  return {
    stock,
    isMatch,
    reasons: {
      maLong,
      shakeout,
      contraction,
      breakout,
      macdImprove,
      biasOk,
      industryMatch
    }
  };
}
