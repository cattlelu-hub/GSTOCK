/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { generateStockMarket } from "./utils/stockGenerator";
import { evaluateScreener, computeIndicators } from "./utils/indicators";
import { Stock, FilterResult } from "./types";
import { fetchYahooStockHistory, fetchYahooRealTimeTick, tickerNamesCache } from "./utils/yahooService";
import ScreenerControl from "./components/ScreenerControl";
import StockTable from "./components/StockTable";
import StockChart from "./components/StockChart";
import GeminiReport from "./components/GeminiReport";
import AiStudioGuide from "./components/AiStudioGuide";
import { TrendingUp, RefreshCw, BarChart3, Radio, Info, Sparkles } from "lucide-react";

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
  const [showOnlyMatches, setShowOnlyMatches] = React.useState<boolean>(false);
  const [avoidOverheated, setAvoidOverheated] = React.useState<boolean>(true); // Default to avoid overheated stocks
  const [countdown, setCountdown] = React.useState<number>(5);
  const [twStatus, setTwStatus] = React.useState(getTaiwanMarketStatus());
  const [isAiGuideOpen, setIsAiGuideOpen] = React.useState<boolean>(false);

  const handleSetKeyword = (val: string) => {
    setKeyword(val);
    if (val.trim() !== "") {
      setShowOnlyMatches(false);
    }
  };

  const handleSelectIndustry = (industry: string) => {
    setKeyword(industry);
    setShowOnlyMatches(false);
  };

  const handleShowKLine = (stock: Stock) => {
    setSelectedStock(stock);
    setChartTab("kline");
    setTimeout(() => {
      const panel = document.getElementById("stock-chart-section") || document.getElementById(`stock-chart-panel-${stock.symbol}`);
      if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
  };

  // Yahoo Finance synchronization states
  const [isSyncingYahoo, setIsSyncingYahoo] = React.useState<boolean>(false);
  const [yahooSyncProgress, setYahooSyncProgress] = React.useState<number>(0);
  const [yahooSyncStatus, setYahooSyncStatus] = React.useState<string>("");

  // Target-stock dynamic resolver states
  const [isResolvingSymbol, setIsResolvingSymbol] = React.useState<boolean>(false);
  const [resolvingStatus, setResolvingStatus] = React.useState<string>("");

  // Shared active chart tab state spanning lightweight-charts, TradingView kline, and potential scoring
  const [chartTab, setChartTab] = React.useState<"chart" | "kline" | "potential">("chart");

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

  // 背景自動同步點擊個股的真實 Yahoo 歷史 K 線與最新價格
  React.useEffect(() => {
    if (!selectedStock) return;
    if (selectedStock.isYahooSynced) return;

    let isAborted = false;

    const syncSingleStockRealTime = async () => {
      try {
        const history = await fetchYahooStockHistory(selectedStock.symbol);
        if (isAborted) return;
        
        if (history && history.length > 0) {
          const indicators = computeIndicators(history);
          const lastH = history[history.length - 1];
          const prevH = history[history.length - 2] || lastH;
          const changePerc = Math.round(((lastH.close - prevH.close) / prevH.close) * 10000) / 100;
          
          const updatedStock: Stock = {
            ...selectedStock,
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

          // 1. 同步更新 stocks 清單中的對應股票
          setStocks((prev) => 
            prev.map((s) => s.symbol === selectedStock.symbol ? updatedStock : s)
          );
          
          // 2. 同步更新當前選中的股票，重繪 K 線
          setSelectedStock((current) => {
            if (current && current.symbol === selectedStock.symbol) {
              return updatedStock;
            }
            return current;
          });
        }
      } catch (e) {
        console.warn(`自動背景聯網更新台股真實日K失敗 for ${selectedStock.symbol}:`, e);
      }
    };

    const t = setTimeout(syncSingleStockRealTime, 150);
    return () => {
      isAborted = true;
      clearTimeout(t);
    };
  }, [selectedStock?.symbol, selectedStock?.isYahooSynced]);

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

  // Dynamic TWD stock seeker for automatic on-demand scans of ANY main or OTC stock
  React.useEffect(() => {
    if (!keyword) return;
    const trimmed = keyword.trim().replace(/\D/g, ""); // Extract numbers
    
    // Check if the search contains a potential 4-digit or 5-digit Taiwan Stock Code
    if (trimmed.length < 4 || trimmed.length > 6) return;

    // Reject if already in loaded pool
    const exists = stocks.some((s) => s.symbol === trimmed);
    if (exists) return;

    let isAborted = false;

    const queryAndInjectStock = async () => {
      setIsResolvingSymbol(true);
      setResolvingStatus(`🔍 正在實時聯網解析台股 [${trimmed}] 行情歷史與篩選指標...`);
      try {
        const history = await fetchYahooStockHistory(trimmed);
        if (isAborted) return;

        if (history && history.length > 0) {
          const compRealName = tickerNamesCache.get(trimmed) || `台股 ${trimmed}`;
          
          // Classify industry based on standard stock codes
          let resolvedIndustry = "聯網自選股";
          if (trimmed.startsWith("23") || trimmed.startsWith("24") || trimmed.startsWith("30")) {
            resolvedIndustry = "半導體";
          } else if (trimmed.startsWith("26")) {
            resolvedIndustry = "航運";
          } else if (trimmed.startsWith("28")) {
            resolvedIndustry = "金融";
          } else if (trimmed.startsWith("32") || trimmed.startsWith("35") || trimmed.startsWith("53") || trimmed.startsWith("80")) {
            resolvedIndustry = "光電";
          } else if (trimmed.startsWith("11") || trimmed.startsWith("12") || trimmed.startsWith("13")) {
            resolvedIndustry = "傳產水泥食品";
          }

          const indicators = computeIndicators(history);
          const lastH = history[history.length - 1];
          const prevH = history[history.length - 2] || lastH;
          const changePerc = Math.round(((lastH.close - prevH.close) / prevH.close) * 10000) / 100;

          const dynamicStock: Stock = {
            symbol: trimmed,
            name: compRealName,
            industry: resolvedIndustry,
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

          setStocks((prev) => {
            if (prev.some((s) => s.symbol === dynamicStock.symbol)) return prev;
            return [dynamicStock, ...prev];
          });
          setSelectedStock(dynamicStock);
          setResolvingStatus(`✓ 成功新增 [${trimmed} ${compRealName}]！已同步納入量化探針篩選範圍`);
          setTimeout(() => {
            if (!isAborted) setResolvingStatus("");
          }, 3000);
        }
      } catch (err: any) {
        if (!isAborted) {
          setResolvingStatus(`✗ 無法搜尋代碼 ${trimmed}: ${err.message || err}`);
          setTimeout(() => {
            if (!isAborted) setResolvingStatus("");
          }, 5000);
        }
      } finally {
        if (!isAborted) setIsResolvingSymbol(false);
      }
    };

    // Debounce to allow user to finish typing code
    const delayTimer = setTimeout(() => {
      queryAndInjectStock();
    }, 600);

    return () => {
      isAborted = true;
      clearTimeout(delayTimer);
    };
  }, [keyword, stocks]);

  // Compute live filter results whenever stocks list, keyword, or time minutes changes
  const filterResults = React.useMemo(() => {
    const timeMins = twStatus.timeString ? twStatus.timeString.slice(0, 5) : null;
    return stocks.map((s) => evaluateScreener(s, keyword, timeMins, avoidOverheated));
  }, [stocks, keyword, twStatus.timeString ? twStatus.timeString.slice(0, 5) : "", avoidOverheated]);

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

  // 3. startLiveUpdateEngine() - 擬真與真實雙引擎盤中 Tick 跳動定時器 (策略研發基地模式已關閉盤中跳動，保持盤後股價穩定性)
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
          // 💡 策略研發與複習基地模式：關閉盤中即時跳動以確保數據正確性、一致性與技術乖離率穩定度。
          const shouldTick = false;

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
  }, [selectedStock, twStatus.isTradingHours]);

  // 4. Periodic background real-time quote sync (策略研發基地模式已關閉即時滾動串流，以穩定的盤後日 K 線與成交量歷史數據為主)
  React.useEffect(() => {
    // 已從原本的 14 秒定期串流拉取，更改為僅在用戶手動或點擊切换時進行完整日K後台同步。
    return () => {};
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
            <div className="bg-[#2962FF] px-1.5 py-0.5 rounded text-sm text-white font-bold tracking-tight">
              GSTOCK
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h1 className="text-md sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  量化選股系統
                </h1>
                <p className="text-xs text-slate-400">💡 整合多頭排列均線、成交量與乖離率技術分析選股，提供高勝率量化策略研發輔助。</p>
              </div>
            </div>
          </div>
          
        </div>
      </header>

      {/* Main Responsive Grid Layout Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* MIDDLE: Advanced Screener Command Console */}
        <ScreenerControl
          keyword={keyword}
          setKeyword={handleSetKeyword}
          avoidOverheated={avoidOverheated}
          setAvoidOverheated={setAvoidOverheated}
          onRunScreener={handleRunScreener}
          matchCount={matchCount}
          totalCount={stocks.length}
          onYahooSyncAll={handleYahooSyncAll}
          isSyncingYahoo={isSyncingYahoo}
          yahooSyncProgress={yahooSyncProgress}
          yahooSyncStatus={yahooSyncStatus}
        />

        {/* Live dynamic explorer load feedback board */}
        {resolvingStatus && (
          <div className="bg-[#1E222D] border border-emerald-500/20 px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between text-slate-300 animate-pulse shadow-md">
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
              <span className="font-semibold text-emerald-400">{resolvingStatus}</span>
            </span>
          </div>
        )}

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
              onSelectIndustry={handleSelectIndustry}
              onShowKLine={handleShowKLine}
            />
          </section>

          {/* RIGHT PANEL: Live Candlestick Graph (5 cols) */}
          <section className="lg:col-span-5 flex flex-col min-h-[420px]" key={activeSelectedStock?.symbol || "empty"}>
            <StockChart
              selectedStock={activeSelectedStock}
              filterResults={filterResults}
              chartTab={chartTab}
              setChartTab={setChartTab}
            />
          </section>
        </div>

        {/* FULL WIDTH: Gemini AI Intelligent Screener Analysis Report */}
        <GeminiReport
          selectedStock={activeSelectedStock}
          marketTime={`${twStatus.dateString} ${twStatus.timeString}`}
        />
      </main>

      <AiStudioGuide 
        isOpen={isAiGuideOpen}
        onClose={() => setIsAiGuideOpen(false)}
      />

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
