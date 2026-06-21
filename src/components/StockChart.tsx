import React from "react";
import { createChart, IChartApi, ColorType, CrosshairMode } from "lightweight-charts";
import { Stock, FilterResult } from "../types";
import { calculateSMA } from "../utils/indicators";
import { HelpCircle, TrendingUp, TrendingDown, Volume2, Landmark } from "lucide-react";

interface StockChartProps {
  selectedStock: Stock | null;
  filterResults: FilterResult[];
}

export default function StockChart({ selectedStock, filterResults }: StockChartProps) {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<any>(null);

  // Find the evaluation details for selected stock
  const currentEvaluation = React.useMemo(() => {
    if (!selectedStock) return null;
    return filterResults.find((r) => r.stock.symbol === selectedStock.symbol) || null;
  }, [selectedStock, filterResults]);

  React.useEffect(() => {
    if (!chartContainerRef.current || !selectedStock) return;

    // Clean up any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    
    // Create new chart instance with typecasting to circumvent version 4 type signatures
    const chart = createChart(container, {
      width: container.clientWidth,
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

    // Add 10MA (Yellow)
    const line10Series = chart.addLineSeries({
      color: "#eab308",
      lineWidth: 1.5,
      title: "10MA",
    });
    line10Series.setData(createLineData(ma10Values, 10));

    // Add 20MA (Pink)
    const line20Series = chart.addLineSeries({
      color: "#ec4899",
      lineWidth: 2,
      title: "20MA (月)",
    });
    line20Series.setData(createLineData(ma20Values, 20));

    // Add 60MA (Teal)
    const line60Series = chart.addLineSeries({
      color: "#14b8a6",
      lineWidth: 2,
      title: "60MA (季)",
    });
    line60Series.setData(createLineData(ma60Values, 60));

    // Fit content inside the screen visible bounds
    chart.timeScale().fitContent();

    // ResizeObserver implementation to guarantee responsive fluid sizing
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chart) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [selectedStock]);

  if (!selectedStock) {
    return (
      <div className="bg-[#131722] border border-[#2D3139] rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500 h-[480px]">
        <Landmark size={48} className="text-slate-700 mb-2 animate-bounce" />
        <p className="font-semibold text-slate-305">未選取任何個股</p>
        <p className="text-xs max-w-xs mt-1 text-slate-500">請先在上方表格中點選任何一列，此處即可載入對應之 TradingView 專業 K 線技術圖。</p>
      </div>
    );
  }

  const isUp = selectedStock.changePercentage >= 0;
  const biasVal = Math.round(selectedStock.indicators.bias20 * 10000) / 100;

  return (
    <div className="bg-[#131722] border border-[#2D3139] rounded-xl overflow-hidden shadow-lg flex flex-col h-full text-[#D1D4DC]" id={`stock-chart-panel-${selectedStock.symbol}`}>
      {/* Chart Top Summary Bar */}
      <div className="p-4 bg-[#1E222D] border-b border-[#2D3139] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#131722] px-3 py-1 rounded border border-[#2D3139]">
            <span className="text-[10px] font-mono text-slate-500 block leading-tight">台股 Ticker</span>
            <span className="text-sm font-bold text-white font-mono">{selectedStock.symbol}</span>
          </div>
          <div>
            <h2 className="text-md font-bold text-slate-100 flex items-center gap-2">
              {selectedStock.name}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#131722] text-slate-400 border border-[#2D3139] font-normal">
                {selectedStock.industry}
              </span>
            </h2>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] font-mono text-slate-400">
              <span>開: <span className="text-white">{selectedStock.todayOpen.toFixed(1)}</span></span>
              <span>高: <span className="text-[#F23645]">{selectedStock.todayHigh.toFixed(1)}</span></span>
              <span>低: <span className="text-[#089981]">{selectedStock.todayLow.toFixed(1)}</span></span>
              <span>收: <span className={isUp ? "text-[#F23645]" : "text-[#089981]"}>{selectedStock.todayClose.toFixed(1)}</span></span>
            </div>
          </div>
        </div>

        {/* Change stats */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block leading-tight">今日幅度</span>
            <span className={`text-md font-mono font-bold ${isUp ? "text-[#F23645]" : "text-[#089981]"}`}>
              {isUp ? "▲ +" : "▼ "}{selectedStock.changePercentage.toFixed(2)}%
            </span>
          </div>
          <div className="border-l border-[#2D3139] pl-3 text-left">
            <span className="text-[10px] text-slate-500 block leading-tight">乖離率</span>
            <span className={`text-xs font-mono font-bold ${biasVal > 0 && biasVal <= 3.0 ? "text-yellow-500" : "text-slate-300"}`}>
              {biasVal > 0 ? "+" : ""}{biasVal.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

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
    </div>
  );
}
