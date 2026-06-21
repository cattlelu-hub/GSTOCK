import React from "react";
import { Stock, FilterResult } from "../types";
import { ChevronUp, ChevronDown, Check, X, Eye, HelpCircle } from "lucide-react";

interface StockTableProps {
  stocks: Stock[];
  filterResults: FilterResult[];
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
  showOnlyMatches: boolean;
  setShowOnlyMatches: (val: boolean) => void;
}

type SortKey = "symbol" | "name" | "todayClose" | "changePercentage" | "todayVolume" | "bias20" | "industry";
type SortOrder = "asc" | "desc";

export default function StockTable({
  stocks,
  filterResults,
  selectedStock,
  onSelectStock,
  showOnlyMatches,
  setShowOnlyMatches,
}: StockTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("changePercentage");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");

  // Create a fast lookup for filter results by stock code
  const resultsMap = React.useMemo(() => {
    const map = new Map<string, FilterResult>();
    filterResults.forEach((res) => {
      map.set(res.stock.symbol, res);
    });
    return map;
  }, [filterResults]);

  // Deciding which list of stocks to present
  const listToRender = React.useMemo(() => {
    let result = stocks.map((s) => {
      const filterRes = resultsMap.get(s.symbol);
      return {
        stock: s,
        isMatch: filterRes?.isMatch ?? false,
        bias20: s.indicators.bias20,
      };
    });

    if (showOnlyMatches) {
      result = result.filter((item) => item.isMatch);
    } else {
      // Sort by changePercentage descending to capture all stocks and limit to top 90 gainers
      result = [...result]
        .sort((a, b) => b.stock.changePercentage - a.stock.changePercentage)
        .slice(0, 90);
    }

    // Perform sorting
    return result.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortKey) {
        case "symbol":
          valA = a.stock.symbol;
          valB = b.stock.symbol;
          break;
        case "name":
          valA = a.stock.name;
          valB = b.stock.name;
          break;
        case "todayClose":
          valA = a.stock.todayClose;
          valB = b.stock.todayClose;
          break;
        case "changePercentage":
          valA = a.stock.changePercentage;
          valB = b.stock.changePercentage;
          break;
        case "todayVolume":
          valA = a.stock.todayVolume;
          valB = b.stock.todayVolume;
          break;
        case "bias20":
          valA = a.stock.indicators.bias20;
          valB = b.stock.indicators.bias20;
          break;
        case "industry":
          valA = a.stock.industry;
          valB = b.stock.industry;
          break;
        default:
          valA = a.stock.symbol;
          valB = b.stock.symbol;
      }

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });
  }, [stocks, resultsMap, showOnlyMatches, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? (
      <ChevronUp size={14} className="inline ml-1" />
    ) : (
      <ChevronDown size={14} className="inline ml-1" />
    );
  };

  const matchesCount = filterResults.filter((r) => r.isMatch).length;

  return (
    <div className="bg-[#131722] border border-[#2D3139] rounded-xl overflow-hidden shadow-lg flex flex-col h-full text-[#D1D4DC]" id="stock-table-section">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-[#2D3139] bg-[#131722]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">📈 個股即時狀態看板</span>
          <span className="text-xs text-slate-500">({listToRender.length} 檔顯示中)</span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex p-0.5 bg-[#1E222D] rounded-lg border border-[#2D3139] self-start sm:self-auto font-sans">
          <button
            onClick={() => setShowOnlyMatches(true)}
            id="view-matches-only-tab"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              showOnlyMatches
                ? "bg-[#2962FF] text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🔥 滿足黑馬股 ({matchesCount})
          </button>
          <button
            onClick={() => setShowOnlyMatches(false)}
            id="view-all-stocks-tab"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              !showOnlyMatches
                ? "bg-[#2962FF] text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="免除 API 金鑰限制，套用台股並依當前市場漲幅排序，前 90 名強勢標的一覽"
          >
            🌐 台股漲幅前 90 名 (免金鑰)
          </button>
        </div>
      </div>

      {/* Table Grid Wrapper with Scroll */}
      <div className="flex-1 overflow-auto max-h-[480px] lg:max-h-[640px] scrollbar-thin">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead className="bg-[#1E222D] sticky top-0 text-slate-400 font-semibold border-b border-[#2D3139] z-10">
            <tr>
              <th
                onClick={() => handleSort("symbol")}
                className="p-3 cursor-pointer hover:bg-[#2D3139] transition-colors select-none w-[12%]"
              >
                代碼 {renderSortIcon("symbol")}
              </th>
              <th
                onClick={() => handleSort("name")}
                className="p-3 cursor-pointer hover:bg-[#2D3139] transition-colors select-none w-[15%]"
              >
                股票名稱 {renderSortIcon("name")}
              </th>
              <th
                onClick={() => handleSort("todayClose")}
                className="p-3 text-right cursor-pointer hover:bg-[#2D3139] transition-colors select-none w-[13%]"
              >
                現價 {renderSortIcon("todayClose")}
              </th>
              <th
                onClick={() => handleSort("changePercentage")}
                className="p-3 text-right cursor-pointer hover:bg-[#2D3139] transition-colors select-none w-[14%]"
              >
                漲跌幅 {renderSortIcon("changePercentage")}
              </th>
              <th
                onClick={() => handleSort("todayVolume")}
                className="p-3 text-right cursor-pointer hover:bg-[#2D3139] transition-colors select-none w-[15%]"
              >
                單日成交量 {renderSortIcon("todayVolume")}
              </th>
              <th
                onClick={() => handleSort("bias20")}
                className="p-3 text-right cursor-pointer hover:bg-[#2D3139] transition-colors select-none w-[15%]"
              >
                20MA 乖離 {renderSortIcon("bias20")}
              </th>
              <th
                onClick={() => handleSort("industry")}
                className="p-3 cursor-pointer hover:bg-[#2D3139] transition-colors select-none w-[12%]"
              >
                產業 {renderSortIcon("industry")}
              </th>
              <th className="p-3 text-center w-[8%]">選股狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2D3139]">
            {listToRender.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <X size={32} className="text-red-550/50" />
                    <p className="font-semibold text-slate-350">查無任何符合條件的個股</p>
                    <p className="text-[11.5px] max-w-sm">
                      請在此區塊右上方切換成「🌐 台股所有標的」即可瀏覽所有股票，或者清除「今日主流題材」過濾關鍵字。
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              listToRender.map(({ stock, isMatch }) => {
                const isSelected = selectedStock?.symbol === stock.symbol;
                const isUp = stock.changePercentage >= 0;
                
                // Color mapping: TW Stock standard is RED for up, GREEN for down!
                const textPriceColor = isUp ? "text-[#F23645]" : "text-[#089981]";
                const bgBadgeClass = isUp ? "bg-[#F23645]/10 text-[#F23645]" : "bg-[#089981]/10 text-[#089981]";
                const biasVal = Math.round(stock.indicators.bias20 * 10000) / 100;
                const isBiasOverlimit = biasVal > 3.0 || biasVal <= 0;
 
                return (
                  <tr
                    key={stock.symbol}
                    id={`stock-row-${stock.symbol}`}
                    onClick={() => onSelectStock(stock)}
                    className={`cursor-pointer transition-colors group select-none ${
                      isSelected
                        ? "bg-[#2962FF]/10 text-white font-medium border-l-4 border-l-[#2962FF]"
                        : "hover:bg-[#1E222D]"
                    }`}
                  >
                    {/* Symbol */}
                    <td className="p-3 font-mono text-slate-400 group-hover:text-white">
                      {stock.symbol}
                    </td>
                    
                    {/* Name */}
                    <td className="p-3 text-slate-100 font-semibold group-hover:text-white flex items-center gap-1">
                      {stock.name}
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2962FF] animate-ping" />
                      )}
                    </td>
 
                    {/* Price */}
                    <td className={`p-3 text-right font-mono font-bold ${textPriceColor}`}>
                      {stock.todayClose.toFixed(2)}
                    </td>
 
                    {/* Change percentage (TW standard - red up, green down) */}
                    <td className="p-3 text-right">
                      <span className={`inline-block font-mono text-xs px-2 py-0.5 rounded font-bold ${bgBadgeClass}`}>
                        {isUp ? "▲ " : "▼ "}
                        {Math.abs(stock.changePercentage).toFixed(2)}%
                      </span>
                    </td>
 
                    {/* Today Volume */}
                    <td className="p-3 text-right font-mono text-slate-300">
                      {stock.todayVolume.toLocaleString()} <span className="text-[10px] text-slate-500">張</span>
                    </td>
 
                    {/* 20MA bias */}
                    <td className={`p-3 text-right font-mono ${isBiasOverlimit ? "text-slate-400" : "text-orange-400 font-bold"}`}>
                      {biasVal > 0 ? "+" : ""}{biasVal.toFixed(2)}%
                    </td>
 
                    {/* Industry */}
                    <td className="p-3">
                      <span className="text-[#D1D4DC] bg-[#1E222D] px-2 py-0.5 rounded text-[10px]">
                        {stock.industry}
                      </span>
                    </td>
 
                    {/* Selection Match Tag */}
                    <td className="p-3 text-center">
                      {isMatch ? (
                        <span className="inline-flex items-center justify-center bg-[#2962FF]/10 text-[#2962FF] border border-[#2962FF]/30 font-bold text-[9px] px-2 py-0.5 rounded h-[18px]">
                          ⭐ 黑馬
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center bg-[#1E222D] text-slate-500 text-[9px] px-2 py-0.5 rounded h-[18px]">
                          不符
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legend footnote indicator */}
      <div className="bg-[#0B0E14] p-2 text-[10px] text-slate-500 text-center border-t border-[#2D3139] flex flex-wrap justify-center gap-4">
        <span>* 💡 點擊上開欄位（漲跌幅、乖離或成交量）可由大至小重新排列。</span>
        <span>* 🔴 台股傳統：紅字表示今日大漲、綠字表示大跌。</span>
      </div>
    </div>
  );
}
