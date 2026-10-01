import { pushToLine } from "../lib/reporting.js";
import { buildSystemAlertMessage, normalizeSystemAlert } from "../lib/system-alert.js";

function authorized(req) {
  const cronSecret = process.env.CRON_SECRET;
  return !cronSecret || req.headers.authorization === `Bearer ${cronSecret}`;
}

async function read(url, expectedType) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    headers: { accept: expectedType },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return { status: response.status, body, latencyMs: Date.now() - startedAt };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized" });

  const productionUrl = process.env.FRANCHISE_ORDERING_URL || "https://laijiduo-franchise-inventory-app.vercel.app";
  try {
    const [app, healthResponse] = await Promise.all([
      read(productionUrl, "text/html"),
      read(`${productionUrl}/api/health`, "application/json"),
    ]);
    if (!/<div\s+id=["']root["'][^>]*>/i.test(app.body)) {
      throw new Error("Public app response is missing the React root element");
    }
    const health = JSON.parse(healthResponse.body);
    const databaseStatus = typeof health.database === "string" ? health.database : health.database?.status;
    if (health.status !== "ok" || databaseStatus !== "ok") {
      throw new Error(`Health endpoint is degraded: ${healthResponse.body.slice(0, 300)}`);
    }

    const alert = normalizeSystemAlert({
      source: "laigdo-franchise-ordering",
      transition: "daily",
      event: {
        checked_at: new Date().toISOString(),
        production_url: productionUrl,
        app_http_status: app.status,
        app_latency_ms: app.latencyMs,
        database_status: databaseStatus,
        health_latency_ms: healthResponse.latencyMs,
      },
    });
    const result = await pushToLine(buildSystemAlertMessage(alert), process.env.LINE_SYSTEM_ALERT_TO);
    if (!result.pushed) return res.status(503).json({ error: "Alert channel is not configured" });
    return res.status(200).json({ ok: true, status: "pass", checked_at: alert.checkedAt });
  } catch (error) {
    console.error("franchise_ordering_daily_health_failed", { message: error.message });
    return res.status(503).json({ ok: false, status: "fail", error: error.message });
  }
}
