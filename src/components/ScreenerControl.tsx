import React from "react";
import { Search, Info, CheckCircle2, ShieldAlert } from "lucide-react";

interface ScreenerControlProps {
  keyword: string;
  setKeyword: (kw: string) => void;
  onRunScreener: () => void;
  matchCount: number;
  totalCount?: number;
}

export default function ScreenerControl({
  keyword,
  setKeyword,
  onRunScreener,
  matchCount,
  totalCount = 90,
}: ScreenerControlProps) {
  const quickTags = ["半導體", "AI伺服器", "航運", "生技", "光電", "金融"];

  return (
    <div className="bg-[#131722] border border-[#2D3139] rounded-xl p-5 shadow-lg text-[#D1D4DC]" id="screener-control-section">
      <div className="mb-4">
        <h2 className="text-md font-bold text-white flex items-center gap-2">
          🎯 智慧技術面量化選股控制台
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          整合趨勢、洗盤、量能、動能與乖離率 6 大指標，過濾出正處於突破拐點的強勢股。
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        {/* Industry classification keyword input */}
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
            今日主流題材 / 股票名稱 / 代碼
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="輸入關鍵字如 '半導體'、'2330' 或是留空篩選全部..."
              className="w-full bg-[#1E222D] border border-[#2D3139] rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#2962FF] focus:ring-1 focus:ring-[#2962FF] transition-all font-sans"
              id="theme-keyword-input"
            />
            {keyword && (
              <button
                onClick={() => setKeyword("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
              >
                清除
              </button>
            )}
          </div>
          
          {/* Quick theme buttons */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[11px] text-slate-500 self-center mr-1">推薦題材:</span>
            {quickTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setKeyword(tag)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                  keyword === tag
                    ? "bg-[#2962FF]/20 border-[#2962FF] text-[#2962FF] font-semibold"
                    : "bg-[#1E222D] border-[#2D3139] text-slate-400 hover:bg-[#2D3139]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="lg:w-auto">
          <button
            onClick={onRunScreener}
            id="run-screener-btn"
            className="w-full lg:w-auto bg-[#2962FF] hover:bg-[#1e4bd8] text-white font-bold text-sm px-6 py-3.5 rounded-lg shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            🔥 一鍵篩選滿足條件黑馬股
          </button>
        </div>
      </div>

      {/* Metric details summary */}
      <div className="mt-5 border-t border-[#2D3139] pt-4">
        <details className="group">
          <summary className="flex items-center justify-between text-xs text-[#089981] cursor-pointer hover:text-green-400 select-none">
            <span className="flex items-center gap-1.5 font-medium">
              <Info size={14} />
              量化選股策略公式說明（符合以下所有 6 項複合條件之黑馬股）
            </span>
            <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3 text-xs text-slate-400 bg-[#0B0E14] p-3.5 rounded-lg border border-[#2D3139] font-mono">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-[#F23645] shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold block">【1】均線多頭格局</span>
                5MA &gt; 10MA &gt; 20MA(月) &gt; 60MA(季)，且月線走平或上揚（MA20今天 &gt;= 昨天）。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-[#F23645] shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold block">【2】歷史洗盤軌跡</span>
                過去 5~10 個交易日內，曾有過至少一天收盤價跌破月線 (20MA) 甩轎洗盤。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-[#F23645] shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold block">【3】突破前量縮整理</span>
                在突破前（過去 2~3 天），成交量呈現明顯萎縮幅度，均低於當時 5 日均量。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-[#F23645] shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold block">【4】今日放量突破</span>
                今日盤中/收盤成功站上 20MA，且成交量放大達前幾日均量的 1.5 倍以上。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-[#F23645] shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold block">【5】MACD 趨勢轉佳</span>
                今日 MACD 柱狀體 (Oscillator) 負值正在縮小 (多頭集結) 或由負翻紅升起。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-[#F23645] shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold block">【6】乖離率追高限制</span>
                與 20MA 保持合理正乖離（0% &lt; 乖離率 &lt;= 3%），確保起漲點，拒絕追高。
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Screen Result Badge */}
      <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-3 rounded bg-[#2962FF]/10 border border-[#2D3139] text-slug-400">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldAlert size={14} />
          <span>篩選提示：台股所有標的中</span>
        </div>
        <div className="text-slate-300">
          <span>共有 </span>
          <span className="font-bold text-white text-sm px-1 font-mono">{matchCount}</span>
          <span> 檔滿足當前複合過濾標準</span>
        </div>
      </div>
    </div>
  );
}
