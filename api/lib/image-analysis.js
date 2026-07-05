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

function normalizeAnalysis(value) {
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

function buildAnalysisPrompt() {
  return [
    "你是萊吉多炸雞總部營運督導的圖片 OCR 與現場判讀助手。",
    "請分析圖片中的文字與現場狀態，重點是門市營運、巡檢表、收貨量、叫貨量、營收回報、衛生、產品品質、設備、人員與客訴。",
    "如果圖片是表格或截圖，請盡量完整 OCR 文字與數字。",
    "如果圖片涉及食安疑慮，例如異物、髒污、腐敗、冰箱異常、油品異常，severity 請給 A。",
    "如果圖片只是不明現場照片且無明確問題，category 用 field_report，severity 用 C。",
    "請只回傳 JSON，不要 markdown，不要額外說明。",
    JSON.stringify({
      ocr_text: "圖片中可讀文字，沒有則空字串",
      visual_summary: "現場狀態摘要，繁體中文",
      category: "field_report | food_safety | product_quality | revenue | receiving | store_transfer | ordering | inventory | equipment | staffing | customer_service | operations | general",
      severity: "A | B | C",
      task_required: false,
      task_title: "若需追蹤，給 20 字內任務標題，否則空字串",
      action_suggestion: "總部後續處理建議，繁體中文",
      confidence: 0.8
    })
  ].join("\n");
}

export function buildImageText(analysis) {
  if (!analysis || analysis.status !== "completed") return "";

  const parts = [];
  if (analysis.visual_summary) parts.push(`圖片摘要：${analysis.visual_summary}`);
  if (analysis.ocr_text) parts.push(`OCR：${analysis.ocr_text}`);
  if (analysis.action_suggestion) parts.push(`建議：${analysis.action_suggestion}`);
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

    const parsed = JSON.parse(extractJson(body.output_text || ""));
    return {
      ...normalizeAnalysis(parsed),
      model
    };
  } catch (error) {
    return {
      status: "failed",
      model,
      error: error.message
    };
  }
}
