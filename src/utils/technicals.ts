import { KLine } from "../types";
import { calculateSMA, calculateMACD } from "./indicators";

export interface TechnicalIndicatorsDetail {
  macd: {
    dif: number;
    dea: number;
    osc: number;
    status: string; // Golden cross, Death cross, positive, negative
  };
  kd: {
    k: number;
    d: number;
    status: string; // Golden cross, Death cross, Overbought, Oversold, Neutral
  };
  rsi: {
    rsi6: number;
    rsi12: number;
    status: string; // Overbought, Oversold, Strength
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    percent: number; // position within bandwidth %
    status: string; // Squeezing, Expanding, Hugging upper, Hugging lower, Neutral
  };
  dmi: {
    plusDI: number;
    minusDI: number;
    adx: number;
    status: string; // Strong uptrend, Strong downtrend, Consolidating
  };
  maDivergence: {
    type: "none" | "bullish_divergence" | "bearish_divergence";
    description: string;
  };
  bias: {
    bias5: number;
    bias10: number;
    bias20: number;
    bias60: number;
    description: string;
  };
}

/**
 * Helper to calculate Standard Deviation
 */
function calculateStdDev(prices: number[], sma: number[], period: number): number[] {
  const stdDev: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      stdDev.push(0);
    } else {
      let sumOfSquares = 0;
      const mean = sma[i];
      for (let j = 0; j < period; j++) {
        const diff = prices[i - j] - mean;
        sumOfSquares += diff * diff;
      }
      stdDev.push(Math.sqrt(sumOfSquares / period));
    }
  }
  return stdDev;
}

/**
 * Calculates Stochastic KD (typically 9-3-3)
 */
export function calculateKD(history: KLine[]): { k: number[]; d: number[] } {
  const kArr: number[] = [];
  const dArr: number[] = [];
  
  let currentK = 50;
  let currentD = 50;

  for (let i = 0; i < history.length; i++) {
    if (i < 8) {
      kArr.push(50);
      dArr.push(50);
      continue;
    }

    // Get rolling 9-day High and Low
    let high9 = history[i].high;
    let low9 = history[i].low;
    for (let j = 0; j < 9; j++) {
      const day = history[i - j];
      if (day.high > high9) high9 = day.high;
      if (day.low < low9) low9 = day.low;
    }

    const close = history[i].close;
    let rsv = 50;
    if (high9 !== low9) {
      rsv = ((close - low9) / (high9 - low9)) * 100;
    }

    currentK = (2 / 3) * currentK + (1 / 3) * rsv;
    currentD = (2 / 3) * currentD + (1 / 3) * currentK;

    kArr.push(Math.round(currentK * 100) / 100);
    dArr.push(Math.round(currentD * 100) / 100);
  }

  return { k: kArr, d: dArr };
}

/**
 * Calculates RSI (Relative Strength Index)
 */
export function calculateRSI(closes: number[], period: number): number[] {
  const rsi: number[] = [];
  if (closes.length < period) {
    return new Array(closes.length).fill(50);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First values
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      avgGain += diff;
    } else {
      avgLoss -= diff;
    }
  }

  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(50);
      continue;
    }

    const diff = closes[i] - closes[i - 1];
    let gain = 0;
    let loss = 0;
    if (diff > 0) {
      gain = diff;
    } else {
      loss = -diff;
    }

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
    }
  }

  return rsi;
}

/**
 * Calculates DMI (Directional Movement Index)
 */
export function calculateDMI(history: KLine[], period: number = 14): { plusDI: number[]; minusDI: number[]; adx: number[] } {
  const n = history.length;
  const plusDI: number[] = new Array(n).fill(20);
  const minusDI: number[] = new Array(n).fill(20);
  const adx: number[] = new Array(n).fill(20);

  if (n <= period) return { plusDI, minusDI, adx };

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < n; i++) {
    const today = history[i];
    const yest = history[i - 1];

    const tr1 = today.high - today.low;
    const tr2 = Math.abs(today.high - yest.close);
    const tr3 = Math.abs(today.low - yest.close);
    tr.push(Math.max(tr1, tr2, tr3));

    const hd = today.high - yest.high;
    const ld = yest.low - today.low;

    if (hd > 0 && hd > ld) {
      plusDM.push(hd);
    } else {
      plusDM.push(0);
    }

    if (ld > 0 && ld > hd) {
      minusDM.push(ld);
    } else {
      minusDM.push(0);
    }
  }

  // Initial smoothed values
  let trSum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let pDmSum = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let mDmSum = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  let currentTR = trSum;
  let currentPDM = pDmSum;
  let currentMDM = mDmSum;

  const dxList: number[] = [];

  for (let i = period; i < n; i++) {
    const idx = i - 1; // matched index in TR/DM lists
    
    // wilder smoothing
    currentTR = currentTR - (currentTR / period) + tr[idx];
    currentPDM = currentPDM - (currentPDM / period) + plusDM[idx];
    currentMDM = currentMDM - (currentMDM / period) + minusDM[idx];

    const pDI = currentTR > 0 ? (currentPDM / currentTR) * 100 : 0;
    const mDI = currentTR > 0 ? (currentMDM / currentTR) * 100 : 0;

    plusDI[i] = Math.round(pDI * 100) / 100;
    minusDI[i] = Math.round(mDI * 100) / 100;

    const diff = Math.abs(pDI - mDI);
    const sum = pDI + mDI;
    const dx = sum > 0 ? (diff / sum) * 100 : 0;
    dxList.push(dx);
  }

  // Calculate ADX
  let adxSum = dxList.slice(0, period).reduce((a, b) => a + b, 0);
  let currentADX = adxSum / period;
  adx[period + period - 1] = Math.round(currentADX * 100) / 100;

  for (let i = period + period; i < n; i++) {
    const dxVal = dxList[i - period];
    currentADX = (currentADX * (period - 1) + dxVal) / period;
    adx[i] = Math.round(currentADX * 100) / 100;
  }

  return { plusDI, minusDI, adx };
}

/**
 * Core function to evaluate Technical Indicators comprehensively
 */
export function computeTechnicalDetails(history: KLine[]): TechnicalIndicatorsDetail {
  const len = history.length;
  const lastIdx = len - 1;
  const closes = history.map(h => h.close);

  // 1. MACD
  const { dif, dea, osc } = calculateMACD(closes);
  const currentDiff = dif[lastIdx] || 0;
  const currentDea = dea[lastIdx] || 0;
  const currentOsc = osc[lastIdx] || 0;
  const prevDiff = dif[lastIdx - 1] || 0;
  const prevDea = dea[lastIdx - 1] || 0;
  
  let macdStatus = "多頭排列 (OSC 紅柱增長)";
  if (currentOsc < 0) {
    macdStatus = "空頭洗盤 (OSC 綠柱收斂)";
    if (currentOsc < (osc[lastIdx - 1] || 0)) {
      macdStatus = "弱勢探底 (OSC 綠柱擴張)";
    }
  } else if (currentOsc < (osc[lastIdx - 1] || 0)) {
    macdStatus = "強勢整理 (OSC 紅柱縮短)";
  }
  
  // Golden/Death Cross detection
  if (prevDiff <= prevDea && currentDiff > currentDea) {
    macdStatus = "🚀 黃金交叉突破 (起漲點)";
  } else if (prevDiff >= prevDea && currentDiff < currentDea) {
    macdStatus = "⚠️ 死亡交叉訊號 (轉弱點)";
  }

  // 2. KD
  const { k, d } = calculateKD(history);
  const currentK = k[lastIdx] || 50;
  const currentD = d[lastIdx] || 50;
  const prevK = k[lastIdx - 1] || 50;
  const prevD = d[lastIdx - 1] || 50;

  let kdStatus = "常態整理區";
  if (currentK > 80) kdStatus = "⚠️ 高檔超買區";
  else if (currentK < 20) kdStatus = "💎 低檔超賣區";

  if (prevK <= prevD && currentK > currentD) {
    kdStatus = "🚀 K值向上黃金交叉";
    if (currentK < 30) kdStatus = "🔥 低檔區黃金交叉 (極強突破訊號)";
  } else if (prevK >= prevD && currentK < currentD) {
    kdStatus = "⚠️ K值向下死亡交叉";
    if (currentK > 70) kdStatus = "🔴 高檔區死亡交叉 (防守減碼訊號)";
  }

  // 3. RSI
  const rsi6 = calculateRSI(closes, 6);
  const rsi12 = calculateRSI(closes, 12);
  const currentRsi6 = rsi6[lastIdx] || 50;
  const currentRsi12 = rsi12[lastIdx] || 50;

  let rsiStatus = "多空平衡區域";
  if (currentRsi6 >= 80) rsiStatus = "🔥 強烈超買 (慎防拉回)";
  else if (currentRsi6 <= 20) rsiStatus = "💎 強烈超賣 (價值浮現)";
  else if (currentRsi6 > 50) {
    rsiStatus = currentRsi6 > currentRsi12 ? "📈 多頭強勢上攻" : "多頭高檔震盪";
  } else if (currentRsi6 < 50) {
    rsiStatus = currentRsi6 < currentRsi12 ? "📉 空頭弱勢主導" : "空頭低檔築底";
  }

  // 4. Bollinger Bands (20, 2)
  const sma20 = calculateSMA(closes, 20);
  const std20 = calculateStdDev(closes, sma20, 20);
  
  const mid = sma20[lastIdx] || 0;
  const dev = std20[lastIdx] || 0;
  const upper = mid + 2 * dev;
  const lower = mid - 2 * dev;
  
  const price = closes[lastIdx];
  const bandwidth = upper - lower;
  const percent = bandwidth > 0 ? ((price - lower) / bandwidth) * 100 : 50;

  let bbStatus = "軌道常態整理";
  if (price >= upper * 0.99) {
    bbStatus = "🚀 爆發突破上軌 (強烈多頭)";
  } else if (price <= lower * 1.01) {
    bbStatus = "⚠️ 跌穿下軌支撐 (強烈空頭)";
  } else if (price > mid) {
    bbStatus = "📈 站穩中軌之上 (強勢區)";
  } else if (price < mid) {
    bbStatus = "📉 跌入中軌之下 (弱勢區)";
  }

  // Check squeeze (bandwidth relative to 20-day average bandwidth)
  let pastBandwidthsSum = 0;
  for (let idx = lastIdx - 10; idx <= lastIdx; idx++) {
    const historicalBandwidth = (sma20[idx] + 2 * std20[idx]) - (sma20[idx] - 2 * std20[idx]);
    pastBandwidthsSum += historicalBandwidth;
  }
  const avgBandwidth = pastBandwidthsSum / 11;
  if (bandwidth < avgBandwidth * 0.7) {
    bbStatus += " & 🔒 壓縮變形中 (即將噴發變盤)";
  }

  // 5. DMI (14)
  const { plusDI, minusDI, adx } = calculateDMI(history, 14);
  const currentPlusDI = plusDI[lastIdx] || 20;
  const currentMinusDI = minusDI[lastIdx] || 20;
  const currentADX = adx[lastIdx] || 20;

  let dmiStatus = "趨勢不明 (無明確波段)";
  if (currentADX > 25) {
    if (currentPlusDI > currentMinusDI) {
      dmiStatus = "📈 強勢多頭趨勢成立 (波段看漲)";
    } else {
      dmiStatus = "📉 強烈空頭趨勢成立 (波段看跌)";
    }
  } else {
    dmiStatus = "⚖️ 盤整無波段趨勢 (ADX低水平)";
  }

  // 6. MA Divergence (均線背離)
  // Check if price is making higher highs/lower lows while MACD or RSI is failing to do so (Divergence indicator)
  let divType: "none" | "bullish_divergence" | "bearish_divergence" = "none";
  let divDesc = "無均線或指標背離結構，股價與指標走勢同步同步。";

  // Check simple MACD or RSI divergences on local peaks (last 20 days)
  const localPeakDays = 15;
  let pricePeakIndex = lastIdx;
  let priceTroughIndex = lastIdx;
  let maxPrice = price;
  let minPrice = price;

  for (let i = lastIdx - localPeakDays; i < lastIdx; i++) {
    if (closes[i] > maxPrice) {
      maxPrice = closes[i];
      pricePeakIndex = i;
    }
    if (closes[i] < minPrice) {
      minPrice = closes[i];
      priceTroughIndex = i;
    }
  }

  if (pricePeakIndex < lastIdx && price > closes[pricePeakIndex]) {
    // Current price is higher, check if index (RSI or MACD OSC) is lower (Bearish Divergence)
    if (rsi6[lastIdx] < rsi6[pricePeakIndex]) {
      divType = "bearish_divergence";
      divDesc = "🔴 警告：價格刷高但 RSI 快線指標未創新高，呈「指標高檔熊市背離」！";
    } else if (dif[lastIdx] < dif[pricePeakIndex]) {
      divType = "bearish_divergence";
      divDesc = "🔴 警告：價格創高但 MACD 差離值(DIF)未創新高，呈「均線熊市背離」！";
    }
  } else if (priceTroughIndex < lastIdx && price < closes[priceTroughIndex]) {
    // Current price is lower, check if index is higher (Bullish Divergence)
    if (rsi6[lastIdx] > rsi6[priceTroughIndex]) {
      divType = "bullish_divergence";
      divDesc = "💎 契機：股價創波段低點但 RSI 精密指標打腳向上抬高，呈「指標底部黃金底背離」！";
    } else if (dif[lastIdx] > dif[priceTroughIndex]) {
      divType = "bullish_divergence";
      divDesc = "💎 契機：股價創波段低點但 MACD 快線值一底比一底高，呈「均線牛市底背離」！";
    }
  }

  // 7. Bias Ratio (乖離率)
  const sma5 = calculateSMA(closes, 5);
  const sma10 = calculateSMA(closes, 10);
  const sma60 = calculateSMA(closes, 60);

  const bias5 = sma5[lastIdx] > 0 ? ((price - sma5[lastIdx]) / sma5[lastIdx]) * 100 : 0;
  const bias10 = sma10[lastIdx] > 0 ? ((price - sma10[lastIdx]) / sma10[lastIdx]) * 100 : 0;
  const bias20 = mid > 0 ? ((price - mid) / mid) * 100 : 0;
  const bias60 = sma60[lastIdx] > 0 ? ((price - sma60[lastIdx]) / sma60[lastIdx]) * 100 : 0;

  let biasDesc = "乖離偏低，利於波段防守。";
  if (bias20 > 5) {
    biasDesc = "🔥 20MA乖離偏大 (+ " + bias20.toFixed(2) + "%)，追價請慎防急拉震盪洗盤！";
  } else if (bias20 < -5) {
    biasDesc = "📉 20MA負乖離大 (- " + Math.abs(bias20).toFixed(2) + "%)，空方拋售竭盡，隨時蘊含跌深反彈！";
  } else {
    biasDesc = "🟢 20MA乖離適中 (" + bias20.toFixed(2) + "%)，處於安全的「起漲拐點成本區」。";
  }

  return {
    macd: {
      dif: Math.round(currentDiff * 100) / 100,
      dea: Math.round(currentDea * 100) / 100,
      osc: Math.round(currentOsc * 100) / 100,
      status: macdStatus
    },
    kd: {
      k: Math.round(currentK * 100) / 100,
      d: Math.round(currentD * 100) / 100,
      status: kdStatus
    },
    rsi: {
      rsi6: Math.round(currentRsi6 * 100) / 100,
      rsi12: Math.round(currentRsi12 * 100) / 100,
      status: rsiStatus
    },
    bollinger: {
      upper: Math.round(upper * 100) / 100,
      middle: Math.round(mid * 100) / 100,
      lower: Math.round(lower * 100) / 100,
      percent: Math.round(percent * 100) / 100,
      status: bbStatus
    },
    dmi: {
      plusDI: Math.round(currentPlusDI * 100) / 100,
      minusDI: Math.round(currentMinusDI * 100) / 100,
      adx: Math.round(currentADX * 100) / 100,
      status: dmiStatus
    },
    maDivergence: {
      type: divType,
      description: divDesc
    },
    bias: {
      bias5: Math.round(bias5 * 100) / 100,
      bias10: Math.round(bias10 * 100) / 100,
      bias20: Math.round(bias20 * 100) / 100,
      bias60: Math.round(bias60 * 100) / 100,
      description: biasDesc
    }
  };
}
