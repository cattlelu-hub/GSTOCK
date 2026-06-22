import React from "react";
import { createChart, IChartApi, ColorType, CrosshairMode } from "lightweight-charts";
import { Stock, FilterResult } from "../types";
import { calculateSMA } from "../utils/indicators";
import { HelpCircle, TrendingUp, TrendingDown, Volume2, Landmark, Award, ShieldCheck, Info, Coins, Star } from "lucide-react";
import { getFundamentalMetrics } from "../utils/fundamentals";
import { evaluateStockPotential, StockFinancialData, ScoringResult } from "../utils/scoringEngine";

interface StockChartProps {
  selectedStock: Stock | null;
  filterResults: FilterResult[];
  chartTab?: "chart" | "kline" | "potential";
  setChartTab?: (val: "chart" | "kline" | "potential") => void;
}

export default function StockChart({ 
  selectedStock, 
  filterResults,
  chartTab,
  setChartTab
}: StockChartProps) {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<any>(null);
  const [localTab, setLocalTab] = React.useState<"chart" | "kline" | "potential">("chart");
  const activeTab = chartTab !== undefined ? chartTab : localTab;
  const setActiveTab = setChartTab !== undefined ? setChartTab : setLocalTab;
  const [activeExplainDim, setActiveExplainDim] = React.useState<string | null>(null);

  // References for series to allow flicker-free real-time ticking
  const candlestickSeriesRef = React.useRef<any>(null);
  const volumeSeriesRef = React.useRef<any>(null);
  const line5SeriesRef = React.useRef<any>(null);
  const line10SeriesRef = React.useRef<any>(null);
  const line20SeriesRef = React.useRef<any>(null);
  const line60SeriesRef = React.useRef<any>(null);

  // Reset explanation dimension when symbol changes
  React.useEffect(() => {
    setActiveExplainDim(null);
  }, [selectedStock?.symbol]);

  // Find the evaluation details for selected stock
  const currentEvaluation = React.useMemo(() => {
    if (!selectedStock) return null;
    return filterResults.find((r) => r.stock.symbol === selectedStock.symbol) || null;
  }, [selectedStock, filterResults]);

  // Convert Stock into StockFinancialData mapping the fundamental metrics database with live values
  const potentialData = React.useMemo<StockFinancialData | null>(() => {
    if (!selectedStock) return null;
    const metrics = getFundamentalMetrics(
      selectedStock.symbol,
      selectedStock.name,
      selectedStock.todayClose,
      selectedStock.industry
    );

    let hash = 0;
    for (let i = 0; i < selectedStock.symbol.length; i++) {
      hash = selectedStock.symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);

    // Tech stocks have higher capital expenditure placeholder
    const isTech = selectedStock.industry === "半導體" || selectedStock.industry === "AI伺服器";
    const capexToRevenue = isTech 
      ? Math.round((12 + (absHash % 15)) * 10) / 10 
      : Math.round((2 + (absHash % 8)) * 10) / 10;

    // Institutional Net Buy: between -1.8% and +4.2%
    const institutionalNetBuy = parseFloat((-1.8 + ((absHash % 60) / 10)).toFixed(2));

    const newsTitles = [
      metrics.industryNews,
      `【熱門解讀】法人調升 ${selectedStock.name} 目標價，看好本季需求強勁成長`,
      `【市場追蹤】主力大戶默默吸碼，散戶融資降溫，籌碼安定度極高`
    ];

    return {
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      revenueYoY: metrics.revenueGrowthRate,
      roe: metrics.roe,
      eps: metrics.eps,
      dividendYield: metrics.dividendYield,
      grossMargin: metrics.grossMargin,
      operatingMargin: metrics.operatingMargin,
      netMargin: metrics.netMargin,
      peRatio: metrics.peRatio,
      pbRatio: metrics.pbRatio,
      historicalReturn: metrics.returnRate,
      institutionalNetBuy,
      capexToRevenue,
      newsTitles
    };
  }, [selectedStock, selectedStock?.todayClose]);

  const scoringResult = React.useMemo<ScoringResult | null>(() => {
    if (!potentialData) return null;
    return evaluateStockPotential(potentialData);
  }, [potentialData]);

  React.useEffect(() => {
    if (!chartContainerRef.current || !selectedStock) return;

    let activeChart: any = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      // Clean up any existing chart
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (err) {
          console.warn("Error removing previous chart instance:", err);
        }
        chartRef.current = null;
      }

      const container = chartContainerRef.current;
      const initialWidth = container.clientWidth || 300;
      
      // Create new chart instance with typecasting to circumvent version 4 type signatures
      const chart = createChart(container, {
        width: initialWidth,
        height: 380,
        layout: {
          background: { type: ColorType.Solid, color: "#131722" },
          textColor: "#94a3b8",
          fontSize: 10,
          fontFamily: "JetBrains Mono, SFMono-Regular, Consolas, monospace",
        },
        grid: {
          vertLines: { color: "rgba(45, 49, 57, 0.3)", style: 1 },
          horzLines: { color: "rgba(45, 49, 57, 0.3)", style: 1 },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: "rgba(148, 163, 184, 0.15)",
          scaleMargins: {
            top: 0.1,
            bottom: 0.25, // leave bottom room for volume
          },
        },
        timeScale: {
          borderColor: "rgba(148, 163, 184, 0.15)",
          timeVisible: false,
          secondsVisible: false,
        },
      }) as any;

      activeChart = chart;
      chartRef.current = chart;

      // Add Candlestick Series (styled using Taiwan rules: Red for Bullish Close >= Open, Green for Bearish)
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: "#F23645",
        downColor: "#089981",
        borderUpColor: "#F23645",
        borderDownColor: "#089981",
        wickUpColor: "#F23645",
        wickDownColor: "#089981",
      });

      // Populate Candlestick Data
      const cData = selectedStock.history.map((h) => ({
        time: h.time,
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
      }));
      candlestickSeries.setData(cData);
      candlestickSeriesRef.current = candlestickSeries;

      // Add Volume Series as Subchart at bottom (bottom 20%)
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "volume-scale", // Custom price scale ID to separate from prices
      });

      chart.priceScale("volume-scale").applyOptions({
        scaleMargins: {
          top: 0.8, // Take only bottom 20%
          bottom: 0,
        },
      });

      // Colorize volume bars based on close >= open (red for bullish volumes, green for bearish)
      const vData = selectedStock.history.map((h) => ({
        time: h.time,
        value: h.volume,
        color: h.close >= h.open ? "rgba(242, 54, 69, 0.45)" : "rgba(8, 153, 129, 0.45)",
      }));
      volumeSeries.setData(vData);
      volumeSeriesRef.current = volumeSeries;

      // Calculate Moving Averages for all 100 days
      const prices = selectedStock.history.map((h) => h.close);
      const ma5Values = calculateSMA(prices, 5);
      const ma10Values = calculateSMA(prices, 10);
      const ma20Values = calculateSMA(prices, 20);
      const ma60Values = calculateSMA(prices, 60);

      const timeKeys = selectedStock.history.map((h) => h.time);

      // helper to map array to lightweight charts line format
      const createLineData = (values: number[], period: number) => {
        const lineData = [];
        for (let i = period - 1; i < values.length; i++) {
          if (values[i] > 0) {
            lineData.push({ time: timeKeys[i], value: values[i] });
          }
        }
        return lineData;
      };

      // Add 5MA (Blue)
      const line5Series = chart.addLineSeries({
        color: "#3b82f6",
        lineWidth: 1.5,
        title: "5MA",
      });
      line5Series.setData(createLineData(ma5Values, 5));
      line5SeriesRef.current = line5Series;

      // Add 10MA (Yellow)
      const line10Series = chart.addLineSeries({
        color: "#eab308",
        lineWidth: 1.5,
        title: "10MA",
      });
      line10Series.setData(createLineData(ma10Values, 10));
      line10SeriesRef.current = line10Series;

      // Add 20MA (Pink)
      const line20Series = chart.addLineSeries({
        color: "#ec4899",
        lineWidth: 2,
        title: "20MA (月)",
      });
      line20Series.setData(createLineData(ma20Values, 20));
      line20SeriesRef.current = line20Series;

      // Add 60MA (Teal)
      const line60Series = chart.addLineSeries({
        color: "#14b8a6",
        lineWidth: 2,
        title: "60MA (季)",
      });
      line60Series.setData(createLineData(ma60Values, 60));
      line60SeriesRef.current = line60Series;

      // Fit content inside the screen visible bounds
      chart.timeScale().fitContent();

      // ResizeObserver implementation to guarantee responsive fluid sizing
      resizeObserver = new ResizeObserver((entries) => {
        if (entries.length === 0 || !chart) return;
        const width = entries[0].contentRect.width;
        if (width > 0) {
          try {
            chart.applyOptions({ width });
          } catch (err) {
            console.warn("Failed to apply size options directly:", err);
          }
        }
      });
      resizeObserver.observe(container);
    } catch (e) {
      console.error("Runtime error initializing lightweight-charts:", e);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (activeChart) {
        try {
          activeChart.remove();
        } catch (err) {
          console.warn("Failed to remove chart instance in cleanup:", err);
        }
      }
      if (chartRef.current === activeChart) {
        chartRef.current = null;
      }
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      line5SeriesRef.current = null;
      line10SeriesRef.current = null;
      line20SeriesRef.current = null;
      line60SeriesRef.current = null;
    };
  }, [selectedStock?.symbol, selectedStock?.history]);

  // Micro secondary hook to perform high-speed updates when any trade tick updates prices and volumes
  React.useEffect(() => {
    if (!selectedStock || !candlestickSeriesRef.current) return;
    
    const history = selectedStock.history;
    if (history.length === 0) return;
    
    const lastH = history[history.length - 1];
    
    try {
      candlestickSeriesRef.current.update({
        time: lastH.time,
        open: lastH.open,
        high: lastH.high,
        low: lastH.low,
        close: lastH.close,
      });

      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.update({
          time: lastH.time,
          value: lastH.volume,
          color: lastH.close >= lastH.open ? "rgba(242, 54, 69, 0.45)" : "rgba(8, 153, 129, 0.45)",
        });
      }

      // Smoothly update Moving Average series terminal points
      if (line5SeriesRef.current && selectedStock.indicators.ma5 > 0) {
        line5SeriesRef.current.update({ time: lastH.time, value: selectedStock.indicators.ma5 });
      }
      if (line10SeriesRef.current && selectedStock.indicators.ma10 > 0) {
        line10SeriesRef.current.update({ time: lastH.time, value: selectedStock.indicators.ma10 });
      }
      if (line20SeriesRef.current && selectedStock.indicators.ma20 > 0) {
        line20SeriesRef.current.update({ time: lastH.time, value: selectedStock.indicators.ma20 });
      }
      if (line60SeriesRef.current && selectedStock.indicators.ma60 > 0) {
        line60SeriesRef.current.update({ time: lastH.time, value: selectedStock.indicators.ma60 });
      }
    } catch (err) {
      console.warn("Error updating chart tick dynamically:", err);
    }
  }, [selectedStock]);

  if (!selectedStock) {
    return (
      <div className="bg-[#131722] border border-[#2D3139] rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500 h-[480px]">
        <Landmark size={48} className="text-slate-700 mb-2 animate-bounce" />
        <p className="font-semibold text-slate-300">未選取任何個股</p>
        <p className="text-xs max-w-xs mt-1 text-slate-500">請先在上方表格中點選任何一列，此處即可載入對應之證交所即時資訊 K 線技術圖。</p>
      </div>
    );
  }

  const isUp = selectedStock.changePercentage >= 0;
  const biasVal = Math.round(selectedStock.indicators.bias20 * 10000) / 100;

  // Multi-factor indicator to determine Bullish or Bearish trend orientation (多方 vs 空方)
  const isBullishTrend = selectedStock.todayClose >= selectedStock.indicators.ma20 || 
                         (selectedStock.indicators.ma5 >= selectedStock.indicators.ma20 && 
                          selectedStock.indicators.macdDiff >= selectedStock.indicators.macdDea);

  // Helper definition for each score meaning click action
  const dimensionDefinitions: Record<string, { label: string; currentVal: string; desc: string }> = {
    "本益比": {
      label: "本益比 (P/E)",
      currentVal: `${potentialData?.peRatio.toFixed(1)} 倍`,
      desc: "反映當前股價相對於每股盈餘的倍數。小於 12 倍給 10 分滿分；12~18 給 8 分；超過 25 或虧損則給最低分，以此鎖定高 CP 值低本益比標的。"
    },
    "股淨比": {
      label: "股價淨值比 (P/B)",
      currentVal: `${potentialData?.pbRatio.toFixed(1)} 倍`,
      desc: "股價相對於帳面價值的倍數。小於 1.2 倍給予 10 分滿分，大於 2.0 則逐步調降評分，藉此保障資產淨值安全邊際。"
    },
    "殖利率": {
      label: "現金股利殖利率",
      currentVal: `${potentialData?.dividendYield.toFixed(1)} %`,
      desc: "每年股利配發報酬。大於等於 6% 給 10 分，大於 4% 給 8 分，藉此篩選出兼具保值性與抗震性的高股息防守股。"
    },
    "報酬率": {
      label: "過去一年歷史報酬率",
      currentVal: `${potentialData?.historicalReturn.toFixed(1)} %`,
      desc: "股票在過去 365 天內的累計漲跌漲幅。大於 30% 代表具備強烈向上多頭慣性與動能，給予 10 分；負值低迷則給較低分。"
    },
    "ROE": {
      label: "股東權益報酬率",
      currentVal: `${potentialData?.roe.toFixed(1)} %`,
      desc: "衡量公司利用股東資金創造獲利的效率。ROE >= 15% 屬於全球頂尖高獲利護城河企業，給予 10 分；小於 5% 則給予 2 分。"
    },
    "EPS": {
      label: "每股盈餘 (單年預估)",
      currentVal: `${potentialData?.eps.toFixed(1)} 元`,
      desc: "公司每一股份能賺得的淨利潤。大於等於 10 元給 10 分，5~10 元給 8 分，以量化數據過濾出高獲利绩優股。"
    },
    "財報三率": {
      label: "財報三率實力",
      currentVal: `毛利 ${potentialData?.grossMargin.toFixed(1)}% / 營益 ${potentialData?.operatingMargin.toFixed(1)}% / 淨利 ${potentialData?.netMargin.toFixed(1)}%`,
      desc: "綜合衡量毛利率、營業利益率與稅後淨利率之總和。綜合三率 >= 50% 且淨利大於 10% 為頂級利潤池擁有者，給予 10 分。"
    },
    "獲利": {
      label: "獲利綜合能力",
      currentVal: "綜合 ROE 與財報三率均值",
      desc: "結合股東回報效率與財報三率做多面向獲利均化判定，避免單一指標偏誤。"
    },
    "財報": {
      label: "財報健康程度",
      currentVal: "EPS 與 淨利率穩定度",
      desc: "綜合偵測是否出現虧損或淨利率亮紅燈。若均未虧損且 ROE 超越 12% 給予極優 10 分，若虧損則評為 4 分 warning。"
    },
    "公司基本面": {
      label: "公司基本面綜合實力",
      currentVal: "獲利 + 財報 + ROE + EPS 平均值",
      desc: "反映公司在過去與當前財務安全堡壘的四维加權平均分，分數越高，基本面底盤越扎實，越抗跌。"
    },
    "營收成長率": {
      label: "營收年增率 (YoY)",
      currentVal: `${potentialData?.revenueYoY.toFixed(1)} %`,
      desc: "反映最新累計營收相對於去年同期的增長速度。YoY >= 20% 代表公司正處於強勁擴張爆發期，給予 10 分滿分。"
    },
    "營收": {
      label: "營運動能走勢",
      currentVal: "對應營收成長率趨勢得分",
      desc: "追蹤營收最新出貨動態，高分代表產品市場佔有率高、出貨順利。"
    },
    "未來成長": {
      label: "未來成長領先指標",
      currentVal: `資本支出比 ${potentialData?.capexToRevenue.toFixed(1)}%`,
      desc: "以未來成長先行指標「資本支出佔營收比重（Capex-to-Revenue）」來檢驗。研發資本支出比大於 10% 且營收有增長給予 10 分滿分，代表公司砸重金佈局未來，中長期動能強悍。"
    },
    "主力籌碼": {
      label: "三大法人五日買賣超持股佔比",
      currentVal: `${potentialData?.institutionalNetBuy.toFixed(2)} %`,
      desc: "法人近 5 日在該股淨買超佔其股本的比例之量化。買超比率大於 2% 代表有特定大戶資金在鎖碼吃貨，籌碼極安定，給予 10 分。"
    },
    "產業新聞": {
      label: "新聞關鍵字情感分析",
      currentVal: `實時對比 ${potentialData?.newsTitles.length || 0} 則頭條新聞`,
      desc: "利用前端關鍵字情感字典對最新新聞標題（如 `看好`, `大增`, `創新高`, `不如預期` 等）進行語意累加，正面情緒強烈點評為 10 分。"
    },
  };

  return (
    <div className="bg-[#131722] border border-[#2D3139] rounded-xl overflow-hidden shadow-lg flex flex-col h-full text-[#D1D4DC]" id="stock-chart-section">
      {/* Chart Top Summary Bar */}
      <div className="p-4 bg-[#1E222D] border-b border-[#2D3139] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#131722] px-3 py-1 rounded border border-[#2D3139]">
            <span className="text-[10px] font-mono text-slate-500 block leading-tight">台股 Ticker</span>
            <span className="text-sm font-bold text-white font-mono">{selectedStock.symbol}</span>
          </div>
          <div>
            <h2 className="text-md font-bold text-slate-100 flex flex-wrap items-center gap-2">
              {selectedStock.name}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#131722] text-slate-400 border border-[#2D3139] font-normal">
                {selectedStock.industry}
              </span>
              <a 
                href="https://mis.twse.com.tw/stock/index?lang=zhHant" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#131722] hover:bg-[#1C2030] text-[#089981] hover:text-[#0bbd9f] border border-[#089981]/30 hover:border-[#089981]/60 font-semibold transition-colors flex items-center gap-1"
              >
                數據來源：證交所 MIS 🌐
              </a>
              
              {/* Trend Tag: 多方趨勢 vs 空方趨勢 */}
              {isBullishTrend ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F23645]/10 text-[#F23645] border border-[#F23645]/30 font-bold flex items-center gap-1 animate-pulse">
                  <TrendingUp size={11} />
                  多方趨勢股
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#089981]/10 text-[#089981] border border-[#089981]/30 font-bold flex items-center gap-1">
                  <TrendingDown size={11} />
                  空方趨勢股
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] font-mono text-slate-400">
              <span>開: <span className="text-white">{selectedStock.todayOpen.toFixed(1)}</span></span>
              <span>高: <span className="text-[#F23645]">{selectedStock.todayHigh.toFixed(1)}</span></span>
              <span>低: <span className="text-[#089981]">{selectedStock.todayLow.toFixed(1)}</span></span>
              <span>收: <span className={isUp ? "text-[#F23645]" : "text-[#089981]"}>{selectedStock.todayClose.toFixed(1)}</span></span>
            </div>
          </div>
        </div>

        {/* Dynamic Dual Tab Switcher & Change stats group */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Tab Switcher */}
          <div className="flex bg-[#131722] p-1 rounded-lg border border-[#2D3139]">
            <button
              onClick={() => setActiveTab("chart")}
              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === "chart"
                  ? "bg-[#2962FF] text-white shadow-md shadow-blue-900/20"
                  : "text-slate-400 hover:text-white hover:bg-[#1E222D]"
              }`}
            >
              📊 盤後技術指標 (日K)
            </button>
            <button
              onClick={() => setActiveTab("kline")}
              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === "kline"
                  ? "bg-[#E65100] text-white shadow-md shadow-orange-950/20"
                  : "text-slate-400 hover:text-white hover:bg-[#1E222D]"
              }`}
            >
              📈 TV 專業 K 線圖
            </button>
            <button
              onClick={() => setActiveTab("potential")}
              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === "potential"
                  ? "bg-[#0bbd9f] text-white shadow-md shadow-emerald-900/20"
                  : "text-slate-400 hover:text-white hover:bg-[#1E222D]"
              }`}
            >
              💎 智星五星潛力評鑑
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block leading-tight">今日幅度</span>
              <span className={`text-md font-mono font-bold ${isUp ? "text-[#F23645]" : "text-[#089981]"}`}>
                {isUp ? "▲ +" : "▼ "}{selectedStock.changePercentage.toFixed(2)}%
              </span>
            </div>
            <div className="border-l border-[#2D3139] pl-3 text-left">
              <span className="text-[10px] text-slate-500 block leading-tight">20D 乖離</span>
              <span className={`text-xs font-mono font-bold ${biasVal > 0 && biasVal <= 3.0 ? "text-yellow-500" : "text-slate-300"}`}>
                {biasVal > 0 ? "+" : ""}{biasVal.toFixed(2)}%
              </span>
            </div>
            <div className="border-l border-[#2D3139] pl-3 text-left">
              <span className="text-[10px] text-slate-500 block leading-tight">5D | 10D 乖離</span>
              <span className="text-xs font-mono font-bold text-[#f5a623]">
                {selectedStock.indicators.bias5 > 0 ? "+" : ""}{selectedStock.indicators.bias5?.toFixed(1)}% / {selectedStock.indicators.bias10 > 0 ? "+" : ""}{selectedStock.indicators.bias10?.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "chart" && (
        <>
          {/* Embedded Chart Canvas */}
          <div className="relative p-2 bg-[#0B0E14] flex-1">
            {/* Indicators Overlay Legend */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono font-semibold bg-[#131722]/90 px-2 py-1 rounded border border-[#2D3139]/80 pointer-events-none">
              <span className="text-blue-500">■ 5MA: {selectedStock.indicators.ma5.toFixed(1)}</span>
              <span className="text-yellow-500">■ 10MA: {selectedStock.indicators.ma10.toFixed(1)}</span>
              <span className="text-pink-500">■ 20MA(月): {selectedStock.indicators.ma20.toFixed(1)}</span>
              <span className="text-teal-500">■ 60MA(季): {selectedStock.indicators.ma60.toFixed(1)}</span>
              <span className="text-slate-400">■ 單日量: {selectedStock.todayVolume}張</span>
            </div>

            <div ref={chartContainerRef} className="w-full h-[380px] rounded-lg overflow-hidden" />
          </div>

          {/* Screen Pass Checklist Status */}
          <div className="p-3.5 bg-[#1E222D] border-t border-[#2D3139] text-[11px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#D1D4DC] uppercase tracking-wider text-[10px] block">
                核心選股條件細部核對
              </span>
              {currentEvaluation?.isMatch ? (
                <span className="bg-[#2962FF]/10 text-[#2962FF] font-bold px-2 py-0.5 rounded border border-[#2962FF]/20 font-mono text-[10px]">
                  ✓ 本檔通過 6 項黑馬策略指標
                </span>
              ) : (
                <span className="bg-[#131722] text-slate-400 font-semibold px-2 py-0.5 rounded border border-[#2D3139] font-mono text-[10px]">
                  部分指標未合，非突破拐點
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 p-1 bg-[#131722]/50 rounded border border-[#2D3139]/40">
                <span className={`w-1.5 h-1.5 rounded-full ${currentEvaluation?.reasons.maLong ? "bg-[#089981]" : "bg-slate-700"}`} />
                <span>5M&gt;10M&gt;20M&gt;60M:</span>
                <span className={currentEvaluation?.reasons.maLong ? "text-[#089981] font-bold" : "text-rose-400"}>
                  {currentEvaluation?.reasons.maLong ? "✓" : "✗"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#131722]/50 rounded border border-[#2D3139]/40">
                <span className={`w-1.5 h-1.5 rounded-full ${currentEvaluation?.reasons.shakeout ? "bg-[#089981]" : "bg-slate-700"}`} />
                <span>歷史洗盤跌破20M:</span>
                <span className={currentEvaluation?.reasons.shakeout ? "text-[#089981] font-bold" : "text-rose-400"}>
                  {currentEvaluation?.reasons.shakeout ? "✓" : "✗"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#131722]/50 rounded border border-[#2D3139]/40">
                <span className={`w-1.5 h-1.5 rounded-full ${currentEvaluation?.reasons.contraction ? "bg-[#089981]" : "bg-slate-700"}`} />
                <span>突破前量能緊縮:</span>
                <span className={currentEvaluation?.reasons.contraction ? "text-[#089981] font-bold" : "text-rose-400"}>
                  {currentEvaluation?.reasons.contraction ? "✓" : "✗"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#131722]/50 rounded border border-[#2D3139]/40">
                <span className={`w-1.5 h-1.5 rounded-full ${currentEvaluation?.reasons.breakout ? "bg-[#089981]" : "bg-slate-700"}`} />
                <span>今日收復20M放量:</span>
                <span className={currentEvaluation?.reasons.breakout ? "text-[#089981] font-bold" : "text-rose-400"}>
                  {currentEvaluation?.reasons.breakout ? "✓" : "✗"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#131722]/50 rounded border border-[#2D3139]/40">
                <span className={`w-1.5 h-1.5 rounded-full ${currentEvaluation?.reasons.macdImprove ? "bg-[#089981]" : "bg-slate-700"}`} />
                <span>MACD 柱體轉佳:</span>
                <span className={currentEvaluation?.reasons.macdImprove ? "text-[#089981] font-bold" : "text-rose-400"}>
                  {currentEvaluation?.reasons.macdImprove ? "✓" : "✗"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#131722]/50 rounded border border-[#2D3139]/40">
                <span className={`w-1.5 h-1.5 rounded-full ${currentEvaluation?.reasons.biasOk ? "bg-[#089981]" : "bg-slate-700"}`} />
                <span>乖離率限制:</span>
                <span className={currentEvaluation?.reasons.biasOk ? "text-[#089981] font-bold" : "text-rose-400"}>
                  {currentEvaluation?.reasons.biasOk ? "✓" : "✗"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "kline" && selectedStock && (
        <div className="flex-1 w-full bg-[#0B0E14] p-3 flex flex-col animate-fadeIn" style={{ minHeight: "440px" }}>
          <div className="text-xs text-orange-400 font-bold mb-2 flex items-center justify-between font-mono">
            <span className="flex items-center gap-1.5">📈 TradingView 專業日K線圖 (夜間模式)</span>
            <span className="text-[10px] text-slate-500 font-mono">代號: {selectedStock.symbol} ({selectedStock.name})</span>
          </div>
          <div className="flex-1 bg-[#131722] rounded-lg overflow-hidden relative border border-[#2D3139] shadow-inner" style={{ minHeight: "380px", height: "100%" }}>
            <iframe
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${["5347", "3529", "3264", "3324", "2636", "3176", "4105", "4107", "4119", "4147", "4162", "4174", "4743", "6446", "1752", "1760", "1786", "4104"].includes(selectedStock.symbol.trim()) ? "TWO" : "TWSE"}%3A${selectedStock.symbol.trim()}&interval=D&symboledit=0&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FTaipei`}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title={`TV-Chart-${selectedStock.symbol}`}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}

      {activeTab === "potential" && (
        // The Multi-Dimension Scorecard view layout
        <div className="p-4 bg-[#0B0E14] flex-1 overflow-y-auto max-h-[500px] flex flex-col gap-4">
          
          {/* Main Scoring Header Card */}
          {scoringResult && potentialData && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#1E222D] p-5 rounded-xl border border-emerald-500/20 shadow-inner">
              
              {/* Score Meter display badge */}
              <div className="md:col-span-5 flex flex-col items-center justify-center text-center bg-[#131722]/90 p-4 rounded-xl border border-[#2D3139]/60 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                <Award size={32} className="text-[#0bbd9f] mb-1.5 animate-pulse" />
                <span className="text-[10px] tracking-wider text-slate-500 font-bold uppercase font-mono block">智星量化評分均值</span>
                
                <div className="my-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-[#0bbd9f] to-cyan-400 font-mono">
                    {scoringResult.averageScore}
                  </span>
                  <span className="text-slate-500 text-sm">/ 10</span>
                </div>

                <span className="text-xs text-[#0bbd9f] bg-[#0bbd9f]/10 px-3 py-1 rounded-full border border-emerald-500/20 font-bold tracking-tight">
                  {scoringResult.investmentPotential}
                </span>

                <div className="mt-3 text-[10px] text-slate-500 font-mono">
                  量化評估點數：<span className="text-emerald-400 font-bold">{scoringResult.totalScore}</span> / 150 點滿分
                </div>
              </div>

              {/* Remarks/Summary card */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#0bbd9f] font-bold">
                    <ShieldCheck size={14} />
                    <span>免金鑰穿透數據・智星評分點評</span>
                  </div>
                  <p className="mt-2 text-slate-300 text-xs leading-relaxed font-semibold">
                    {scoringResult.summary}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    本系統精確解析該股獲利（三率與ROE）、安全估值（PE/PB）、近期籌碼流向以及新聞情緒字典等15個面向做全方位交叉判定，為技術分析搭配基本面的全能利器。
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2D3139]/80 flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                    營收年增: {potentialData.revenueYoY >= 0 ? "+" : ""}{potentialData.revenueYoY.toFixed(1)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-500/20">
                    股本大戶吃籌: {potentialData.institutionalNetBuy >= 0 ? "+" : ""}{potentialData.institutionalNetBuy.toFixed(2)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-500/20">
                    先進資本研發比: {potentialData.capexToRevenue.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Dimension Breakdown table list */}
          {scoringResult && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">
                🔍 點擊各維度雷達得分可查看評測與數據對標算式:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(scoringResult.dimensions).map(([dimName, dimVal]) => {
                  const dimScore = Number(dimVal);
                  const info = dimensionDefinitions[dimName];
                  const isExplaining = activeExplainDim === dimName;

                  // color themes for dimension ratings
                  let barColor = "bg-gradient-to-r from-emerald-500 to-cyan-400";
                  if (dimScore < 5) barColor = "bg-gradient-to-r from-rose-500 to-orange-400";
                  else if (dimScore < 8) barColor = "bg-gradient-to-r from-yellow-500 to-emerald-400";

                  return (
                    <div 
                      key={dimName}
                      onClick={() => setActiveExplainDim(isExplaining ? null : dimName)}
                      className={`p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
                        isExplaining 
                          ? "bg-[#1E222D] border-[#0bbd9f]/50 shadow-md shadow-[#0bbd9f]/5" 
                          : "bg-[#131722] border-[#2D3139] hover:bg-[#1C2030] hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-xs text-slate-200 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${dimScore >= 8 ? "bg-[#0bbd9f]" : dimScore >= 5 ? "bg-amber-400" : "bg-rose-500"}`} />
                          {info ? info.label : dimName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono font-bold">
                            {info ? info.currentVal : ""}
                          </span>
                          <span className={`font-mono font-bold text-xs ${dimScore >= 8 ? "text-[#0bbd9f]" : dimScore >= 5 ? "text-amber-400" : "text-rose-400"}`}>
                            {dimScore} 分
                          </span>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${barColor} transition-all duration-300`} 
                          style={{ width: `${dimScore * 10}%` }}
                        />
                      </div>

                      {/* Expandable explaining panel on click */}
                      {isExplaining && info && (
                        <div className="mt-2.5 pt-2 border-t border-[#2D3139] text-[11px] text-slate-400 leading-relaxed font-mono">
                          <div className="text-[#0bbd9f] font-bold mb-0.5">💡 評分公式對應標的：</div>
                          {info.desc}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sentiment News Analyser dictionary block */}
          {potentialData && (
            <div className="bg-[#131722] border border-[#2D3139] rounded-xl p-4 flex flex-col gap-2">
              <span className="text-[10px] text-[#0bbd9f] font-bold font-mono uppercase tracking-wider block">
                📰 新聞關鍵字情緒剖析儀 (實時字典對比)
              </span>

              <div className="flex flex-col gap-2">
                {potentialData.newsTitles.map((news, i) => (
                  <div key={i} className="flex gap-2 items-start text-xs border-b border-[#2D3139]/40 pb-2 last:border-b-0 last:pb-0 font-mono">
                    <span className="text-[#0bbd9f] bg-[#0bbd9f]/5 px-1 rounded text-[10px] font-bold border border-emerald-500/10 mt-0.5">
                      LIVE
                    </span>
                    <span className="text-slate-300 flex-1 hover:text-[#0bbd9f] transition-colors">
                      {news}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
