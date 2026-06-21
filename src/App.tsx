/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { generateStockMarket } from "./utils/stockGenerator";
import { evaluateScreener, computeIndicators } from "./utils/indicators";
import { Stock, FilterResult } from "./types";
import { fetchYahooStockHistory, fetchYahooRealTimeTick } from "./utils/yahooService";
import IndustryBoard from "./components/IndustryBoard";
import ScreenerControl from "./components/ScreenerControl";
import StockTable from "./components/StockTable";
import StockChart from "./components/StockChart";
import GeminiReport from "./components/GeminiReport";
import { TrendingUp, RefreshCw, BarChart3, Radio, Info } from "lucide-react";

// Helper to compute Taiwan time status (UTC+8)
const getTaiwanMarketStatus = () => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  };

  try {
    const formatter = new Intl.DateTimeFormat('zh-TW', options);
    const parts = formatter.formatToParts(new Date());
    
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const dayVal = parts.find(p => p.type === 'day')?.value || '';
    const hourVal = parts.find(p => p.type === 'hour')?.value || '00';
    const minVal = parts.find(p => p.type === 'minute')?.value || '00';
    const secVal = parts.find(p => p.type === 'second')?.value || '00';
    
    const d = new Date();
    // In local time to get correct weekday aligned with Asia/Taipei
    // To match actual day of week in Taipei, let's calculate based on the parts
    // but a simpler way is to construct a date object with the Taipei date
    const twDate = new Date(`${year}-${month}-${dayVal}T${hourVal}:${minVal}:${secVal}`);
    const day = twDate.getDay();
    const hours = parseInt(hourVal, 10);
    const minutes = parseInt(minVal, 10);

    const isWeekday = day >= 1 && day <= 5;
    const timeInMinutes = hours * 60 + minutes;
    
    // Taiwan Standard Trading Hours: Monday - Friday, 09:00 - 13:30 (540 mins to 810 mins)
    const startMins = 9 * 60;
    const endMins = 13 * 60 + 30;
    const isTradingHours = isWeekday && (timeInMinutes >= startMins && timeInMinutes <= endMins);
    
    const weekdayString = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][day];

    return {
      isTradingHours,
      timeString: `${hourVal}:${minVal}:${secVal}`,
      dateString: `${year}/${month}/${dayVal}`,
      weekdayString: `(${weekdayString})`,
      isWeekday,
    };
  } catch (err) {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isWeekday = day >= 1 && day <= 5;
    const isTradingHours = isWeekday && ((hours * 60 + minutes) >= 540 && (hours * 60 + minutes) <= 810);
    return {
      isTradingHours,
      timeString: now.toLocaleTimeString("zh-TW", { hour12: false }),
      dateString: now.toLocaleDateString("zh-TW"),
      weekdayString: `(${["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][day]})`,
      isWeekday,
    };
  }
};

export default function App() {
  const [stocks, setStocks] = React.useState<Stock[]>([]);
  const [keyword, setKeyword] = React.useState<string>("");
  const [selectedStock, setSelectedStock] = React.useState<Stock | null>(null);
  const [showOnlyMatches, setShowOnlyMatches] = React.useState<boolean>(true);
  const [countdown, setCountdown] = React.useState<number>(5);
  const [marketMode, setMarketMode] = React.useState<"strict" | "always">("always"); // Default always to keep tickers dynamic
  const [twStatus, setTwStatus] = React.useState(getTaiwanMarketStatus());

  // Yahoo Finance synchronization states
  const [isSyncingYahoo, setIsSyncingYahoo] = React.useState<boolean>(false);
  const [yahooSyncProgress, setYahooSyncProgress] = React.useState<number>(0);
  const [yahooSyncStatus, setYahooSyncStatus] = React.useState<string>("");

  // Update Taiwan Clock status every second
  React.useEffect(() => {
    const clockInterval = setInterval(() => {
      setTwStatus(getTaiwanMarketStatus());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Initialize stock database on mount
  React.useEffect(() => {
    const market = generateStockMarket();
    setStocks(market);

    // Run screener on initial dataset to pre-select the first matching stock
    const matches = market
      .map((s) => evaluateScreener(s, ""))
      .filter((res) => res.isMatch);

    if (matches.length > 0) {
      setSelectedStock(matches[0].stock);
    } else if (market.length > 0) {
      setSelectedStock(market[0]);
    }
  }, []);

  // Auto-select and refresh stock details if keyword matches a stock symbol or name
  React.useEffect(() => {
    if (!keyword) return;
    const trimmed = keyword.trim().toLowerCase();
    
    const found = stocks.find(
      (s) => s.symbol.toLowerCase() === trimmed || s.name.toLowerCase() === trimmed
    );
    if (found) {
      setSelectedStock(found);
    } else {
      // Also match prefix support if user inputs 4 digits to enable instant select on code
      if (trimmed.length >= 4) {
        const prefixFound = stocks.find(
          (s) => s.symbol.toLowerCase().startsWith(trimmed) || s.name.toLowerCase().startsWith(trimmed)
        );
        if (prefixFound) {
          setSelectedStock(prefixFound);
        }
      }
    }
  }, [keyword, stocks]);

  // Compute live filter results whenever stocks list, keyword, or time minutes changes
  const filterResults = React.useMemo(() => {
    const timeMins = twStatus.timeString ? twStatus.timeString.slice(0, 5) : null;
    return stocks.map((s) => evaluateScreener(s, keyword, timeMins));
  }, [stocks, keyword, twStatus.timeString ? twStatus.timeString.slice(0, 5) : ""]);

  // Handle a click-to-screen from the industry board
  const handleSelectIndustry = (indName: string) => {
    setKeyword(indName);
    setShowOnlyMatches(true); // Automatically toggle to show matches for this industry
  };

  // Re-run filter button
  const handleRunScreener = () => {
    // Explicitly enforce view matches only
    setShowOnlyMatches(true);
    
    // Auto-select the first matching stock from the current filtered set if any exist
    const activeMatches = filterResults.filter((r) => r.isMatch);
    if (activeMatches.length > 0) {
      setSelectedStock(activeMatches[0].stock);
    }
  };

  // 1. One-click Yahoo Finance and Taiwan Stock Exchange Sync
  const handleYahooSyncAll = async () => {
    setIsSyncingYahoo(true);
    setYahooSyncProgress(0);
    setYahooSyncStatus("正在穿透連線 Yahoo 財經、證交所伺服器...");

    const targetList = [
      "2330", "2454", "2317", "2308", "3008", 
      "2382", "3231", "2603", "2303", "2609", 
      "3711", "2409", "3481", "2618", "2610"
    ];

    let successCount = 0;
    let currentList = [...stocks];

    for (let i = 0; i < targetList.length; i++) {
      const sym = targetList[i];
      setYahooSyncStatus(`正在拉取個股 ${sym} 的最新交易歷史與即時數據...`);
      setYahooSyncProgress(Math.round((i / targetList.length) * 100));

      try {
        const history = await fetchYahooStockHistory(sym);
        if (history && history.length > 0) {
          const indicators = computeIndicators(history);
          const lastH = history[history.length - 1];
          const prevH = history[history.length - 2] || lastH;
          const changePerc = Math.round(((lastH.close - prevH.close) / prevH.close) * 10000) / 100;

          currentList = currentList.map((s) => {
            if (s.symbol === sym) {
              return {
                ...s,
                history,
                indicators,
                changePercentage: changePerc,
                todayClose: lastH.close,
                todayOpen: lastH.open,
                todayHigh: lastH.high,
                todayLow: lastH.low,
                todayVolume: lastH.volume,
                isYahooSynced: true
              };
            }
            return s;
          });
          successCount++;
        }
      } catch (err) {
        console.warn(`Yahoo sync failed for ${sym}:`, err);
      }
    }

    setStocks(currentList);
    setYahooSyncProgress(100);
    setYahooSyncStatus(`同步完成！成功載入 ${successCount} 檔 證交所/Yahoo! 實時代表股 K 線，其餘個股將在您點選時在背景即時連網載入。`);
    
    // Automatically perform a screener evaluation to update selection
    setTimeout(() => {
      setIsSyncingYahoo(false);
      // Auto-select first matching black horse if available
      const activeMatches = currentList
        .map((s) => evaluateScreener(s, keyword))
        .filter((r) => r.isMatch);
      if (activeMatches.length > 0) {
        setSelectedStock(activeMatches[0].stock);
      }
    }, 2500);
  };

  // 2. On-Demand background stock sync when clicked/selected
  const syncedSymbolsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!selectedStock) return;
    if (syncedSymbolsRef.current.has(selectedStock.symbol)) return;

    const runOnDemandSync = async () => {
      try {
        const symbolToSync = selectedStock.symbol;
        // Mark as syncing to avoid duplicate calls
        syncedSymbolsRef.current.add(symbolToSync);

        const history = await fetchYahooStockHistory(symbolToSync);
        if (history && history.length > 0) {
          const indicators = computeIndicators(history);
          const lastH = history[history.length - 1];
          const prevH = history[history.length - 2] || lastH;
          const changePerc = Math.round(((lastH.close - prevH.close) / prevH.close) * 10000) / 100;

          setStocks((prevStocks) =>
            prevStocks.map((s) => {
              if (s.symbol === symbolToSync) {
                return {
                  ...s,
                  history,
                  indicators,
                  changePercentage: changePerc,
                  todayClose: lastH.close,
                  todayOpen: lastH.open,
                  todayHigh: lastH.high,
                  todayLow: lastH.low,
                  todayVolume: lastH.volume,
                  isYahooSynced: true
                };
              }
              return s;
            })
          );
        }
      } catch (e) {
        console.warn(`On-demand select sync failed for ${selectedStock.symbol}:`, e);
      }
    };

    runOnDemandSync();
  }, [selectedStock?.symbol]);

  // 3. startLiveUpdateEngine() - 擬真與真實雙引擎盤中 Tick 跳動定時器 (每 2 秒執行一次)
  React.useEffect(() => {
    const liveTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 5;
        return prev - 1;
      });

      setStocks((currentStocks) => {
        if (currentStocks.length === 0) return currentStocks;

        return currentStocks.map((stock) => {
          // If this stock is the active selected stock, perform higher-amplitude shadow ticks
          const isSelected = selectedStock && stock.symbol === selectedStock.symbol;
          const isTrading = twStatus.isTradingHours;
          const shouldTick = marketMode === "always" || isTrading;

          if (!shouldTick) return stock;

          const deltaFactor = isSelected ? 0.0016 : 0.0005;
          const delta = (Math.random() - 0.49) * deltaFactor;
          
          const originalClose = stock.todayClose;
          const newClose = Math.round(originalClose * (1 + delta) * 10) / 10;
          
          const updatedHistory = [...stock.history];
          const todayIdx = updatedHistory.length - 1;
          if (todayIdx >= 0) {
            const updatedToday = { ...updatedHistory[todayIdx] };
            updatedToday.close = newClose;
            updatedToday.high = Math.round(Math.max(updatedToday.high, newClose) * 10) / 10;
            updatedToday.low = Math.round(Math.min(updatedToday.low, newClose) * 10) / 10;
            updatedHistory[todayIdx] = updatedToday;
          }

          // Recalculate indicators with updated close price
          const lastIndices = updatedHistory.length - 1;
          const yesterdayClose = updatedHistory[lastIndices - 1]?.close || originalClose;
          const changePercentage = Math.round(((newClose - yesterdayClose) / yesterdayClose) * 10000) / 100;
          const indicators = computeIndicators(updatedHistory);

          return {
            ...stock,
            todayClose: newClose,
            todayHigh: Math.max(stock.todayHigh, newClose),
            todayLow: Math.min(stock.todayLow, newClose),
            changePercentage,
            history: updatedHistory,
            indicators
          };
        });
      });
    }, 2000);

    return () => clearInterval(liveTimer);
  }, [selectedStock, marketMode, twStatus.isTradingHours]);

  // 4. Periodic background real-time quote sync (every 14s) from Yahoo APIs directly
  React.useEffect(() => {
    if (!selectedStock) return;

    const tickerInterval = setInterval(async () => {
      try {
        const liveTick = await fetchYahooRealTimeTick(selectedStock.symbol);
        if (liveTick) {
          setStocks((prevStocks) =>
            prevStocks.map((s) => {
              if (s.symbol === selectedStock.symbol) {
                const updatedHistory = [...s.history];
                const todayIdx = updatedHistory.length - 1;
                if (todayIdx >= 0) {
                  const updatedToday = { ...updatedHistory[todayIdx] };
                  updatedToday.close = liveTick.price;
                  updatedToday.high = Math.max(updatedToday.high, liveTick.high);
                  updatedToday.low = Math.min(updatedToday.low, liveTick.low);
                  updatedHistory[todayIdx] = updatedToday;
                }
                const lastIndices = updatedHistory.length - 1;
                const yesterdayClose = updatedHistory[lastIndices - 1]?.close || s.todayClose;
                const changePercentage = Math.round(((liveTick.price - yesterdayClose) / yesterdayClose) * 10000) / 100;
                const indicators = computeIndicators(updatedHistory);

                return {
                  ...s,
                  todayClose: liveTick.price,
                  todayHigh: Math.max(s.todayHigh, liveTick.high),
                  todayLow: Math.min(s.todayLow, liveTick.low),
                  todayVolume: liveTick.volume || s.todayVolume,
                  changePercentage,
                  history: updatedHistory,
                  indicators,
                  isYahooSynced: true
                };
              }
              return s;
            })
          );
        }
      } catch (e) {
        console.warn("Real-time background tick sync failed:", e);
      }
    }, 14000);

    return () => clearInterval(tickerInterval);
  }, [selectedStock?.symbol]);

  // Make sure selected stock stays fully up-to-date with computed ticking prices
  const activeSelectedStock = React.useMemo(() => {
    if (!selectedStock) return null;
    return stocks.find((s) => s.symbol === selectedStock.symbol) || selectedStock;
  }, [stocks, selectedStock]);

  const matchCount = React.useMemo(() => {
    return filterResults.filter((r) => r.isMatch).length;
  }, [filterResults]);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#D1D4DC] flex flex-col font-sans" id="main-frame-container">
      {/* Visual Navigation Header Banner */}
      <header className="bg-[#131722] border-b border-[#2D3139] shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#F23645] px-1.5 py-0.5 rounded text-sm text-white font-bold tracking-tight">
              TW
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h1 className="text-md sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  量化選股專業版
                  <span className="bg-[#089981]/10 text-[#089981] border border-[#089981]/30 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                    <Radio size={8} /> 盤中監控
                  </span>
                </h1>
                <p className="text-xs text-slate-500">TWSE MIS 證交所即時資訊行情連動・強勢均線與量能多頭排列選股系統</p>
              </div>
              <nav className="hidden md:flex gap-4 text-xs font-medium border-l border-[#2D3139] pl-4">
                <span className="text-[#2962FF] border-b-2 border-[#2962FF] pb-1 cursor-pointer">盤中監控</span>
                <span className="text-slate-500 hover:text-slate-300 cursor-pointer">回測分析</span>
                <span className="text-slate-500 hover:text-slate-300 cursor-pointer">自選組合</span>
              </nav>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 text-xs font-mono">
            {/* Live Clock and Status Indicator */}
            <div className="flex items-center gap-2 bg-[#1E222D] px-2.5 py-1.5 rounded border border-[#2D3139]">
              <span className="flex h-2 w-2 relative">
                {twStatus.isTradingHours ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#089981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#089981]"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#eab308]"></span>
                )}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
                  <span className="text-slate-500 font-bold">台北時間:</span>
                  <span className="text-slate-300 font-bold">{twStatus.dateString} {twStatus.weekdayString} {twStatus.timeString}</span>
                </div>
                <div className="text-[9px] text-slate-500 flex items-center gap-1">
                  <span>台股盤中時段: 一至五 09:00-13:30</span>
                  <span className={twStatus.isTradingHours ? "text-[#089981] font-semibold animate-pulse" : "text-yellow-500 font-semibold"}>
                    ({twStatus.isTradingHours ? "交易中" : "已收盤"})
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Selector Pill Buttons */}
            <div className="flex bg-[#1E222D] p-0.5 rounded border border-[#2D3139] items-center text-[10px]">
              <button
                onClick={() => setMarketMode("strict")}
                className={`px-2 py-1 rounded transition-colors ${
                  marketMode === "strict"
                    ? "bg-[#2962FF] text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="只在台北時間週一至週五 09:00-13:30 期間刷新股價，其餘休市時間靜止"
              >
                真實時間連動
              </button>
              <button
                onClick={() => setMarketMode("always")}
                className={`px-2 py-1 rounded transition-colors ${
                  marketMode === "always"
                    ? "bg-[#2962FF] text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="忽視當前時間，全天候 24/7 持續模擬盤中股價波動刷新數據"
              >
                全天候模擬
              </button>
            </div>

            {/* Component statistics indicator */}
            <div className="hidden lg:flex items-center bg-[#1E222D] px-2.5 py-2 rounded border border-[#2D3139] text-[10px] gap-1">
              <span className="text-slate-500">數據來源:</span>
              <a 
                href="https://mis.twse.com.tw/stock/index?lang=zhHant" 
                target="_blank" 
                rel="noreferrer" 
                className="text-white hover:text-[#0bbd9f] font-bold transition-colors underline decoration-dotted"
              >
                證交所 MIS (台股所有標的) 🌐
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Layout Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* TOP: Real-time Industry Hotspots Board */}
        <IndustryBoard
          stocks={stocks}
          onSelectIndustry={handleSelectIndustry}
          countdown={countdown}
          isRefreshPaused={marketMode === "strict" && !twStatus.isTradingHours}
        />

        {/* MIDDLE: Advanced Screener Command Console */}
        <ScreenerControl
          keyword={keyword}
          setKeyword={setKeyword}
          onRunScreener={handleRunScreener}
          matchCount={matchCount}
          totalCount={stocks.length}
          onYahooSyncAll={handleYahooSyncAll}
          isSyncingYahoo={isSyncingYahoo}
          yahooSyncProgress={yahooSyncProgress}
          yahooSyncStatus={yahooSyncStatus}
        />

        {/* BOTTOM: Split-pane Workspace (Left: Sorter spreadsheet, Right: 證交所即時 K 線技術圖) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* LEFT PANEL: Stock Screener listing (7 cols) */}
          <section className="lg:col-span-7 flex flex-col min-h-[420px]">
            <StockTable
              stocks={stocks}
              filterResults={filterResults}
              selectedStock={activeSelectedStock}
              onSelectStock={setSelectedStock}
              showOnlyMatches={showOnlyMatches}
              setShowOnlyMatches={setShowOnlyMatches}
            />
          </section>

          {/* RIGHT PANEL: Live Candlestick Graph (5 cols) */}
          <section className="lg:col-span-5 flex flex-col min-h-[420px]" key={activeSelectedStock?.symbol || "empty"}>
            <StockChart
              selectedStock={activeSelectedStock}
              filterResults={filterResults}
            />
          </section>
        </div>

        {/* FULL WIDTH: Gemini AI Intelligent Screener Analysis Report */}
        <GeminiReport
          selectedStock={activeSelectedStock}
          marketTime={`${twStatus.dateString} ${twStatus.timeString}`}
        />
      </main>

      {/* Footer credits disclaimer (No AI clutter or unrequested credit rails, keeps the page content extremely professional) */}
      <footer className="bg-[#131722] text-[#D1D4DC] text-[10px] py-4 border-t border-[#2D3139] font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2 text-slate-500">
          <span>© 2026 量化選股專業版 TW Quant. 均線、成交量與 MACD 計算皆由內部演算法進行。</span>
          <span className="text-slate-500">警語：模擬試算數據僅供學術交流與技術開發測試，不構成任何真實證券操作買賣之建議。</span>
        </div>
      </footer>
    </div>
  );
}
