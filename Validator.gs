/**
 * LibItemsFlow - 資料驗證模組
 * 提供各類資料的驗證規則
 */

/**
 * 驗證新增設備的資料
 * @param {Object} data - 設備資料
 * @return {Object} { valid: boolean, errors: Array<string> }
 */
function validateItemCreate_(data) {
  const errors = [];
  
  // 必填欄位
  if (!data.Name || data.Name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!data.Category || data.Category.trim() === '') {
    errors.push('Category is required');
  }
  
  if (!data.Status) {
    errors.push('Status is required');
  } else if (!isValidEnum_(data.Status, LIB_CONFIG.enums.ItemsStatus)) {
    errors.push(`Invalid Status: ${data.Status}. Valid values: ${LIB_CONFIG.enums.ItemsStatus.join(', ')}`);
  }
  
  // 位置欄位（選填，但如果提供則不能為空）
  if (data.Location !== undefined && data.Location.trim() === '') {
    errors.push('Location cannot be empty string');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 驗證借出資料
 * @param {Object} data - 借出資料
 * @return {Object} { valid: boolean, errors: Array<string> }
 */
function validateLoanCreate_(data) {
  const errors = [];
  
  // 必填欄位
  if (!data.ItemID || data.ItemID.trim() === '') {
    errors.push('ItemID is required');
  }
  
  if (!data.BorrowerName || data.BorrowerName.trim() === '') {
    errors.push('BorrowerName is required');
  }
  
  if (!data.BorrowerContact || data.BorrowerContact.trim() === '') {
    errors.push('BorrowerContact is required');
  }
  
  // 日期驗證
  if (!data.LoanDate) {
    errors.push('LoanDate is required');
  } else if (!isValidIsoDate_(data.LoanDate)) {
    errors.push('Invalid LoanDate format. Use YYYY-MM-DD');
  }
  
  if (!data.DueDate) {
    errors.push('DueDate is required');
  } else if (!isValidIsoDate_(data.DueDate)) {
    errors.push('Invalid DueDate format. Use YYYY-MM-DD');
  }
  
  // DueDate 必須 >= LoanDate
  if (data.LoanDate && data.DueDate && isValidIsoDate_(data.LoanDate) && isValidIsoDate_(data.DueDate)) {
    if (compareDates_(data.DueDate, data.LoanDate) < 0) {
      errors.push('DueDate must be >= LoanDate');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 驗證批次借出資料（同一借用人、一次多個設備）
 * @param {Object} data - 借出資料
 * @return {Object} { valid: boolean, errors: Array<string> }
 */
function validateLoanBatchCreate_(data) {
  const errors = [];

  if (!Array.isArray(data.ItemIDs) || data.ItemIDs.length === 0) {
    errors.push('ItemIDs is required and must be a non-empty array');
  } else {
    const normalized = data.ItemIDs
      .map(id => String(id || '').trim())
      .filter(id => id !== '');
    if (normalized.length !== data.ItemIDs.length) {
      errors.push('ItemIDs cannot contain empty values');
    }
    if (new Set(normalized).size !== normalized.length) {
      errors.push('ItemIDs cannot contain duplicates');
    }
  }

  if (!data.BorrowerName || data.BorrowerName.trim() === '') {
    errors.push('BorrowerName is required');
  }

  if (!data.BorrowerContact || data.BorrowerContact.trim() === '') {
    errors.push('BorrowerContact is required');
  }

  if (!data.LoanDate) {
    errors.push('LoanDate is required');
  } else if (!isValidIsoDate_(data.LoanDate)) {
    errors.push('Invalid LoanDate format. Use YYYY-MM-DD');
  }

  if (!data.DueDate) {
    errors.push('DueDate is required');
  } else if (!isValidIsoDate_(data.DueDate)) {
    errors.push('Invalid DueDate format. Use YYYY-MM-DD');
  }

  if (data.LoanDate && data.DueDate && isValidIsoDate_(data.LoanDate) && isValidIsoDate_(data.DueDate)) {
    if (compareDates_(data.DueDate, data.LoanDate) < 0) {
      errors.push('DueDate must be >= LoanDate');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 驗證歸還資料
 * @param {Object} data - 歸還資料
 * @return {Object} { valid: boolean, errors: Array<string> }
 */
function validateReturn_(data) {
  const errors = [];
  
  // 必填欄位
  if (!data.LoanID || data.LoanID.trim() === '') {
    errors.push('LoanID is required');
  }
  
  if (!data.ReturnDate) {
    errors.push('ReturnDate is required');
  } else if (!isValidIsoDate_(data.ReturnDate)) {
    errors.push('Invalid ReturnDate format. Use YYYY-MM-DD');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 驗證設備是否可借
 * @param {Object} item - 設備資料
 * @return {Object} { valid: boolean, errors: Array<string> }
 */
function validateItemAvailable_(item) {
  const errors = [];
  
  if (!item) {
    errors.push('Item not found');
    return { valid: false, errors: errors };
  }
  
  // 檢查狀態
  const unavailableStatuses = ['CHECKED_OUT', 'MAINTENANCE', 'RETIRED'];
  if (unavailableStatuses.includes(item.Status)) {
    errors.push(`Item is not available. Current status: ${item.Status}`);
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 驗證借還記錄是否可歸還
 * @param {Object} loan - 借還記錄
 * @return {Object} { valid: boolean, errors: Array<string> }
 */
function validateLoanReturnable_(loan) {
  const errors = [];
  
  if (!loan) {
    errors.push('Loan record not found');
    return { valid: false, errors: errors };
  }
  
  if (loan.Status === 'RETURNED') {
    errors.push('Loan already returned');
  }
  
  const returnDateText = loan.ReturnDate === undefined || loan.ReturnDate === null
    ? ''
    : String(loan.ReturnDate).trim();
  if (returnDateText !== '') {
    errors.push('Loan already has return date');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}
