import crypto from "node:crypto";
import { buildDailyReport, getActiveStoreSettings, getSupabase, pushToLine } from "../lib/reporting.js";

const categoryRules = [
  { category: "food_safety", severity: "A", keywords: ["\u98df\u5b89", "\u9178\u6557", "\u7570\u5473", "\u904e\u671f", "\u885b\u751f", "\u51b0\u7bb1", "\u6563\u71b1\u7247", "\u6cb9\u57a2", "\u672a\u6e05\u6f54"] },
  { category: "product_quality", severity: "B", keywords: ["\u70b8\u592a\u9ed1", "\u592a\u4e7e", "\u4e0d\u8106", "\u8089\u6c41", "\u53e3\u611f", "\u96de\u7fc5", "\u96de\u6392", "\u96de\u817f", "\u4e09\u89d2\u9aa8", "\u96de\u7c73\u82b1", "\u984f\u8272", "\u9000\u8ca8"] },
  { category: "revenue", severity: "C", keywords: ["PO", "po", "\u71df\u696d\u984d", "\u6536\u5165", "\u696d\u7e3e"] },
  { category: "receiving", severity: "C", keywords: ["\u6536\u8ca8", "\u5230\u8ca8", "\u9032\u8ca8", "\u9a57\u6536", "\u6536\u8ca8\u91cf", "\u4f86\u8ca8", "\u9001\u8ca8", "\u8ca8\u5230"] },
  { category: "store_transfer", severity: "C", keywords: ["\u914d\u9001\u81f3", "\u914d\u9001\u5230", "\u7269\u6d41", "\u8abf\u8ca8", "\u652f\u63f4\u8ca8", "\u5efa\u8208\u53eb\u8ca8\u91cf", "\u5927\u660c\u6e96\u5099"] },
  { category: "ordering", severity: "C", keywords: ["\u53eb\u8ca8\u91cf", "\u53eb\u8ca8", "\u8a02\u8ca8", "\u8a02\u8ca8\u91cf", "\u88dc\u8ca8", "\u88dc\u8ca8\u91cf"] },
  { category: "inventory", severity: "B", keywords: ["\u7f3a\u8ca8", "\u6c92\u8ca8", "\u5eab\u5b58", "\u5099\u6599", "\u65b7\u8ca8", "\u8017\u640d"] },
  { category: "equipment", severity: "B", keywords: ["\u6545\u969c", "\u51b0\u7bb1\u58de", "\u70b8\u7210", "\u8a2d\u5099", "\u6f0f\u6c34", "\u8df3\u96fb", "\u74e6\u65af", "\u505c\u96fb"] },
  { category: "staffing", severity: "B", keywords: ["\u9072\u5230", "\u8acb\u5047", "\u6392\u73ed", "\u4eba\u624b", "\u7f3a\u4eba", "\u5de5\u8b80", "\u52a0\u73ed"] },
  { category: "customer_service", severity: "B", keywords: ["\u5ba2\u8a34", "\u8ca0\u8a55", "\u9000\u6b3e", "\u614b\u5ea6", "\u7b49\u592a\u4e45", "\u51fa\u9910\u6162", "\u9867\u5ba2"] },
  { category: "operations", severity: "C", keywords: ["\u958b\u5e97", "\u6253\u70ca", "SOP", "\u6d41\u7a0b", "\u4ea4\u63a5", "\u5de1\u6aa2", "\u672a\u6539\u5584", "\u8ffd\u8e64"] }
];

const completionKeywords = ["\u5b8c\u6210", "\u5df2\u5b8c\u6210", "\u5df2\u8655\u7406", "\u8655\u7406\u597d\u4e86", "\u6539\u5584\u5b8c\u6210", "\u56de\u5831\u5b8c\u6210", "\u7167\u7247\u56de\u50b3"];
const followUpKeywords = ["\u8ffd\u8e64", "\u672a\u5b8c\u6210", "\u5f85\u8655\u7406", "\u8acb\u6539\u5584", "\u7570\u5e38", "\u5ba2\u8a34", "\u6545\u969c", "\u7f3a\u8ca8", "\u672a\u6e05\u6f54", "\u660e\u5929", "\u8907\u67e5"];
const receivingIssueKeywords = ["\u672a\u5230", "\u6c92\u5230", "\u5c11", "\u7f3a", "\u7570\u5e38", "\u7834\u640d", "\u9000\u8ca8", "\u6578\u91cf\u4e0d\u5c0d"];
const orderingIssueKeywords = ["\u672a\u4e0b", "\u6f0f\u4e0b", "\u7f3a", "\u7570\u5e38", "\u6578\u91cf\u4e0d\u5c0d", "\u8ffd\u8e64"];
const mediaTypes = new Set(["image", "video", "audio", "file"]);
const reportCommandKeywords = ["今日匯報", "今日回報", "今天匯報", "今天回報"];

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isValidLineSignature(rawBody, signature) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret || !signature) return false;

  const digest = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function classifyMessage(text = "", messageType = "text") {
  if (/\bpo\b/i.test(text) && /(?:\$|[0-9][0-9,]*\s*$|\u71df\u696d\u984d|\u6536\u5165)/.test(text)) {
    return { category: "revenue", severity: "C" };
  }

  if (/\u5efa\u8208.*\u53eb\u8ca8\u91cf/.test(text) && /@|Gin|\u5927\u660c|\u914d\u9001|\u7269\u6d41/.test(text)) {
    return { category: "store_transfer", severity: "C" };
  }

  const matched = categoryRules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  if (matched) return matched;
  if (mediaTypes.has(messageType)) return { category: "field_report", severity: "C" };
  return { category: "general", severity: "C" };
}

function normalizeLineEvent(event) {
  const source = event.source || {};
  const message = event.message || {};
  const text = message.type === "text" ? message.text : "";
  const result = classifyMessage(text, message.type || event.type);

  return {
    line_event_id: event.webhookEventId || null,
    reply_token: event.replyToken || null,
    source_type: source.type || null,
    group_id: source.groupId || null,
    room_id: source.roomId || null,
    user_id: source.userId || null,
    message_id: message.id || null,
    message_type: message.type || event.type,
    text,
    category: result.category,
    severity: result.severity,
    media_file_name: message.fileName || null,
    media_file_size: message.fileSize || null,
    occurred_at: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
    raw_event: event
  };
}

function extensionFromContentType(contentType, fallback = "bin") {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "application/pdf": "pdf"
  };
  return map[contentType] || fallback;
}

async function downloadLineContent(record) {
  if (!mediaTypes.has(record.message_type) || !record.message_id) return null;

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;

  const response = await fetch(`https://api-data.line.me/v2/bot/message/${record.message_id}/content`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    return { media_download_error: `LINE content download failed: ${response.status}` };
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, contentType };
}

async function saveMediaToStorage(supabase, record) {
  const downloaded = await downloadLineContent(record);
  if (!downloaded || downloaded.media_download_error) return downloaded || {};

  const sourceId = record.group_id || record.room_id || record.user_id || "unknown";
  const date = record.occurred_at.slice(0, 10);
  const ext = record.media_file_name?.split(".").pop() || extensionFromContentType(downloaded.contentType);
  const path = `${sourceId}/${date}/${record.message_id}.${ext}`;

  const { error } = await supabase.storage
    .from("line-media")
    .upload(path, downloaded.bytes, {
      contentType: downloaded.contentType,
      upsert: true
    });

  if (error) return { media_download_error: error.message };

  return {
    media_storage_bucket: "line-media",
    media_storage_path: path,
    media_content_type: downloaded.contentType,
    media_file_size: record.media_file_size || downloaded.bytes.length
  };
}

function inferTaskStatus(record) {
  const text = record.text || "";
  if (completionKeywords.some((keyword) => text.includes(keyword))) return "completed";
  if (record.category === "revenue") return null;
  if (record.category === "receiving" && !receivingIssueKeywords.some((keyword) => text.includes(keyword))) return null;
  if (record.category === "ordering" && !orderingIssueKeywords.some((keyword) => text.includes(keyword))) return null;
  if (record.category !== "general" || mediaTypes.has(record.message_type)) return "open";
  if (followUpKeywords.some((keyword) => text.includes(keyword))) return "open";
  return null;
}

function parseTaskId(text = "") {
  const match = text.match(/(?:#|T-?|task-?)(\d+)/i);
  return match ? Number(match[1]) : null;
}

function extractOrderItems(text = "") {
  const sections = { products: [], dry_goods: [], add_ons: [] };
  let current = "products";
  const ignored = [/^@/, /^\s*[-\u2014_]{3,}\s*$/, /^\s*$/];

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (ignored.some((pattern) => pattern.test(line))) return;
    if (line.includes("\u5357\u5317\u8ca8")) {
      current = "dry_goods";
      return;
    }
    if (line.includes("\u8ffd\u52a0")) {
      current = "add_ons";
      return;
    }
    if (/[\d\uff10-\uff19]+\s*(\u5305|\u652f|\u7bb1|\u5c01|\u888b|\u5305|\u7247)/.test(line)) {
      sections[current].push(line);
    }
  });

  return sections;
}

function summarizeOrderSections(text = "") {
  const sections = extractOrderItems(text);
  const parts = [];
  if (sections.products.length) parts.push(`products ${sections.products.length}`);
  if (sections.dry_goods.length) parts.push(`dry goods ${sections.dry_goods.length}`);
  if (sections.add_ons.length) parts.push(`add-ons ${sections.add_ons.length}`);
  return parts.length ? parts.join(", ") : null;
}

function buildTaskTitle(record) {
  if (record.category === "store_transfer" || record.category === "ordering") {
    const summary = summarizeOrderSections(record.text);
    if (summary) return `${record.category}: ${summary}`;
  }
  if (record.text) return record.text.slice(0, 60);
  return `${record.category}: ${record.message_type} field report`;
}

async function upsertTaskForRecord(supabase, record, messageRow) {
  const taskStatus = inferTaskStatus(record);
  if (!taskStatus) return null;

  const groupId = record.group_id || record.room_id;
  if (!groupId) return null;

  if (taskStatus === "completed") {
    const explicitTaskId = parseTaskId(record.text);
    if (explicitTaskId) {
      await supabase
        .from("line_tasks")
        .update({ status: "completed", completed_at: record.occurred_at, updated_at: new Date().toISOString() })
        .eq("id", explicitTaskId)
        .eq("group_id", groupId);

      await supabase.from("line_task_events").insert({
        task_id: explicitTaskId,
        message_id: messageRow.id,
        event_type: "completed",
        note: record.text || "completed"
      });

      return explicitTaskId;
    }

    const { data: openTasks } = await supabase
      .from("line_tasks")
      .select("id")
      .eq("group_id", groupId)
      .neq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1);

    const task = openTasks?.[0];
    if (!task) return null;

    await supabase
      .from("line_tasks")
      .update({ status: "completed", completed_at: record.occurred_at, updated_at: new Date().toISOString() })
      .eq("id", task.id);

    await supabase.from("line_task_events").insert({
      task_id: task.id,
      message_id: messageRow.id,
      event_type: "completed",
      note: record.text || "completed"
    });

    return task.id;
  }

  const dueAt = record.severity === "A"
    ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: task, error } = await supabase
    .from("line_tasks")
    .insert({
      group_id: groupId,
      source_type: record.source_type,
      category: record.category,
      severity: record.severity,
      status: "open",
      title: buildTaskTitle(record),
      first_message_id: messageRow.id,
      latest_message_id: messageRow.id,
      due_at: dueAt,
      created_at: record.occurred_at,
      updated_at: record.occurred_at
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabase.from("line_task_events").insert({
    task_id: task.id,
    message_id: messageRow.id,
    event_type: "created",
    note: record.text || `${record.message_type} field report`
  });

  return task.id;
}

async function saveEvents(records) {
  const supabase = getSupabase();
  if (!supabase || records.length === 0) return { saved: false, count: records.length };

  const saved = [];
  for (const record of records) {
    const mediaInfo = await saveMediaToStorage(supabase, record);
    const insertRecord = { ...record, ...mediaInfo };
    const { data: messageRow, error } = await supabase
      .from("line_group_messages")
      .insert(insertRecord)
      .select("id")
      .single();

    if (error) throw error;

    const taskId = await upsertTaskForRecord(supabase, insertRecord, messageRow);
    if (taskId) {
      await supabase.from("line_group_messages").update({ task_id: taskId }).eq("id", messageRow.id);
    }

    saved.push({ ...insertRecord, id: messageRow.id, task_id: taskId });
  }

  return { saved: true, count: saved.length, records: saved };
}

function splitLineText(text, maxLength = 4800) {
  const chunks = [];
  let remaining = text || "";
  while (remaining.length > maxLength) {
    const splitAt = remaining.lastIndexOf("\n", maxLength);
    const index = splitAt > 1000 ? splitAt : maxLength;
    chunks.push(remaining.slice(0, index));
    remaining = remaining.slice(index).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks.slice(0, 5);
}

async function replyToLine(replyToken, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken || !text) return;
  const messages = splitLineText(text).map((chunk) => ({ type: "text", text: chunk }));

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      replyToken,
      messages
    })
  });
}

function getSourceId(record) {
  return record.group_id || record.room_id || record.user_id;
}

function isHeadquartersSource(record) {
  const reportTo = process.env.LINE_REPORT_TO;
  if (!reportTo) return false;
  return [record.group_id, record.room_id, record.user_id].includes(reportTo);
}

function isTodayReportCommand(text = "") {
  return reportCommandKeywords.some((keyword) => text.includes(keyword));
}

function buildStoreSelectionMessage(stores) {
  if (!stores.length) {
    return "目前尚未建立可匯報門市清單，請先完成 store_settings 設定。";
  }

  const lines = [
    "請選擇要產出今日匯報的門市：",
    "",
    ...stores.map((store, index) => `${index + 1}. ${store.short_name || store.store_name}`),
    "",
    "回覆方式：",
    "- 單店：1",
    "- 多店：1,3,5",
    "- 全部：全部"
  ];
  return lines.join("\n");
}

function parseStoreSelection(text = "", stores = []) {
  const normalized = text.trim();
  if (!normalized) return [];
  if (/^(全部|全店|所有|all)$/i.test(normalized)) return stores;

  const tokens = normalized
    .split(/[\s,，、/／]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const selected = new Map();

  tokens.forEach((token) => {
    const index = Number(token);
    if (Number.isInteger(index) && index >= 1 && index <= stores.length) {
      const store = stores[index - 1];
      selected.set(store.store_name, store);
      return;
    }

    stores.forEach((store) => {
      if (token === store.short_name || token === store.store_name || store.store_name.includes(token)) {
        selected.set(store.store_name, store);
      }
    });
  });

  return [...selected.values()];
}

async function createPendingReportRequest(supabase, record) {
  const sourceId = getSourceId(record);
  if (!sourceId) return;

  await supabase.from("line_report_requests").insert({
    source_id: sourceId,
    user_id: record.user_id,
    status: "pending",
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });
}

async function findPendingReportRequest(supabase, record) {
  const sourceId = getSourceId(record);
  if (!sourceId) return null;

  const { data, error } = await supabase
    .from("line_report_requests")
    .select("id, source_id, user_id, status, expires_at")
    .eq("source_id", sourceId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "42P01") throw error;
  return data || null;
}

async function completeReportRequest(supabase, request, selectedStores) {
  if (!request?.id) return;

  await supabase
    .from("line_report_requests")
    .update({
      status: "completed",
      store_names: selectedStores.map((store) => store.store_name),
      completed_at: new Date().toISOString()
    })
    .eq("id", request.id);
}

async function handleHeadquartersReportCommand(supabase, record) {
  if (!isHeadquartersSource(record) || record.message_type !== "text") return false;

  const stores = await getActiveStoreSettings(supabase);
  const activeStores = stores.filter((store) => store.is_active !== false);

  if (isTodayReportCommand(record.text)) {
    await createPendingReportRequest(supabase, record);
    await replyToLine(record.reply_token, buildStoreSelectionMessage(activeStores));
    return true;
  }

  const pending = await findPendingReportRequest(supabase, record);
  if (!pending) return false;

  const selectedStores = parseStoreSelection(record.text, activeStores);
  if (!selectedStores.length) {
    await replyToLine(record.reply_token, "未辨識門市，請回覆編號，例如：1 或 1,3，或回覆「全部」。");
    return true;
  }

  const selectedStoreNames = selectedStores.map((store) => store.store_name);
  const result = await buildDailyReport({ supabase, selectedStoreNames });
  await completeReportRequest(supabase, pending, selectedStores);

  if (record.reply_token) {
    await replyToLine(record.reply_token, result.report);
  } else {
    await pushToLine(result.report, getSourceId(record));
  }

  return true;
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-line-signature"];

  if (!isValidLineSignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid LINE signature" });
  }

  const payload = JSON.parse(rawBody);
  const events = Array.isArray(payload.events) ? payload.events : [];
  const records = events.map(normalizeLineEvent);
  const result = await saveEvents(records);

  const supabase = getSupabase();
  if (supabase) {
    for (const record of result.records || records) {
      await handleHeadquartersReportCommand(supabase, record);
    }
  }

  const shouldAck = process.env.LINE_ACK_ENABLED === "true";
  if (shouldAck) {
    const actionable = result.records?.find((record) => record.reply_token && record.category !== "general");
    if (actionable) {
      await replyToLine(
        actionable.reply_token,
        "\u5df2\u6536\u5230\uff1a\u5c07\u5217\u5165\u9580\u5e02\u4efb\u52d9\u8ffd\u8e64\u3002"
      );
    }
  }

  return res.status(200).json({ ok: true, received: records.length, saved: result.count });
}
