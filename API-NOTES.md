# API 設計注意事項

## 🔴 重要：路由參數限制

### 問題描述
在 Google Workspace 教育版環境下，Apps Script Web App 對路徑參數有限制：

```
✅ 可以訪問：https://script.google.com/macros/s/{ID}/exec
❌ 被封鎖：  https://script.google.com/macros/s/{ID}/exec/health
```

### 原因
- Google Workspace 教育版的組織政策可能限制帶路徑參數的 URL
- 管理控制台中沒有直接的 Apps Script 設定選項
- 基礎 URL 可以訪問，但加上路徑後會被重定向到登入頁面

### 解決方案
**使用查詢參數代替路徑參數**

```javascript
// ✅ 正確做法
function handleRequest_(method, e) {
  const query = (e && e.parameter) || {};
  const action = query.action || query.a; // 支援完整名稱和簡寫
  let route = action ? `/${action}` : normalizeRoute_(e.pathInfo);
  // ...
}
```

### API 端點範例

| 功能 | 錯誤方式 | 正確方式 |
|------|---------|---------|
| 健康檢查 | `/exec/health` | `/exec?action=health` |
| 取得設備 | `/exec/items` | `/exec?action=items` |
| 借出設備 | `POST /exec/loans` | `POST /exec?action=loans` |
| 歸還設備 | `POST /exec/returns` | `POST /exec?action=returns` |

### 測試方法

```bash
# 健康檢查
curl "https://script.google.com/macros/s/{ID}/exec?action=health"

# 或使用簡寫
curl "https://script.google.com/macros/s/{ID}/exec?a=health"

# POST 請求
curl -X POST "https://script.google.com/macros/s/{ID}/exec?action=items" \
  -H "Content-Type: application/json" \
  -d '{"name":"筆電","category":"電腦設備"}'
```

### 相容性設計
程式碼同時支援兩種方式，確保在不同環境下都能運作：
- 查詢參數（`?action=xxx`）- 主要方式，保證可用
- 路徑參數（`/xxx`）- 備選方式，如果環境允許

## 📝 經驗教訓

1. **開發環境與生產環境差異**
   - 開發者個人帳號可能沒有限制
   - 組織帳號（教育版/企業版）可能有額外限制

2. **測試方法**
   - 使用 `curl` 測試無認證訪問
   - 使用瀏覽器無痕模式測試
   - 確保在目標環境（組織帳號）中測試

3. **文件記錄**
   - 在 SDD.md 的技術架構中明確規範
   - 在 MVP.md 的 API 設計中提醒
   - 避免未來重複踩坑

## 🔗 相關文件

- [SDD.md](./SDD.md) - 第 0.1 節：API 路由設計規範
- [MVP.md](./MVP.md) - Day 2-3：GAS 後端骨架注意事項
- [App.gs](./App.gs) - 實際實作範例

---

**最後更新：** 2026-02-11  
**問題根源：** Google Workspace 教育版組織政策  
**解決狀態：** ✅ 已解決（使用查詢參數）
