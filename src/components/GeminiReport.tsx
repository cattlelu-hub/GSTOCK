import React from "react";
import { 
  Sparkles, 
  TrendingUp, 
  ShieldAlert, 
  ArrowRight, 
  Table, 
  Terminal, 
  FileText, 
  Eye, 
  CheckCircle2,
  Calendar,
  Layers,
  Percent,
  CheckCircle,
  HelpCircle,
  Activity,
  Award
} from "lucide-react";
import { motion } from "motion/react";
import { Stock } from "../types";
import { computeTechnicalDetails } from "../utils/technicals";

interface GeminiReportProps {
  selectedStock: Stock | null;
  marketTime: string;
}

export default function GeminiReport({ selectedStock, marketTime }: GeminiReportProps) {
  // Compute deterministic technical metrics for the selected stock
  const tMetrics = React.useMemo(() => {
    if (!selectedStock || !selectedStock.history || selectedStock.history.length === 0) return null;
    return computeTechnicalDetails(selectedStock.history);
  }, [selectedStock]);

  const scoringData = React.useMemo(() => {
    if (!selectedStock || !tMetrics) return null;

    // 1. MACD Score & Comment
    let macdScore = 5;
    let macdComment = "OSC多空信號平衡，正在進行底部分水嶺震盪整理中。";
    const macdStatus = tMetrics.macd.status;
    const osc = tMetrics.macd.osc;
    if (macdStatus.includes("黃金交叉") || macdStatus.includes("金叉")) {
      macdScore = 10;
      macdComment = "🚀 差離值黃金交叉突破，OSC紅柱首日冒頭，強勢波段行情蓄勢待發。";
    } else if (macdStatus.includes("死亡交叉") || macdStatus.includes("死叉")) {
      macdScore = 2;
      macdComment = "⚠️ DIF向下摜破DEA死亡交叉，OSC開綠柱，偏向空頭震盪，防守主導。";
    } else if (osc > 0) {
      if (selectedStock.changePercentage && selectedStock.changePercentage > 0) {
        macdScore = 8;
        macdComment = "📈 OSC紅柱持續擴張，多方能量充沛，沿五日均線上攻意圖明顯。";
      } else {
        macdScore = 6;
        macdComment = "⚖️ OSC紅柱轉向收斂，高檔追價意願趨緩，多頭面臨強勢震盪洗盤。";
      }
    } else if (osc < 0) {
      if (selectedStock.changePercentage && selectedStock.changePercentage > 0) {
        macdScore = 5;
        macdComment = "💎 OSC綠柱見底翻紅，空方拋售力道衰竭，蘊含深回彈或拐點機會。";
      } else {
        macdScore = 3;
        macdComment = "📉 OSC綠柱持續放大，空盤探底格局，操作宜保守，等待落底訊號。";
      }
    }

    // 2. KD Score & Comment
    let kdScore = 5;
    let kdComment = "KD處在常態多空拉鋸震盪區，多空勢均力敵。";
    const kVal = tMetrics.kd.k;
    const dVal = tMetrics.kd.d;
    const kdStatus = tMetrics.kd.status;

    if (kdStatus.includes("黃金交叉") || kdStatus.includes("金叉")) {
      if (kVal < 30) {
        kdScore = 10;
        kdComment = "🔥 30以下極低檔黃金交叉，極致多頭突破訊號，主力打底反轉確立。";
      } else {
        kdScore = 8;
        kdComment = "🚀 K向上貫穿D黃金交叉，短線多頭發散，具有強烈上攻之突破慣性。";
      }
    } else if (kdStatus.includes("死亡交叉") || kdStatus.includes("死叉")) {
      if (kVal > 75) {
        kdScore = 1;
        kdComment = "🔴 80以上高檔死亡交叉，買盤極限衰竭，追高套牢風險極高，宜調節。";
      } else {
        kdScore = 3;
        kdComment = "⚠️ K值向下摜穿D死亡交叉，短線拉回整理確立，轉為防守找買點。";
      }
    } else if (kVal > 80) {
      kdScore = 4;
      kdComment = "🔥 K值進入超買高熱區（>80），慎防多頭動能耗盡引發的高檔急拉震盪。";
    } else if (kVal < 20) {
      kdScore = 7;
      kdComment = "💎 K值跌入超賣絕望底（<20），空頭力道竭盡，長線價值投資者已可分批佈局。";
    } else if (kVal > dVal) {
      kdScore = 7;
      kdComment = "📈 K值大於D值震盪向上，多方掌控盤勢中短期節奏，緩步推升。";
    } else {
      kdScore = 5;
      kdComment = "📉 K值低於D值震盪修正，空方略佔上風，持股尚未脫離向下扣抵軌道。";
    }

    // 3. RSI Score & Comment
    let rsiScore = 5;
    let rsiComment = "相對強弱度在中軸50附近均衡震盪，盤面呈現牛皮拉鋸。";
    const rsi6 = tMetrics.rsi.rsi6;
    const rsi12 = tMetrics.rsi.rsi12;

    if (rsi6 > 85) {
      rsiScore = 3;
      rsiComment = "🔥 RSI-6 爆表超買，短線乖離已達過熱臨界值，不建議在此盲目跟風追高。";
    } else if (rsi6 > 70) {
      rsiScore = 6;
      rsiComment = "📈 進入強勢攻擊波，買氣充足，但需同時檢視成交量是否能跟進爆量。";
    } else if (rsi6 < 15) {
      rsiScore = 9;
      rsiComment = "💎 RSI-6 跌破極限超賣臨界，股價通常已超跌，反彈行情一觸即發，值密切關注。";
    } else if (rsi6 < 25) {
      rsiScore = 8;
      rsiComment = "🛡️ 處於深水區超賣，多頭抵抗意願升溫，進入中長波段佈局的安全溢價區。";
    } else if (rsi6 > 55 && rsi6 > rsi12) {
      rsiScore = 8;
      rsiComment = "📈 多頭在強勢主導區，6MA突破12MA，短中期向上趨勢仍有強力支撐。";
    } else if (rsi6 < 45 && rsi6 < rsi12) {
      rsiScore = 3;
      rsiComment = "📉 指標落在多空線(50)之下，意味目前賣壓大於買盤，線型暫呈偏弱整理。";
    }

    // 4. Bollinger Bands Score & Comment
    let bbScore = 5;
    let bbComment = "股價處於布林常態帶，上下波幅暫無明顯多空方向。";
    const bbStatus = tMetrics.bollinger.status;
    const percent = tMetrics.bollinger.percent;

    if (bbStatus.includes("突破上軌")) {
      bbScore = 9;
      bbComment = "🚀 強勢帶量突破上軌，布林軌道向兩側爆發開口，大飆股、妖股起漲型態特徵。";
    } else if (bbStatus.includes("跌破下軌")) {
      bbScore = 2;
      bbComment = "⚠️ 股價摜破下軌，殺盤恐慌湧現；等待回補下軌內方為止跌進場時機。";
    } else if (percent > 50) {
      bbScore = 8;
      bbComment = "📈 穩守布林中軌（20MA生命線）之上，通道溫和向上，標準的盤堅多頭攻勢。";
    } else {
      bbScore = 4;
      bbComment = "📉 壓制在中軌之下，中軌轉為重壓區，多頭突圍困難，走勢偏向弱勢底盤。";
    }

    // 5. DMI Score & Comment
    let dmiScore = 5;
    let dmiComment = "DMI趨向指標纏繞，代表市場正處於無趨勢方向的橫盤洗洗盤期。";
    const adx = tMetrics.dmi.adx;
    const plusDI = tMetrics.dmi.plusDI;
    const minusDI = tMetrics.dmi.minusDI;

    if (adx > 25) {
      if (plusDI > minusDI) {
        dmiScore = 9;
        dmiComment = "🚀 ADX高於25強勢發散且 +DI 高懸，正向波段趨勢極度強烈，多頭必修課。";
      } else {
        dmiScore = 2;
        dmiComment = "📉 ADX確認空頭高張且 -DI 主導，大波段下殺煞車未啟，切忌盲目摸底。";
      }
    } else if (plusDI > minusDI) {
      dmiScore = 6;
      dmiComment = "⚖️ +DI 大於 -DI 但 ADX 趨弱，多方小幅佔優，但爆發力受制於大盤量能。";
    } else {
      dmiScore = 4;
      dmiComment = "⚖️ -DI 大於 +DI 但 ADX 低伏，空方略微控股，波段方向仍需時間淬煉。";
    }

    // 6. MA Divergence Score & Comment
    let divScore = 5;
    let divComment = "股價與各指標走勢同步健康推進，無任何頂/底背離跡象，架構健康。";
    const divType = tMetrics.maDivergence.type;

    if (divType === "bullish_divergence") {
      divScore = 9;
      divComment = "💎 極罕見底部背離！股價破低隨後指標打底向上，屬於極佳的主力吃貨與起漲起漲點。";
    } else if (divType === "bearish_divergence") {
      divScore = 2;
      divComment = "🔴 警惕高檔指標背離！股價刷高但MACD/RSI退縮，為典型的主力拉高出貨，慎防跳水。";
    }

    // 7. Bias Score & Comment
    let biasScore = 6;
    let biasComment = "乖離率處於安全合理範圍，與20MA成本線貼合度高，盤整沉澱。";
    const bias20 = tMetrics.bias.bias20;

    if (bias20 > 5) {
      biasScore = 4;
      biasComment = "🔥 20日乖離率大於5%，短線漲勢過急，與成本線脫節，應防備突發性的拉回洗盤。";
    } else if (bias20 < -5) {
      biasScore = 8;
      biasComment = "📉 20日負乖離過大，恐慌盤竭盡，提供中長線買家極具安全邊際的跌深反彈黃金底。";
    } else if (bias20 >= 0 && bias20 <= 3) {
      biasScore = 9;
      biasComment = "🟢 20MA乖離率極佳，主力成本控制適當，股價正處於突破後回踩確認的『起漲拐點』。";
    } else if (bias20 > 3 && bias20 <= 5) {
      biasScore = 7;
      biasComment = "📈 短中期仍有續強向上攀升動能，但進場空間已稍微壓縮，逢拉回支撐可承接。";
    }

    const items = [
      { name: "MACD 指標", data: `DIF: ${tMetrics.macd.dif} / DEA: ${tMetrics.macd.dea} / OSC: ${tMetrics.macd.osc}`, score: macdScore, comment: macdComment },
      { name: "KD 隨機指標", data: `K值: ${tMetrics.kd.k}% / D值: ${tMetrics.kd.d}% (${tMetrics.kd.status})`, score: kdScore, comment: kdComment },
      { name: "RSI 相對強弱", data: `RSI6: ${tMetrics.rsi.rsi6}% / RSI12: ${tMetrics.rsi.rsi12}%`, score: rsiScore, comment: rsiComment },
      { name: "布林通道軌道", data: `軌道比位: ${tMetrics.bollinger.percent}% / (中): ${tMetrics.bollinger.middle}`, score: bbScore, comment: bbComment },
      { name: "DMI 趨勢指標", data: `ADX: ${tMetrics.dmi.adx} (+DI: ${tMetrics.dmi.plusDI} / -DI: ${tMetrics.dmi.minusDI})`, score: dmiScore, comment: dmiComment },
      { name: "均線指標背離", data: divType === "none" ? "正常走勢" : divType === "bullish_divergence" ? "黃金底背離" : "熊市頂背離", score: divScore, comment: divComment },
      { name: "乖離率 (BIAS)", data: `5D: ${tMetrics.bias.bias5}% / 20D: ${tMetrics.bias.bias20}%`, score: biasScore, comment: biasComment },
    ];

    const sumScore = items.reduce((acc, curr) => acc + curr.score, 0);
    const avgScore = Math.round((sumScore / items.length) * 10) / 10;

    let verdict = "觀望等待拐點 (Neutral-Hold)";
    let verdictColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    if (avgScore >= 8) {
      verdict = "強烈建議買進 (Strong Buy)";
      verdictColor = "text-[#00E676] bg-[#00E676]/10 border-[#00E676]/30";
    } else if (avgScore >= 6.5) {
      verdict = "逢低分批佈局 (Accumulate)";
      verdictColor = "text-[#2962FF] bg-[#2962FF]/10 border-[#2962FF]/30";
    } else if (avgScore < 4.5) {
      verdict = "高估值高風險避開 (Reduce-Avoid)";
      verdictColor = "text-red-400 bg-red-400/10 border-red-400/30";
    }

    // Derive 2 Bullish highlights & 1 Bearish Risk
    const highlights: string[] = [];
    if (macdScore >= 8 || kdScore >= 8) {
      highlights.push("短線主流爆發：MACD/KD 釋放起漲金叉的多頭動能發散訊號。");
    }
    if (bbScore >= 8) {
      highlights.push("多頭強勢盤堅：股價穩守20MA生命線或布林中軌呈穩健上揚軌道。");
    } else if (biasScore >= 8) {
      highlights.push("極佳安全邊際：乖離率適度回踩，正處於主力多頭成本防守區。");
    }
    if (divType === "bullish_divergence") {
      highlights.push("籌碼極致進駐：盤面出現珍貴底部底背離，蘊含高勝率大拐點。");
    }
    
    // Ensure we have at least 2 highlights
    if (highlights.length < 1) {
      highlights.push("量能結構健全：日K與短天期均線無嚴重套牢乖離，有利控盤。");
    }
    if (highlights.length < 2) {
      highlights.push("防守區間明確：下方有高解析天期均線堆疊，支撐力道厚實。");
    }

    let potentialRisk = "日K線與短天期均線短期震盪，需防備浮額反覆洗籌盤。";
    if (bias20 > 5) {
      potentialRisk = `20MA正乖離過大 (+${bias20.toFixed(1)}%)，短線衝高追高有被主力打回洗盤的劇烈跳水風險。`;
    } else if (rsi6 > 80) {
      potentialRisk = "RSI 快線已達極度超買區，籌碼追價動能瀕臨力竭臨界，防備洗盤。";
    } else if (divType === "bearish_divergence") {
      potentialRisk = "技術面已驚現『高檔指標頂背離』！股價拉盤但資金在暗中流出，慎防快速回踩。";
    } else if (bbScore <= 4) {
      potentialRisk = "受制於布林中軌生命線（20MA）下壓，上行量能若無法爆量，恐流於箱型下探。";
    } else if (kdScore <= 3) {
      potentialRisk = "KD指標短期死亡向下延伸，浮額尚待消化，宜耐心等待指標二次黃金底交叉。";
    }

    return {
      items,
      avgScore,
      verdict,
      verdictColor,
      highlights: highlights.slice(0, 2),
      potentialRisk,
      stopLossPrice: (selectedStock.todayClose * 0.95).toFixed(1),
      twentyMA: tMetrics.bollinger.middle.toFixed(1)
    };
  }, [selectedStock, tMetrics]);

  return (
    <div className="bg-[#131722] border border-[#2D3139] rounded-xl p-5 shadow-xl mt-5 text-[#D1D4DC]" id="gemini-report-card">
      {/* Title Header with Glowing Pulse Icon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#2D3139]/80">
        <div>
          <h2 className="text-md sm:text-lg font-bold text-white flex items-center gap-2.5">
            <span className="bg-[#2962FF]/15 text-[#2962FF] p-2 rounded-lg border border-[#2962FF]/30 shadow-md shrink-0">
              <Activity size={18} className="text-[#2962FF] animate-pulse" />
            </span>
            7 大量化技術指標即時評等與多空診斷儀表板
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            即時計算目標個股之 MACD、KD、RSI、布林通道、DMI、均線背離與 20MA 乖離率，進行量化指標深度點評。
          </p>
        </div>
      </div>

      {/* State A: No Selected Stock */}
      {!selectedStock && (
        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 bg-[#0B0E14] border border-[#2D3139]/40 rounded-xl my-4 px-6">
          <div className="bg-slate-900 p-3.5 rounded-full border border-[#2D3139]/50 mb-3 text-slate-400">
            <Eye size={26} className="animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-slate-300">請先在上方點選一檔個股</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
            點選左側列表或搜尋個股後，系統將在此對該股進行 MACD、KD、RSI、布林通道、DMI、均線背離、乖離率共 7 大指標之 1-10 分即時評估，並產生精準的技術分析白皮書。
          </p>
        </div>
      )}

      {/* State B: Active Stock Selected - Show the Technical Grounding cockpit container */}
      {selectedStock && tMetrics && scoringData && (
        <div className="flex flex-col gap-5">
          {/* Collapsible/Expandable Cockpit Heading */}
          <div className="bg-[#0B0E14] border border-[#2D3139]/70 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pointer-events-none mb-3 border-b border-[#2D3139]/30 pb-2">
              <span className="text-xs font-bold text-[#2962FF] flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#2962FF]" />
                現有 7 面向高解析量化技術指標 (個股技術型態)
              </span>
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Calendar size={12} />
                {marketTime}
              </span>
            </div>

            {/* Grid of the 7 metrics */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Box 1: Technical indicators grid (8 cols) */}
              <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2 sm:p-2.5 bg-[#131722] border border-[#2D3139]/50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">1. MACD 指標</span>
                  <span className="text-xs font-bold font-mono text-[#00E676] block">
                    DIF: {tMetrics.macd.dif} / DEA: {tMetrics.macd.dea}
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">
                    OSC: {tMetrics.macd.osc}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 bg-[#131722] border border-[#2D3139]/50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">2. KD 隨機指標</span>
                  <span className="text-xs font-bold font-mono text-[#2962FF] block">
                    K: {tMetrics.kd.k}% / D: {tMetrics.kd.d}%
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {tMetrics.kd.status}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 bg-[#131722] border border-[#2D3139]/50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">3. RSI 相對強弱</span>
                  <span className="text-xs font-bold font-mono text-yellow-400 block">
                    RSI6: {tMetrics.rsi.rsi6}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    RSI12: {tMetrics.rsi.rsi12}%
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 bg-[#131722] border border-[#2D3139]/50 rounded-lg col-span-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">4. 布林通道 (Bollinger)</span>
                  <span className="text-xs font-bold font-mono text-slate-300 block truncate">
                    中軌(20MA): {tMetrics.bollinger.middle} | 頻寬比: {tMetrics.bollinger.percent}%
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    [上]: {tMetrics.bollinger.upper} [下]: {tMetrics.bollinger.lower}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 bg-[#131722] border border-[#2D3139]/50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">5. DMI 趨勢指標</span>
                  <span className="text-xs font-bold font-mono text-[#089981] block">
                    ADX: {tMetrics.dmi.adx}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    +DI: {tMetrics.dmi.plusDI} | -DI: {tMetrics.dmi.minusDI}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 bg-[#131722] border border-[#2D3139]/50 rounded-lg col-span-3">
                  <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">7. 均線乖離率 (BIAS)</span>
                  <span className="text-xs font-bold font-mono text-[#D1D4DC] block">
                    5D: {tMetrics.bias.bias5}% | 20D: {tMetrics.bias.bias20}%
                  </span>
                  <span className="text-[10px] text-teal-400 block truncate mt-0.5">
                    {tMetrics.bias.description}
                  </span>
                </div>
              </div>

              {/* Box 2: Descriptive metrics & Divergence (4 cols) */}
              <div className="md:col-span-4 flex flex-col gap-2 bg-[#131722] border border-[#2D3139]/50 p-2.5 rounded-lg justify-between">
                <div className="text-[11px] leading-relaxed">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2962FF]/10 text-[#2962FF] border border-[#2962FF]/20 font-bold uppercase tracking-wider inline-block mb-1.5 font-mono">
                    6. 均線與指標背離
                  </span>
                  <p className="text-slate-300 font-medium">背離狀態: {tMetrics.maDivergence.type === "none" ? "無顯著背離" : "⚠️ 偵測到指標背離"}</p>
                  <p className="text-[#00E676] text-[10px] mt-0.5 leading-relaxed font-sans">{tMetrics.maDivergence.description}</p>
                </div>
                
                <div className="text-[11px] border-t border-[#2D3139]/40 pt-1.5 leading-relaxed">
                  <span className="text-[x-small] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase tracking-wider inline-block mb-1 font-mono">
                    即時量化底層定位
                  </span>
                  <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
                    個股: {selectedStock.name} ({selectedStock.symbol})
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      selectedStock.todayClose >= selectedStock.indicators.ma20 || 
                      (selectedStock.indicators.ma5 >= selectedStock.indicators.ma20 && 
                       selectedStock.indicators.macdDiff >= selectedStock.indicators.macdDea)
                        ? "text-[#F23645] bg-[#F23645]/10 border border-[#F23645]/20"
                        : "text-[#089981] bg-[#089981]/10 border border-[#089981]/20"
                    }`}>
                      {selectedStock.todayClose >= selectedStock.indicators.ma20 || 
                       (selectedStock.indicators.ma5 >= selectedStock.indicators.ma20 && 
                        selectedStock.indicators.macdDiff >= selectedStock.indicators.macdDea)
                        ? "多方趨勢"
                        : "空方趨勢"}
                    </span>
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">今日收盤: <span className="text-white font-bold">{selectedStock.todayClose}</span> 元 | 成交量: <span className="text-white font-bold">{selectedStock.todayVolume}</span> 張</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table representing the 7 line indicator scoring table (Request: 進行 1-10 分評等并表格畫) */}
          <div className="bg-[#0B0E14] border border-[#2D3139] rounded-xl overflow-hidden shadow-2xl">
            <div className="px-4.5 py-3 bg-[#1C1F2B] border-b border-[#2D3139] flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Table size={15} className="text-[#2962FF]" />
                📊 7 大量化技術指標 1–10 評分大師點評表
              </span>
              <span className="bg-[#2962FF]/15 text-[#2962FF] border border-[#2962FF]/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                Real-Time Quant Grid
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2D3139]/70 bg-[#131722]/50 text-slate-400 transition-colors">
                    <th className="p-3.5 font-bold text-slate-200 text-xs sm:text-sm w-36">技術評估項目</th>
                    <th className="p-3.5 font-bold text-slate-200 text-xs sm:text-sm">實際計算數據與狀態</th>
                    <th className="p-3.5 font-bold text-slate-200 text-xs sm:text-sm text-center w-24">技術評分 (1-10)</th>
                    <th className="p-3.5 font-bold text-slate-200 text-xs sm:text-sm">核心點評與多空契機（精闢剖析）</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D3139]/70 bg-[#12151E]">
                  {scoringData.items.map((item, idx) => {
                    const isHighScore = item.score >= 8;
                    const isLowScore = item.score <= 3;
                    return (
                      <tr key={idx} className="hover:bg-[#252936]/40 transition-colors">
                        <td className="p-3.5 font-bold text-white bg-[#131722]/40 border-r border-[#2D3139]/40 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded bg-[#2962FF]"></span>
                          {item.name}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300 text-xs">
                          {item.data}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`font-mono font-extrabold text-[14px] px-2.5 py-1 rounded ${
                            isHighScore ? "text-[#00E676] bg-[#00E676]/10" :
                            isLowScore ? "text-red-400 bg-red-400/10" :
                            "text-[#2962FF] bg-[#2962FF]/10"
                          }`}>
                            {item.score} / 10
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300 text-[11px] sm:text-xs leading-relaxed font-sans">
                          {item.comment}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Technical Verdict Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left Box: Ultimate Verdict */}
            <div className="md:col-span-5 bg-[#0B0E14] border border-[#2D3139]/80 rounded-xl p-5 flex flex-col justify-between shadow-lg">
              <div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#2962FF]/10 text-[#2962FF] border border-[#2962FF]/20 font-bold uppercase tracking-wider inline-block mb-3.5 font-mono">
                  🏆 量化技術面算術平均分
                </span>
                
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">{scoringData.avgScore}</span>
                  <span className="text-sm text-slate-500 font-bold font-mono">/ 10</span>
                </div>

                <div className="mb-4">
                  <span className="text-[10px] text-slate-500 block mb-1">技術型態終極評級：</span>
                  <span className={`text-xs font-extrabold px-3 py-1.5 rounded-lg border inline-block ${scoringData.verdictColor}`}>
                    {scoringData.verdict}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#2D3139]/40 pt-4 mt-2">
                <h5 className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-2 font-mono">
                  <Award size={13} className="text-[#00E676]" />
                  終極診斷評語
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  該股在 7 面向量化項目中累計拿下 <strong>{scoringData.avgScore}</strong> 分。技術型態目前定位處於 
                  {scoringData.avgScore >= 8 ? " 極佳的強烈買進突破段主升波段。 " : 
                   scoringData.avgScore >= 6.5 ? " 標準的逢低分批建倉安全區。 " : 
                   scoringData.avgScore >= 4.5 ? " 膠著的觀望洗籌區，尚需等待拐點交叉。 " : 
                   " 偏空的轉弱修正形態，宜先行觀望防禦避開。 "}
                  操作上應嚴格遵守交易紀律防線，控制整體倉位比例。
                </p>
              </div>
            </div>

            {/* Right Box: Bullets & Stop-loss strategy */}
            <div className="md:col-span-7 bg-[#0B0E14] border border-[#2D3139]/80 rounded-xl p-5 flex flex-col gap-4 shadow-lg">
              {/* Bullets */}
              <div>
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#2962FF] mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-gradient-to-r from-[#2962FF] to-teal-400" />
                  型態重點
                </h3>
                <div className="flex flex-col gap-2">
                  {scoringData.highlights.map((hilight, hIdx) => (
                    <div key={hIdx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                      <span className="bg-[#00E676]/10 text-[#00E676] p-0.5 rounded mt-0.5 shrink-0 border border-[#00E676]/20">
                        <CheckCircle size={10} />
                      </span>
                      <span>
                        <strong className="text-[#00E676] font-bold">強勢亮點 {hIdx+1}：</strong>
                        {hilight}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                    <span className="bg-red-500/10 text-red-400 p-0.5 rounded mt-0.5 shrink-0 border border-red-500/20">
                      <ShieldAlert size={10} />
                    </span>
                    <span>
                      <strong className="text-red-400 font-bold">潛在風險項目：</strong>
                      {scoringData.potentialRisk}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stop loss card */}
              <div className="bg-[#131722] border border-[#2D3139] rounded-lg p-3.5 mt-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  ⚔️ 交易員實戰進場、停損防守與防護撤退機制
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans mb-2">
                  策略指引：明日若無帶量開高，可待回落至 <strong>20MA 生命線 ({scoringData.twentyMA} 元)</strong> 附近有守時分批佈局。
                </p>
                <div className="flex items-center gap-2 bg-[#eac54f]/10 text-[#eac54f] border border-[#eac54f]/20 p-2.5 rounded text-xs select-none">
                  <ShieldAlert size={14} className="shrink-0 animate-bounce" />
                  <span className="font-sans leading-relaxed">
                    <strong>收盤硬性停損防線：</strong>落實紀律！收盤確認跌破 <strong>{scoringData.stopLossPrice} 元</strong> (今日收盤價 -5%) 或持續跌破下彎之 20MA 超過 1.5% 且 3 日不站回時，即應落實避險撤退。
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
