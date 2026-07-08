import { getSupabase } from "./reporting.js";

export const TRANSFER_GROUP_ID = "Cc3b5acf128788bf429885e7f24062013";

const PRODUCT_HEADER = "產品類";
const DRY_GOODS_HEADER = "南北貨";
const ADD_ON_HEADER = "追加";
const DEFAULT_SOURCE_BY_DESTINATION = {
  鼎山: "大昌",
  中山: "凱旋",
  武廟: "義華",
  隆興: "五甲"
};

function taipeiDate(offsetDays = 0, base = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.format(base).split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + offsetDays));
  return {
    ymd: date.toISOString().slice(0, 10),
    label: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function taipeiBoundaryIso(hour, minute = 0, offsetDays = 0) {
  const date = taipeiDate(offsetDays);
  return new Date(`${date.ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`).toISOString();
}

function oneLine(text = "", maxLength = 52) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function cleanLine(line = "") {
  return String(line)
    .replace(/^[\d]+\.\s*/, "")
    .replace(/^[-•]\s*/, "")
    .trim();
}

function normalizeStoreName(store = "") {
  return String(store || "")
    .replace(/[（(][一二三四五六日天][）)]/g, "")
    .replace(/店$/g, "")
    .trim();
}

function getDefaultSourceStore(destinationStore = "") {
  const normalized = normalizeStoreName(destinationStore);
  return DEFAULT_SOURCE_BY_DESTINATION[normalized] || null;
}

function isItemLine(line = "") {
  return /(?:[\d０-９]+(?:\.\d+)?|[一二三四五六七八九十兩半]+)\s*(件|包|大包|小包|箱|罐|盒|袋|支|片|封|桶|組)/.test(line);
}

function isRouteLine(line = "") {
  const value = cleanLine(line);
  if (!value || isItemLine(value)) return false;
  return /^(.{1,12}?)\s*(?:給|出給|貨給|送到|配送至|配送到)\s*(.{1,12}?)$/.test(value);
}

function parseRouteLine(line = "") {
  const match = cleanLine(line).match(/^(.{1,12}?)\s*(?:給|出給|貨給|送到|配送至|配送到)\s*(.{1,12}?)$/);
  if (!match) return null;
  return {
    sourceStore: match[1].trim(),
    store: match[2].trim()
  };
}

function normalizeDigits(text = "") {
  return String(text).replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

function parseDate(text = "") {
  const normalized = normalizeDigits(text);
  const monthDate = normalized.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|號)?/);
  const slashDate = normalized.match(/(\d{1,2})\s*[\/／]\s*(\d{1,2})/);
  const matched = monthDate || slashDate;
  return {
    month: matched ? Number(matched[1]) : null,
    day: matched ? Number(matched[2]) : null
  };
}

function parseOrderHeaderLine(line = "") {
  const normalized = normalizeDigits(cleanLine(line));
  const datePrefix = String.raw`(\d{1,2})\s*(?:月|[\/／])\s*(\d{1,2})\s*(?:日|號)?\s*(?:[（(][一二三四五六日天][）)])?\s*`;
  const match = normalized.match(new RegExp(`^${datePrefix}(.+?)(?:取貨量|叫貨量|叫貨|取貨)\\s*$`));
  if (!match) return null;
  return {
    month: Number(match[1]),
    day: Number(match[2]),
    store: match[3].replace(/[：:]/g, "").trim()
  };
}

function parseStoreAndDate(text = "") {
  const normalized = normalizeDigits(text);
  const header = normalized.split(/\r?\n/).map((line) => parseOrderHeaderLine(line)).find(Boolean);
  const explicitStore = normalized.match(/(?:需求店|取貨店|門市)[：:\s]*([^\s\n]+)/)?.[1] || null;
  const dateStore = normalized.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|號)?\s*([^\s\n]+?)(?:取貨量|叫貨量|叫貨|取貨)/);
  const slashDateStore = normalized.match(/(\d{1,2})\s*[\/／]\s*(\d{1,2})\s*([^\s\n]+?)(?:取貨量|叫貨量|叫貨|取貨)?/);
  const matched = dateStore || slashDateStore;
  return {
    month: header?.month || (matched ? Number(matched[1]) : null),
    day: header?.day || (matched ? Number(matched[2]) : null),
    store: explicitStore || header?.store || matched?.[3]?.replace(/[：:]/g, "") || "未辨識門市"
  };
}

function parseSourceStore(text = "") {
  return String(text).match(/(?:出貨店|來源店)[：:\s]*([^\s\n]+)/)?.[1]
    || String(text).match(/([^\s\n]+)\s*出(?:給|貨給|到)\s*([^\s\n]+)/)?.[1]
    || null;
}

function parseDeliveryStatus(text = "") {
  return String(text).match(/配送狀態[：:\s]*([^\s\n]+)/)?.[1]
    || (text.includes("已收貨") ? "已收貨" : null)
    || (text.includes("已備貨") ? "已備貨" : null)
    || (text.includes("配送中") ? "配送中" : null)
    || null;
}

function createEmptyOrder({ month, day, store, sourceStore, status, text }) {
  return {
    month,
    day,
    store,
    sourceStore,
    status,
    text,
    sections: {
      products: [],
      dryGoods: [],
      addOns: []
    },
    itemCount: 0
  };
}

function appendItem(order, section, line) {
  if (section === DRY_GOODS_HEADER) order.sections.dryGoods.push(line);
  else if (section === ADD_ON_HEADER) order.sections.addOns.push(line);
  else order.sections.products.push(line);
  order.itemCount += 1;
}

export function parseTransferOrdersText(text = "") {
  const normalizedText = normalizeDigits(text);
  const lines = normalizedText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const hasMultipleOrderMarkers = lines.some(isRouteLine) || lines.filter((line) => parseOrderHeaderLine(line)).length > 1;
  if (!hasMultipleOrderMarkers) return [parseTransferOrderText(text)];

  const fallbackDate = parseDate(normalizedText);
  const status = parseDeliveryStatus(normalizedText);
  const orders = [];
  let currentOrder = null;
  let currentSection = PRODUCT_HEADER;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line || /^[-—_]{3,}$/.test(line)) continue;
    if (/^(南北貨|南北货)/.test(line)) {
      currentSection = DRY_GOODS_HEADER;
      continue;
    }
    if (/^追加/.test(line)) {
      currentSection = ADD_ON_HEADER;
      continue;
    }

    const header = parseOrderHeaderLine(line);
    if (header) {
      if (currentOrder) orders.push(currentOrder);
      currentOrder = createEmptyOrder({
        month: header.month,
        day: header.day,
        store: header.store,
        sourceStore: getDefaultSourceStore(header.store),
        status,
        text
      });
      currentSection = PRODUCT_HEADER;
      continue;
    }

    if (/^\d{1,2}\s*(?:月|[\/／])\s*\d{1,2}/.test(line)) continue;

    const route = parseRouteLine(line);
    if (route) {
      if (currentOrder) orders.push(currentOrder);
      currentOrder = createEmptyOrder({
        month: fallbackDate.month,
        day: fallbackDate.day,
        store: route.store,
        sourceStore: route.sourceStore,
        status,
        text
      });
      currentSection = PRODUCT_HEADER;
      continue;
    }

    if (!currentOrder || !isItemLine(line)) continue;
    appendItem(currentOrder, currentSection, line);
  }

  if (currentOrder) orders.push(currentOrder);
  return orders.length ? orders : [parseTransferOrderText(text)];
}

export function parseTransferOrderText(text = "") {
  const lines = normalizeDigits(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const { month, day, store } = parseStoreAndDate(text);
  const sourceStore = parseSourceStore(text) || getDefaultSourceStore(store);
  const status = parseDeliveryStatus(text);
  const sections = {
    products: [],
    dryGoods: [],
    addOns: []
  };
  let current = PRODUCT_HEADER;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line || /^[-—_]{3,}$/.test(line)) continue;
    if (/^(南北貨|南北货)/.test(line)) {
      current = DRY_GOODS_HEADER;
      continue;
    }
    if (/^追加/.test(line)) {
      current = ADD_ON_HEADER;
      continue;
    }
    if (/^(日期|需求店|取貨店|出貨店|來源店|配送方式|配送狀態|異常|備註)[：:]/.test(line)) continue;
    if (/取貨量|叫貨量|調貨配送回報|進貨回報/.test(line) && !isItemLine(line)) continue;
    if (!isItemLine(line)) continue;

    if (current === DRY_GOODS_HEADER) sections.dryGoods.push(line);
    else if (current === ADD_ON_HEADER) sections.addOns.push(line);
    else sections.products.push(line);
  }

  const itemCount = sections.products.length + sections.dryGoods.length + sections.addOns.length;
  return {
    month,
    day,
    store,
    sourceStore,
    status,
    sections,
    itemCount
  };
}

function matchesTargetDate(order, targetDate) {
  if (!order.month || !order.day) return true;
  return order.month === targetDate.month && order.day === targetDate.day;
}

function normalizeItemText(item = "") {
  return String(item || "").replace(/\s+/g, "").replace(/[：:]/g, "").trim();
}

function parseChineseNumber(text = "") {
  const map = { 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5 };
  if (text === "半") return 0.5;
  if (text === "十") return 10;
  if (/^[一二兩三四五六七八九]十[一二兩三四五六七八九]?$/.test(text)) {
    const [head, tail] = text.split("十");
    return (map[head] || 1) * 10 + (map[tail] || 0);
  }
  return map[text] || null;
}

function parseItemQuantity(item = "") {
  const normalized = String(item || "").replace(/\s+/g, "");
  const unitPattern = "(大包|小包|件|包|箱|罐|盒|袋|支|片|封|桶|組)";
  const match = normalized.match(new RegExp(`^(.+?)(\\d+(?:\\.\\d+)?|[一二兩三四五六七八九十半]+)${unitPattern}(.*)$`));
  if (!match) return null;
  const quantity = /^\d/.test(match[2]) ? Number(match[2]) : parseChineseNumber(match[2]);
  if (!Number.isFinite(quantity)) return null;
  const name = match[1].replace(/[：:]/g, "").trim();
  const unit = match[3];
  const suffix = match[4] || "";
  if (!name || suffix.includes("*")) return null;
  return { name, quantity, unit, suffix, key: `${name}|${unit}|${suffix}` };
}

function getItemProductKey(item = "") {
  const parsed = parseItemQuantity(item);
  if (parsed) return parsed.name;
  return normalizeItemText(item).replace(/(?:\d+(?:\.\d+)?|[一二兩三四五六七八九十半]+)(大包|小包|件|包|箱|罐|盒|袋|支|片|封|桶|組).*$/, "");
}

function mergeSectionItems(existingItems, incomingItems) {
  const seen = new Set(existingItems.map(normalizeItemText));
  const seenProducts = new Set(existingItems.map(getItemProductKey).filter(Boolean));

  for (const item of incomingItems) {
    const key = normalizeItemText(item);
    if (!key || seen.has(key)) continue;
    const productKey = getItemProductKey(item);
    if (productKey && seenProducts.has(productKey)) {
      seen.add(key);
      continue;
    }

    existingItems.push(item);
    seen.add(key);
    if (productKey) seenProducts.add(productKey);
  }
}

export function mergeOrders(orders = []) {
  const merged = new Map();

  for (const order of orders) {
    const sourceStore = normalizeStoreName(order.sourceStore || "待確認");
    const store = normalizeStoreName(order.store || "待確認");
    const key = [order.month || "", order.day || "", sourceStore, store].join("|");
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...order,
        sourceStore: order.sourceStore || null,
        store: order.store || null,
        sections: {
          products: [...order.sections.products],
          dryGoods: [...order.sections.dryGoods],
          addOns: [...order.sections.addOns]
        }
      });
      continue;
    }

    mergeSectionItems(existing.sections.products, order.sections.products);
    mergeSectionItems(existing.sections.dryGoods, order.sections.dryGoods);
    mergeSectionItems(existing.sections.addOns, order.sections.addOns);
    existing.status = existing.status || order.status;
    existing.text = [existing.text, order.text].filter(Boolean).join("\n---\n");
  }

  return [...merged.values()].map((order) => ({
    ...order,
    itemCount: order.sections.products.length + order.sections.dryGoods.length + order.sections.addOns.length
  }));
}

function formatOrder(order, index) {
  const route = order.sourceStore ? `${order.sourceStore} → ${order.store}` : order.store;
  const lines = [`${index}. ${route}`];
  lines.push(`   出貨：${order.sourceStore || "待確認"}｜到店：${order.store || "待確認"}｜狀態：${order.status || "待備貨"}`);
  if (order.sections.products.length) {
    lines.push(`   ${PRODUCT_HEADER}：${order.sections.products.join("、")}`);
  }
  if (order.sections.dryGoods.length) {
    lines.push(`   ${DRY_GOODS_HEADER}：${order.sections.dryGoods.join("、")}`);
  }
  if (order.sections.addOns.length) {
    lines.push(`   ${ADD_ON_HEADER}：${order.sections.addOns.join("、")}`);
  }
  if (!order.itemCount) lines.push(`   原文：${oneLine(order.text)}`);
  return lines;
}

export async function buildTransferDeliveryReport({ supabase = getSupabase(), reportType = "tomorrow" } = {}) {
  if (!supabase) throw new Error("Supabase is not configured");

  const targetDate = reportType === "tomorrow" ? taipeiDate(1) : taipeiDate(0);
  const since = reportType === "second"
    ? taipeiBoundaryIso(8, 0, 0)
    : reportType === "today"
      ? taipeiBoundaryIso(0, 0, -1)
      : taipeiBoundaryIso(15, 0, -1);
  const until = new Date().toISOString();

  const { data, error } = await supabase
    .from("line_group_messages")
    .select("id, group_id, message_type, text, category, severity, occurred_at")
    .eq("group_id", TRANSFER_GROUP_ID)
    .gte("occurred_at", since)
    .lte("occurred_at", until)
    .order("occurred_at", { ascending: true });
  if (error) throw error;

  const rows = (data || []).filter((row) => {
    const text = row.text || "";
    return row.message_type === "text" && /取貨量|叫貨量|叫貨|調貨|進貨回報|給/.test(text);
  });

  const rawOrders = rows
    .flatMap((row) => parseTransferOrdersText(row.text || "").map((order) => ({ ...order, id: row.id, text: row.text || "" })))
    .filter((order) => matchesTargetDate(order, targetDate));
  const orders = mergeOrders(rawOrders);

  const title = reportType === "second"
    ? "二次叫貨配送清單"
    : reportType === "today"
      ? "今日配送清單"
      : "明日配送清單";
  const lines = [
    `【${title}】`,
    `配送日期：${targetDate.label}`,
    `來源：調貨配送群`,
    `筆數：${orders.length}`,
    ""
  ];

  if (!orders.length) {
    lines.push("目前未偵測到可整理的叫貨/取貨資料。");
    lines.push("提醒：請用固定格式，例如「7月9號 武廟取貨量」。");
  } else {
    orders.forEach((order, index) => {
      lines.push(...formatOrder(order, index + 1));
      lines.push("");
    });
  }

  lines.push("配送提醒：出貨店或狀態若為待確認，請配送前補齊。");
  return {
    report: lines.join("\n").trim(),
    rows: rows.length,
    orders: orders.length,
    rawOrders: rawOrders.length,
    targetDate: targetDate.label,
    reportType
  };
}

export async function pushTransferReport(text, to = process.env.LINE_TRANSFER_REPORT_TO || TRANSFER_GROUP_ID) {
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
