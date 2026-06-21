import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "10mb" }));

  // API endpoint for Gemini Stock Analysis Report (1-10 scores on 7 technical indicators & strategy verdict)
  app.post("/api/generate-report", async (req, res) => {
    try {
      const { stock, technicals, marketTime } = req.body;
      if (!stock || !technicals) {
        return res.status(400).json({ error: "未選取個股或技術指標數據不完整" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "尚未設定 GEMINI_API_KEY。請點擊 AI Studio 右上角『設定』填寫您的 Gemini API 金鑰，即可啟用智慧投顧報告分析功能！" 
        });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const lastKline = stock.history && stock.history.length > 0 ? stock.history[stock.history.length - 1] : null;
      const prevKline = stock.history && stock.history.length > 1 ? stock.history[stock.history.length - 2] : null;

      // Clean representation focusing on technical configurations
      const stockContext = {
        代碼: stock.symbol,
        名稱: stock.name,
        產業分類: stock.industry,
        今日股價: stock.todayClose + " 元",
        今日漲跌幅: stock.changePercentage?.toFixed(2) + "%",
        今日成交量: stock.todayVolume + " 張",
        昨日收盤價: prevKline ? prevKline.close : "無",
        
        // The 7 requested technical line dimensions
        MACD指標: `DIF: ${technicals.macd.dif}, DEA: ${technicals.macd.dea}, OSC柱狀值: ${technicals.macd.osc} (狀態: ${technicals.macd.status})`,
        KD隨機指標: `K值: ${technicals.kd.k}%, D值: ${technicals.kd.d}% (狀態: ${technicals.kd.status})`,
        RSI相對強弱: `RSI-6: ${technicals.rsi.rsi6}%, RSI-12: ${technicals.rsi.rsi12}% (狀態: ${technicals.rsi.status})`,
        布林通道軌道: `上軌: ${technicals.bollinger.upper}, 中軌(20MA): ${technicals.bollinger.middle}, 下軌: ${technicals.bollinger.lower}, 現價位於頻寬比: ${technicals.bollinger.percent}% (狀態: ${technicals.bollinger.status})`,
        DMI趨勢指數: `+DI: ${technicals.dmi.plusDI}, -DI: ${technicals.dmi.minusDI}, ADX強度: ${technicals.dmi.adx} (狀態: ${technicals.dmi.status})`,
        均線指標背離狀態: technicals.maDivergence.description,
        乖離率安全度: `5日乖離: ${technicals.bias.bias5}%, 10日乖離: ${technicals.bias.bias10}%, 20日乖離: ${technicals.bias.bias20}%, 60日乖離: ${technicals.bias.bias60}% | 評語: ${technicals.bias.description}`
      };

      const prompt = `您是台灣最頂尖的量化交易大師、技術分析權威與星級投顧策略分析師。
我們剛剛收到了系統所監測點選的個股完整即時技術面數據：

${JSON.stringify(stockContext, null, 2)}

請為這檔個股撰寫一份極具大師級深度與實戰指引的「${stock.name} (${stock.symbol}) 7大指標技術線型量化綜合評等與極客交易白皮書」。

您的報告必須嚴格遵循以下兩大部分：

### 第一部分：📊 【7大指標技術型態評等表】
請針對以下計量技術面向，依據今日個股實際所屬的位置、線型強度與量能狀態，進行 **1-10 分** 的客觀技術面評分。評分要完全符合真實數據代表的多空強弱，並將結果呈現在一個精美的 Markdown 表格中：
| 技術評估項目 | 實際計算數據與狀態 | 技術評分 (1-10) | 核心點評與多空契機（50字內精闢剖析） |
| :--- | :--- | :--- | :--- |
| 1. **MACD指標** | ${stockContext.MACD指標} | [填寫分數] | [填寫核心點評] |
| 2. **KD隨機指標** | ${stockContext.KD隨機指標} | [填寫分數] | [填寫核心點評] |
| 3. **RSI相對強弱** | ${stockContext.RSI相對強弱} | [填寫分數] | [填寫核心點評] |
| 4. **布林通道軌道** | ${stockContext.布林通道軌道} | [填寫分數] | [填寫核心點評] |
| 5. **DMI趨勢指數** | ${stockContext.DMI趨勢指數} | [填寫分數] | [填寫核心點評] |
| 6. **均線指標背離** | ${stockContext.均線指標背離狀態} | [填寫分數] | [填寫核心點評] |
| 7. **乖離率 (BIAS)** | ${stockContext.乖離率安全度} | [填寫分數] | [填寫核心點評] |

*(請注意：評語與指標分析必須非常客觀、科學，且完全符合實際數據代表的多空強弱，不可敷衍。分數應充分拉開級距。)*

---

### 第二部分：🎯 【技術型態綜合多空 verdict】
請針對上述 7 個技術指標的綜合評等與今日的起漲/整理線型做最終評估：
1. 💡 **【綜合技術型態多空剖析】**
   - 列出本股技術型態上的 **「2大強勢亮點」與「1項潛在風險」**。
2. ⚔️ **【頂尖交易員實戰進場、停損防守與防護撤退機制】**
   - 給出具體實操戰術（例如：明天開盤如何避開追高？拉回到哪個關鍵均線或布林中軌支撐位置可分批切入？)
   - 訂出具體、不含糊的收盤停損撤退點 (例如收盤跌破今天帶量紅K低點，或跌破持續走揚的20MA超過 1.5% 等)。
3. 🏁 **【技術潛力終極評級與建議】**
   - 計算這 7 項技術指標的「技術面算術平均分」（總分 10 分）。
   - 從「強烈建議買進 (Strong Buy)」、「逢低建倉佈局 (Accumulate)」、「觀望等待拐點 (Neutral-Hold)」、「高估值高風險避開 (Reduce-Avoid)」中擇一。
   - 給出強力且真誠的技術面分析總結，告知投資人此時是否為絕佳的「黑馬起漲型可投資潛力點」。

請用極其生動、專業、散發計量策略大師及老練投顧風格的繁體中文，搭配排版精緻漂亮的 Markdown 呈獻，文字要有深度且字字珠璣。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      res.json({ report: response.text });
    } catch (err: any) {
      console.error("Gemini server error:", err);
      res.status(500).json({ error: err.message || "伺服器在生成 AI 報告時發生技術錯誤" });
    }
  });

  // Vite development middleware vs. production static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware loaded successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static handler ready for serving builds.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express Backend] Running on port ${PORT}`);
  });
}

startServer();
