# Spreadsheet 欄位模板（LibItemsFlow）

> 依 SDD.md 的資料模型整理，供建立 Google Spreadsheet 使用。

## 共通規則
- **ID 必須唯一（字串）**
- **時間戳**：UTC ISO 8601，例如 `2026-01-28T10:15:30Z`
- **日期**：`YYYY-MM-DD`
- **空值**：使用空字串 `""`，不使用 null
- **狀態欄位**：必須符合列舉值

---

## 1. Items（設備資料表）
| 欄位 | 型態 | 說明 |
|---|---|---|
| ItemID | string | 唯一識別碼 |
| Name | string | 設備名稱（必填，1-100） |
| Category | string | 類別（必填，1-50） |
| AssetTag | string | 資產編號（可空，0-50） |
| Status | string | 設備狀態（見列舉） |
| Location | string | 存放位置 |
| Note | string | 備註 |
| CreatedAt | datetime | 建檔時間 |
| UpdatedAt | datetime | 最後更新時間 |

### Items 狀態列舉
- AVAILABLE
- CHECKED_OUT
- MAINTENANCE
- RETIRED

---

## 2. Loans（借還紀錄表）
| 欄位 | 型態 | 說明 |
|---|---|---|
| LoanID | string | 唯一識別碼 |
| ItemID | string | 對應設備 |
| BorrowerName | string | 借用人（必填，1-50） |
| BorrowerUnit | string | 單位/班級 |
| BorrowerContact | string | 電話/Email（必填，1-100） |
| LoanDate | date | 借出日期（必填） |
| DueDate | date | 預計歸還日（必填） |
| ReturnDate | date | 實際歸還日（可空） |
| Status | string | 借還狀態（見列舉） |
| Note | string | 備註 |
| CreatedAt | datetime | 建檔時間 |
| UpdatedAt | datetime | 最後更新時間 |

### Loans 狀態列舉
- ACTIVE
- RETURNED
- OVERDUE

---

## 3. Logs（操作紀錄）
| 欄位 | 型態 | 說明 |
|---|---|---|
| LogID | string | 唯一識別 |
| Action | string | 動作列舉（見下） |
| Actor | string | 操作者（Users.Email） |
| TargetID | string | ItemID 或 LoanID |
| Timestamp | datetime | 操作時間 |
| Meta | string | 額外資訊 JSON 字串 |

### Logs 動作列舉
- ITEM_CREATE
- ITEM_UPDATE
- LOAN_CREATE
- LOAN_RETURN
- STATUS_CHANGE

---

## 4. Users（使用者身份表）
| 欄位 | 型態 | 說明 |
|---|---|---|
| UserID | string | 唯一識別碼 |
| Email | string | Gmail 帳號（必填） |
| Name | string | 使用者姓名（必填） |
| Role | string | 角色（見列舉） |
| Status | string | 狀態（見列舉） |
| CreatedAt | datetime | 建檔時間 |
| UpdatedAt | datetime | 最後更新時間 |

### Users 角色列舉
- ADMIN
- STAFF

### Users 狀態列舉
- ACTIVE
- DISABLED
