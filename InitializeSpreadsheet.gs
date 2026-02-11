/**
 * LibItemsFlow - 初始化資料表
 * 建立 Items / Loans / Logs / Users 工作表與欄位標題（若不存在）。
 * 可在 Spreadsheet UI 自訂選單呼叫。
 */

const LIB_CONFIG = {
  sheets: {
    Items: [
      "ItemID",
      "Name",
      "Category",
      "AssetTag",
      "Status",
      "Location",
      "Note",
      "CreatedAt",
      "UpdatedAt",
    ],
    Loans: [
      "LoanID",
      "ItemID",
      "BorrowerName",
      "BorrowerUnit",
      "BorrowerContact",
      "LoanDate",
      "DueDate",
      "ReturnDate",
      "Status",
      "Note",
      "CreatedAt",
      "UpdatedAt",
    ],
    Logs: [
      "LogID",
      "Action",
      "Actor",
      "TargetID",
      "Timestamp",
      "Meta",
    ],
    Users: [
      "UserID",
      "Email",
      "Name",
      "Role",
      "Status",
      "CreatedAt",
      "UpdatedAt",
    ],
  },
  enums: {
    ItemsStatus: ["AVAILABLE", "CHECKED_OUT", "MAINTENANCE", "RETIRED"],
    LoansStatus: ["ACTIVE", "RETURNED", "OVERDUE"],
    UsersRole: ["ADMIN", "STAFF"],
    UsersStatus: ["ACTIVE", "DISABLED"],
    LogsAction: [
      "ITEM_CREATE",
      "ITEM_UPDATE",
      "LOAN_CREATE",
      "LOAN_RETURN",
      "STATUS_CHANGE",
    ],
  },
  defaultAdmin: {
    enabled: true,
    email: "555@tea.nknush.kh.edu.tw", // 若要自動建立管理員，填入 Gmail
    name: "Admin555",
    role: "ADMIN",
    status: "ACTIVE",
  },
  seedLogs: {
    enabled: true,
    action: "STATUS_CHANGE",
    actor: "system",
    meta: "{\"message\":\"Initialized sheets\"}",
  },
};

/**
 * Spreadsheet 開啟時建立自訂選單
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("LibItemsFlow")
    .addItem("初始化資料表", "initializeLibrarySheets")
    .addToUi();
}

/**
 * 初始化工作表與欄位標題（若不存在）
 */
function initializeLibrarySheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = Object.keys(LIB_CONFIG.sheets);

  sheetNames.forEach((sheetName) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    const headers = LIB_CONFIG.sheets[sheetName];
    const existingHeaderRange = sheet.getRange(1, 1, 1, headers.length);
    const existingHeaders = existingHeaderRange.getValues()[0];

    const needHeaderUpdate = !existingHeaders.some((cell) => cell && String(cell).trim() !== "");
    if (needHeaderUpdate) {
      existingHeaderRange.setValues([headers]);
    }
  });

  applyEnumValidations_(ss);
  maybeCreateDefaultAdmin();
  maybeSeedInitialLogs_();
  SpreadsheetApp.getUi().alert("初始化完成：工作表與欄位已就緒。");
}

/**
 * 可選：新增預設管理員
 * 只有當 Users 表為空且 defaultAdmin.email 有填寫時才會建立
 */
function maybeCreateDefaultAdmin() {
  const config = LIB_CONFIG.defaultAdmin;
  if (!config.enabled || !config.email) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  if (!userSheet) {
    return;
  }

  const lastRow = userSheet.getLastRow();
  if (lastRow > 1) {
    return;
  }

  const now = new Date().toISOString();
  const userId = Utilities.getUuid();

  userSheet.appendRow([
    userId,
    config.email,
    config.name,
    config.role,
    config.status,
    now,
    now,
  ]);
}

/**
 * 設定狀態欄位的資料驗證（下拉選單）
 */
function applyEnumValidations_(ss) {
  const itemsSheet = ss.getSheetByName("Items");
  const loansSheet = ss.getSheetByName("Loans");
  const usersSheet = ss.getSheetByName("Users");
  const logsSheet = ss.getSheetByName("Logs");

  if (itemsSheet) {
    applyValidationToColumn_(itemsSheet, "Status", LIB_CONFIG.enums.ItemsStatus);
  }
  if (loansSheet) {
    applyValidationToColumn_(loansSheet, "Status", LIB_CONFIG.enums.LoansStatus);
  }
  if (usersSheet) {
    applyValidationToColumn_(usersSheet, "Role", LIB_CONFIG.enums.UsersRole);
    applyValidationToColumn_(usersSheet, "Status", LIB_CONFIG.enums.UsersStatus);
  }
  if (logsSheet) {
    applyValidationToColumn_(logsSheet, "Action", LIB_CONFIG.enums.LogsAction);
  }
}

/**
 * 依欄位名稱套用資料驗證（從第 2 列起）
 */
function applyValidationToColumn_(sheet, headerName, allowedValues) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columnIndex = headers.indexOf(headerName) + 1;
  if (columnIndex <= 0) {
    return;
  }

  const maxRows = Math.max(sheet.getMaxRows(), 1000);
  const range = sheet.getRange(2, columnIndex, maxRows - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(allowedValues, true)
    .setAllowInvalid(false)
    .build();

  range.setDataValidation(rule);
}

/**
 * 初始化 Logs 預設資料（可選）
 */
function maybeSeedInitialLogs_() {
  const config = LIB_CONFIG.seedLogs;
  if (!config.enabled) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logsSheet = ss.getSheetByName("Logs");
  if (!logsSheet) {
    return;
  }

  const lastRow = logsSheet.getLastRow();
  if (lastRow > 1) {
    return;
  }

  const now = new Date().toISOString();
  const logId = Utilities.getUuid();
  logsSheet.appendRow([
    logId,
    config.action,
    config.actor,
    "",
    now,
    config.meta,
  ]);
}
