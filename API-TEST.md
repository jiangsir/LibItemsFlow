# API 測試指南

## 準備工作

1. **重新部署 Web App**（更新程式碼後必須重新部署）
   - Apps Script 編輯器 → 部署 → 管理部署
   - 編輯現有部署 → 新增版本
   - 說明：「新增核心 API」
   - 部署

2. **取得部署 URL**
   ```
   https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```

## API 測試範例

### 1. 健康檢查
```bash
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=health"
```

**預期回應：**
```json
{"ok":true,"data":{"status":"ok"}}
```

---

### 2. 新增設備
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_ID/exec?action=items" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "MacBook Pro",
    "Category": "筆記型電腦",
    "AssetTag": "NB-001",
    "Status": "AVAILABLE",
    "Location": "圖書館櫃台",
    "Note": "2024年採購"
  }'
```

**預期回應：**
```json
{
  "ok": true,
  "data": {
    "ItemID": "ITEM_1707609600000_1234",
    "Name": "MacBook Pro",
    "Category": "筆記型電腦",
    "AssetTag": "NB-001",
    "Status": "AVAILABLE",
    "Location": "圖書館櫃台",
    "Note": "2024年採購",
    "CreatedAt": "2026-02-11T10:00:00Z",
    "UpdatedAt": "2026-02-11T10:00:00Z"
  }
}
```

**測試驗證：**
- 打開 Spreadsheet Items 工作表
- 確認新增了一筆資料
- Logs 工作表應有 ITEM_CREATE 記錄

---

### 3. 查詢設備清單
```bash
# 全部設備
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=items"

# 只看可借設備
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=items&status=AVAILABLE"

# 搜尋
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=items&search=MacBook"
```

---

### 4. 借出設備
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_ID/exec?action=loans" \
  -H "Content-Type: application/json" \
  -d '{
    "ItemID": "ITEM_1707609600000_1234",
    "BorrowerName": "王小明",
    "BorrowerUnit": "高一甲班",
    "BorrowerContact": "0912345678",
    "LoanDate": "2026-02-11",
    "DueDate": "2026-02-25",
    "Note": "課堂報告使用"
  }'
```

**預期回應：**
```json
{
  "ok": true,
  "data": {
    "LoanID": "LOAN_1707609700000_5678",
    "ItemID": "ITEM_1707609600000_1234",
    "BorrowerName": "王小明",
    "BorrowerUnit": "高一甲班",
    "BorrowerContact": "0912345678",
    "LoanDate": "2026-02-11",
    "DueDate": "2026-02-25",
    "ReturnDate": "",
    "Status": "ACTIVE",
    "Note": "課堂報告使用",
    "CreatedAt": "2026-02-11T10:05:00Z",
    "UpdatedAt": "2026-02-11T10:05:00Z"
  }
}
```

**測試驗證：**
- Loans 工作表有新記錄，Status = ACTIVE
- Items 工作表中該設備 Status = CHECKED_OUT
- Logs 工作表有 LOAN_CREATE 記錄

**錯誤測試：**
```bash
# 重複借出同一設備（應該失敗）
curl -X POST "https://script.google.com/macros/s/YOUR_ID/exec?action=loans" \
  -H "Content-Type: application/json" \
  -d '{
    "ItemID": "ITEM_1707609600000_1234",
    "BorrowerName": "李小華",
    "BorrowerContact": "0987654321",
    "LoanDate": "2026-02-11",
    "DueDate": "2026-02-25"
  }'
```

**預期錯誤回應：**
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "ITEM_UNAVAILABLE",
    "message": "Item is not available. Current status: CHECKED_OUT"
  }
}
```

---

### 5. 查詢借還記錄
```bash
# 所有記錄
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=loans"

# 只看未歸還
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=loans&status=ACTIVE"

# 只看逾期
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=loans&status=OVERDUE"

# 搜尋借用人
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=loans&borrower=王小明"
```

---

### 6. 歸還設備
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_ID/exec?action=returns" \
  -H "Content-Type: application/json" \
  -d '{
    "LoanID": "LOAN_1707609700000_5678",
    "ReturnDate": "2026-02-20",
    "Note": "狀況良好"
  }'
```

**預期回應：**
```json
{
  "ok": true,
  "data": {
    "LoanID": "LOAN_1707609700000_5678",
    "ItemID": "ITEM_1707609600000_1234",
    "BorrowerName": "王小明",
    "ReturnDate": "2026-02-20",
    "Status": "RETURNED",
    "Note": "狀況良好",
    "UpdatedAt": "2026-02-11T10:10:00Z",
    ...
  }
}
```

**測試驗證：**
- Loans 工作表該記錄 Status = RETURNED，有 ReturnDate
- Items 工作表該設備 Status = AVAILABLE
- Logs 工作表有 LOAN_RETURN 記錄

---

## 完整測試流程

### 測試案例 1：正常借還流程
1. ✅ 新增設備
2. ✅ 查詢該設備（Status = AVAILABLE）
3. ✅ 借出設備
4. ✅ 查詢該設備（Status = CHECKED_OUT）
5. ✅ 查詢借還記錄（Status = ACTIVE）
6. ✅ 歸還設備
7. ✅ 查詢該設備（Status = AVAILABLE）
8. ✅ 查詢借還記錄（Status = RETURNED）

### 測試案例 2：錯誤處理
1. ✅ 借出不存在的設備（應失敗）
2. ✅ 借出已借出的設備（應失敗）
3. ✅ 歸還不存在的記錄（應失敗）
4. ✅ 重複歸還（應失敗）
5. ✅ 錯誤的日期格式（應失敗）
6. ✅ DueDate < LoanDate（應失敗）

### 測試案例 3：逾期處理
1. ✅ 新增設備
2. ✅ 借出設備（DueDate = 昨天的日期）
3. ✅ 查詢借還記錄
4. ✅ 確認 Status 自動變更為 OVERDUE

---

## 在 Apps Script 中測試

也可以在 Apps Script 中直接執行函數測試：

```javascript
function testCreateItem() {
  const result = handleCreateItem_({
    Name: "測試筆電",
    Category: "電腦",
    Status: "AVAILABLE",
    Location: "圖書館"
  });
  Logger.log(result);
}

function testCreateLoan() {
  // 先取得 ItemID
  const items = getAllRecords_('Items');
  const itemID = items[0].ItemID;
  
  const result = handleCreateLoan_({
    ItemID: itemID,
    BorrowerName: "測試用戶",
    BorrowerContact: "0912345678",
    LoanDate: "2026-02-11",
    DueDate: "2026-02-25"
  });
  Logger.log(result);
}
```

---

## 驗收標準

依據 MVP.md Day 2-3 驗收標準：

✅ 能用 curl 或 Postman 測通借出/歸還流程
✅ 設備狀態正確轉換（AVAILABLE ↔ CHECKED_OUT）
✅ 借還記錄狀態正確（ACTIVE/RETURNED/OVERDUE）
✅ 所有操作有日誌記錄
✅ 錯誤情境能正確阻擋並回傳錯誤訊息

完成上述測試後，Day 2-3 即完成！✅
