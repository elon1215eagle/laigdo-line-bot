import { buildDailyReport, getSupabase, pushToLine } from "../lib/reporting.js";

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured" });
  }

  const result = await buildDailyReport({ supabase });
  const pushResult = await pushToLine(result.report);

  return res.status(200).json({
    ok: true,
    ...result,
    ...pushResult
  });
}
