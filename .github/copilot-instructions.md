# Copilot Instructions

本專案所有產出請優先使用繁體中文（台灣）。

## Commit 訊息語言

- 任何 commit message 一律使用繁體中文（台灣）。
- 禁止使用英文句子作為主訊息（技術名詞可保留英文，例如 API、GAS、GitHub Pages）。
- 若工具預設產生英文，請先轉寫為繁體中文再提交。

## Commit 訊息格式

- 採用 Conventional Commits：`<type>: <主旨>`
- `type` 僅限：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`
- 主旨建議 50 字內，清楚描述「做了什麼變更」。

範例：
- `feat: 新增批次借用流程與多設備清單送出`
- `fix: 修正 ItemID 搜尋不到設備的問題`
- `docs: 更新部署與 API 測試說明`

## Commit 主旨撰寫原則

- 使用動詞開頭，直接描述變更內容。
- 避免空泛字詞，例如「更新」、「調整」而不說明具體修改。
- 若變更跨多個模組，主旨聚焦最重要的使用者價值或風險修正。
