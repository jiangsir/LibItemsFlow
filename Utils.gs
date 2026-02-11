/**
 * LibItemsFlow - 工具函數
 * 提供 ID 生成、日期處理、物件操作等通用功能
 */

/**
 * 生成唯一 ID（時間戳 + 隨機數）
 * @param {string} prefix - ID 前綴（如 'ITEM', 'LOAN', 'LOG'）
 * @return {string} 唯一 ID
 */
function generateId_(prefix) {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 取得當前 UTC 時間戳（ISO 8601）
 * @return {string} ISO 格式時間戳，例如 "2026-02-11T10:15:30Z"
 */
function getUtcTimestamp_() {
  return new Date().toISOString();
}

/**
 * 取得當前日期（ISO 格式）
 * @return {string} ISO 格式日期，例如 "2026-02-11"
 */
function getIsoDate_() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 驗證日期格式（YYYY-MM-DD）
 * @param {string} dateStr - 日期字串
 * @return {boolean} 是否為有效日期格式
 */
function isValidIsoDate_(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * 比較兩個日期（YYYY-MM-DD）
 * @param {string} date1 - 第一個日期
 * @param {string} date2 - 第二個日期
 * @return {number} -1: date1 < date2, 0: 相等, 1: date1 > date2
 */
function compareDates_(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * 驗證列舉值
 * @param {string} value - 要驗證的值
 * @param {Array<string>} validValues - 有效值列表
 * @return {boolean} 是否為有效值
 */
function isValidEnum_(value, validValues) {
  return validValues.includes(value);
}

/**
 * 清理物件（移除 undefined/null 值）
 * @param {Object} obj - 要清理的物件
 * @return {Object} 清理後的物件
 */
function cleanObject_(obj) {
  const cleaned = {};
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

/**
 * 將物件陣列轉換為工作表資料（二維陣列）
 * @param {Array<Object>} objects - 物件陣列
 * @param {Array<string>} headers - 欄位標題
 * @return {Array<Array>} 二維陣列
 */
function objectsToRows_(objects, headers) {
  return objects.map(obj => headers.map(header => obj[header] || ''));
}

/**
 * 將工作表資料（二維陣列）轉換為物件陣列
 * @param {Array<Array>} rows - 二維陣列（含標題行）
 * @return {Array<Object>} 物件陣列
 */
function rowsToObjects_(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}
