# clasp 部署指南

## clasp 快速指令

### 上傳
clasp push
### 查看現有版本
clasp deployments
### 建立新版本
clasp version "fix: returnDate trim"
### 佈署
clasp deploy -i AKfycbwRVTUmlUsEqzVQTtd52-qBcYTYJJndBgUcyZQ0EU1Qlz9-8-8zrQdy-0dV_5UDKi_7 -V 14 -d "2026-02-11 fix"
### 執行測試
python scripts\run_mvp_tests.py --verbose


## 一、安裝 clasp

```powershell
npm install -g @google/clasp
```

## 二、取得 Script ID

1. 開啟 [Apps Script 編輯器](https://script.google.com)
2. 開啟你的專案（LibItemsFlow）
3. 點左側 ⚙️ **專案設定**
4. 複製「指令碼 ID」（Script ID）
5. 編輯 `clasp.json`，將 Script ID 貼上

## 三、登入並連結專案

```powershell
# 登入 Google 帳號
clasp login

# 確認連結狀態
clasp open
```

## 四、推送檔案

```powershell
# 推送所有 src/*.gs 檔案到 Apps Script
clasp push

# 推送後開啟編輯器確認
clasp open
```

## 五、日常開發流程

```powershell
# 修改本地 src/*.gs 檔案
# ...

# 推送到雲端
clasp push

# 部署新版本（在 Apps Script 介面操作）
# 或用指令：clasp deploy --description "描述"
```

## 注意事項

- ✅ 只推送 `src/` 資料夾內的 .gs 檔案
- ✅ Markdown 文件不會被推送（由 .claspignore 控制）
- ✅ clasp.json 包含 Script ID，不可提交到公開 Git（已加入 .gitignore）
- ⚠️ 推送後需在 Apps Script 介面手動建立新部署版本

## 專案結構

```
LibItemsFlow/
├── src/                          # Apps Script 原始碼
│   ├── App.gs
│   ├── Utils.gs
│   ├── SheetRepository.gs
│   ├── Validator.gs
│   └── InitializeSpreadsheet.gs
├── clasp.json                    # clasp 設定（含 Script ID）
├── .claspignore                  # 推送忽略規則
├── MVP.md                        # 文件（不會推送）
├── SDD.md
├── API-NOTES.md
└── API-TEST.md
```
