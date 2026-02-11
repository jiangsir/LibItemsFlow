/**
 * LibItemsFlow - Spreadsheet 資料存取層
 * 封裝所有 Spreadsheet 操作，提供統一的 CRUD 介面
 */

/**
 * 取得工作表
 * @param {string} sheetName - 工作表名稱
 * @return {GoogleAppsScript.Spreadsheet.Sheet} 工作表物件
 */
function getSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  return sheet;
}

/**
 * 取得所有資料（含標題）
 * @param {string} sheetName - 工作表名稱
 * @return {Array<Array>} 二維陣列
 */
function getAllData_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return [];
  return sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
}

/**
 * 取得所有資料（物件陣列格式）
 * @param {string} sheetName - 工作表名稱
 * @return {Array<Object>} 物件陣列
 */
function getAllRecords_(sheetName) {
  const rows = getAllData_(sheetName);
  return rowsToObjects_(rows);
}

/**
 * 根據條件查詢資料
 * @param {string} sheetName - 工作表名稱
 * @param {Function} filterFn - 過濾函數 (record) => boolean
 * @return {Array<Object>} 符合條件的記錄
 */
function findRecords_(sheetName, filterFn) {
  const records = getAllRecords_(sheetName);
  return records.filter(filterFn);
}

/**
 * 根據 ID 查詢單筆資料
 * @param {string} sheetName - 工作表名稱
 * @param {string} idField - ID 欄位名稱
 * @param {string} idValue - ID 值
 * @return {Object|null} 找到的記錄或 null
 */
function findById_(sheetName, idField, idValue) {
  const records = findRecords_(sheetName, record => record[idField] === idValue);
  return records.length > 0 ? records[0] : null;
}

/**
 * 新增一筆資料
 * @param {string} sheetName - 工作表名稱
 * @param {Object} record - 要新增的記錄
 * @return {Object} 新增的記錄
 */
function createRecord_(sheetName, record) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => record[header] || '');
  sheet.appendRow(row);
  return record;
}

/**
 * 更新一筆資料（根據 ID）
 * @param {string} sheetName - 工作表名稱
 * @param {string} idField - ID 欄位名稱
 * @param {string} idValue - ID 值
 * @param {Object} updates - 要更新的欄位
 * @return {Object|null} 更新後的記錄或 null
 */
function updateRecord_(sheetName, idField, idValue, updates) {
  const sheet = getSheet_(sheetName);
  const rows = getAllData_(sheetName);
  if (rows.length < 2) return null;
  
  const headers = rows[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex === -1) return null;
  
  // 找到目標行
  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIndex] === idValue) {
      targetRowIndex = i;
      break;
    }
  }
  
  if (targetRowIndex === -1) return null;
  
  // 更新資料
  const updatedRow = [...rows[targetRowIndex]];
  headers.forEach((header, index) => {
    if (updates[header] !== undefined) {
      updatedRow[index] = updates[header];
    }
  });
  
  // 寫回工作表
  sheet.getRange(targetRowIndex + 1, 1, 1, headers.length).setValues([updatedRow]);
  
  // 轉換為物件返回
  const result = {};
  headers.forEach((header, index) => {
    result[header] = updatedRow[index];
  });
  return result;
}

/**
 * 刪除一筆資料（實際上是標記為已刪除，不真正刪除行）
 * @param {string} sheetName - 工作表名稱
 * @param {string} idField - ID 欄位名稱
 * @param {string} idValue - ID 值
 * @return {boolean} 是否成功
 */
function deleteRecord_(sheetName, idField, idValue) {
  // 暫不實作真正的刪除，可透過更新 Status 來標記
  return updateRecord_(sheetName, idField, idValue, { Status: 'DELETED' }) !== null;
}

/**
 * 計數符合條件的記錄
 * @param {string} sheetName - 工作表名稱
 * @param {Function} filterFn - 過濾函數
 * @return {number} 符合條件的記錄數
 */
function countRecords_(sheetName, filterFn) {
  return findRecords_(sheetName, filterFn).length;
}
