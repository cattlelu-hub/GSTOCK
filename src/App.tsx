/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { generateStockMarket } from "./utils/stockGenerator";
import { evaluateScreener } from "./utils/indicators";
import { Stock, FilterResult } from "./types";
import IndustryBoard from "./components/IndustryBoard";
import ScreenerControl from "./components/ScreenerControl";
import StockTable from "./components/StockTable";
import StockChart from "./components/StockChart";
import { TrendingUp, RefreshCw, BarChart3, Radio, Info } from "lucide-react";

export default function App() {
  const [stocks, setStocks] = React.useState<Stock[]>([]);
  const [keyword, setKeyword] = React.useState<string>("");
  const [selectedStock, setSelectedStock] = React.useState<Stock | null>(null);
  const [showOnlyMatches, setShowOnlyMatches] = React.useState<boolean>(true);
  const [countdown, setCountdown] = React.useState<number>(5);

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

  // Compute live filter results whenever stocks list or keyword changes
  const filterResults = React.useMemo(() => {
    return stocks.map((s) => evaluateScreener(s, keyword));
  }, [stocks, keyword]);

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

  // Live price fluctuation interval ticker (Runs every 5 seconds)
  // Simulates minor disc-fluctuation during active trading session
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger price refresh on 0
          setStocks((currentStocks) => {
            return currentStocks.map((stock) => {
              // 5-second minor price fluctuation (-0.4% to +0.5%)
              const delta = (Math.random() - 0.45) * 0.007;
              const originalClose = stock.todayClose;
              const newClose = Math.round(originalClose * (1 + delta) * 10) / 10;
              
              // Updates history's latest index (Day 99)
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

              return {
                ...stock,
                todayClose: newClose,
                todayHigh: Math.max(stock.todayHigh, newClose),
                todayLow: Math.min(stock.todayLow, newClose),
                changePercentage,
                history: updatedHistory,
                // re-execute indicators helper
                indicators: {
                  ...stock.indicators,
                  // quick-patch today close metrics
                  bias20: stock.indicators.ma20 > 0 ? (newClose - stock.indicators.ma20) / stock.indicators.ma20 : 0
                }
              };
            });
          });

          return 5; // Reset timer count
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
                <p className="text-xs text-slate-500">強勢均線與量能多頭排列選股系統</p>
              </div>
              <nav className="hidden md:flex gap-4 text-xs font-medium border-l border-[#2D3139] pl-4">
                <span className="text-[#2962FF] border-b-2 border-[#2962FF] pb-1 cursor-pointer">盤中監控</span>
                <span className="text-slate-500 hover:text-slate-300 cursor-pointer">回測分析</span>
                <span className="text-slate-500 hover:text-slate-300 cursor-pointer">自選組合</span>
              </nav>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-slate-400 self-start sm:self-auto font-mono bg-[#1E222D] p-2 rounded border border-[#2D3139]">
            <div>
              <span className="text-slate-500">當前日期:</span>{" "}
              <span className="text-slate-300 font-bold">2026-06-20</span>
            </div>
            <div className="border-l border-[#2D3139] h-3" />
            <div>
              <span className="text-slate-500">市場成分股:</span>{" "}
              <span className="text-[#2962FF] font-bold">60 檔</span>
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
        />

        {/* MIDDLE: Advanced Screener Command Console */}
        <ScreenerControl
          keyword={keyword}
          setKeyword={setKeyword}
          onRunScreener={handleRunScreener}
          matchCount={matchCount}
        />

        {/* BOTTOM: Split-pane Workspace (Left: Sorter spreadsheet, Right: TradingView Light chart) */}
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
          <section className="lg:col-span-5 flex flex-col min-h-[420px]">
            <StockChart
              selectedStock={activeSelectedStock}
              filterResults={filterResults}
            />
          </section>
        </div>
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
