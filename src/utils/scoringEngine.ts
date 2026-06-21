/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 1. 定義傳入的個股財務與市場數據介面
export interface StockFinancialData {
  symbol: string;
  name: string;
  // 基礎財務數據
  revenueYoY: number;       // 營收成長率 (%)
  roe: number;              // 股東權益報酬率 (%)
  eps: number;              // 每股盈餘 (元)
  dividendYield: number;    // 殖利率 (%)
  grossMargin: number;      // 毛利率 (%)
  operatingMargin: number;  // 營業利益率 (%)
  netMargin: number;        // 稅後淨利率 (%)
  // 估值與報酬
  peRatio: number;          // 本益比
  pbRatio: number;          // 股價淨值比
  historicalReturn: number; // 過去一年報酬率 (%)
  // 籌碼與新聞 (前端可簡單抓取 Yahoo 或 TWSE 數據)
  institutionalNetBuy: number; // 主力/三大法人近五日買賣超佔股本比例 (%)
  capexToRevenue: number;   // 資本支出佔營收比重 (作為未來成長的量化替代)
  newsTitles: string[];     // 近期新聞標題陣列 (用於本機關鍵字情緒分析)
}

// 2. 定義評分結果介面
export interface ScoringResult {
  dimensions: Record<string, number>; // 各面向 1-10 評分
  totalScore: number;                 // 總分 (滿分 150)
  averageScore: number;               // 平均分 (1-10)
  investmentPotential: string;        // 投資潛力判定
  summary: string;                    // 系統點評
}

// 3. 主力評分引擎
export function evaluateStockPotential(data: StockFinancialData): ScoringResult {
  const scores: Record<string, number> = {};

  // --- A. 估值與回報面向 ---
  // 1. 本益比 (P/E) - 越低越好，但需避開虧損(負值)
  if (data.peRatio > 0 && data.peRatio <= 12) scores['本益比'] = 10;
  else if (data.peRatio > 12 && data.peRatio <= 18) scores['本益比'] = 8;
  else if (data.peRatio > 18 && data.peRatio <= 25) scores['本益比'] = 6;
  else if (data.peRatio > 25) scores['本益比'] = 4;
  else scores['本益比'] = 1; // 虧損

  // 2. 股淨比 (P/B)
  if (data.pbRatio > 0 && data.pbRatio <= 1.2) scores['股淨比'] = 10;
  else if (data.pbRatio > 1.2 && data.pbRatio <= 2.0) scores['股淨比'] = 8;
  else if (data.pbRatio > 2.0 && data.pbRatio <= 3.5) scores['股淨比'] = 6;
  else scores['股淨比'] = 3;

  // 3. 殖利率 (Yield)
  if (data.dividendYield >= 6) scores['殖利率'] = 10;
  else if (data.dividendYield >= 4) scores['殖利率'] = 8;
  else if (data.dividendYield >= 2) scores['殖利率'] = 6;
  else scores['殖利率'] = 4;

  // 4. 報酬率 (動能表現)
  if (data.historicalReturn >= 30) scores['報酬率'] = 10;
  else if (data.historicalReturn >= 15) scores['報酬率'] = 8;
  else if (data.historicalReturn >= 0) scores['報酬率'] = 6;
  else scores['報酬率'] = 3;

  // --- B. 獲利與財務能力面向 ---
  // 5. ROE
  if (data.roe >= 15) scores['ROE'] = 10;
  else if (data.roe >= 10) scores['ROE'] = 8;
  else if (data.roe >= 5) scores['ROE'] = 5;
  else scores['ROE'] = 2;

  // 6. EPS (絕對值較難評斷，此處以是否大於 5 塊錢做基準，可依產業調整)
  if (data.eps >= 10) scores['EPS'] = 10;
  else if (data.eps >= 5) scores['EPS'] = 8;
  else if (data.eps > 0) scores['EPS'] = 6;
  else scores['EPS'] = 2;

  // 7. 財報三率 (以三率之和或標準作為衡量)
  const marginStrength = data.grossMargin + data.operatingMargin + data.netMargin;
  if (marginStrength >= 50 && data.netMargin > 10) scores['財報三率'] = 10;
  else if (marginStrength >= 30 && data.netMargin > 5) scores['財報三率'] = 8;
  else if (marginStrength >= 15 && data.netMargin > 0) scores['財報三率'] = 6;
  else scores['財報三率'] = 3;

  // 8. 獲利綜合評比 (整合 ROE 與 淨利率)
  scores['獲利'] = Math.round((scores['ROE'] + scores['財報三率']) / 2);

  // 9. 財報健康度 (模擬：若未虧損且有穩定獲利給予高分)
  scores['財報'] = data.eps > 0 && data.netMargin > 0 ? 8 : 4; 
  if (scores['財報'] === 8 && data.roe > 12) scores['財報'] = 10;

  // 10. 公司基本面 (綜合上述的均值)
  scores['公司基本面'] = Math.round((scores['獲利'] + scores['財報'] + scores['ROE'] + scores['EPS']) / 4);

  // --- C. 成長與動能面向 ---
  // 11. 營收成長率 YoY
  if (data.revenueYoY >= 20) scores['營收成長率'] = 10;
  else if (data.revenueYoY >= 10) scores['營收成長率'] = 8;
  else if (data.revenueYoY >= 0) scores['營收成長率'] = 6;
  else scores['營收成長率'] = 3;

  // 12. 營收 (絕對規模或營收動能綜合考量)
  scores['營收'] = scores['營收成長率']; 

  // 13. 未來成長 (無 AI 時，以「資本支出佔營收比重」與「營收成長率」作為先行指標)
  if (data.capexToRevenue >= 10 && data.revenueYoY > 5) scores['未來成長'] = 10;
  else if (data.capexToRevenue >= 5) scores['未來成長'] = 8;
  else scores['未來成長'] = 6;

  // --- D. 籌碼與市場情緒面向 ---
  // 14. 主力籌碼 (三大法人買賣超佔比)
  if (data.institutionalNetBuy >= 2) scores['主力籌碼'] = 10; // 大量買超
  else if (data.institutionalNetBuy >= 0.5) scores['主力籌碼'] = 8;
  else if (data.institutionalNetBuy >= -0.5) scores['主力籌碼'] = 6; // 中立
  else scores['主力籌碼'] = 3; // 遭倒貨

  // 15. 產業新聞 (無 AI，使用本機字典進行關鍵字情緒分析)
  const positiveWords = ['看好', '大增', '雙增', '創新高', '受惠', '訂單', '突破', '成長', '漲價'];
  const negativeWords = ['衰退', '大減', '看淡', '下修', '不如預期', '跌破', '保守', '出清'];
  let newsScore = 6; // 預設中立分
  let sentimentCount = 0;

  data.newsTitles.forEach(title => {
    positiveWords.forEach(word => { if (title.includes(word)) sentimentCount += 1; });
    negativeWords.forEach(word => { if (title.includes(word)) sentimentCount -= 1; });
  });

  if (sentimentCount >= 2) scores['產業新聞'] = 10;
  else if (sentimentCount === 1) scores['產業新聞'] = 8;
  else if (sentimentCount === 0) scores['產業新聞'] = 6;
  else scores['產業新聞'] = 3;

  // --- 結算與潛力判定 ---
  const dimensionsCount = Object.keys(scores).length;
  const totalScore = Object.values(scores).reduce((acc, curr) => acc + curr, 0);
  const averageScore = Number((totalScore / dimensionsCount).toFixed(1));

  let investmentPotential = "";
  let summary = "";

  if (averageScore >= 8.5) {
    investmentPotential = "⭐⭐⭐⭐⭐ 極高潛力 (強力買進)";
    summary = `該股 (${data.symbol}) 各項量化指標表現極優，兼具基本面防護與成長動能，為主升段潛力股。`;
  } else if (averageScore >= 7.0) {
    investmentPotential = "⭐⭐⭐⭐ 具備潛力 (逢低佈局)";
    summary = `該股整體表現優良，估值與獲利處於健康水平，若主力籌碼配合可伺機佈局。`;
  } else if (averageScore >= 5.0) {
    investmentPotential = "⭐⭐⭐ 中立觀望 (區間操作)";
    summary = `基本面表現平平或估值已高，缺乏明顯的突破催化劑，建議觀察為主。`;
  } else {
    investmentPotential = "⭐ 風險較高 (暫停觀望)";
    summary = `多項財務或籌碼指標亮起紅燈，短期內下行風險較大，建議避開。`;
  }

  return {
    dimensions: scores,
    totalScore,
    averageScore,
    investmentPotential,
    summary
  };
}
