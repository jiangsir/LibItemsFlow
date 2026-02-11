/**
 * LibItemsFlow - GAS 後端骨架
 * 提供 doGet/doPost 路由與統一回應格式
 */

const API_CONFIG = {
  basePath: "",
  healthUrl: "https://script.google.com/macros/s/AKfycbwsLBJEgIaxY74A-72mzNVeu_PhI1-81j1rmvFindpoZsae6vHsHgtglHIduogLXWZl/exec", // 部署後填入 Web App URL（例如 https://script.google.com/macros/s/xxx/exec）
  
};

/**
 * GET 入口
 */
function doGet(e) {
  return handleRequest_("GET", e);
}

/**
 * POST 入口
 */
function doPost(e) {
  return handleRequest_("POST", e);
}

/**
 * 路由分派
 * 同時支援路徑參數 (/health) 和查詢參數 (?action=health)
 */
function handleRequest_(method, e) {
  try {
    // 優先使用查詢參數，其次使用路徑參數
    const query = (e && e.parameter) || {};
    const action = query.action || query.a; // 支援 action 或簡寫 a
    const pathInfo = e && e.pathInfo;

    if (method === "GET" && !action && (!pathInfo || String(pathInfo).trim() === "" || String(pathInfo).trim() === "/")) {
      return ok_({
        service: "LibItemsFlow API",
        message: "Use ?action=health|items|loans|returns",
      });
    }
    
    // 決定路由：查詢參數優先
    let route;
    if (action) {
      route = `/${action}`;
    } else {
      route = normalizeRoute_(pathInfo);
    }
    
    const body = parseJsonBody_(e);

    const routes = {
      "GET /health": () => ok_({ status: "ok" }),
      "GET /debug": () => ok_({ 
        route: route,
        pathInfo: pathInfo,
        action: action,
        method: method,
        query: query,
        timestamp: new Date().toISOString()
      }),
      // 設備管理
      "POST /items": () => handleCreateItem_(body),
      "GET /items": () => handleGetItems_(query),
      // 借還管理
      "POST /loans": () => handleCreateLoan_(body),
      "GET /loans": () => handleGetLoans_(query),
      "POST /returns": () => handleReturn_(body),
    };

    const key = `${method} ${route}`;
    if (!routes[key]) {
      return error_("NOT_FOUND", `Route not found: ${key}`, 404);
    }

    return routes[key]({ method, route, query, body, raw: e });
  } catch (error) {
    return error_("INTERNAL_ERROR", error && error.message ? error.message : String(error), 500);
  }
}

/**
 * 路由正規化
 */
function normalizeRoute_(pathInfo) {
  const path = pathInfo ? String(pathInfo).trim() : "";
  if (!path || path === "/") {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * 解析 JSON body
 */
function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("Invalid JSON body");
  }
}

/**
 * 成功回應
 */
function ok_(data) {
  return jsonResponse_({ ok: true, data });
}

/**
 * 錯誤回應
 */
function error_(code, message, statusCode) {
  return jsonResponse_(
    {
      ok: false,
      data: null,
      error: { code, message },
    },
    statusCode || 400
  );
}

/**
 * JSON 回應
 * 注意：Google Apps Script 無法設定自定義 HTTP 狀態碼，
 * 所有回應都是 HTTP 200，錯誤資訊在 JSON payload 中
 */
function jsonResponse_(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * 測試用：呼叫 /health 端點
 * 1) 部署 Web App 後，填入 API_CONFIG.healthUrl
 * 2) 在 Apps Script 執行 testHealthEndpoint()
 */
function testHealthEndpoint() {
  if (!API_CONFIG.healthUrl) {
    throw new Error("請先在 API_CONFIG.healthUrl 設定 Web App URL");
  }
  const url = `${API_CONFIG.healthUrl.replace(/\/$/, "")}?action=health`;
  const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
  Logger.log("Status: %s", response.getResponseCode());
  Logger.log("Body: %s", response.getContentText());
}

// ==================== API 處理函數 ====================

/**
 * 處理新增設備
 * POST /exec?action=items
 */
function handleCreateItem_(body) {
  // 驗證輸入
  const validation = validateItemCreate_(body);
  if (!validation.valid) {
    return error_("VALIDATION_ERROR", validation.errors.join('; '));
  }
  
  // 準備資料
  const now = getUtcTimestamp_();
  const item = {
    ItemID: generateId_('ITEM'),
    Name: body.Name,
    Category: body.Category,
    AssetTag: body.AssetTag || '',
    Status: body.Status || 'AVAILABLE',
    Location: body.Location || '',
    Note: body.Note || '',
    CreatedAt: now,
    UpdatedAt: now
  };
  
  // 寫入資料表
  createRecord_('Items', item);
  
  // 記錄日誌
  createLog_('ITEM_CREATE', 'system', item.ItemID, { name: item.Name });
  
  return ok_(item);
}

/**
 * 處理取得設備清單
 * GET /exec?action=items
 */
function handleGetItems_(query) {
  let items = getAllRecords_('Items');
  
  // 篩選條件
  if (query.status) {
    items = items.filter(item => item.Status === query.status);
  }
  
  if (query.category) {
    items = items.filter(item => item.Category === query.category);
  }
  
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    items = items.filter(item => 
      item.Name.toLowerCase().includes(searchTerm) ||
      item.AssetTag.toLowerCase().includes(searchTerm)
    );
  }
  
  return ok_(items);
}

/**
 * 處理借出設備
 * POST /exec?action=loans
 */
function handleCreateLoan_(body) {
  // 驗證輸入
  const validation = validateLoanCreate_(body);
  if (!validation.valid) {
    return error_("VALIDATION_ERROR", validation.errors.join('; '));
  }
  
  // 檢查設備是否存在且可借
  const item = findById_('Items', 'ItemID', body.ItemID);
  const availCheck = validateItemAvailable_(item);
  if (!availCheck.valid) {
    return error_("ITEM_UNAVAILABLE", availCheck.errors.join('; '));
  }
  
  // 建立借還記錄
  const now = getUtcTimestamp_();
  const loan = {
    LoanID: generateId_('LOAN'),
    ItemID: body.ItemID,
    BorrowerName: body.BorrowerName,
    BorrowerUnit: body.BorrowerUnit || '',
    BorrowerContact: body.BorrowerContact,
    LoanDate: body.LoanDate,
    DueDate: body.DueDate,
    ReturnDate: '',
    Status: 'ACTIVE',
    Note: body.Note || '',
    CreatedAt: now,
    UpdatedAt: now
  };
  
  createRecord_('Loans', loan);
  
  // 更新設備狀態為借出中
  updateRecord_('Items', 'ItemID', body.ItemID, {
    Status: 'CHECKED_OUT',
    UpdatedAt: now
  });
  
  // 記錄日誌
  createLog_('LOAN_CREATE', body.BorrowerName, loan.LoanID, {
    itemID: body.ItemID,
    itemName: item.Name
  });
  
  return ok_(loan);
}

/**
 * 處理取得借還記錄
 * GET /exec?action=loans
 */
function handleGetLoans_(query) {
  let loans = getAllRecords_('Loans');
  
  // 更新逾期狀態
  const today = getIsoDate_();
  loans.forEach(loan => {
    if (loan.Status === 'ACTIVE' && loan.ReturnDate === '' && compareDates_(today, loan.DueDate) > 0) {
      // 更新為 OVERDUE
      updateRecord_('Loans', 'LoanID', loan.LoanID, { Status: 'OVERDUE' });
      loan.Status = 'OVERDUE';
    }
  });
  
  // 篩選條件
  if (query.status) {
    loans = loans.filter(loan => loan.Status === query.status);
  }
  
  if (query.itemID) {
    loans = loans.filter(loan => loan.ItemID === query.itemID);
  }
  
  if (query.borrower) {
    const searchTerm = query.borrower.toLowerCase();
    loans = loans.filter(loan => loan.BorrowerName.toLowerCase().includes(searchTerm));
  }
  
  return ok_(loans);
}

/**
 * 處理歸還設備
 * POST /exec?action=returns
 */
function handleReturn_(body) {
  // 驗證輸入
  const validation = validateReturn_(body);
  if (!validation.valid) {
    return error_("VALIDATION_ERROR", validation.errors.join('; '));
  }
  
  // 檢查借還記錄是否存在且可歸還
  const loan = findById_('Loans', 'LoanID', body.LoanID);
  const returnCheck = validateLoanReturnable_(loan);
  if (!returnCheck.valid) {
    return error_("LOAN_NOT_RETURNABLE", returnCheck.errors.join('; '));
  }
  
  // 更新借還記錄
  const now = getUtcTimestamp_();
  const updatedLoan = updateRecord_('Loans', 'LoanID', body.LoanID, {
    ReturnDate: body.ReturnDate,
    Status: 'RETURNED',
    Note: body.Note || loan.Note,
    UpdatedAt: now
  });
  
  // 更新設備狀態為可借
  updateRecord_('Items', 'ItemID', loan.ItemID, {
    Status: 'AVAILABLE',
    UpdatedAt: now
  });
  
  // 記錄日誌
  createLog_('LOAN_RETURN', loan.BorrowerName, body.LoanID, {
    itemID: loan.ItemID,
    returnDate: body.ReturnDate
  });
  
  return ok_(updatedLoan);
}

/**
 * 建立日誌記錄
 */
function createLog_(action, actor, targetID, meta) {
  const log = {
    LogID: generateId_('LOG'),
    Action: action,
    Actor: actor,
    TargetID: targetID,
    Timestamp: getUtcTimestamp_(),
    Meta: JSON.stringify(meta || {})
  };
  createRecord_('Logs', log);
}
