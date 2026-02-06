# 軟體設計文件（SDD）
# LibItemsFlow 圖書館設備流通系統

## 0. 文件資訊（AI 可讀）
- 文件目的：本 SDD 供 AI 產生程式使用，請嚴格遵循結構、列舉、欄位與規則。
- 專案名稱：LibItemsFlow
- 目的：圖書館設備借還與未歸還追蹤
- 技術架構：
  - 前端：GitHub Pages（靜態網站）
  - 後端：Google Apps Script（GAS）Web App
  - 資料庫：Google Spreadsheet（多工作表）

## 1. 目標
- 管理設備借出/歸還行為的完整紀錄
- 追蹤未歸還設備並支援追回
- 支援「邊借邊建檔」：遇到未建檔設備時，可即時新增設備資料至試算表，供下次借用直接讀取

## 2. 使用者角色
- 管理員 (Admin)
  - 新增/編輯設備資料
  - 執行借出/歸還
  - 檢視借還記錄與未歸還清單
- 一般使用者 (Staff/Student)
  - 借出/歸還（或由管理員代操作）
  - 查詢設備基本資訊與可借狀態

## 3. 功能需求

### 3.1 設備管理
- 讀取設備清單（Spreadsheet）
- 設備查詢（名稱、類別、資產編號、狀態）
- 設備新增（即時）
  - 借出流程中，若輸入設備找不到，提供「立即新增」
  - 新增後回到借出流程並可直接使用新設備

### 3.2 借出流程
- 輸入借用人資訊（姓名、單位、聯絡方式）
- 選擇設備（可搜尋）
- 設定借出日期與預計歸還日期
- 檢查設備是否可借（未借出）
- 成功後寫入「借還紀錄表」
- 更新設備狀態為「借出中」

### 3.3 歸還流程
- 以借用人或設備查詢未歸還記錄
- 確認歸還日期
- 可填寫備註（損壞、遺失、需維修等）
- 更新借還紀錄狀態為「已歸還」
- 更新設備狀態為「可借」

### 3.4 逾期與追蹤
- 顯示未歸還清單（超過預計歸還日）
- 顯示借用人資訊與聯絡方式
- 支援管理員導出/列印

## 4. 非功能需求
- 介面簡單易用、操作步驟少
- 行動裝置可用
- 資料操作需可靠（防止重複借出或誤更新）
- 記錄可追溯（操作紀錄可留）

## 5. 資料模型（Spreadsheet）

### 5.0 全域資料規則
- 各表內的 ID 必須唯一（字串）。
- 時間戳：使用 UTC 的 ISO 8601，例如 `2026-01-28T10:15:30Z`（CreatedAt/UpdatedAt）。
- 日期：使用 ISO 格式 `YYYY-MM-DD`（LoanDate/DueDate/ReturnDate）。
- 狀態欄位必須符合列舉值，不可自由輸入。
- 空值/未知值以空字串 `""` 表示，不使用 null。

### 5.1 工作表：Items（設備資料表）
| 欄位 | 型態 | 說明 |
|---|---|---|
| ItemID | string | 唯一識別碼 |
| Name | string | 設備名稱 |
| Category | string | 類別 |
| AssetTag | string | 資產編號（可空） |
| Status | string | 狀態列舉（見下） |
| Location | string | 存放位置 |
| Note | string | 備註 |
| CreatedAt | datetime | 建檔時間 |
| UpdatedAt | datetime | 最後更新時間 |

#### Items 狀態列舉
- AVAILABLE
- CHECKED_OUT
- MAINTENANCE
- RETIRED

### 5.2 工作表：Loans（借還紀錄表）
| 欄位 | 型態 | 說明 |
|---|---|---|
| LoanID | string | 唯一識別碼 |
| ItemID | string | 對應設備 |
| BorrowerName | string | 借用人 |
| BorrowerUnit | string | 單位/班級 |
| BorrowerContact | string | 電話/Email |
| LoanDate | date | 借出日期 |
| DueDate | date | 預計歸還日 |
| ReturnDate | date | 實際歸還日 |
| Status | string | 狀態列舉（見下） |
| Note | string | 備註 |
| CreatedAt | datetime | 建檔時間 |
| UpdatedAt | datetime | 最後更新時間 |

#### Loans 狀態列舉
- ACTIVE
- RETURNED
- OVERDUE

### 5.3 工作表：Logs（操作紀錄）
| 欄位 | 型態 | 說明 |
|---|---|---|
| LogID | string | 唯一識別 |
| Action | string | 動作列舉（見下） |
| Actor | string | 操作者 |
| TargetID | string | ItemID 或 LoanID |
| Timestamp | datetime | 操作時間 |
| Meta | string | 額外資訊 JSON 字串（可選） |

#### Logs 動作列舉
- ITEM_CREATE
- ITEM_UPDATE
- LOAN_CREATE
- LOAN_RETURN
- STATUS_CHANGE

## 6. 驗證規則
- Items.Name: required, 1-100 chars
- Items.Category: required, 1-50 chars
- Items.Status: must be Items Status Enum
- Items.AssetTag: optional, 0-50 chars
- Loans.BorrowerName: required, 1-50 chars
- Loans.BorrowerContact: required, 1-100 chars
- Loans.LoanDate: required, ISO date
- Loans.DueDate: required, ISO date, must be >= LoanDate
- Loans.ReturnDate: optional, ISO date, must be >= LoanDate

## 7. 商業規則（狀態轉移）
- 當建立借出時：
  - Items.Status must be AVAILABLE.
  - Items.Status becomes CHECKED_OUT.
  - Loans.Status becomes ACTIVE.
- 當歸還時：
  - Loans.Status becomes RETURNED.
  - Items.Status becomes AVAILABLE (unless flagged for maintenance).
- 逾期判定：
  - If today > DueDate and ReturnDate is empty, Loans.Status becomes OVERDUE.
- 若 Items.Status 為 MAINTENANCE 或 RETIRED，則不可借出。

## 8. API 設計（GAS）

### 8.0 API 基本規範
- Base URL：GAS Web App 端點
- Content-Type：application/json
- 回應格式：
  - { "ok": boolean, "data": any, "error": { "code": string, "message": string } }

### 8.1 Items
- GET /items
  - Query: `query` (string, optional)
  - Response: Items 清單
- POST /items
  - Body: { Name, Category, AssetTag?, Location?, Note? }
  - Response: 建立後的 Item
  - Side effects: Logs ITEM_CREATE

POST /items 範例：
```json
{
  "Name": "投影機 A",
  "Category": "投影設備",
  "AssetTag": "",
  "Location": "館內倉庫A",
  "Note": ""
}
```

### 8.2 Loans
- POST /loans
  - Body: { ItemID, BorrowerName, BorrowerUnit?, BorrowerContact, LoanDate, DueDate, Note? }
  - Response: 建立後的 Loan
  - Side effects: Items.Status -> CHECKED_OUT, Logs LOAN_CREATE
- POST /returns
  - Body: { LoanID, ReturnDate, Note? }
  - Response: 更新後的 Loan
  - Side effects: Items.Status -> AVAILABLE, Logs LOAN_RETURN
- GET /loans
  - Query: `status` (ACTIVE|OVERDUE|RETURNED), optional
  - Response: Loans 清單

### 8.3 錯誤碼
- ITEM_NOT_FOUND
- ITEM_NOT_AVAILABLE
- LOAN_NOT_FOUND
- VALIDATION_FAILED
- INTERNAL_ERROR

## 8.4 試算表自訂選單（GAS）
- 需在 Spreadsheet UI 建立自訂選單：`初始化資料表`
- 選單內功能：建立必要工作表（Items/Loans/Logs）
- 若工作表已存在，保留原有工作表與資料，不重建、不覆蓋
- 建議操作時機：管理員首次部署後手動執行

## 9. UI 需求（GitHub Pages）
- Dashboard
  - 未歸還數量、逾期數量
- 借出頁
  - 設備搜尋 + 借用人資訊 + 借出確認
  - 找不到設備時提供「立即新增」
- 歸還頁
  - 查詢未歸還 → 確認歸還
- 設備管理頁
  - 列表 + 編輯/新增
- 逾期清單頁
  - 列出借用人與聯絡方式

## 10. 規則與限制
- 同一設備不可同時有多筆未歸還記錄
- 新增設備後必須立即可借
- 設備狀態為 MAINTENANCE/RETIRED 時不可借出

## 11. 錯誤處理
- 借出時設備已借出 → 顯示警告並阻止寫入
- 找不到設備 → 顯示新增入口
- GAS 回傳錯誤 → 顯示訊息並停止寫入

## 12. 可選擴充
- 簡易登入（管理員/一般使用者）
- Email 或 LINE 通知逾期
- CSV 匯出
