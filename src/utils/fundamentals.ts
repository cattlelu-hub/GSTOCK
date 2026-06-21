export interface FundamentalMetrics {
  revenue: string;           // 營收
  financialReport: string;    // 財報
  profitability: string;     // 獲利
  majorChips: string;        // 主力籌碼
  companyFundamentals: string;// 公司基本面
  roe: number;               // ROE %
  eps: number;               // EPS (元)
  dividendYield: number;     // 殖利率 %
  grossMargin: number;       // 毛利率 %
  operatingMargin: number;   // 營業利益率 %
  netMargin: number;         // 淨利率 %
  revenueGrowthRate: number; // 營收成長率 % (YoY)
  returnRate: number;        // 報酬率 %
  peRatio: number;           // 本益比 (倍)
  pbRatio: number;           // 股淨比 (倍)
  futureGrowth: string;      // 未來成長
  industryNews: string;      // 產業新聞
}

// Simple deterministic hash based on stock symbol string to make mock metrics stable
function getSymbolHash(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getFundamentalMetrics(symbol: string, name: string, price: number, industry: string): FundamentalMetrics {
  const hash = getSymbolHash(symbol);
  
  // Custom seed generators
  const seedFloat = (offset: number, min: number, max: number) => {
    const val = ((hash + offset) % 1000) / 1000;
    return Math.round((min + val * (max - min)) * 100) / 100;
  };
  
  const seedInt = (offset: number, min: number, max: number) => {
    return Math.floor(seedFloat(offset, min, max));
  };

  const seedChoice = <T>(offset: number, list: T[]): T => {
    const idx = (hash + offset) % list.length;
    return list[idx];
  };

  // 1. Precise overrides for Taiwan market headline stock profiles to make them super accurate:
  if (symbol === "2330") { // 台積電
    return {
      revenue: "24,050 億 TWD (年增 22.8%)",
      financialReport: "毛利率突破 53.5%，獲利展望各季度皆擊敗市場預期，先進製程產能滿載",
      profitability: "獲利能力極優。先進製程（3nm/2nm）具絕對壟斷報價權，定價能力強韌",
      majorChips: "外資與投信持有率達 74.2%，主力籌碼極度安定，大戶持股比例維持歷史高檔",
      companyFundamentals: "全球晶圓代工霸主，技術領先地位與專利壁壘牢不可破，護城河極深",
      roe: 28.5,
      eps: 39.5,
      dividendYield: 2.1,
      grossMargin: 53.8,
      operatingMargin: 42.5,
      netMargin: 38.6,
      revenueGrowthRate: 24.8,
      returnRate: 48.2,
      peRatio: 26.5,
      pbRatio: 5.8,
      futureGrowth: "高規 AI 晶片 (CoWoS) 供不應求，2nm 先進製程與矽光子技術為中長期強大動能",
      industryNews: "台積電 2 奈米先進製程客戶預訂熱烈，傳將調漲代工價格，市場重估目標價"
    };
  }

  if (symbol === "2454") { // 聯發科
    return {
      revenue: "5,320 億 TWD (年增 15.4%)",
      financialReport: "Q1 財報優於預期，天璣系列 5G 晶片在大陸市占率持續拔得頭籌",
      profitability: "高毛利晶片占比上升，第二季利潤率表現強勁，整體經營效率持續提升",
      majorChips: "董監事持股與外資高比例持有（達 61.2%），主力籌碼流向特定法人手中",
      companyFundamentals: "全球手機與物聯網晶片設計二大龍頭之一，在邊緣端 AI (Edge AI) 擁有核心優勢",
      roe: 22.4,
      eps: 61.8,
      dividendYield: 4.8,
      grossMargin: 47.5,
      operatingMargin: 18.2,
      netMargin: 16.5,
      revenueGrowthRate: 14.8,
      returnRate: 28.5,
      peRatio: 18.2,
      pbRatio: 4.1,
      futureGrowth: "天璣 9400 超智行動晶片平台出貨強勁，車用晶片與自研 ASIC 業務進展順利",
      industryNews: "聯發科與輝達攜手打造車用智能座艙系統，未來 5 年將迎接車載運算爆發期"
    };
  }

  if (symbol === "2382") { // 廣達
    return {
      revenue: "11,850 億 TWD (年增 18.2%)",
      financialReport: "三率三升，毛利率達到 8.2% 創盤後新高，AI 伺服器成營收核心主力",
      profitability: "獲利能力隨高單價 AI 架構伺服器組裝占比大幅擴張，利益率穩健上揚",
      majorChips: "大戶籌碼維持 65% 高集中度，主力連續數週追蹤買超，融資低水位",
      companyFundamentals: "全球頂級筆電與伺服器代工龍頭，與美系雲端巨頭 (CSP) 策略夥伴關係極為緊密",
      roe: 24.1,
      eps: 12.8,
      dividendYield: 3.5,
      grossMargin: 8.4,
      operatingMargin: 4.2,
      netMargin: 3.8,
      revenueGrowthRate: 19.5,
      returnRate: 72.8,
      peRatio: 22.4,
      pbRatio: 3.8,
      futureGrowth: "GB200 高規 AI 液冷伺服器今年正式進入爆發出貨期，AI 業務占比預計翻倍",
      industryNews: "廣達喜迎微軟與亞馬遜 AI 大單，旗下雲達液冷機櫃出貨爆發，外資調高評等至買進"
    };
  }

  if (symbol === "2317") { // 鴻海
    return {
      revenue: "61,620 億 TWD (年增 10.4%)",
      financialReport: "第一季財報表現穩健，因高毛利 AI 伺服器貢獻上升，毛利率高於市場預期",
      profitability: "本業獲利維持穩健。3+3 轉型策略（電動車、數位健康、機器人）有助提升毛利",
      majorChips: "外資與三大法人持股維持 42.5%，散戶籌碼沉澱，近期呈現主力洗盤回補跡象",
      companyFundamentals: "全球規模最大的電子代工巨霸，具備地緣分散與極強的供應鏈垂直整合能力",
      roe: 14.6,
      eps: 10.8,
      dividendYield: 4.2,
      grossMargin: 6.3,
      operatingMargin: 3.1,
      netMargin: 2.5,
      revenueGrowthRate: 12.1,
      returnRate: 35.4,
      peRatio: 15.2,
      pbRatio: 1.6,
      futureGrowth: "AI 伺服器（特別是 Blackwell 架構組裝與散熱）與電動車代工將引領雙位數成長",
      industryNews: "鴻海透露 GB200 正式出貨，預估 2026 年在 AI 伺服器市占率將站穩 4 成以上"
    };
  }

  if (symbol === "2603") { // 長榮
    return {
      revenue: "3,892 億 TWD (年增 42.5%)",
      financialReport: "財報受惠紅海危機繞道及運價(SCFI)暴漲影響，首季 EPS 大幅超越法人預估",
      profitability: "獲利表現受航運運價指數高低影響劇烈，屬於典型高波動循環週期，當前獲利處於波段高峰",
      majorChips: "大戶主力籌碼與投信大舉加碼配息 ETF，主力籌碼吸納力度強，惟融資亦有所攀升",
      companyFundamentals: "全球第七大貨櫃航運商，新船隊配置極具燃油效率，控箱及調度能力居領先地位",
      roe: 18.2,
      eps: 18.5,
      dividendYield: 8.5,
      grossMargin: 24.5,
      operatingMargin: 19.8,
      netMargin: 15.2,
      revenueGrowthRate: 38.6,
      returnRate: 46.5,
      peRatio: 8.2,
      pbRatio: 1.1,
      futureGrowth: "全球塞港與氣候變遷（巴拿馬運河限航）及地緣衝突短期難解，有利高運價維持中短期",
      industryNews: "航運指數 SCFI 本週再度上揚，長榮歐美長程合約換約價格優質，下半年獲利看旺"
    };
  }

  // 2. Generic but highly customized generator using the symbol-based deterministic hash:
  const isSemi = industry === "半導體";
  const isAI = industry === "AI伺服器";
  const isOpto = industry === "光電";
  const isBiotech = industry === "生技";
  const isShip = industry === "航運";
  const isFinance = industry === "金融";

  // Base ranges
  let minEPS = 1.5, maxEPS = 15;
  let minROE = 5, maxROE = 22;
  let minGross = 10, maxGross = 45;
  let minDiv = 2, maxDiv = 6.5;
  let minPE = 10, maxPE = 28;
  let minPB = 1.1, maxPB = 3.5;
  let minRevenueGrowth = -5, maxRevenueGrowth = 45;

  if (isSemi) {
    minEPS = 4.5; maxEPS = 45; minROE = 12; maxROE = 28; minGross = 35; maxGross = 58; minPE = 15; maxPE = 35; minPB = 2.0; maxPB = 6.0; minRevenueGrowth = 10; maxRevenueGrowth = 60;
  } else if (isAI) {
    minEPS = 3.0; maxEPS = 30; minROE = 15; maxROE = 30; minGross = 8; maxGross = 25; minPE = 18; maxPE = 40; minPB = 2.5; maxPB = 5.5; minRevenueGrowth = 15; maxRevenueGrowth = 80;
  } else if (isBiotech) {
    minEPS = -1.0; maxEPS = 12; minROE = -5; maxROE = 18; minGross = 40; maxGross = 85; minPE = 25; maxPE = 65; minPB = 3.0; maxPB = 7.0; minRevenueGrowth = -10; maxRevenueGrowth = 120;
  } else if (isShip) {
    minEPS = 1.0; maxEPS = 25; minROE = 5; maxROE = 25; minGross = 12; maxGross = 35; minPE = 5; maxPE = 12; minPB = 0.8; maxPB = 1.8; minDiv = 5; maxDiv = 10; minRevenueGrowth = -20; maxRevenueGrowth = 90;
  } else if (isFinance) {
    minEPS = 1.2; maxEPS = 7.5; minROE = 8; maxROE = 15; minGross = 70; maxGross = 95; minPE = 10; maxPE = 16; minPB = 0.9; maxPB = 1.7; minDiv = 4.0; maxDiv = 7.0; minRevenueGrowth = 3; maxRevenueGrowth = 15;
  }

  const eps = seedFloat(1, minEPS, maxEPS);
  const roe = seedFloat(2, minROE, maxROE);
  const grossMargin = seedFloat(3, minGross, maxGross);
  const operatingMargin = seedFloat(4, grossMargin * 0.4, grossMargin * 0.85);
  const netMargin = seedFloat(5, operatingMargin * 0.5, operatingMargin * 0.9);
  const dividendYield = seedFloat(6, minDiv, maxDiv);
  const peRatio = seedFloat(7, minPE, maxPE);
  const pbRatio = seedFloat(8, minPB, maxPB);
  const revenueGrowthRate = seedFloat(9, minRevenueGrowth, maxRevenueGrowth);
  const returnRate = seedFloat(10, -5, 85);

  const rawRevenueBillions = seedFloat(11, 20, 480);
  const revenue = `${rawRevenueBillions} 億 TWD (年增 ${revenueGrowthRate > 0 ? "+" : ""}${revenueGrowthRate.toFixed(1)}%)`;

  const financialChoices = [
    "Q1財報優於預期，產品組合優化推升利潤率",
    "財報獲利表現穩健，營業利益率維持在近兩季高檔",
    "存貨去化完畢，毛利率連三季攀升，經營體質明顯改善",
    "研發支出增加致短期費用上升，但毛利率符合預期",
    "受匯兌利益挹注，首季淨利攀升強勁"
  ];
  const financialReport = seedChoice(12, financialChoices);

  const profitChoices = [
    "毛利率與淨利率均見提升，高值化產品出貨順暢",
    "產品組合隨新客戶加入而優化，利潤回升軌跡確立",
    "受惠訂單規模效益，製程良率改善，獲利結構非常優異",
    "本業營運利益擴大，轉投資事業虧損收斂",
    "三率維持良好成長曲線，重返成長軌道"
  ];
  const profitability = seedChoice(13, profitChoices);

  const chipChoices = [
    "外資近期買超轉趨積極，大戶持股比例顯著增加，融資沉澱",
    "主力法人於月線附近呈現橫盤吃貨，籌碼集中度大於 55%",
    "投信積極建倉，主力大戶籌碼被法人有效吸收，呈現鎖股抗跌",
    "融資水位下降至近期新低，特定分點連續數日買盤卡位，散戶洗盤出場",
    "主力持股百分比創近三月最高，前五大主力賣盤竭盡，買超家數集中度好"
  ];
  const majorChips = seedChoice(14, chipChoices);

  const fundamentalChoices = [
    "產業老店，技術品質深具口碑，在台廠供應鏈中極具互補優勢",
    "細分行業領導廠商，受惠客戶多元化，產能利用率持續看漲",
    "主力研發團隊陣容強健，客戶黏著度極高，擁有良好的長期訂單能見度",
    "營運體質乾淨、手握充足充沛現金，抗波動防腐能力極佳",
    "屬垂直整合之要角，市場地位穩固，具有中長期的溢價抗通膨特質"
  ];
  const companyFundamentals = seedChoice(15, fundamentalChoices);

  const growthChoices = [
    "受惠 AI 技術革命催生智慧終端升级，帶動新一代產品週期",
    "下半年新產能即將投入使用，預計整體營收將迎來雙位數強勁躍升",
    "海外新廠投產、國際客戶分散風險的首選代工廠，未來 3 年高速成長",
    "新興利基應用切入顺利，客戶訂單能見度已看至下半年底",
    "高單價新品比例提升與車用/網通比重拉高，未來複合成長率可期"
  ];
  const futureGrowth = seedChoice(16, growthChoices);

  const newsChoices = [
    `${name} 喜迎國際一線大廠追加訂單，今年產力已被一掃而空`,
    `投信發布最新台灣半導體研究報告，看好 ${name} 在低基期循環中的反攻動能`,
    `${name} 前五月累積營收年成長超預期，法人上修今年獲利預測`,
    `應對產能吃緊，${name} 評估啟動新一輪擴建計畫，法人給予 positive 展望`,
    `${name} 精密技術驚艷國際展會，市場傳出大腕客戶尋求戰略結盟`
  ];
  const industryNews = seedChoice(17, newsChoices);

  return {
    revenue,
    financialReport,
    profitability,
    majorChips,
    companyFundamentals,
    roe,
    eps,
    dividendYield,
    grossMargin,
    operatingMargin,
    netMargin,
    revenueGrowthRate,
    returnRate,
    peRatio,
    pbRatio,
    futureGrowth,
    industryNews
  };
}
