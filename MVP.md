# MVP 規劃（LibItemsFlow）

> 目標：建立**可實際運作的借還流程**，先驗證核心價值，再逐步擴充。

## 1. MVP 範圍（第一版只做這些）

### 1.1 必要功能
1. 新增設備（借出時找不到可立即新增）
2. 借出設備
3. 歸還設備
4. 未歸還／逾期清單

### 1.2 暫不做（非 MVP）
- 使用者管理頁（先由 Sheet 手動管理）
- 通知（Email/LINE）
- CSV 匯出
- 全面權限管理 UI

---

## 2. MVP 驗收標準（完成條件）

### 2.1 借出流程
- 可成功借出一筆設備
- 設備狀態由 `AVAILABLE -> CHECKED_OUT`
- Loans 狀態為 `ACTIVE`
- 同設備不可重複借出（阻擋）

### 2.2 歸還流程
- 可成功歸還一筆借出中的設備
- 設備狀態由 `CHECKED_OUT -> AVAILABLE`
- Loans 狀態為 `RETURNED`

### 2.3 未歸還／逾期
- 可列出 `ACTIVE` 與 `OVERDUE` 的借出紀錄
- 若今天 > DueDate 且 ReturnDate 為空，Loans 狀態為 `OVERDUE`

### 2.4 資料一致性
- Items / Loans / Logs 皆有時間戳
- Logs 至少記錄：`ITEM_CREATE`, `LOAN_CREATE`, `LOAN_RETURN`

---

## 3. 建議排程（7~10 天）

### Day 1：定 MVP 範圍 + 建資料表
- 建立 Items / Loans / Logs / Users
- 手動放入 1 筆 ADMIN 帳號
- 確認欄位與 enum 依 SDD

**驗收**：四張表欄位齊全，能人工新增 1 筆測試資料。

### Day 2-3：GAS 後端骨架 + 核心 API
- 通用模組（response / sheet repo / validator / auth）
- API（⚠️ 使用查詢參數，見 SDD 0.1 節）：
  - `POST /exec?action=items` - 新增設備
  - `POST /exec?action=loans` - 借出設備
  - `POST /exec?action=returns` - 歸還設備
  - `GET /exec?action=loans&status=ACTIVE|OVERDUE` - 查詢借還紀錄
  - `GET /exec?action=health` - 健康檢查

**驗收**：能用 Postman 或 fetch 測通借出/歸還流程。

### Day 4-5：前端 MVP（能用即可）
- 借出表單
- 歸還表單
- 逾期清單
- API client 封裝

**驗收**：流程完整，可從 UI 完成借還。

### Day 6：商業規則補強
- 狀態轉移防呆
- DueDate >= LoanDate
- MAINTENANCE / RETIRED 禁借
- Logs 完整

**驗收**：錯誤情境能阻擋並回傳正確錯誤碼。

### Day 7：端到端測試 + 發布
- 測試案例至少 8 個
- 部署 GAS Web App
- 前端連接正式 API URL

**驗收**：真實借還一輪成功，逾期清單可查。

---

## 4. 開發提醒
- SDD.md 是唯一需求來源，修改需同步更新
- 每完成一個 API 就寫一個最小測試案例
- 先重流程再重 UI 美觀
