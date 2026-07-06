# LAIGDO LINE Management Bot

LAIGDO 小幫手用於收集各門市 LINE 管理群訊息，整理營運問題、任務追蹤、營收回報、收貨量與叫貨量資訊，並於每日 08:00 回報總部。

## 核心原則

1. 所有門市群訊息先收集、分類、存檔、追蹤。
2. 未經 Elon 明確指示，不主動在任何門市群發佈訊息。
3. 每日總部回報時間固定為 08:00。
4. 每日報表整理區間為 08:00 前 24 小時。
5. 圖片、影片、音訊、檔案會下載到 Supabase Storage，資料庫只存索引與路徑。
6. LINE 記事本與相簿內容無法由 Messaging API 主動讀取，需轉貼或轉傳到群組訊息流後才會被收集。

## 營運功能

- 接收 LINE 群組文字、圖片、影片、音訊與檔案。
- 依內容分類為一般訊息、現場回報、食安衛生、產品品質、即時營收、收貨量、門市調貨配送、叫貨量、庫存缺貨、設備異常、人員排班、客訴服務、營運流程。
- 自動建立需追蹤任務，保留未完成、已完成、需追蹤的前後脈絡。
- 每日 08:00 推送總部彙整，不對門市群自動發佈。
- 依門市設定檢核 14:00、19:00、打烊營收回報狀態。
- 圖片 OCR 若判斷為盤點表，會拆成結構化資料；門市食材庫存與促銷飲料庫存分開存放。
- 每日圖片 OCR 上限預設 100 張，超過後圖片照常存檔，但標記為待人工確認，不再送 OpenAI OCR。
- 每日匯報會列出圖片數、OCR 成功數、待人工確認數、Token 用量與 API 預估成本。
- 總部群可輸入「今日匯報」，系統會先詢問門市，可單選、多選或全部，再產出指定門市匯報。

## LINE 設定

Webhook URL:

```text
https://line-management-bot.vercel.app/api/line/webhook
```

每日 08:00 報表 API:

```text
GET https://line-management-bot.vercel.app/api/cron/daily-report
```

Vercel Cron 排程：

```text
0 0 * * *  # UTC 00:00 = 台灣時間 08:00
```

## 環境變數

| 變數 | 用途 |
|---|---|
| `LINE_CHANNEL_SECRET` | LINE Developers Channel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE long-lived channel access token |
| `SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 伺服器端寫入資料庫與 Storage |
| `LINE_REPORT_TO` | 總部回報群組 ID |
| `LINE_GROUP_NAMES` | LINE 群組 ID 對應群名 JSON |
| `CRON_SECRET` | 選用，保護每日報表 API |
| `LINE_ACK_ENABLED` | 預設不啟用；只有設為 `true` 才會在來源群組回覆確認 |
| `OPENAI_API_KEY` | 圖片 OCR 與現場辨識使用 |
| `OPENAI_VISION_MODEL` | 圖片辨識模型，預設 `gpt-4.1-mini` |
| `IMAGE_ANALYSIS_MAX_BYTES` | 單張圖片分析上限，預設 4MB |
| `ANALYZE_ADMIN_TOKEN` | 補跑既有圖片 OCR 的管理 token |
| `OCR_DAILY_IMAGE_LIMIT` | 每日 OCR 圖片上限，預設 100 |
| `OPENAI_INPUT_COST_PER_1M` | 成本估算用，預設 0.40 美元 / 100萬 input tokens |
| `OPENAI_OUTPUT_COST_PER_1M` | 成本估算用，預設 1.60 美元 / 100萬 output tokens |

## Supabase

主要資料表：

- `line_group_messages`
- `line_tasks`
- `line_task_events`
- `line_report_requests`
- `store_settings`
- `store_staff`
- `store_inventory_records`
- `store_inventory_items`
- `beverage_inventory_records`
- `beverage_inventory_items`

庫存資料分流：

| 類型 | 資料表 | 使用情境 |
|---|---|---|
| 門市盤點庫存 | `store_inventory_records` / `store_inventory_items` | 雞肉、炸物、粉類、油品、常態食材與耗材 |
| 飲料促銷庫存 | `beverage_inventory_records` / `beverage_inventory_items` | 可樂、雪碧、零卡可樂等少數門市促銷飲料 |

`store_settings` 目前已匯入 `00AI人資.xlsx / 各店時間`：

- 鳳山五甲店
- 鳳山凱旋店
- 鳳山武廟店
- 鳳山中山店
- 鳳山南華店
- 前鎮隆興店
- 三民大昌店
- 三民義華店
- 三民鼎山店
- 屏東潮州店
- 屏東潮二店

目前已綁定 LINE 群組：

| 群組 | 門市 |
|---|---|
| 義華 大昌管理群 | 三民義華店、三民大昌店 |

## 發佈邊界

本系統預設只做總部彙整與內部任務追蹤。任何門市群公告、提醒、催辦、回覆，都必須由 Elon 明確下達指令後才能執行。

## GitHub / Vercel

GitHub repository:

```text
https://github.com/elon1215eagle/laigdo-line-bot
```

Production:

```text
https://line-management-bot.vercel.app
```
