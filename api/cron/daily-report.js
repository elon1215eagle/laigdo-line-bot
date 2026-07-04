import { createClient } from "@supabase/supabase-js";

const labels = {
  general: "\u4e00\u822c\u8a0a\u606f",
  field_report: "\u73fe\u5834\u56de\u5831",
  food_safety: "\u98df\u5b89\u885b\u751f",
  product_quality: "\u7522\u54c1\u54c1\u8cea",
  revenue: "\u5373\u6642\u71df\u6536",
  receiving: "\u6536\u8ca8\u91cf",
  store_transfer: "\u9580\u5e02\u8abf\u8ca8\u914d\u9001",
  ordering: "\u53eb\u8ca8\u91cf",
  inventory: "\u5eab\u5b58\u7f3a\u8ca8",
  equipment: "\u8a2d\u5099\u7570\u5e38",
  staffing: "\u4eba\u54e1\u6392\u73ed",
  customer_service: "\u5ba2\u8a34\u670d\u52d9",
  operations: "\u71df\u904b\u6d41\u7a0b",
  "\u4e00\u822c\u8a0a\u606f": "\u4e00\u822c\u8a0a\u606f",
  "\u73fe\u5834\u56de\u5831": "\u73fe\u5834\u56de\u5831",
  "\u98df\u5b89\u885b\u751f": "\u98df\u5b89\u885b\u751f",
  "\u7522\u54c1\u54c1\u8cea": "\u7522\u54c1\u54c1\u8cea",
  "\u5373\u6642\u71df\u6536": "\u5373\u6642\u71df\u6536",
  "\u6536\u8ca8\u91cf": "\u6536\u8ca8\u91cf",
  "\u9580\u5e02\u8abf\u8ca8\u914d\u9001": "\u9580\u5e02\u8abf\u8ca8\u914d\u9001",
  "\u53eb\u8ca8\u91cf": "\u53eb\u8ca8\u91cf",
  "\u5eab\u5b58\u7f3a\u8ca8": "\u5eab\u5b58\u7f3a\u8ca8",
  "\u8a2d\u5099\u7570\u5e38": "\u8a2d\u5099\u7570\u5e38",
  "\u4eba\u54e1\u6392\u73ed": "\u4eba\u54e1\u6392\u73ed",
  "\u5ba2\u8a34\u670d\u52d9": "\u5ba2\u8a34\u670d\u52d9",
  "\u71df\u904b\u6d41\u7a0b": "\u71df\u904b\u6d41\u7a0b"
};

function label(value) {
  return labels[value] || value || "\u672a\u5206\u985e";
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
    if (/[\d\uff10-\uff19]+\s*(\u5305|\u652f|\u7bb1|\u5c01|\u888b|\u7247)/.test(line)) {
      sections[current].push(line);
    }
  });

  return sections;
}

function formatOrderSections(text = "") {
  const sections = extractOrderItems(text);
  const lines = [];
  if (sections.products.length) lines.push(`\u7522\u54c1\u985e\uff1a${sections.products.join("\uff0c")}`);
  if (sections.dry_goods.length) lines.push(`\u5357\u5317\u8ca8\uff1a${sections.dry_goods.join("\uff0c")}`);
  if (sections.add_ons.length) lines.push(`\u8ffd\u52a0\uff1a${sections.add_ons.join("\uff0c")}`);
  return lines;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getGroupNameMap() {
  try {
    return JSON.parse(process.env.LINE_GROUP_NAMES || "{}");
  } catch {
    return {};
  }
}

function getGroupDisplayName(groupId, groupNameMap) {
  const name = groupNameMap[groupId];
  return name || "\u672a\u547d\u540d\u7fa4\u7d44";
}

function buildReport(rows) {
  const groupNameMap = getGroupNameMap();

  if (!rows.length) {
    return "LAIGDO\u5c0f\u5e6b\u624b \u4eca\u65e5\u9580\u5e02\u7fa4\u56de\u5831\n\n\u4eca\u65e5\u672a\u6536\u5230\u9700\u8ffd\u8e64\u71df\u904b\u8a0a\u606f\u3002";
  }

  const grouped = rows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "\u672a\u5206\u985e\u7fa4\u7d44";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = ["\u3010\u9580\u5e02\u8a0a\u606f\u7e3d\u89bd\u3011", ""];

  for (const [groupId, items] of Object.entries(grouped)) {
    const issueItems = items.filter((item) => item.category !== "general" && item.category !== "\u4e00\u822c\u8a0a\u606f");
    lines.push(`${getGroupDisplayName(groupId, groupNameMap)}`);
    lines.push(`- \u8a0a\u606f\u6578\uff1a${items.length}`);
    lines.push(`- \u9700\u95dc\u6ce8\u4e8b\u9805\uff1a${issueItems.length}`);

    if (issueItems.length === 0) {
      lines.push("\u72c0\u614b\uff1a\u672a\u5075\u6e2c\u5230\u660e\u78ba\u71df\u904b\u554f\u984c");
    } else {
      issueItems.slice(0, 8).forEach((item, index) => {
        const text = item.text ? item.text.slice(0, 40) : `[${item.message_type}]`;
        lines.push(`${index + 1}. ${label(item.category)} / ${item.severity}\u7d1a`);
        lines.push(`   ${text}`);
        if (item.category === "store_transfer" || item.category === "ordering") {
          formatOrderSections(item.text).forEach((line) => lines.push(`   ${line}`));
        }
      });
    }

    lines.push("");
  }

  lines.push("\u8ffd\u8e64\u8981\u6c42\uff1aA\u7d1a\u4eca\u65e5\u8655\u7406\uff0cB\u7d1a24\u5c0f\u6642\u5167\u56de\u8986\u6539\u5584\u7167\u7247\uff0cC\u7d1a\u7d0d\u5165\u4e0b\u6b21\u5de1\u6aa2\u3002");
  return lines.join("\n");
}

function buildTaskSection(tasks) {
  const groupNameMap = getGroupNameMap();
  const openTasks = (tasks || []).filter((task) => task.status !== "completed");

  if (!openTasks.length) {
    return ["", "\u4efb\u52d9\u8ffd\u8e64", "\u76ee\u524d\u6c92\u6709\u672a\u5b8c\u6210\u4efb\u52d9\u3002"].join("\n");
  }

  const lines = ["", "\u4efb\u52d9\u8ffd\u8e64"];
  const now = Date.now();

  openTasks.slice(0, 20).forEach((task, index) => {
    const groupName = getGroupDisplayName(task.group_id, groupNameMap);
    const dueAt = task.due_at ? new Date(task.due_at) : null;
    const isOverdue = dueAt && dueAt.getTime() < now;
    const dueText = dueAt ? dueAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }) : "\u672a\u8a2d\u5b9a";
    const statusText = isOverdue ? "\u903e\u671f" : "\u672a\u5b8c\u6210";

    lines.push(`${index + 1}. #${task.id} ${statusText} / ${task.severity}\u7d1a / ${groupName}`);
    lines.push(`   \u985e\u5225\uff1a${label(task.category)}`);
    lines.push(`   \u5167\u5bb9\uff1a${task.title}`);
    lines.push(`   \u671f\u9650\uff1a${dueText}`);
  });

  return lines.join("\n");
}

function buildReceivingSection(rows) {
  const groupNameMap = getGroupNameMap();
  const receivingRows = (rows || []).filter((row) => row.category === "receiving" || row.category === "\u6536\u8ca8\u91cf");

  if (!receivingRows.length) {
    return ["", "\u6536\u8ca8\u91cf\u7d71\u8a08", "\u8fd124\u5c0f\u6642\u672a\u5075\u6e2c\u5230\u6536\u8ca8\u91cf\u56de\u5831\u3002"].join("\n");
  }

  const grouped = receivingRows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "\u672a\u5206\u985e\u7fa4\u7d44";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = ["", "\u6536\u8ca8\u91cf\u7d71\u8a08"];

  for (const [groupId, items] of Object.entries(grouped)) {
    lines.push(`${getGroupDisplayName(groupId, groupNameMap)}\uff1a${items.length}\u7b46\u6536\u8ca8\u56de\u5831`);
    items.slice(0, 5).forEach((item, index) => {
      const text = item.text ? item.text.slice(0, 60) : `[${item.message_type}]`;
      lines.push(`  ${index + 1}. ${text}`);
    });
  }

  return lines.join("\n");
}

function parseRevenueText(text = "") {
  const normalized = text.replace(/,/g, "").replace(/\uff04/g, "$");
  const timeMatch = normalized.match(/(?:^|\s)([01]?\d|2[0-3])[：:]?([0-5]\d)?(?:\s|\/|-|$)/);
  const amountMatch = normalized.match(/\$?\s*([1-9]\d{2,6})(?:\s*\u5143)?\s*$/);
  const storeMatch = normalized.match(/([\u4e00-\u9fa5A-Za-z]+)\s*[-/]\s*\$?\d/) || normalized.match(/\bPO\s+([\u4e00-\u9fa5A-Za-z]+)\s*\d/i);

  return {
    store: storeMatch?.[1] || null,
    reportTime: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2] || "00"}` : null,
    amount: amountMatch ? Number(amountMatch[1]) : null
  };
}

function buildRevenueSection(rows) {
  const revenueRows = (rows || []).filter((row) => row.category === "revenue" || row.category === "\u5373\u6642\u71df\u6536");

  if (!revenueRows.length) {
    return ["", "\u5373\u6642\u71df\u6536\u7d71\u8a08", "\u8fd124\u5c0f\u6642\u672a\u5075\u6e2c\u5230\u71df\u6536\u56de\u5831\u3002"].join("\n");
  }

  const latestByStore = new Map();
  for (const row of revenueRows) {
    const parsed = parseRevenueText(row.text || "");
    const key = parsed.store || row.group_id || row.room_id || "\u672a\u5206\u985e";
    const previous = latestByStore.get(key);
    if (!previous || new Date(row.occurred_at) > new Date(previous.row.occurred_at)) {
      latestByStore.set(key, { row, parsed });
    }
  }

  const lines = ["", "\u5373\u6642\u71df\u6536\u7d71\u8a08"];
  let total = 0;

  for (const [store, item] of latestByStore.entries()) {
    const amount = item.parsed.amount;
    if (amount) total += amount;
    const amountText = amount ? `$${amount.toLocaleString("en-US")}` : "\u672a\u8fa8\u8b58\u91d1\u984d";
    const timeText = item.parsed.reportTime || "\u672a\u8fa8\u8b58\u6642\u9593";
    lines.push(`${store}\uff1a${timeText} \u7d2f\u8a08 ${amountText}`);
  }

  if (total > 0) {
    lines.push(`\u5df2\u8fa8\u8b58\u71df\u6536\u5408\u8a08\uff1a$${total.toLocaleString("en-US")}`);
  }

  return lines.join("\n");
}

function buildOrderingSection(rows) {
  const groupNameMap = getGroupNameMap();
  const orderingRows = (rows || []).filter((row) => row.category === "ordering" || row.category === "\u53eb\u8ca8\u91cf");

  if (!orderingRows.length) {
    return ["", "\u53eb\u8ca8\u91cf\u7d71\u8a08", "\u8fd124\u5c0f\u6642\u672a\u5075\u6e2c\u5230\u53eb\u8ca8\u91cf\u56de\u5831\u3002"].join("\n");
  }

  const grouped = orderingRows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "\u672a\u5206\u985e\u7fa4\u7d44";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = ["", "\u53eb\u8ca8\u91cf\u7d71\u8a08"];

  for (const [groupId, items] of Object.entries(grouped)) {
    lines.push(`${getGroupDisplayName(groupId, groupNameMap)}\uff1a${items.length}\u7b46\u53eb\u8ca8\u56de\u5831`);
    items.slice(0, 5).forEach((item, index) => {
      const text = item.text ? item.text.slice(0, 80) : `[${item.message_type}]`;
      lines.push(`  ${index + 1}. ${text}`);
      formatOrderSections(item.text).forEach((line) => lines.push(`     ${line}`));
    });
  }

  return lines.join("\n");
}

async function pushToLine(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_REPORT_TO;
  if (!token || !to) return { pushed: false };

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE push failed: ${response.status} ${body}`);
  }

  return { pushed: true };
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured" });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("line_group_messages")
    .select("group_id, room_id, message_type, text, category, severity, occurred_at")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true });

  if (error) throw error;

  const { data: tasks, error: taskError } = await supabase
    .from("line_tasks")
    .select("id, group_id, category, severity, status, title, due_at, updated_at")
    .neq("status", "completed")
    .order("due_at", { ascending: true })
    .limit(20);

  if (taskError) throw taskError;

  const reportTo = process.env.LINE_REPORT_TO;
  const reportRows = (data || []).filter((row) => {
    if (!reportTo) return true;
    return row.group_id !== reportTo && row.room_id !== reportTo;
  });

  const report = `${buildReport(reportRows)}\n${buildRevenueSection(reportRows)}\n${buildReceivingSection(reportRows)}\n${buildOrderingSection(reportRows)}\n${buildTaskSection(tasks || [])}`;
  const pushResult = await pushToLine(report);

  return res.status(200).json({
    ok: true,
    rows: reportRows.length,
    excludedRows: (data?.length || 0) - reportRows.length,
    report,
    ...pushResult
  });
}
