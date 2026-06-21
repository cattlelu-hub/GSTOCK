import React from "react";
import { Stock } from "../types";
import { Flame, TrendingUp, RefreshCw } from "lucide-react";

interface IndustryBoardProps {
  stocks: Stock[];
  onSelectIndustry: (industry: string) => void;
  countdown: number;
}

export default function IndustryBoard({ stocks, onSelectIndustry, countdown }: IndustryBoardProps) {
  // Compute average returns for each industry
  const industriesStats = React.useMemo(() => {
    const map: Record<string, { totalChange: number; count: number }> = {};
    stocks.forEach((s) => {
      if (!map[s.industry]) {
        map[s.industry] = { totalChange: 0, count: 0 };
      }
      map[s.industry].totalChange += s.changePercentage;
      map[s.industry].count += 1;
    });

    return Object.entries(map)
      .map(([name, stat]) => ({
        name,
        avgChange: Math.round((stat.totalChange / stat.count) * 100) / 100,
      }))
      .sort((a, b) => b.avgChange - a.avgChange); // descending order
  }, [stocks]);

  // Display top 5
  const topFive = industriesStats.slice(0, 5);

  return (
    <div className="bg-[#131722] border border-[#2D3139] rounded-xl p-4 shadow-xl text-[#D1D4DC]" id="industry-board-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-[#F23645]/10 p-2 rounded-lg text-[#F23645]">
            <Flame size={20} className="className" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white flex items-center gap-2 uppercase">
              🔥 盤中焦點：前五大漲幅產業
            </h2>
            <p className="text-xs text-slate-500">系統即時統計當前漲幅榜，點擊產業直接篩選成份股</p>
          </div>
        </div>
        
        {/* Real-time Status */}
        <div className="flex items-center gap-3 bg-[#1E222D] px-3 py-1.5 rounded-full border border-[#2D3139] self-start md:self-auto">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-[#089981] animate-spin" style={{ animationDuration: "3s" }} />
            <span className="text-xs font-mono text-slate-450">
              🔄 系統自動刷新中 ({countdown}s)
            </span>
          </div>
          <div className="w-16 h-1.5 bg-[#2D3139] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#2962FF] to-[#089981] transition-all duration-1000"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {topFive.map((ind, idx) => {
          const isUp = ind.avgChange >= 0;
          const bgIntensity = Math.min(10, Math.max(1, Math.abs(ind.avgChange) * 4));
          const ringStyle = idx === 0 ? "ring-1 ring-[#F23645]/50 shadow-[0_0_12px_rgba(242,54,69,0.15)] border-[#F23645]" : "border border-[#2D3139]";
          
          return (
            <button
              key={ind.name}
              id={`industry-card-${ind.name}`}
              onClick={() => onSelectIndustry(ind.name)}
              className={`hover:scale-[1.02] hover:border-[#2962FF] active:scale-95 transition-all duration-200 text-left rounded-lg p-3 bg-[#1E222D] flex flex-col justify-between h-24 ${ringStyle} group cursor-pointer`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-slate-500 font-medium group-hover:text-white transition-colors">
                  RANK {idx + 1}
                </span>
                {idx === 0 && (
                  <span className="bg-[#F23645]/10 text-[#F23645] text-[10px] px-1.5 py-0.5 rounded font-bold animate-pulse">
                    LEADER
                  </span>
                )}
              </div>
              
              <div className="my-1">
                <h3 className="text-sm font-bold text-[#D1D4DC] group-hover:text-white transition-colors">
                  {ind.name}
                </h3>
              </div>

              <div className="flex items-baseline gap-1">
                <TrendingUp size={12} className={isUp ? "text-[#F23645]" : "text-[#089981] rotate-180"} />
                <span className={`text-md font-mono font-bold ${isUp ? "text-[#F23645]" : "text-[#089981]"}`}>
                  {isUp ? "+" : ""}{ind.avgChange}%
                </span>
              </div>
              
              {/* Micro bar beneath card to show color intensity */}
              <div className="w-full h-1.5 bg-[#2D3139] rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${isUp ? "bg-[#F23645]" : "bg-[#089981]"}`}
                  style={{ width: `${Math.min(100, Math.max(10, Math.abs(ind.avgChange) * 20))}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
