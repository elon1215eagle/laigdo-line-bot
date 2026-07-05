import { analyzeImageBytes, buildImageText } from "../lib/image-analysis.js";
import { getSupabase } from "../lib/reporting.js";

function isAuthorized(req) {
  const tokens = [process.env.ANALYZE_ADMIN_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  if (!tokens.length) return false;
  return tokens.some((token) => req.headers.authorization === `Bearer ${token}`);
}

async function analyzeRow(supabase, row) {
  if (!row.media_storage_bucket || !row.media_storage_path) {
    return { id: row.id, status: "skipped", error: "Missing storage path" };
  }

  if (row.raw_event?.image_analysis?.status === "completed") {
    return { id: row.id, status: "already_completed" };
  }

  const { data, error } = await supabase.storage
    .from(row.media_storage_bucket)
    .download(row.media_storage_path);

  if (error) {
    return { id: row.id, status: "failed", error: error.message };
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  const contentType = row.media_content_type || data.type || "image/jpeg";
  const analysis = await analyzeImageBytes(bytes, contentType);
  const rawEvent = {
    ...(row.raw_event || {}),
    image_analysis: analysis
  };
  const patch = { raw_event: rawEvent };

  if (analysis.status === "completed") {
    patch.text = row.text || buildImageText(analysis);
    patch.category = analysis.category || row.category;
    patch.severity = analysis.severity || row.severity;
  }

  const { error: updateError } = await supabase
    .from("line_group_messages")
    .update(patch)
    .eq("id", row.id);

  if (updateError) {
    return { id: row.id, status: "failed", error: updateError.message };
  }

  return { id: row.id, status: analysis.status, category: analysis.category, severity: analysis.severity };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured" });
  }

  const limit = Math.min(Number(req.query.limit || 10), 20);
  const groupId = req.query.group_id;
  let query = supabase
    .from("line_group_messages")
    .select("id, group_id, message_type, text, category, severity, media_storage_bucket, media_storage_path, media_content_type, raw_event, occurred_at")
    .eq("message_type", "image")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (groupId) query = query.eq("group_id", groupId);

  const { data, error } = await query;
  if (error) throw error;

  const results = [];
  for (const row of data || []) {
    results.push(await analyzeRow(supabase, row));
  }

  return res.status(200).json({ ok: true, results });
}
