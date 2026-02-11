## clasp 快速指令

### 上傳
clasp push
### 佈署
手動管理佈署，建立新版本，不更動 URL
URL: https://script.google.com/macros/s/AKfycbzVvH7KXNQ__H5oLpBthyYTu88m7tvtRacdx7k_LFZ2mDW-i93Q-1hC32aQmNtVuFjW/exec
### 執行測試
python scripts\run_mvp_tests.py --verbose



# CLASP 設定與發版 SOP

本文件以目前專案可用流程為準。

## 目前 Web App URL

`https://script.google.com/macros/s/AKfycbzVvH7KXNQ__H5oLpBthyYTu88m7tvtRacdx7k_LFZ2mDW-i93Q-1hC32aQmNtVuFjW/exec`


## 一次性設定

```powershell
npm install -g @google/clasp
clasp login
clasp open
```

## 建議發版流程（安全）

1. 上傳程式碼：

```powershell
clasp push
```

2. 建立新版本：

```powershell
clasp version "本次變更說明"
```

3. 到 Apps Script UI 更新既有部署：
- 開啟 Apps Script 編輯器
- `Deploy` -> `Manage deployments`
- 編輯既有的 **Web app**
- 將版本切到剛建立的新版本
- 按 `Deploy`

4. 執行 API 測試：

```powershell
python scripts\run_mvp_tests.py --verbose
```

## 為什麼用這套流程

在此專案中，直接使用 `clasp deploy -i ...` 更新部署，可能造成部署型態或入口異常。
為了維持同一個 `/exec` URL 與穩定行為，建議：
- CLASP 只負責 `push` + `version`
- Web App 版本切換在 UI 進行

## 常用指令

只測健康檢查：

```powershell
python scripts\run_mvp_tests.py --only-health --verbose
```

臨時指定其他 URL：

```powershell
python scripts\run_mvp_tests.py --base-url "https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec" --verbose
```
