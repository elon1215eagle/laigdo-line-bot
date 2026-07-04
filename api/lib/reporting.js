import { createClient } from "@supabase/supabase-js";

export const DAILY_REPORT_TIME = "08:00";
export const REPORT_WINDOW_HOURS = 24;
export const STORE_BROADCAST_ENABLED = false;

const fallbackStoreSettings = [
  { store_name: "鳳山五甲店", short_name: "五甲", group_id: null, group_name: null, noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "23:00", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "鳳山凱旋店", short_name: "凱旋", group_id: null, group_name: null, noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "22:30", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "鳳山武廟店", short_name: "武廟", group_id: null, group_name: null, noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "22:30", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "鳳山中山店", short_name: "中山", group_id: null, group_name: null, noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "22:30", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "鳳山南華店", short_name: "南華", group_id: null, group_name: null, noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "21:00", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "前鎮隆興店", short_name: "隆興", group_id: null, group_name: null, noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "22:30", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "三民大昌店", short_name: "大昌", group_id: "C664b7d66db0ef351a87a2a88acec921c", group_name: "義華 大昌管理群", noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "22:30", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "三民義華店", short_name: "義華", group_id: "C664b7d66db0ef351a87a2a88acec921c", group_name: "義華 大昌管理群", noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "22:30", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "三民鼎山店", short_name: "鼎山", group_id: null, group_name: null, noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "23:00", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "屏東潮州店", short_name: "潮州", group_id: null, group_name: null, noon_report_time: "14:00", evening_report_time: "19:00", closing_report_time: "21:30", daily_hq_report_time: "08:00", is_active: true },
  { store_name: "屏東潮二店", short_name: "潮二", group_id: null, group_name: null, noon_report_time: "13:00", evening_report_time: "18:00", closing_report_time: "21:30", daily_hq_report_time: "08:00", is_active: true }
];

const labels = {
  general: "一般訊息",
  field_report: "現場回報",
  food_safety: "食安衛生",
  product_quality: "產品品質",
  revenue: "即時營收",
  receiving: "收貨量",
  store_transfer: "門市調貨配送",
  ordering: "叫貨量",
  inventory: "庫存缺貨",
  equipment: "設備異常",
  staffing: "人員排班",
  customer_service: "客訴服務",
  operations: "營運流程",
  一般訊息: "一般訊息",
  現場回報: "現場回報",
  食安衛生: "食安衛生",
  產品品質: "產品品質",
  即時營收: "即時營收",
  收貨量: "收貨量",
  門市調貨配送: "門市調貨配送",
  叫貨量: "叫貨量",
  庫存缺貨: "庫存缺貨",
  設備異常: "設備異常",
  人員排班: "人員排班",
  客訴服務: "客訴服務",
  營運流程: "營運流程"
};

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function label(value) {
  return labels[value] || value || "未分類";
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
  return name || "未命名群組";
}

function getStoreAliases(setting) {
  const names = [
    setting.short_name,
    setting.store_name,
    setting.store_name?.replace("鳳山", "").replace("三民", "").replace("前鎮", "").replace("屏東", "").replace("店", "")
  ];

  return [...new Set(names.filter(Boolean))];
}

function timeText(value) {
  if (!value) return "未設定";
  return String(value).slice(0, 5);
}

export function parseRevenueText(text = "") {
  const normalized = text.replace(/,/g, "").replace(/＄/g, "$");
  const timeMatch = normalized.match(/(?:^|\s)([01]?\d|2[0-3])[\uff1a:]?([0-5]\d)?(?:\s|\/|-|$)/);
  const amountMatch = normalized.match(/\$?\s*([1-9]\d{2,6})(?:\s*元)?\s*$/);
  const storeMatch = normalized.match(/([\u4e00-\u9fa5A-Za-z]+)\s*[-/]\s*\$?\d/) || normalized.match(/\bPO\s+([\u4e00-\u9fa5A-Za-z]+)\s*\d/i);

  return {
    store: storeMatch?.[1] || null,
    reportTime: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2] || "00"}` : null,
    amount: amountMatch ? Number(amountMatch[1]) : null
  };
}

function rowMatchesStore(row, setting) {
  const parsed = parseRevenueText(row.text || "");
  const aliases = getStoreAliases(setting);
  return aliases.some((alias) => parsed.store === alias || (row.text || "").includes(alias));
}

function rowMatchesSelectedStores(row, selectedSettings) {
  if (!selectedSettings?.length) return true;
  if (selectedSettings.length === 1) return rowMatchesStore(row, selectedSettings[0]) || row.group_id === selectedSettings[0].group_id;
  return selectedSettings.some((setting) => rowMatchesStore(row, setting) || row.group_id === setting.group_id);
}

function taskMatchesSelectedStores(task, selectedSettings) {
  if (!selectedSettings?.length) return true;
  return selectedSettings.some((setting) => task.group_id === setting.group_id);
}

function extractOrderItems(text = "") {
  const sections = { products: [], dry_goods: [], add_ons: [] };
  let current = "products";
  const ignored = [/^@/, /^\s*[-\u2014_]{3,}\s*$/, /^\s*$/];

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (ignored.some((pattern) => pattern.test(line))) return;
    if (line.includes("南北貨")) {
      current = "dry_goods";
      return;
    }
    if (line.includes("追加")) {
      current = "add_ons";
      return;
    }
    if (/[\d\uff10-\uff19]+\s*(包|支|箱|封|袋|片)/.test(line)) {
      sections[current].push(line);
    }
  });

  return sections;
}

function formatOrderSections(text = "") {
  const sections = extractOrderItems(text);
  const lines = [];
  if (sections.products.length) lines.push(`產品類：${sections.products.join("，")}`);
  if (sections.dry_goods.length) lines.push(`南北貨：${sections.dry_goods.join("，")}`);
  if (sections.add_ons.length) lines.push(`追加：${sections.add_ons.join("，")}`);
  return lines;
}

function buildReport(rows, context = {}) {
  const groupNameMap = getGroupNameMap();
  const title = context.selectedStoreNames?.length
    ? `【門市指定匯報：${context.selectedStoreNames.join("、")}】`
    : "【門市資訊總覽】";

  if (!rows.length) {
    return `${title}\n\n近24小時未收到符合條件的營運訊息。`;
  }

  const grouped = rows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "未分類群組";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = [title, ""];

  for (const [groupId, items] of Object.entries(grouped)) {
    const issueItems = items.filter((item) => item.category !== "general" && item.category !== "一般訊息");
    lines.push(`${getGroupDisplayName(groupId, groupNameMap)}`);
    lines.push(`- 訊息數：${items.length}`);
    lines.push(`- 需關注事項：${issueItems.length}`);

    if (issueItems.length === 0) {
      lines.push("狀態：未偵測到明確營運問題");
    } else {
      issueItems.slice(0, 8).forEach((item, index) => {
        const text = item.text ? item.text.slice(0, 40) : `[${item.message_type}]`;
        lines.push(`${index + 1}. ${label(item.category)} / ${item.severity}級`);
        lines.push(`   ${text}`);
        if (item.category === "store_transfer" || item.category === "ordering") {
          formatOrderSections(item.text).forEach((line) => lines.push(`   ${line}`));
        }
      });
    }

    lines.push("");
  }

  lines.push("追蹤要求：A級今日處理，B級24小時內回覆改善照片，C級納入下次巡檢。");
  lines.push("發布原則：未經 Elon 明確指示，不對各門市群主動發佈訊息。");
  return lines.join("\n");
}

function buildTaskSection(tasks) {
  const groupNameMap = getGroupNameMap();
  const openTasks = (tasks || []).filter((task) => task.status !== "completed");

  if (!openTasks.length) {
    return ["", "任務追蹤", "目前沒有未完成任務。"].join("\n");
  }

  const lines = ["", "任務追蹤"];
  const now = Date.now();

  openTasks.slice(0, 20).forEach((task, index) => {
    const groupName = getGroupDisplayName(task.group_id, groupNameMap);
    const dueAt = task.due_at ? new Date(task.due_at) : null;
    const isOverdue = dueAt && dueAt.getTime() < now;
    const dueText = dueAt ? dueAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }) : "未設定";
    const statusText = isOverdue ? "逾期" : "未完成";

    lines.push(`${index + 1}. #${task.id} ${statusText} / ${task.severity}級 / ${groupName}`);
    lines.push(`   類別：${label(task.category)}`);
    lines.push(`   內容：${task.title}`);
    lines.push(`   期限：${dueText}`);
  });

  return lines.join("\n");
}

function buildReceivingSection(rows) {
  const groupNameMap = getGroupNameMap();
  const receivingRows = (rows || []).filter((row) => row.category === "receiving" || row.category === "收貨量");

  if (!receivingRows.length) {
    return ["", "收貨量統計", "近24小時未偵測到收貨量回報。"].join("\n");
  }

  const grouped = receivingRows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "未分類群組";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = ["", "收貨量統計"];

  for (const [groupId, items] of Object.entries(grouped)) {
    lines.push(`${getGroupDisplayName(groupId, groupNameMap)}：${items.length}筆收貨回報`);
    items.slice(0, 5).forEach((item, index) => {
      const text = item.text ? item.text.slice(0, 60) : `[${item.message_type}]`;
      lines.push(`  ${index + 1}. ${text}`);
    });
  }

  return lines.join("\n");
}

function buildStoreReportAuditSection(rows, storeSettings) {
  const activeSettings = (storeSettings || []).filter((setting) => setting.is_active !== false && setting.group_id);

  if (!activeSettings.length) {
    return ["", `門市回報檢核（每日 ${DAILY_REPORT_TIME}）`, "尚未設定已綁定 LINE 群的門市。"].join("\n");
  }

  const revenueRows = (rows || []).filter((row) => row.category === "revenue" || row.category === "即時營收");
  const lines = ["", `門市回報檢核（每日 ${DAILY_REPORT_TIME}）`];
  lines.push(`檢核區間：${DAILY_REPORT_TIME} 前 ${REPORT_WINDOW_HOURS} 小時`);
  lines.push(STORE_BROADCAST_ENABLED ? "門市群發佈：已啟用" : "門市群發佈：關閉（未經 Elon 指示不發布）");

  activeSettings.forEach((setting) => {
    const matchedRows = revenueRows
      .filter((row) => rowMatchesStore(row, setting))
      .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
    const latest = matchedRows[0];
    const expectedTimes = [setting.noon_report_time, setting.evening_report_time, setting.closing_report_time]
      .map(timeText)
      .join(" / ");

    if (!latest) {
      lines.push(`${setting.short_name}：未偵測到營收回報（應回報 ${expectedTimes}）`);
      return;
    }

    const parsed = parseRevenueText(latest.text || "");
    const amountText = parsed.amount ? `$${parsed.amount.toLocaleString("en-US")}` : "金額未辨識";
    const reportTime = parsed.reportTime || "時間未辨識";
    lines.push(`${setting.short_name}：已回報 ${reportTime} ${amountText}（應回報 ${expectedTimes}）`);
  });

  return lines.join("\n");
}

function buildRevenueSection(rows) {
  const revenueRows = (rows || []).filter((row) => row.category === "revenue" || row.category === "即時營收");

  if (!revenueRows.length) {
    return ["", "即時營收統計", "近24小時未偵測到營收回報。"].join("\n");
  }

  const latestByStore = new Map();
  for (const row of revenueRows) {
    const parsed = parseRevenueText(row.text || "");
    const key = parsed.store || row.group_id || row.room_id || "未分類";
    const previous = latestByStore.get(key);
    if (!previous || new Date(row.occurred_at) > new Date(previous.row.occurred_at)) {
      latestByStore.set(key, { row, parsed });
    }
  }

  const lines = ["", "即時營收統計"];
  let total = 0;

  for (const [store, item] of latestByStore.entries()) {
    const amount = item.parsed.amount;
    if (amount) total += amount;
    const amountText = amount ? `$${amount.toLocaleString("en-US")}` : "未辨識金額";
    const reportTime = item.parsed.reportTime || "未辨識時間";
    lines.push(`${store}：${reportTime} 累計 ${amountText}`);
  }

  if (total > 0) {
    lines.push(`已辨識營收合計：$${total.toLocaleString("en-US")}`);
  }

  return lines.join("\n");
}

function buildOrderingSection(rows) {
  const groupNameMap = getGroupNameMap();
  const orderingRows = (rows || []).filter((row) => row.category === "ordering" || row.category === "叫貨量");

  if (!orderingRows.length) {
    return ["", "叫貨量統計", "近24小時未偵測到叫貨量回報。"].join("\n");
  }

  const grouped = orderingRows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "未分類群組";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = ["", "叫貨量統計"];

  for (const [groupId, items] of Object.entries(grouped)) {
    lines.push(`${getGroupDisplayName(groupId, groupNameMap)}：${items.length}筆叫貨回報`);
    items.slice(0, 5).forEach((item, index) => {
      const text = item.text ? item.text.slice(0, 80) : `[${item.message_type}]`;
      lines.push(`  ${index + 1}. ${text}`);
      formatOrderSections(item.text).forEach((line) => lines.push(`     ${line}`));
    });
  }

  return lines.join("\n");
}

export async function getActiveStoreSettings(supabase) {
  const { data, error } = await supabase
    .from("store_settings")
    .select("store_name, short_name, group_id, group_name, noon_report_time, evening_report_time, closing_report_time, daily_hq_report_time, is_active")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error?.code === "42P01" || error?.code === "PGRST205") return fallbackStoreSettings;
  if (error) throw error;
  return data || [];
}

export async function buildDailyReport({ supabase, selectedStoreNames = [] } = {}) {
  const since = new Date(Date.now() - REPORT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const storeSettings = await getActiveStoreSettings(supabase);
  const selectedNameSet = new Set(selectedStoreNames);
  const selectedSettings = selectedStoreNames.length
    ? storeSettings.filter((setting) => selectedNameSet.has(setting.store_name) || selectedNameSet.has(setting.short_name))
    : [];

  const selectedGroupIds = [...new Set(selectedSettings.map((setting) => setting.group_id).filter(Boolean))];
  let messageQuery = supabase
    .from("line_group_messages")
    .select("group_id, room_id, message_type, text, category, severity, occurred_at")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true });

  if (selectedGroupIds.length) {
    messageQuery = messageQuery.in("group_id", selectedGroupIds);
  }

  const { data, error } = await messageQuery;
  if (error) throw error;

  const { data: tasks, error: taskError } = await supabase
    .from("line_tasks")
    .select("id, group_id, category, severity, status, title, due_at, updated_at")
    .neq("status", "completed")
    .order("due_at", { ascending: true })
    .limit(20);

  if (taskError) throw taskError;

  const reportTo = process.env.LINE_REPORT_TO;
  const reportRows = (data || [])
    .filter((row) => {
      if (!reportTo) return true;
      return row.group_id !== reportTo && row.room_id !== reportTo;
    })
    .filter((row) => rowMatchesSelectedStores(row, selectedSettings));

  const selectedTasks = (tasks || []).filter((task) => taskMatchesSelectedStores(task, selectedSettings));
  const auditSettings = selectedSettings.length ? selectedSettings : storeSettings;
  const context = { selectedStoreNames: selectedSettings.map((setting) => setting.short_name || setting.store_name) };
  const report = `${buildReport(reportRows, context)}\n${buildStoreReportAuditSection(reportRows, auditSettings)}\n${buildRevenueSection(reportRows)}\n${buildReceivingSection(reportRows)}\n${buildOrderingSection(reportRows)}\n${buildTaskSection(selectedTasks)}`;

  return {
    report,
    rows: reportRows.length,
    excludedRows: (data?.length || 0) - reportRows.length,
    selectedStores: context.selectedStoreNames
  };
}

export async function pushToLine(text, to = process.env.LINE_REPORT_TO) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
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
