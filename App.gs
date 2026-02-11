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
  const url = `${API_CONFIG.healthUrl.replace(/\/$/, "")}/health`;
  const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
  Logger.log("Status: %s", response.getResponseCode());
  Logger.log("Body: %s", response.getContentText());
}
