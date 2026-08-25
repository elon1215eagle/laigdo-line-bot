const transitions = new Set(["failed", "recovered", "test"]);

function clean(value, maxLength = 300) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeSystemAlert(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid alert payload");
  if (payload.source !== "laigdo-franchise-ordering") throw new Error("Unknown alert source");
  if (!transitions.has(payload.transition)) throw new Error("Unknown alert transition");

  const event = payload.event && typeof payload.event === "object" ? payload.event : {};
  return {
    transition: payload.transition,
    checkedAt: clean(event.checked_at || new Date().toISOString(), 50),
    productionUrl: clean(event.production_url, 200),
    error: clean(event.error, 300),
    appStatus: clean(event.app_http_status, 20),
    databaseStatus: clean(event.database_status, 30),
    appLatencyMs: Number.isFinite(Number(event.app_latency_ms)) ? Number(event.app_latency_ms) : null,
    healthLatencyMs: Number.isFinite(Number(event.health_latency_ms)) ? Number(event.health_latency_ms) : null,
  };
}

export function buildSystemAlertMessage(alert) {
  const heading = {
    failed: "【系統故障通知】",
    recovered: "【系統恢復通知】",
    test: "【系統通知測試】",
  }[alert.transition];
  const lines = [
    heading,
    "系統：萊吉多加盟叫貨系統",
    `狀態：${alert.transition === "failed" ? "異常，請處理" : alert.transition === "recovered" ? "已恢復正常" : "通知管道測試"}`,
    `檢查時間：${alert.checkedAt}`,
  ];
  if (alert.appStatus) lines.push(`網站狀態：HTTP ${alert.appStatus}`);
  if (alert.databaseStatus) lines.push(`資料庫狀態：${alert.databaseStatus}`);
  if (alert.appLatencyMs !== null) lines.push(`網站回應：${alert.appLatencyMs} ms`);
  if (alert.healthLatencyMs !== null) lines.push(`健康檢查：${alert.healthLatencyMs} ms`);
  if (alert.error) lines.push(`錯誤摘要：${alert.error}`);
  if (alert.productionUrl) lines.push(`系統網址：${alert.productionUrl}`);
  lines.push(alert.transition === "failed" ? "處理：請先確認 Vercel 與 Supabase 狀態。" : "本通知不包含帳密、訂單或門店資料。");
  return lines.join("\n");
}
