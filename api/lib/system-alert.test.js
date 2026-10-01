import test from "node:test";
import assert from "node:assert/strict";
import { buildSystemAlertMessage, normalizeSystemAlert } from "./system-alert.js";

test("system alert accepts only the ordering system source", () => {
  assert.throws(() => normalizeSystemAlert({ source: "unknown", transition: "failed" }), /Unknown alert source/);
});

test("system alert excludes fields outside the allowlist", () => {
  const alert = normalizeSystemAlert({
    source: "laigdo-franchise-ordering",
    transition: "failed",
    event: { error: "timeout", order_id: "must-not-leak", password: "must-not-leak" },
  });
  assert.equal(alert.error, "timeout");
  assert.equal(alert.order_id, undefined);
  assert.equal(alert.password, undefined);
});

test("system alert creates a concise Traditional Chinese message", () => {
  const alert = normalizeSystemAlert({
    source: "laigdo-franchise-ordering",
    transition: "recovered",
    event: { checked_at: "2026-08-25T08:00:00.000Z", database_status: "ok" },
  });
  const message = buildSystemAlertMessage(alert);
  assert.match(message, /系統恢復通知/);
  assert.match(message, /資料庫狀態：ok/);
  assert.doesNotMatch(message, /order_id|password/);
});

test("daily system health uses the existing safe alert format", () => {
  const alert = normalizeSystemAlert({
    source: "laigdo-franchise-ordering",
    transition: "daily",
    event: {
      checked_at: "2026-10-02T02:00:00.000Z",
      production_url: "https://example.com",
      app_http_status: 200,
      database_status: "ok",
      app_latency_ms: 120,
      health_latency_ms: 85,
    },
  });
  const message = buildSystemAlertMessage(alert);
  assert.match(message, /加盟店叫貨系統｜每日健康檢查/);
  assert.match(message, /系統目前正常運作/);
  assert.doesNotMatch(message, /order_id|password|access_token|店別：/);
});
