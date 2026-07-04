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

## LINE 設定

Webhook URL:

```text
https://line-management-bot.vercel.app/api/line/webhook
```

每日 08:00 報表 API:

```text
GET https://line-management-bot.vercel.app/api/cron/daily-report
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

## Supabase

主要資料表：

- `line_group_messages`
- `line_tasks`
- `line_task_events`
- `store_settings`
- `store_staff`

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
