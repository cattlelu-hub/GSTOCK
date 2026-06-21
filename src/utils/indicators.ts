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
 * Calculates Bias (%) of an array of numbers relative to their Moving Average
 * Bias = ((Close - MA) / MA) * 100
 */
export function calculateBIAS(prices: number[], period: number): number[] {
  const sma = calculateSMA(prices, period);
  const bias: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (sma[i] === 0) {
      bias.push(0);
    } else {
      bias.push(((prices[i] - sma[i]) / sma[i]) * 100);
    }
  }
  return bias;
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
  const currentMA5 = sma5[lastIndex];
  const currentMA10 = sma10[lastIndex];
  const currentMA20 = sma20[lastIndex];
  const currentMA60 = sma60[lastIndex];
  const prevMA20 = sma20[prevIndex] || currentMA20;

  // Calculate 20MA bias percentage: (Close - 20MA) / 20MA
  const bias20 = currentMA20 > 0 ? (currentClose - currentMA20) / currentMA20 : 0;
  const bias5 = currentMA5 > 0 ? ((currentClose - currentMA5) / currentMA5) * 100 : 0;
  const bias10 = currentMA10 > 0 ? ((currentClose - currentMA10) / currentMA10) * 100 : 0;
  const bias60 = currentMA60 > 0 ? ((currentClose - currentMA60) / currentMA60) * 100 : 0;

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
    bias20: bias20,
    bias5: Math.round(bias5 * 100) / 100,
    bias10: Math.round(bias10 * 100) / 100,
    bias60: Math.round(bias60 * 100) / 100
  };
}

/**
 * Helper calculation for MA in strategy (reversed history)
 */
export function calculateStrategyMA(klines: any[], startIndex: number, period: number): number {
  let sum = 0;
  for (let i = startIndex; i < startIndex + period; i++) {
    sum += klines[i]?.close || 0;
  }
  return sum / period;
}

/**
 * Helper calculation for Volume MA in strategy (reversed history)
 */
export function calculateStrategyVolumeMA(klines: any[], startIndex: number, period: number): number {
  let sum = 0;
  for (let i = startIndex; i < startIndex + period; i++) {
    sum += klines[i]?.volume || 0;
  }
  return sum / period;
}

/**
 * Estimator for intraday full-day volume
 */
export function estimateFullDayVolume(currentVol: number, timeStr: string): number {
  const [hrs, mins] = timeStr.split(':').map(Number);
  const totalMarketMinutes = 270; // 09:00 ~ 13:30 = 270 mins
  
  let currentMinutes = (hrs - 9) * 60 + mins;
  if (currentMinutes < 0) currentMinutes = 0;
  if (currentMinutes > totalMarketMinutes) currentMinutes = totalMarketMinutes;
  
  if (currentMinutes === 0) return currentVol;
  
  const linearEstimate = currentVol * (totalMarketMinutes / currentMinutes);
  return linearEstimate * 0.7 + currentVol * 0.3; // hybrid smoothing
}

/**
 * Strong moving average and volume bullish alignment - inflection point screener algorithm
 */
export function checkBlackHorseStrategy(
  klines: any[],
  currentTimeStr: string | null = null
): {
  isBull: boolean;
  reason: string;
  bias: string;
  estimatedVol: number;
  details: {
    maLong: boolean;
    shakeout: boolean;
    contraction: boolean;
    breakout: boolean;
    biasOk: boolean;
  };
} {
  if (!klines || klines.length < 60) {
    return {
      isBull: false,
      reason: "歷史資料不足 60 筆",
      bias: "0.00%",
      estimatedVol: 0,
      details: { maLong: false, shakeout: false, contraction: false, breakout: false, biasOk: false }
    };
  }

  const today = klines[0];
  const yesterday = klines[1];

  const ma5_today = calculateStrategyMA(klines, 0, 5);
  const ma10_today = calculateStrategyMA(klines, 0, 10);
  const ma20_today = calculateStrategyMA(klines, 0, 20);
  const ma20_yest = calculateStrategyMA(klines, 1, 20);
  const ma60_today = calculateStrategyMA(klines, 0, 60);
  const v_ma5_past = calculateStrategyVolumeMA(klines, 1, 5); // 5-day average volume (excluding today)

  let currentVolume = today.volume;
  let estimatedVolume = today.volume;

  if (currentTimeStr) {
    estimatedVolume = estimateFullDayVolume(today.volume, currentTimeStr);
    currentVolume = estimatedVolume;
  }

  // 1. Trend Bullish
  const isTrendBullish = (ma60_today > calculateStrategyMA(klines, 1, 60)) && (ma20_today >= ma20_yest);

  // 4. Today Breakout
  const isTodayBreakout = (today.close >= ma20_today) && (yesterday.close <= ma20_yest * 1.005);

  // 2. Shakeout track
  let hasWashMarket = false;
  for (let i = 2; i <= 10; i++) {
    let ma20_historical = calculateStrategyMA(klines, i, 20);
    if (klines[i].close < ma20_historical) {
      hasWashMarket = true;
      break;
    }
  }

  // 3. Volume Contraction
  let isVolumeContracted = true;
  for (let i = 1; i <= 3; i++) {
    let v_ma5_historical = calculateStrategyVolumeMA(klines, i, 5);
    if (klines[i].volume > v_ma5_historical * 1.1) {
      isVolumeContracted = false;
      break;
    }
  }

  // 4 (cont). Today Volumepump
  const isVolumePumped = currentVolume >= v_ma5_past * 1.5;

  // 6. Bias Ratio
  const biasRatio = ((today.close - ma20_today) / ma20_today) * 100;
  const biasOk = biasRatio >= 0 && biasRatio <= 3.0;

  const isBull = isTrendBullish && isTodayBreakout && hasWashMarket && isVolumeContracted && isVolumePumped && biasOk;

  let reason = "⭐ 滿足黑馬股條件";
  if (!isTrendBullish) reason = "大趨勢未符合(60MA未上揚或20MA下彎)";
  else if (!isTodayBreakout) reason = "今日未現K線突破月線拐點";
  else if (!hasWashMarket) reason = "近期歷史無洗盤甩轎軌跡";
  else if (!isVolumeContracted) reason = "突破前未見明顯縮量整理";
  else if (!isVolumePumped) reason = `量能未放大(需>${Math.round(v_ma5_past * 1.5)}張，目前/預估:${Math.round(currentVolume)}張)`;
  else if (!biasOk) reason = `乖離率過高或過低 (${biasRatio.toFixed(2)}%)`;

  return {
    isBull,
    reason,
    bias: biasRatio.toFixed(2) + "%",
    estimatedVol: Math.round(estimatedVolume),
    details: {
      maLong: isTrendBullish,
      shakeout: hasWashMarket,
      contraction: isVolumeContracted,
      breakout: isTodayBreakout && isVolumePumped,
      biasOk
    }
  };
}

/**
 * Detailed technical analyzer validating a stock against conditions
 */
export function evaluateScreener(
  stock: Stock,
  industryKeyword: string = "",
  currentTimeStr: string | null = null,
  avoidOverheated: boolean = false
): FilterResult {
  const history = stock.history;
  const len = history.length;

  if (len < 61) {
    return {
      stock,
      isMatch: false,
      reasons: { maLong: false, shakeout: false, contraction: false, breakout: false, macdImprove: false, biasOk: false, industryMatch: false, overheated: false }
    };
  }

  // Prepare reversed array for strategy API
  const klines = [...history].reverse();
  const evaluation = checkBlackHorseStrategy(klines, currentTimeStr);

  // Still preserve MACD improvement check visually (since it's a pleasant UI indicator, we can let it green or use our previous logic)
  const closes = history.map(h => h.close);
  const { osc } = calculateMACD(closes);
  const lastIndex = len - 1;
  const prevIndex = lastIndex - 1;
  const macdOsc = osc[lastIndex] || 0;
  const macdOscPrev = osc[prevIndex] || 0;
  const macdImprove = (macdOsc < 0 && macdOsc > macdOscPrev) || (macdOsc >= 0 && macdOscPrev < 0);

  // 7. Industry Matching
  let industryMatch = true;
  if (industryKeyword.trim() !== "") {
    industryMatch = stock.industry.toLowerCase().includes(industryKeyword.toLowerCase().trim()) ||
                    stock.symbol.includes(industryKeyword.trim()) ||
                    stock.name.includes(industryKeyword.trim());
  }

  // Calculate if the stock is overheated (乖離率過大)
  const bias5Val = stock.indicators.bias5 || 0;
  const bias10Val = stock.indicators.bias10 || 0;
  const bias20Val = (stock.indicators.bias20 || 0) * 100; // stored as ratio, convert to %
  const isOverheated = bias5Val > 5.0 || bias10Val > 8.0 || bias20Val > 10.0;

  // If "avoidOverheated" is enabled, overheated stocks are filtered out
  const isMatch = evaluation.isBull && industryMatch && (!avoidOverheated || !isOverheated);

  return {
    stock,
    isMatch,
    reasons: {
      maLong: evaluation.details.maLong,
      shakeout: evaluation.details.shakeout,
      contraction: evaluation.details.contraction,
      breakout: evaluation.details.breakout,
      macdImprove, // keep the MACD visualization
      biasOk: evaluation.details.biasOk,
      industryMatch,
      overheated: isOverheated
    }
  };
}

