const validCategories = new Set([
  "field_report",
  "food_safety",
  "product_quality",
  "revenue",
  "receiving",
  "store_transfer",
  "ordering",
  "inventory",
  "equipment",
  "staffing",
  "customer_service",
  "operations",
  "general"
]);

const validSeverities = new Set(["A", "B", "C"]);
const defaultInputCostPerMillion = 0.4;
const defaultOutputCostPerMillion = 1.6;

function extractJson(text = "") {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1];

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return "{}";
}

function extractResponseText(body = {}) {
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text;
  }

  const chunks = [];
  for (const item of body.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }

  return chunks.join("\n");
}

function normalizeAnalysis(value = {}) {
  const category = validCategories.has(value.category) ? value.category : "field_report";
  const severity = validSeverities.has(value.severity) ? value.severity : "C";

  return {
    status: "completed",
    ocr_text: String(value.ocr_text || "").slice(0, 4000),
    visual_summary: String(value.visual_summary || "").slice(0, 1000),
    category,
    severity,
    task_required: Boolean(value.task_required),
    task_title: String(value.task_title || "").slice(0, 120),
    action_suggestion: String(value.action_suggestion || "").slice(0, 1000),
    confidence: Number.isFinite(Number(value.confidence)) ? Number(value.confidence) : null
  };
}

function estimateCost(usage = {}) {
  const inputTokens = Number(usage.input_tokens || 0);
  const outputTokens = Number(usage.output_tokens || 0);
  const inputCostPerMillion = Number(process.env.OPENAI_INPUT_COST_PER_1M || defaultInputCostPerMillion);
  const outputCostPerMillion = Number(process.env.OPENAI_OUTPUT_COST_PER_1M || defaultOutputCostPerMillion);
  const estimatedCostUsd = (inputTokens / 1_000_000) * inputCostPerMillion
    + (outputTokens / 1_000_000) * outputCostPerMillion;

  return {
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: Number(usage.total_tokens || inputTokens + outputTokens)
    },
    cost_estimate: {
      currency: "USD",
      input_cost_per_1m: inputCostPerMillion,
      output_cost_per_1m: outputCostPerMillion,
      estimated_cost_usd: Number(estimatedCostUsd.toFixed(8))
    }
  };
}

function buildAnalysisPrompt() {
  return [
    "你是萊吉多炸雞總部的營運督導助理，請分析 LINE 群組上傳的圖片。",
    "任務是辨識圖片中的文字、截圖、照片、收貨單、叫貨單、業績回報、現場狀況、客訴、衛生、設備或營運問題。",
    "請盡量做 OCR。若圖片沒有可讀文字，也要描述畫面看到的重點。",
    "分類請只能使用以下其中一個：field_report, food_safety, product_quality, revenue, receiving, store_transfer, ordering, inventory, equipment, staffing, customer_service, operations, general。",
    "嚴重度規則：A=食品安全、停電停水、重大客訴、設備無法營業、明顯違規；B=需主管追蹤的品質、庫存、人員、設備或顧客問題；C=一般回報、業績、收貨、叫貨、照片留存。",
    "task_required 代表是否需要建立追蹤任務。單純業績、正常收貨、一般留存照片通常為 false；異常、缺貨、未完成、需回覆、需改善為 true。",
    "只輸出 JSON，不要 markdown，不要補充說明。",
    JSON.stringify({
      ocr_text: "圖片中可讀到的完整文字，無則空字串",
      visual_summary: "畫面內容摘要，說明照片或截圖重點",
      category: "field_report",
      severity: "C",
      task_required: false,
      task_title: "若需追蹤，20字內任務標題；不需則空字串",
      action_suggestion: "建議總部或門市下一步動作；不需則空字串",
      confidence: 0.8
    })
  ].join("\n");
}

export function buildImageText(analysis) {
  if (!analysis) return "";

  const parts = [];
  if (analysis.visual_summary) parts.push(`圖片摘要：${analysis.visual_summary}`);
  if (analysis.ocr_text) parts.push(`OCR：${analysis.ocr_text}`);
  if (analysis.action_suggestion) parts.push(`建議動作：${analysis.action_suggestion}`);
  if (analysis.manual_review_required) parts.push("狀態：待人工確認");
  return parts.join("\n").slice(0, 6000);
}

export async function analyzeImageBytes(bytes, contentType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: "skipped",
      error: "OPENAI_API_KEY is not configured"
    };
  }

  if (!contentType?.startsWith("image/")) {
    return {
      status: "skipped",
      error: `Unsupported content type: ${contentType || "unknown"}`
    };
  }

  const maxBytes = Number(process.env.IMAGE_ANALYSIS_MAX_BYTES || 4 * 1024 * 1024);
  if (bytes.length > maxBytes) {
    return {
      status: "skipped",
      error: `Image too large for analysis: ${bytes.length} bytes`
    };
  }

  const model = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
  const dataUrl = `data:${contentType};base64,${bytes.toString("base64")}`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_output_tokens: 900,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: buildAnalysisPrompt() },
              { type: "input_image", image_url: dataUrl }
            ]
          }
        ]
      })
    });

    const body = await response.json();
    if (!response.ok) {
      return {
        status: "failed",
        model,
        error: body.error?.message || `OpenAI request failed: ${response.status}`
      };
    }

    const responseText = extractResponseText(body);
    const parsed = JSON.parse(extractJson(responseText));
    return {
      ...normalizeAnalysis(parsed),
      model,
      ...estimateCost(body.usage)
    };
  } catch (error) {
    return {
      status: "failed",
      model,
      error: error.message
    };
  }
}
