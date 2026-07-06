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

function sectionTitle(index, title) {
  return ["", "----------------", `【${index}｜${title}】`];
}

function oneLine(text = "", maxLength = 48) {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function normalizeReportText(text = "") {
  return String(text || "")
    .replace(/,/g, "")
    .replace(/＄/g, "$")
    .replace(/[：]/g, ":")
    .replace(/[／]/g, "/");
}

function parseRevenueTableText(text = "") {
  const normalized = normalizeReportText(text);
  const store = normalized.includes("義華") ? "義華" : normalized.includes("大昌") ? "大昌" : null;
  const amountAfter = (patterns) => {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match?.[1]) return Number(match[1]);
    }
    return null;
  };
  const noonAmount = amountAfter([
    /14\s*(?:點|:00|00)?\s*(?:營收|收入|業績)?\s*\$?\s*([1-9]\d{2,7})/i,
    /14\s*(?:點|:00|00)?.*?(?:義華|大昌|五甲|建興|自由|鼎中|瑞隆|文山|小港|林園|鳳山)\s*[-/]\s*\$?\s*([1-9]\d{2,7})/i,
    /(?:中午|午間).*?\$?\s*([1-9]\d{2,7})/i
  ]);
  const eveningAmount = amountAfter([
    /19\s*(?:點|:00|00)?\s*(?:營收|收入|業績)?\s*\$?\s*([1-9]\d{2,7})/i,
    /(?:晚上|晚間).*?\$?\s*([1-9]\d{2,7})/i
  ]);
  const totalAmount = amountAfter([
    /(?:總營收|總收入|今日營收|今日收入|總計|合計)\s*\$?\s*([1-9]\d{2,7})/i
  ]);
  const dateText = normalized.match(/日期[:：]?\s*([^\n]+)/)?.[1]?.trim() || null;

  if (!noonAmount && !eveningAmount && !totalAmount) return null;
  return { store, noonAmount, eveningAmount, totalAmount, dateText };
}

export function parseRevenueText(text = "") {
  const table = parseRevenueTableText(text);
  if (table) {
    return {
      store: table.store,
      reportTime: table.eveningAmount ? "19:00" : table.noonAmount ? "14:00" : null,
      amount: table.totalAmount || table.eveningAmount || table.noonAmount,
      revenueTable: table
    };
  }

  const normalized = normalizeReportText(text);
  const timeMatch = normalized.match(/(?:^|\s)([01]?\d|2[0-3])[\uff1a:]?([0-5]\d)?(?:\s|\/|-|$)/);
  const amountMatch = normalized.match(/\$?\s*([1-9]\d{2,7})(?:\s*元)?\s*$/)
    || normalized.match(/(?:營收|收入|業績)\s*\$?\s*([1-9]\d{2,7})/);
  const storeMatch = normalized.match(/([\u4e00-\u9fa5A-Za-z]+)\s*[-/]\s*\$?\d/)
    || normalized.match(/\bPO\s+([\u4e00-\u9fa5A-Za-z]+)\s*\d/i)
    || normalized.match(/(義華|大昌|五甲|建興|自由|鼎中|瑞隆|文山|小港|林園|鳳山)/);

  return {
    store: storeMatch?.[1] || null,
    reportTime: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2] || "00"}` : null,
    amount: amountMatch ? Number(amountMatch[1]) : null,
    revenueTable: null
  };
}

function hasRevenueSignal(row) {
  const text = row.text || "";
  const parsed = parseRevenueText(text);
  return row.category === "revenue"
    || row.category === "即時營收"
    || Boolean(parsed.revenueTable)
    || Boolean(parsed.amount && (parsed.store || parsed.reportTime || /營收|收入|業績|\bPO\b/i.test(text)));
}

function isTestMessage(row) {
  const text = row.text || "";
  return text.includes("測試訊息") || text.includes("店員太可愛");
}

function isRelevantIssueItem(row) {
  if (isTestMessage(row)) return false;
  if (row.category === "general" || row.category === "一般訊息") return false;
  if (row.category === "customer_service" && /測試|太可愛/.test(row.text || "")) return false;
  return true;
}

function parseTemperatureReport(row) {
  const text = row.text || "";
  if (!/冰箱.*溫度|冷凍|冷藏/.test(text)) return null;
  const store = text.includes("義華") ? "義華" : text.includes("大昌") ? "大昌" : "未辨識門市";
  const freezerValues = [];
  const chillerValues = [];

  for (const line of text.split(/\n/)) {
    if (!/^\s*\d+\s+/.test(line)) continue;
    const numbers = [...line.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
    if (numbers.length < 3) continue;
    const values = numbers.slice(1);
    const freezer = values.find((value) => value < 0);
    const chiller = [...values].reverse().find((value) => value >= 0 && value <= 30);
    if (freezer != null) freezerValues.push(freezer);
    if (chiller != null) chillerValues.push(chiller);
  }

  const freezerAbnormal = freezerValues.filter((value) => value > -12);
  const chillerAbnormal = chillerValues.filter((value) => value > 7);
  if (!freezerAbnormal.length && !chillerAbnormal.length) return null;

  return {
    store,
    freezerAbnormal,
    chillerAbnormal
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
    ? `【萊吉多門市指定日報】\n門市：${context.selectedStoreNames.join("、")}`
    : "【萊吉多每日營運日報】";

  if (!rows.length) {
    return `${title}\n區間：${DAILY_REPORT_TIME} 前 ${REPORT_WINDOW_HOURS} 小時\n\n近24小時未收到符合條件的營運訊息。`;
  }

  const grouped = rows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "未分類群組";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = [title, `區間：${DAILY_REPORT_TIME} 前 ${REPORT_WINDOW_HOURS} 小時`, ...sectionTitle(1, "需即時處理事項")];

  let immediateCount = 0;
  for (const [groupId, items] of Object.entries(grouped)) {
    const groupName = getGroupDisplayName(groupId, groupNameMap);
    const issueItems = items
      .filter(isRelevantIssueItem)
      .filter((item) => item.severity === "A" || item.severity === "B");
    const temperatureIssues = items.map(parseTemperatureReport).filter(Boolean);

    if (!issueItems.length && !temperatureIssues.length) continue;

    lines.push(`群組：${groupName}`);
    issueItems.slice(0, 6).forEach((item) => {
      immediateCount += 1;
      lines.push(`${immediateCount}. ${label(item.category)} / ${item.severity}級`);
      lines.push(`   ${oneLine(item.text || `[${item.message_type}]`, 44)}`);
    });

    temperatureIssues.forEach((issue) => {
      immediateCount += 1;
      const parts = [];
      if (issue.freezerAbnormal.length) parts.push(`冷凍偏高 ${issue.freezerAbnormal.join("、")}`);
      if (issue.chillerAbnormal.length) parts.push(`冷藏偏高 ${issue.chillerAbnormal.join("、")}`);
      lines.push(`${immediateCount}. 冰箱溫度異常 / A級`);
      lines.push(`   ${issue.store}：${parts.join("；")}`);
      lines.push("   動作：店長確認實際溫度與保存狀態");
    });
  }

  if (!immediateCount) {
    lines.push("目前無 A/B 級即時處理事項。");
  }

  lines.push(...sectionTitle(2, "訊息總覽"));

  for (const [groupId, items] of Object.entries(grouped)) {
    const issueItems = items.filter(isRelevantIssueItem);
    const temperatureIssues = items.map(parseTemperatureReport).filter(Boolean);
    lines.push(`群組：${getGroupDisplayName(groupId, groupNameMap)}`);
    lines.push(`訊息：${items.length} 筆`);
    lines.push(`需關注：${issueItems.length + temperatureIssues.length} 項`);

    if (issueItems.length === 0) {
      lines.push("狀態：未偵測到明確營運問題");
    } else {
      const highCount = issueItems.filter((item) => item.severity === "A" || item.severity === "B").length;
      const followCount = issueItems.length - highCount;
      lines.push(`A/B即時：${highCount} 項`);
      lines.push(`C級追蹤：${followCount} 項`);
    }

    lines.push("");
  }

  lines.push("追蹤規則：A級今日處理；B級24小時內回覆改善照片；C級納入下次檢核。");
  return lines.join("\n");
}

function isNoiseTask(task) {
  const title = task.title || "";
  return /field report/i.test(title)
    || title === "圖片/媒體回報待判讀"
    || (task.category === "field_report" && task.severity === "C");
}

function buildTaskSection(tasks) {
  const groupNameMap = getGroupNameMap();
  const openTasks = (tasks || [])
    .filter((task) => task.status !== "completed")
    .filter((task) => !isNoiseTask(task));

  if (!openTasks.length) {
    return [...sectionTitle(10, "任務追蹤"), "目前沒有未完成任務。"].join("\n");
  }

  const lines = [...sectionTitle(10, "任務追蹤")];
  const now = Date.now();

  openTasks.slice(0, 12).forEach((task, index) => {
    const groupName = getGroupDisplayName(task.group_id, groupNameMap);
    const dueAt = task.due_at ? new Date(task.due_at) : null;
    const isOverdue = dueAt && dueAt.getTime() < now;
    const dueText = dueAt ? dueAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }) : "未設定";
    const statusText = isOverdue ? "逾期" : "未完成";
    const title = /field report/i.test(task.title || "") ? "圖片/媒體回報待判讀" : oneLine(task.title, 42);

    lines.push(`${index + 1}. #${task.id} ${statusText} / ${task.severity}級`);
    lines.push(`   群組：${groupName}`);
    lines.push(`   類別：${label(task.category)}`);
    lines.push(`   內容：${title}`);
    lines.push(`   期限：${dueText}`);
  });
  if (openTasks.length > 12) lines.push(`另有 ${openTasks.length - 12} 筆任務未列出`);

  return lines.join("\n");
}

function buildReceivingSection(rows) {
  const groupNameMap = getGroupNameMap();
  const receivingRows = (rows || []).filter((row) => row.category === "receiving" || row.category === "收貨量");

  if (!receivingRows.length) {
    return [...sectionTitle(5, "收貨量"), "近24小時未偵測到收貨量回報。"].join("\n");
  }

  const grouped = receivingRows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "未分類群組";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = [...sectionTitle(5, "收貨量")];

  for (const [groupId, items] of Object.entries(grouped)) {
    lines.push(`${getGroupDisplayName(groupId, groupNameMap)}：${items.length}筆收貨回報`);
    items.slice(0, 5).forEach((item, index) => {
      const text = item.text ? oneLine(item.text, 54) : `[${item.message_type}]`;
      lines.push(`  ${index + 1}. ${text}`);
    });
  }

  return lines.join("\n");
}

function buildStoreReportAuditSection(rows, storeSettings) {
  const activeSettings = (storeSettings || []).filter((setting) => setting.is_active !== false && setting.group_id);

  if (!activeSettings.length) {
    return [...sectionTitle(3, "門市回報檢核"), "尚未設定已綁定 LINE 群的門市。"].join("\n");
  }

  const revenueRows = (rows || []).filter(hasRevenueSignal);
  const lines = [...sectionTitle(3, "門市回報檢核")];
  lines.push(`每日檢核：${DAILY_REPORT_TIME}`);
  lines.push(`門市群發佈：${STORE_BROADCAST_ENABLED ? "已啟用" : "關閉"}`);

  activeSettings.forEach((setting) => {
    const matchedRows = revenueRows
      .filter((row) => rowMatchesStore(row, setting))
      .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
    const latest = matchedRows[0];
    const expectedTimes = [setting.noon_report_time, setting.evening_report_time, setting.closing_report_time]
      .map(timeText)
      .join(" / ");

    if (!latest) {
      lines.push(`- ${setting.short_name}：未回報`);
      lines.push(`  應回報：${expectedTimes}`);
      return;
    }

    const parsed = parseRevenueText(latest.text || "");
    const amountText = parsed.amount ? `$${parsed.amount.toLocaleString("en-US")}` : "金額未辨識";
    const reportTime = parsed.reportTime || "時間未辨識";
    lines.push(`- ${setting.short_name}：已回報 ${reportTime} ${amountText}`);
    lines.push(`  應回報：${expectedTimes}`);
  });

  return lines.join("\n");
}

function buildRevenueSection(rows) {
  const revenueRows = (rows || []).filter(hasRevenueSignal);

  if (!revenueRows.length) {
    return [...sectionTitle(4, "即時營收"), "近24小時未偵測到營收回報。"].join("\n");
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

  const lines = [...sectionTitle(4, "即時營收")];

  for (const [store, item] of latestByStore.entries()) {
    const amount = item.parsed.amount;
    const amountText = amount ? `$${amount.toLocaleString("en-US")}` : "未辨識金額";
    const reportTime = item.parsed.reportTime || "未辨識時間";
    if (item.parsed.revenueTable) {
      const table = item.parsed.revenueTable;
      const parts = [
        table.noonAmount ? `14點 $${table.noonAmount.toLocaleString("en-US")}` : null,
        table.eveningAmount ? `19點 $${table.eveningAmount.toLocaleString("en-US")}` : null,
        table.totalAmount ? `總營收 $${table.totalAmount.toLocaleString("en-US")}` : null
      ].filter(Boolean);
      lines.push(`${store}`);
      if (parts.length) parts.forEach((part) => lines.push(`- ${part}`));
      else lines.push("- 結帳表金額需確認");
    } else {
      lines.push(`${store}`);
      lines.push(`- ${reportTime} 累計 ${amountText}`);
    }
  }

  return lines.join("\n");
}

function isOrderingLikeRow(row) {
  const text = row.text || "";
  return row.category === "ordering"
    || row.category === "store_transfer"
    || row.category === "叫貨量"
    || row.category === "調貨配送"
    || text.includes("叫貨量")
    || text.includes("叫貨")
    || text.includes("調貨");
}

function buildOrderingSection(rows) {
  const groupNameMap = getGroupNameMap();
  const orderingRows = (rows || []).filter(isOrderingLikeRow);

  if (!orderingRows.length) {
    return [...sectionTitle(6, "叫貨/調貨配送"), "近24小時未偵測到叫貨或調貨配送回報。"].join("\n");
  }

  const grouped = orderingRows.reduce((acc, row) => {
    const key = row.group_id || row.room_id || "未分類群組";
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});

  const lines = [...sectionTitle(6, "叫貨/調貨配送")];

  for (const [groupId, items] of Object.entries(grouped)) {
    lines.push(`${getGroupDisplayName(groupId, groupNameMap)}：${items.length}筆叫貨回報`);
    items.slice(0, 5).forEach((item, index) => {
      const text = item.text ? oneLine(item.text, 46) : `[${item.message_type}]`;
      lines.push(`  ${index + 1}. ${text}`);
      formatOrderSections(item.text).forEach((line) => lines.push(`     ${oneLine(line, 58)}`));
    });
  }

  return lines.join("\n");
}

function isMissingTableError(error) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function itemQuantityText(quantity, unit) {
  if (quantity == null) return null;
  return `${Number(quantity).toLocaleString("en-US")}${unit || ""}`;
}

function getInventoryStoreKey(record) {
  return record.store_name || record.group_id || "未辨識門市";
}

function matchesInventorySelection(record, selectedSettings) {
  if (!selectedSettings?.length) return true;
  return selectedSettings.some((setting) => {
    const aliases = getStoreAliases(setting);
    return record.store_name === setting.store_name
      || aliases.includes(record.store_name)
      || record.group_id === setting.group_id;
  });
}

function pickLatestInventoryRecords(records = []) {
  const latest = new Map();
  for (const record of records) {
    const key = getInventoryStoreKey(record);
    const previous = latest.get(key);
    if (!previous || new Date(record.created_at) > new Date(previous.created_at)) {
      latest.set(key, record);
    }
  }
  return [...latest.values()].sort((a, b) => String(getInventoryStoreKey(a)).localeCompare(String(getInventoryStoreKey(b)), "zh-Hant"));
}

function pickLatestInventoryRecordPairs(records = []) {
  const grouped = new Map();
  for (const record of records) {
    const key = getInventoryStoreKey(record);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  }

  const pairs = [...grouped.values()]
    .map((group) => group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 2))
    .sort((a, b) => String(getInventoryStoreKey(a[0])).localeCompare(String(getInventoryStoreKey(b[0])), "zh-Hant"));

  return pairs.flat();
}

function uniqueBy(items = [], keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeStoreInventoryItems(items = []) {
  return uniqueBy(items, (item) => [
    item.inventory_record_id,
    item.item_name,
    item.frozen_quantity,
    item.frozen_unit,
    item.chilled_quantity,
    item.chilled_unit,
    item.safety_quantity,
    item.safety_unit,
    item.note
  ].join("|"));
}

function dedupeBeverageInventoryItems(items = []) {
  return uniqueBy(items, (item) => [
    item.beverage_record_id,
    item.beverage_name,
    item.line_date_text,
    item.inbound_cases,
    item.counted_bottles
  ].join("|"));
}

function inventoryCount(item) {
  const hasFrozen = item.frozen_quantity != null;
  const hasChilled = item.chilled_quantity != null;
  if (!hasFrozen && !hasChilled) return null;
  const frozen = Number(item.frozen_quantity || 0);
  const chilled = Number(item.chilled_quantity || 0);
  if (!Number.isFinite(frozen) || !Number.isFinite(chilled)) return null;
  return frozen + chilled;
}

function formatInventoryDiff(currentItem, previousItem) {
  if (!previousItem) return "昨日：無資料";
  const current = inventoryCount(currentItem);
  const previous = inventoryCount(previousItem);
  if (current == null || previous == null) return "差異：需人工確認";
  const diff = current - previous;
  if (diff === 0) return "差異 0";
  return `差異 ${diff > 0 ? "+" : ""}${Number(diff.toFixed(2)).toLocaleString("en-US")}`;
}

function inventoryDiffRows(currentItems = [], previousItems = []) {
  const previousByName = new Map(previousItems.map((item) => [item.item_name, item]));
  const currentByName = new Map(currentItems.map((item) => [item.item_name, item]));
  const itemNames = [...new Set([...currentByName.keys(), ...previousByName.keys()])].sort((a, b) => String(a).localeCompare(String(b), "zh-Hant"));

  return itemNames
    .map((itemName) => {
      const currentItem = currentByName.get(itemName);
      const previousItem = previousByName.get(itemName);
      if (!currentItem) return { itemName, text: "今日未辨識，需人工確認", changed: true };
      if (!previousItem) return { itemName, text: "新增辨識，無昨日基準", changed: true };

      const current = inventoryCount(currentItem);
      const previous = inventoryCount(previousItem);
      if (current == null || previous == null) return { itemName, text: "數字需人工確認", changed: true };

      const diff = current - previous;
      if (diff === 0) return { itemName, text: "0", changed: false };
      return {
        itemName,
        text: `${diff > 0 ? "+" : ""}${Number(diff.toFixed(2)).toLocaleString("en-US")}`,
        changed: true
      };
    })
    .filter((row) => row.changed);
}

function buildStoreInventorySection(records = [], items = []) {
  if (!records.length) {
    return [...sectionTitle(7, "店面盤點庫存"), "目前尚未取得店面盤點庫存資料。"].join("\n");
  }

  const lines = [...sectionTitle(7, "店面盤點庫存")];
  lines.push("規則：日報不顯示兩天原始庫存，只顯示今日與昨日差異；目前尚未納入調貨/進貨，不計正式使用量。");
  lines.push("後續：調貨與進貨流水建立後，差異會與調貨進出、進貨量一起加總判斷。");

  const recordPairs = new Map();
  for (const record of records) {
    const key = getInventoryStoreKey(record);
    if (!recordPairs.has(key)) recordPairs.set(key, []);
    recordPairs.get(key).push(record);
  }

  for (const pair of [...recordPairs.values()]) {
    const [record, previousRecord] = pair.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const currentItems = dedupeStoreInventoryItems(items.filter((item) => item.inventory_record_id === record.id));
    const previousItems = previousRecord
      ? dedupeStoreInventoryItems(items.filter((item) => item.inventory_record_id === previousRecord.id))
      : [];

    lines.push(`- ${record.store_name || "未辨識門市"}`);
    if (!previousRecord) {
      lines.push("  差異：尚無昨日盤點資料，無法比對");
      continue;
    }

    const diffRows = inventoryDiffRows(currentItems, previousItems);
    if (!diffRows.length) {
      lines.push("  差異：無明顯差異");
      continue;
    }

    diffRows.slice(0, 8).forEach((diff) => {
      lines.push(`  ${diff.itemName}：${diff.text}`);
    });
    if (diffRows.length > 8) {
      lines.push(`  另有 ${diffRows.length - 8} 項差異未列出`);
    }
    lines.push("  備註：OCR 差異僅供檢核，正式用量待調貨/進貨資料補齊後再計算");
  }

  return lines.join("\n");
}

function buildBeverageInventorySection(records = [], items = []) {
  if (!records.length) {
    return [...sectionTitle(8, "飲料促銷庫存"), "目前尚未取得促銷飲料庫存資料；此項不列入常態食材庫存。"].join("\n");
  }

  const itemsByRecord = dedupeBeverageInventoryItems(items).reduce((acc, item) => {
    acc[item.beverage_record_id] ||= [];
    acc[item.beverage_record_id].push(item);
    return acc;
  }, {});
  const lines = [...sectionTitle(8, "飲料促銷庫存")];
  lines.push("說明：少數門市促銷品，不列入常態食材庫存。");

  for (const record of records) {
    const beverageItems = itemsByRecord[record.id] || [];
    lines.push(`- ${record.store_name || "未辨識門市"}：${beverageItems.length}筆`);
    beverageItems.slice(0, 6).forEach((item) => {
      const inbound = itemQuantityText(item.inbound_cases, "箱");
      const counted = itemQuantityText(item.counted_bottles, "瓶");
      const parts = [
        inbound ? `進貨 ${inbound}` : null,
        counted ? `盤點 ${counted}` : null
      ].filter(Boolean);
      lines.push(`  ${item.line_date_text || "未辨識日期"} ${item.beverage_name}：${parts.length ? parts.join(" / ") : "數字需確認"}`);
    });

    if (beverageItems.length > 6) {
      lines.push(`  另有 ${beverageItems.length - 6} 筆未列出`);
    }
  }

  return lines.join("\n");
}

function getImageAnalysis(row) {
  return row.raw_event?.image_analysis || null;
}

function buildAiUsageSection(rows = []) {
  const imageRows = rows.filter((row) => row.message_type === "image");
  const imageLimit = Number(process.env.OCR_DAILY_IMAGE_LIMIT || 100);
  const analyzedRows = imageRows.filter((row) => getImageAnalysis(row)?.status === "completed");
  const skippedRows = imageRows.filter((row) => getImageAnalysis(row)?.status === "skipped");
  const manualReviewRows = imageRows.filter((row) => getImageAnalysis(row)?.manual_review_required);
  const failedRows = imageRows.filter((row) => getImageAnalysis(row)?.status === "failed");

  const totals = imageRows.reduce((acc, row) => {
    const analysis = getImageAnalysis(row);
    const usage = analysis?.usage || {};
    const cost = analysis?.cost_estimate || {};
    acc.inputTokens += Number(usage.input_tokens || 0);
    acc.outputTokens += Number(usage.output_tokens || 0);
    acc.totalTokens += Number(usage.total_tokens || 0);
    acc.estimatedCostUsd += Number(cost.estimated_cost_usd || 0);
    return acc;
  }, {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0
  });

  const usageRate = imageLimit > 0 ? Math.round((imageRows.length / imageLimit) * 100) : 0;
  const lines = [...sectionTitle(9, "AI OCR 成本監控")];
  lines.push(`圖片：${imageRows.length} / ${imageLimit}（${usageRate}%）`);
  lines.push(`OCR：成功 ${analyzedRows.length} / 待人工 ${manualReviewRows.length} / 失敗 ${failedRows.length}`);
  lines.push(`略過：${skippedRows.length}`);
  lines.push(`Token：${totals.totalTokens.toLocaleString("en-US")}`);
  lines.push(`預估成本：US$${totals.estimatedCostUsd.toFixed(4)}`);
  lines.push("計費來源：OpenAI API，不使用 ChatGPT 對話額度。");
  return lines.join("\n");
}

async function buildInventorySections(supabase, selectedSettings = []) {
  const { data: inventoryRecords, error: inventoryError } = await supabase
    .from("store_inventory_records")
    .select("id, group_id, store_name, report_date_text, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (isMissingTableError(inventoryError)) {
    return ["", "庫存統計", "尚未建立庫存資料表，請先套用 supabase/inventory_tables.sql。"].join("\n");
  }
  if (inventoryError) throw inventoryError;

  const selectedInventoryRecords = pickLatestInventoryRecordPairs(
    (inventoryRecords || []).filter((record) => matchesInventorySelection(record, selectedSettings))
  );
  const inventoryRecordIds = selectedInventoryRecords.map((record) => record.id);
  let inventoryItems = [];
  if (inventoryRecordIds.length) {
    const { data, error } = await supabase
      .from("store_inventory_items")
      .select("inventory_record_id, item_name, frozen_quantity, frozen_unit, chilled_quantity, chilled_unit, safety_quantity, safety_unit, note")
      .in("inventory_record_id", inventoryRecordIds)
      .order("item_name", { ascending: true });
    if (error) throw error;
    inventoryItems = data || [];
  }

  const { data: beverageRecords, error: beverageError } = await supabase
    .from("beverage_inventory_records")
    .select("id, group_id, store_name, report_date_text, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (beverageError) throw beverageError;

  const selectedBeverageRecords = pickLatestInventoryRecords(
    (beverageRecords || []).filter((record) => matchesInventorySelection(record, selectedSettings))
  );
  const beverageRecordIds = selectedBeverageRecords.map((record) => record.id);
  let beverageItems = [];
  if (beverageRecordIds.length) {
    const { data, error } = await supabase
      .from("beverage_inventory_items")
      .select("beverage_record_id, beverage_name, line_date_text, inbound_cases, counted_bottles")
      .in("beverage_record_id", beverageRecordIds)
      .order("line_date_text", { ascending: true });
    if (error) throw error;
    beverageItems = data || [];
  }

  return `${buildStoreInventorySection(selectedInventoryRecords, inventoryItems)}\n${buildBeverageInventorySection(selectedBeverageRecords, beverageItems)}`;
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

function inferStoreLabel(row, storeSettings = []) {
  const text = row.text || "";
  const matched = storeSettings.find((setting) => {
    const aliases = getStoreAliases(setting);
    return aliases.some((alias) => alias && text.includes(alias));
  });
  return matched?.short_name || matched?.store_name || getGroupDisplayName(row.group_id || row.room_id, getGroupNameMap());
}

function summarizeTemperatureIssue(issue) {
  const parts = [];
  if (issue.freezerAbnormal.length) parts.push(`冷凍 ${issue.freezerAbnormal.join("、")}`);
  if (issue.chillerAbnormal.length) parts.push(`冷藏 ${issue.chillerAbnormal.join("、")}`);
  return parts.join("；");
}

export async function buildHqSummaryReport({ supabase } = {}) {
  const since = new Date(Date.now() - REPORT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const storeSettings = await getActiveStoreSettings(supabase);
  const activeStores = storeSettings.filter((setting) => setting.is_active !== false);
  const boundStores = activeStores.filter((setting) => setting.group_id);

  const { data, error } = await supabase
    .from("line_group_messages")
    .select("group_id, room_id, message_type, text, category, severity, occurred_at, raw_event")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true });
  if (error) throw error;

  const { data: tasks, error: taskError } = await supabase
    .from("line_tasks")
    .select("id, group_id, category, severity, status, title, due_at, updated_at")
    .neq("status", "completed")
    .order("due_at", { ascending: true })
    .limit(50);
  if (taskError) throw taskError;

  const reportTo = process.env.LINE_REPORT_TO;
  const rows = (data || []).filter((row) => {
    if (!reportTo) return true;
    return row.group_id !== reportTo && row.room_id !== reportTo;
  });

  const issueRows = rows
    .filter(isRelevantIssueItem)
    .filter((row) => row.severity === "A" || row.severity === "B");
  const temperatureIssues = rows.map(parseTemperatureReport).filter(Boolean);
  const openTasks = (tasks || [])
    .filter((task) => task.status !== "completed")
    .filter((task) => !isNoiseTask(task));

  const revenueRows = rows.filter(hasRevenueSignal);
  const revenueStatus = boundStores.map((setting) => {
    const matchedRows = revenueRows
      .filter((row) => rowMatchesStore(row, setting))
      .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
    const latest = matchedRows[0];
    if (!latest) return { store: setting.short_name || setting.store_name, status: "未回報" };
    const parsed = parseRevenueText(latest.text || "");
    return {
      store: setting.short_name || setting.store_name,
      status: "已回報",
      amount: parsed.amount,
      time: parsed.reportTime
    };
  });

  const revenueMissing = revenueStatus.filter((item) => item.status !== "已回報");
  const lines = [
    "【萊吉多總部摘要日報】",
    `區間：${DAILY_REPORT_TIME} 前 ${REPORT_WINDOW_HOURS} 小時`,
    `門市：啟用 ${activeStores.length} 店 / 已綁 LINE ${boundStores.length} 店`,
    ...sectionTitle(1, "今日必處理")
  ];

  let actionIndex = 0;
  issueRows.slice(0, 6).forEach((row) => {
    actionIndex += 1;
    lines.push(`${actionIndex}. ${inferStoreLabel(row, activeStores)}｜${label(row.category)}｜${row.severity}級`);
    lines.push(`   ${oneLine(row.text || `[${row.message_type}]`, 42)}`);
  });
  temperatureIssues.slice(0, 6).forEach((issue) => {
    actionIndex += 1;
    lines.push(`${actionIndex}. ${issue.store}｜冰箱溫度異常｜A級`);
    lines.push(`   ${summarizeTemperatureIssue(issue)}`);
    lines.push("   動作：店長回覆實測溫度與照片");
  });
  if (!actionIndex) lines.push("目前無 A/B 級即時處理事項。");
  if (issueRows.length + temperatureIssues.length > actionIndex) {
    lines.push(`另有 ${issueRows.length + temperatureIssues.length - actionIndex} 項未列出`);
  }

  lines.push(...sectionTitle(2, "門市狀態"));
  lines.push(`訊息總數：${rows.length} 筆`);
  lines.push(`異常/即時：${issueRows.length + temperatureIssues.length} 項`);
  lines.push(`未完成任務：${openTasks.length} 項`);
  if (revenueMissing.length) {
    lines.push(`營收未回報：${revenueMissing.map((item) => item.store).join("、")}`);
  } else {
    lines.push("營收未回報：無");
  }

  lines.push(...sectionTitle(3, "營收回報"));
  revenueStatus.forEach((item) => {
    if (item.status !== "已回報") {
      lines.push(`- ${item.store}：未回報`);
      return;
    }
    lines.push(`- ${item.store}：${item.time || "時間未辨識"} ${item.amount ? `$${item.amount.toLocaleString("en-US")}` : "金額需確認"}`);
  });

  lines.push(...sectionTitle(4, "任務追蹤"));
  if (!openTasks.length) {
    lines.push("目前沒有需追蹤任務。");
  } else {
    openTasks.slice(0, 6).forEach((task, index) => {
      const groupName = getGroupDisplayName(task.group_id, getGroupNameMap());
      lines.push(`${index + 1}. #${task.id} ${task.severity}級｜${label(task.category)}`);
      lines.push(`   ${oneLine(task.title, 42)}`);
      lines.push(`   群組：${groupName}`);
    });
    if (openTasks.length > 6) lines.push(`另有 ${openTasks.length - 6} 項未列出`);
  }

  lines.push(...sectionTitle(5, "查詢指令"));
  lines.push("單店明細：今日匯報 大昌");
  lines.push("多店明細：今日匯報 義華,大昌");
  lines.push("總部摘要：總部摘要日報");

  return {
    report: lines.join("\n"),
    rows: rows.length,
    actionItems: actionIndex,
    openTasks: openTasks.length
  };
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
    .select("group_id, room_id, message_type, text, category, severity, occurred_at, raw_event")
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
  const inventorySections = await buildInventorySections(supabase, selectedSettings);
  const report = `${buildReport(reportRows, context)}\n${buildStoreReportAuditSection(reportRows, auditSettings)}\n${buildRevenueSection(reportRows)}\n${buildReceivingSection(reportRows)}\n${buildOrderingSection(reportRows)}\n${inventorySections}\n${buildAiUsageSection(reportRows)}\n${buildTaskSection(selectedTasks)}`;

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
