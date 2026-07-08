import { buildTransferDeliveryReport, pushTransferReport } from "../lib/transfer-reporting.js";

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const result = await buildTransferDeliveryReport({ reportType: "tomorrow" });
  const pushResult = await pushTransferReport(result.report);
  return res.status(200).json({
    ok: true,
    ...result,
    ...pushResult
  });
}
