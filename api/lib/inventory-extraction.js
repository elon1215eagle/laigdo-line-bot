const beverageKeywords = ["水量", "可樂", "雪碧", "零卡", "飲料", "瓶"];
const nonInventoryKeywords = ["員工餐", "耗損紀錄", "耗損"];
const inventoryHeaderKeywords = ["冷凍庫存", "冷藏庫存", "安全庫存", "盤點人", "庫存盤點"];
const storeInventoryKeywords = [
  "冷凍庫存",
  "冷藏庫存",
  "安全庫存",
  "盤點人",
  "雞翅",
  "腿排",
  "雞腿",
  "雞排",
  "雞米花",
  "三角骨",
  "雞脖",
  "雞皮",
  "米血",
  "花枝丸",
  "黑輪",
  "熱狗",
  "雞塊",
  "地瓜",
  "炸油",
  "酥粉",
  "脆粉"
];

const storeInventoryItems = [
  "雞翅",
  "腿排",
  "雞腿",
  "雞排",
  "雞米花",
  "三角骨",
  "雞脖子",
  "雞脖",
  "雞皮",
  "米血",
  "花枝丸",
  "黑輪片",
  "黑輪",
  "熱狗",
  "雞塊",
  "地瓜",
  "炸油",
  "湯翅粉",
  "21粉",
  "酥粉",
  "薯條脆粉",
  "脆粉"
];

const beverageItems = ["可樂", "雪碧", "零卡可樂", "零卡", "薑母茶"];

const unitPattern = "(大包|小包|箱|包|支|件|瓶|桶|袋|盒|封|片)";

function cleanText(text = "") {
  return String(text)
    .replace(/\r/g, "")
    .replace(/[：]/g, ":")
    .replace(/[，]/g, ",")
    .trim();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeItemName(name = "") {
  if (name === "雞脖") return "雞脖子";
  if (name === "零卡") return "零卡可樂";
  if (name === "脆粉") return "薯條脆粉";
  return name;
}

function inferStoreName(text = "") {
  if (text.includes("義華")) return "三民義華店";
  if (text.includes("大昌")) return "三民大昌店";
  return null;
}

function extractReportDate(text = "") {
  const dateMatch = text.match(/(?:日期[:：]?\s*)?(\d{1,3}[./月-]\d{1,2}(?:[./月-]\d{1,2})?|\d{1,2}[./-]\d{1,2})/);
  return dateMatch?.[1]?.replace("月", "/") || null;
}

function parseQuantityToken(token = "") {
  const match = String(token).match(/(-?\d+(?:\.\d+)?)\s*(大包|小包|箱|包|支|件|瓶|桶|袋|盒|封|片)?/);
  if (!match) return null;
  return {
    quantity: Number(match[1]),
    unit: match[2] || null
  };
}

function parseStoreInventoryLine(line = "") {
  const item = storeInventoryItems.find((name) => line.includes(name));
  if (!item) return null;

  const itemIndex = line.indexOf(item);
  const rest = line.slice(itemIndex + item.length);
  const tokenRegex = new RegExp(`-?\\d+(?:\\.\\d+)?\\s*${unitPattern}?`, "g");
  const tokens = rest.match(tokenRegex) || [];
  const parsed = tokens.map(parseQuantityToken).filter(Boolean);

  if (!parsed.length && !/(x|X|無|缺|沒)/.test(rest)) return null;

  return {
    item_name: normalizeItemName(item),
    frozen_quantity: parsed[0]?.quantity ?? null,
    frozen_unit: parsed[0]?.unit ?? null,
    chilled_quantity: parsed[1]?.quantity ?? null,
    chilled_unit: parsed[1]?.unit ?? null,
    safety_quantity: parsed[2]?.quantity ?? null,
    safety_unit: parsed[2]?.unit ?? null,
    note: rest.replace(/\s+/g, " ").trim() || null,
    raw_line: line
  };
}

function parseStoreInventory(text = "") {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  const seen = new Set();
  for (const line of lines) {
    const parsed = parseStoreInventoryLine(line);
    if (!parsed) continue;
    const key = [
      parsed.item_name,
      parsed.frozen_quantity,
      parsed.frozen_unit,
      parsed.chilled_quantity,
      parsed.chilled_unit,
      parsed.safety_quantity,
      parsed.safety_unit,
      parsed.raw_line
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(parsed);
  }

  return items;
}

function parseBeverageInventory(text = "") {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  const seen = new Set();
  const headerLine = lines.find((line) => beverageItems.some((name) => line.includes(name))) || "";
  const headerItems = beverageItems.filter((name) => headerLine.includes(name)).map(normalizeItemName);
  const activeItems = headerItems.length ? headerItems : ["可樂", "雪碧", "零卡可樂"];

  for (const line of lines) {
    if (!/^\d{1,2}[./-]\d{1,2}/.test(line)) continue;
    const numbers = [...line.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
    if (numbers.length < 2) continue;

    const reportDate = line.match(/^\d{1,2}[./-]\d{1,2}/)?.[0] || null;
    const values = numbers.slice(reportDate ? 2 : 0);

    const oneValuePerItem = values.length === activeItems.length;
    activeItems.forEach((name, index) => {
      const first = oneValuePerItem ? null : values[index * 2];
      const second = oneValuePerItem ? values[index] : values[index * 2 + 1];
      if (first == null && second == null) return;
      const parsed = {
        beverage_name: name,
        line_date_text: reportDate,
        inbound_cases: Number.isFinite(first) ? first : null,
        counted_bottles: Number.isFinite(second) ? second : null,
        raw_line: line
      };
      const key = [
        parsed.beverage_name,
        parsed.line_date_text,
        parsed.inbound_cases,
        parsed.counted_bottles,
        parsed.raw_line
      ].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      items.push(parsed);
    });
  }

  return items;
}

export function extractInventoryFromMessage(record = {}) {
  const analysis = record.raw_event?.image_analysis || {};
  const primaryText = cleanText(analysis.ocr_text || record.text || "");
  const contextText = cleanText([primaryText, analysis.visual_summary].filter(Boolean).join("\n"));
  if (!primaryText && !contextText) return null;
  if (includesAny(contextText, nonInventoryKeywords)) return null;

  const isBeverage = includesAny(contextText, beverageKeywords) && !includesAny(contextText, ["雞腿", "雞排", "雞米花", "炸油"]);
  if (isBeverage) {
    const items = parseBeverageInventory(primaryText);
    if (!items.length) return null;
    return {
      inventory_type: "beverage_promo",
      store_name: inferStoreName(contextText),
      report_date_text: extractReportDate(primaryText),
      items
    };
  }

  const isStoreInventory = includesAny(contextText, inventoryHeaderKeywords);
  if (!isStoreInventory) return null;

  const items = parseStoreInventory(primaryText);
  if (!items.length) return null;

  return {
    inventory_type: "store_inventory",
    store_name: inferStoreName(contextText),
    report_date_text: extractReportDate(primaryText),
    items
  };
}

function shouldIgnoreMissingTable(error) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function saveInventoryExtraction(supabase, record, messageId) {
  const extraction = extractInventoryFromMessage(record);
  if (!extraction || !messageId) return { saved: false, reason: "not_inventory" };

  if (extraction.inventory_type === "beverage_promo") {
    return saveBeverageInventory(supabase, record, messageId, extraction);
  }

  return saveStoreInventory(supabase, record, messageId, extraction);
}

async function saveStoreInventory(supabase, record, messageId, extraction) {
  const { error: deleteError } = await supabase
    .from("store_inventory_records")
    .delete()
    .eq("message_id", messageId);

  if (shouldIgnoreMissingTable(deleteError)) return { saved: false, reason: "table_missing" };
  if (deleteError) throw deleteError;

  const { data: snapshot, error } = await supabase
    .from("store_inventory_records")
    .insert({
      message_id: messageId,
      group_id: record.group_id || record.room_id,
      store_name: extraction.store_name,
      report_date_text: extraction.report_date_text,
      source_text: record.text || null
    })
    .select("id")
    .single();

  if (shouldIgnoreMissingTable(error)) return { saved: false, reason: "table_missing" };
  if (error) throw error;

  const rows = extraction.items.map((item) => ({
    inventory_record_id: snapshot.id,
    ...item
  }));

  const { error: itemError } = await supabase.from("store_inventory_items").insert(rows);
  if (itemError) throw itemError;

  return { saved: true, type: "store_inventory", items: rows.length };
}

async function saveBeverageInventory(supabase, record, messageId, extraction) {
  const { error: deleteError } = await supabase
    .from("beverage_inventory_records")
    .delete()
    .eq("message_id", messageId);

  if (shouldIgnoreMissingTable(deleteError)) return { saved: false, reason: "table_missing" };
  if (deleteError) throw deleteError;

  const { data: snapshot, error } = await supabase
    .from("beverage_inventory_records")
    .insert({
      message_id: messageId,
      group_id: record.group_id || record.room_id,
      store_name: extraction.store_name,
      report_date_text: extraction.report_date_text,
      source_text: record.text || null,
      promotion_flag: true
    })
    .select("id")
    .single();

  if (shouldIgnoreMissingTable(error)) return { saved: false, reason: "table_missing" };
  if (error) throw error;

  const rows = extraction.items.map((item) => ({
    beverage_record_id: snapshot.id,
    ...item
  }));

  const { error: itemError } = await supabase.from("beverage_inventory_items").insert(rows);
  if (itemError) throw itemError;

  return { saved: true, type: "beverage_promo", items: rows.length };
}
