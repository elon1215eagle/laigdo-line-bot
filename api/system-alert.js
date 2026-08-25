import crypto from "node:crypto";
import { pushToLine } from "./lib/reporting.js";
import { buildSystemAlertMessage, normalizeSystemAlert } from "./lib/system-alert.js";

function authorized(req) {
  const expected = process.env.SYSTEM_ALERT_SECRET || "";
  const provided = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const alert = normalizeSystemAlert(payload);
    const message = buildSystemAlertMessage(alert);
    const result = await pushToLine(message, process.env.LINE_SYSTEM_ALERT_TO);
    if (!result.pushed) return res.status(503).json({ error: "Alert channel is not configured" });
    return res.status(200).json({ ok: true, transition: alert.transition });
  } catch (error) {
    console.error("system_alert_failed", { message: error.message });
    return res.status(400).json({ error: "Invalid alert request" });
  }
}
