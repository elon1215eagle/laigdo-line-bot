# LAIGDO 小幫手 LINE 門市管理 Bot

用途：讓 `LAIGDO小幫手 @148zqfao` 加入各門市管理群後，接收每日群組訊息，分類問題，儲存到 Supabase，並於每日台灣時間 08:00 產出總部督導日報。

## 第一階段功能

1. 接收 LINE 群組文字、圖片、檔案等事件。
2. 驗證 LINE Webhook 簽章。
3. 依關鍵字分類問題：食安衛生、產品品質、庫存缺貨、設備異常、人員排班、客訴服務、營運流程。
4. 寫入 Supabase 資料表。
5. 每日 08:00 整理前 24 小時訊息並推送總部群。

## 必要環境變數

| 變數 | 用途 |
|---|---|
| `LINE_CHANNEL_SECRET` | LINE Developers 的 Channel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers 產生的 long-lived channel access token |
| `SUPABASE_URL` | Supabase 專案網址 |
| `SUPABASE_SERVICE_ROLE_KEY` | 後端寫入資料庫使用 |
| `LINE_REPORT_TO` | 總部日報接收群組 ID |
| `LINE_GROUP_NAMES` | 門市群組 ID 對名稱的 JSON 對照表 |
| `CRON_SECRET` | 保護每日報告 API 的密碼，可選 |

`LINE_REPORT_TO` 代表總部日報接收群。系統會把這個群排除在門市問題統計之外，避免總部群訊息混入門市日報。

`LINE_GROUP_NAMES` 範例：

```json
{
  "C664b7d66db0ef351a87a2a88acec921c": "義華 大昌管理群"
}
```

## Webhook URL

LINE Developers 的 Webhook URL：

```text
https://line-management-bot.vercel.app/api/line/webhook
```

## Supabase 建表

到 Supabase SQL Editor 執行：

```sql
-- supabase/schema.sql
```

## 每日回報 API

```text
GET https://line-management-bot.vercel.app/api/cron/daily-report
Authorization: Bearer 你的CRON_SECRET
```

正式排程設定為每天台灣時間 08:00 執行，整理 08:00 前 24 小時的門市群訊息。

## 嚴重度規則

| 嚴重度 | 定義 | 處理要求 |
|---|---|---|
| A | 食安、重大客訴、營業中斷、嚴重衛生問題 | 當日處理，總部立即追蹤 |
| B | 品質、缺貨、設備、人員、排班、流程問題 | 24 小時內回報改善 |
| C | 一般提醒、可改善事項 | 納入下次巡檢 |

## 注意

- Bot 只能讀取加入群組後的新訊息，不能讀取加入前的歷史紀錄。
- 不要把 Channel secret 或 Channel access token 貼到 LINE 群組。
- 正式啟用 Webhook 後，建議關閉 LINE 官方帳號自動回覆。
