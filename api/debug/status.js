import { getSupabase } from "../lib/reporting.js";

function getSupabaseHost() {
  try {
    const url = process.env.SUPABASE_URL;
    if (!url) return null;
    return new URL(url).host;
  } catch {
    return null;
  }
}

async function safeCount(supabase, table, modifier) {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (modifier) query = modifier(query);
    const { count, error } = await query;
    return error ? { error: error.code || error.message } : { count };
  } catch (error) {
    return { error: error.message };
  }
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(200).json({
      ok: true,
      hasSupabase: false,
      supabaseHost: getSupabaseHost()
    });
  }

  const totalMessages = await safeCount(supabase, "line_group_messages");
  const imageMessages = await safeCount(supabase, "line_group_messages", (query) => query.eq("message_type", "image"));
  const dachangGroupMessages = await safeCount(supabase, "line_group_messages", (query) => query.eq("group_id", "C664b7d66db0ef351a87a2a88acec921c"));
  const { data: recentImages } = await supabase
    .from("line_group_messages")
    .select("id, raw_event, occurred_at")
    .eq("message_type", "image")
    .order("occurred_at", { ascending: false })
    .limit(20);
  const analyzedImages = (recentImages || []).filter((row) => row.raw_event?.image_analysis?.status === "completed").length;
  const pendingImages = (recentImages || []).filter((row) => row.raw_event?.image_analysis?.status !== "completed").length;

  return res.status(200).json({
    ok: true,
    hasSupabase: true,
    supabaseHost: getSupabaseHost(),
    totalMessages,
    imageMessages,
    dachangGroupMessages,
    recentImageAnalysis: {
      sampled: recentImages?.length || 0,
      analyzed: analyzedImages,
      pending: pendingImages
    }
  });
}
