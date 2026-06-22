import React from "react";
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  Terminal, 
  Settings, 
  BookOpen, 
  ExternalLink 
} from "lucide-react";

interface AiStudioGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiStudioGuide({ isOpen, onClose }: AiStudioGuideProps) {
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const systemInstructionText = `你現在是「GSTOCK 量化選股 — 策略研發及複習基地」的專屬 AI 數據核心。
你的任務是將使用者提供的「台股盤後原始數據」進行深度清洗、策略研發分類與複習標記。請完全關閉盤中即時監控思維，專注於歷史與盤後拐點研發。

請嚴格遵循以下處理邏輯：
1. 角色定位：策略研發與歷史複習助手，不提供即時報價，專注於盤後技術面與產業題材的複合交叉驗證。
2. 題材關聯篩選：當使用者指定特定「推薦題材」（如：半導體、AI伺服器、PCB、低軌衛星等）或關鍵字時，你必須精準篩選出屬於該產業的個股。
3. K線圖網址映射：為每一檔被篩選出的股票，自動生成對應的 TradingView 台灣股市歷史 K 線圖連結。格式統一為：\`https://tw.tradingview.com/chart/?symbol=TWSE:{股號}\` (上市) 或 \`https://tw.tradingview.com/chart/?symbol=OTC:{股號}\` (上櫃，若不確定可統一先用 TWSE)。
4. 複習指標標記：在看板中清楚呈現「盤後收盤價」、「單日漲跌幅」、「單日成交量」以及「20MA 乖離率」，並為符合「均線多頭且乖離適中」的個股加上【💡 亮點回測標的】標籤。

輸出格式：
請一律使用 Markdown 表格輸出精簡、易讀的「盤後研發複習看板」，並在表格下方提供點擊題材的統整分析與操作複習筆記。`;

  const userPromptText = `【GSTOCK 盤後策略研發指令】
請幫我分析以下盤後個股數據。

1. 我目前想複習的特定推薦題材關鍵字：[請在此輸入你想篩選的題材，例如：AI伺服器]
(若留空則代表顯示全部以供研發)

2. 盤後個股原始數據清單：
[請直接複製網頁上的看板文字或下方範例貼在此處]
2330 台積電 現價:2510.00 漲跌幅:+4.15% 成交量:36,447張 20MA乖離:+6.96% 產業:半導體
2379 瑞昱 現價:556.90 漲跌幅:+1.09% 成交量:5,179張 20MA乖離:+3.11% 產業:半導體
2313 華通 現價:62.20 漲跌幅:+0.65% 成交量:3,282張 20MA乖離:+1.73% 產業:PCB
2382 廣達 現價:279.10 漲跌幅:+1.09% 成交量:1,600張 20MA乖離:+1.68% 產業:AI伺服器
4977 眾達-KY 現價:88.60 漲跌幅:+0.34% 成交量:2,263張 20MA乖離:+2.27% 產業:光通訊
3491 昇達科 現價:196.30 漲跌幅:+0.05% 成交量:1,839張 20MA乖離:+1.97% 產業:低軌衛星
2301 光寶科 現價:119.60 漲跌幅:-0.25% 成交量:2,775張 20MA乖離:+0.86% 產業:AI伺服器`;

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E14]/80 backdrop-blur-sm"
      id="ai-studio-guide-modal"
    >
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#131722] border border-[#2D3139] rounded-xl shadow-2xl overflow-hidden text-[#D1D4DC]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#1C1F2B] border-b border-[#2D3139]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#2962FF]/15 text-[#2962FF] rounded border border-[#2962FF]/30">
              <Sparkles size={16} className="animate-pulse" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Google AI Studio 策略複製 / 串接指南</h2>
              <p className="text-[10px] text-slate-500">將本看板數據無縫串接至 Google AI Studio，啟動專屬 AI 歷史拐點大腦</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#2D3139] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Top Banner Guideline */}
          <div className="p-3 bg-[#1C1F2B]/50 border border-[#2D3139]/50 rounded-lg text-xs leading-relaxed text-slate-300">
            💡 <strong className="text-white">如何使用此指南：</strong>本指南提供完整的系統提示詞、對話範本與參數數值。您可以直接點擊下方 <strong className="text-sky-400">一鍵複製</strong> 鈕，然後前往{" "}
            <a 
              href="https://aistudio.google.com/" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#2962FF] hover:underline font-bold inline-flex items-center gap-0.5"
            >
              Google AI Studio <ExternalLink size={11} />
            </a>{" "}
            對應欄位中貼上，即可讓 Gemini 完美理解本平台策略並產出結構化動態分析報告！
          </div>

          {/* Grid Layout of inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Section 1: System Instruction */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <Terminal size={14} className="text-[#089981]" />
                  1. System Instruction (系統指令欄位)
                </span>
                <button
                  onClick={() => handleCopy(systemInstructionText, "sys")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-[#089981]/15 text-[#089981] rounded border border-[#089981]/35 hover:bg-[#089981]/25 transition-all font-medium"
                >
                  {copiedSection === "sys" ? (
                    <>
                      <Check size={12} />
                      已複製
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      一鍵複製
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                複製此文字並貼入 Google AI Studio 左側的 &quot;System Instructions&quot; 框內：
              </p>
              <textarea
                readOnly
                value={systemInstructionText}
                className="w-full h-64 p-3 bg-[#0B0E14] border border-[#2D3139] rounded-lg text-slate-300 font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
              />
            </div>

            {/* Section 2: User Prompt Template */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <BookOpen size={14} className="text-[#2962FF]" />
                  2. User Prompt Template (對話範本)
                </span>
                <button
                  onClick={() => handleCopy(userPromptText, "prompt")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-[#2962FF]/15 text-[#2962FF] rounded border border-[#2962FF]/35 hover:bg-[#2962FF]/25 transition-all font-medium"
                >
                  {copiedSection === "prompt" ? (
                    <>
                      <Check size={12} />
                      已複製
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      一鍵複製
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                在 AI Studio 主輸入對話框（Prompt 區）貼上此文字架構進行分析：
              </p>
              <textarea
                readOnly
                value={userPromptText}
                className="w-full h-64 p-3 bg-[#0B0E14] border border-[#2D3139] rounded-lg text-slate-300 font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Parameters Settings */}
          <div className="p-4 bg-[#1C1F2B] border border-[#2D3139] rounded-lg space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Settings size={14} className="text-[#eab308]" />
              ⚙️ Google AI Studio 推薦參數設定說明
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans text-slate-300">
              <div className="space-y-1">
                <p className="font-bold text-slate-200">Model (模型選擇)：</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  建議選擇 <strong className="text-white">Gemini 1.5 Flash</strong> （速度極快且表格處理能力好）或 <strong className="text-white">Gemini 1.5 Pro</strong> （若您一次丟入整整 300 檔的大量數據，Pro 的長文本推理表現更細緻）。
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-200">Temperature (溫度值)：</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  建議調低至 <strong className="text-white">0.2</strong>。因為這是股票數據與策略回測，我們需要模型保持高度的精準度與邏輯嚴謹性，不需要太多的創意發揮。
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Expected Output View Preview */}
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              🎨 Google AI Studio 預期輸出效果展示
            </h4>
            <div className="p-4 bg-[#0B0E14] border border-[#2D3139] rounded-lg text-xs leading-relaxed font-sans space-y-3 text-slate-300">
              <p className="font-bold text-emerald-400">📊 GSTOCK 盤後策略研發看板 — 篩選題材：【AI伺服器】</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-[#2D3139]/70">
                  <thead className="bg-[#1C1F2B] text-slate-400">
                    <tr className="border-b border-[#2D3139]">
                      <th className="p-2 border-r border-[#2D3139]">代碼</th>
                      <th className="p-2 border-r border-[#2D3139]">股票名稱</th>
                      <th className="p-2 border-r border-[#2D3139]">盤後收盤價</th>
                      <th className="p-2 border-r border-[#2D3139]">單日漲跌幅</th>
                      <th className="p-2 border-r border-[#2D3139]">單日成交量</th>
                      <th className="p-2 border-r border-[#2D3139]">20MA 乖離</th>
                      <th className="p-2 border-r border-[#2D3139]">產業題材</th>
                      <th className="p-2">研發操作複習 (K線拉出)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#2D3139]/50">
                      <td className="p-2 border-r border-[#2D3139]/50 font-mono">2382</td>
                      <td className="p-2 border-r border-[#2D3139]/50 font-bold text-white">廣達</td>
                      <td className="p-2 border-r border-[#2D3139]/50">279.10</td>
                      <td className="p-2 border-r border-[#2D3139]/50 text-red-400">+1.09%</td>
                      <td className="p-2 border-r border-[#2D3139]/50">1,600 張</td>
                      <td className="p-2 border-r border-[#2D3139]/50 text-[#00E676] font-mono">+1.68%</td>
                      <td className="p-2 border-r border-[#2D3139]/50">AI伺服器</td>
                      <td className="p-2 text-sky-400 cursor-pointer hover:underline">📈 開啟 TradingView K線</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-[#2D3139]/50 font-mono">2301</td>
                      <td className="p-2 border-r border-[#2D3139]/50 font-bold text-white">光寶科</td>
                      <td className="p-2 border-r border-[#2D3139]/50">119.60</td>
                      <td className="p-2 border-r border-[#2D3139]/50 text-emerald-400">-0.25%</td>
                      <td className="p-2 border-r border-[#2D3139]/50">2,775 張</td>
                      <td className="p-2 border-r border-[#2D3139]/50 text-[#00E676] font-mono">+0.86%</td>
                      <td className="p-2 border-r border-[#2D3139]/50">AI伺服器</td>
                      <td className="p-2 text-sky-400 cursor-pointer hover:underline">📈 開啟 TradingView K線</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 border-t border-[#2D3139]/40 pt-3">
                <p className="font-bold text-white">💡 策略研發與技術面複習筆記：</p>
                <p className="text-[11px] text-slate-300">
                  ⚠️ <strong className="text-white">廣達 (2382)：</strong> 盤後數據顯示今日小幅放量，且 20MA 正乖離僅有 +1.68%，非常符合 GSTOCK 核心指標第 6 項（0% &lt; 乖離率 &lt;= 3%）的防守起漲點原則。建議點擊上方連結複習其歷史洗盤軌跡，觀察過去 5 天是否有跌破月線甩轎的行為。
                </p>
                <p className="text-[11px] text-slate-300">
                  ⚠️ <strong className="text-white">光寶科 (2301)：</strong> 今日雖然單日微幅修正 -0.25%，但月線乖離收斂至 +0.86%，在量化策略中屬於典型的「突破後量縮回測月線」複習樣本。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 bg-[#1C1F2B] border-t border-[#2D3139]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-300 bg-slate-900 border border-[#2D3139] hover:bg-[#2D3139] hover:text-white rounded-lg transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
}
