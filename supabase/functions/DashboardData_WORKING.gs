/*******************************************************
 * SHAHI DASHBOARD + TRIP DATA WEB API
 * FULL PRODUCTION VERSION + DEBUG UTILITIES
 *******************************************************/

const SPREADSHEET_ID = "1-Dkt3gIgIkPFtS6skypq2XDf4WzUl0faomCm-RAV3Kk";

const SHEETS = {
  DASHBOARD: "Shahi Dashboard",
  TRIPS: "Shahi Reverse Pickup/Trip Details",
  USERS: "AllowedUsers",
  AUDIT_LOG: "AuditLog"
};

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;
const CACHE_TTL = 30; // seconds

const DATE_COLUMNS = [
  "Trip Creation Date",
  "Trip Completion Date",
  "Pick-up Raised On",
  "Actual Pick-up Date",
  "Delivered Date"
];

/* =====================================================
   ENTRY POINTS
===================================================== */

function doOptions() {
  return buildResponse({});
}

function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {

      case "getTrips":
        return buildResponse(
          getAllRows(
            SHEETS.TRIPS,
            parseInt(e.parameter.limit) || DEFAULT_LIMIT,
            parseInt(e.parameter.offset) || 0
          )
        );

      case "getDashboard":
        return buildResponse(getAllRows(SHEETS.DASHBOARD));

      case "getStockData":
        return buildResponse({ stockData: getStockDataFast() });

      case "getRow":
        return buildResponse(
          getRowById(
            e.parameter.sheet,
            e.parameter.idColumn,
            e.parameter.idValue
          )
        );

      default:
        return buildResponse({ error: "Invalid GET action" });
    }

  } catch (err) {
    return buildResponse({ error: err.message });
  }
}

function doPost(e) {

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const body = parseBody(e);

    switch (body.action) {

      case "create":
        return buildResponse(createRow(body.sheet, body.data));

      case "update":
        return buildResponse(
          updateRow(body.sheet, body.idColumn, body.idValue, body.updates)
        );

      case "delete":
        return buildResponse(
          deleteRow(body.sheet, body.idColumn, body.idValue)
        );

      default:
        return buildResponse({ error: "Invalid POST action" });
    }

  } catch (err) {
    return buildResponse({ error: err.message });
  } finally {
    lock.releaseLock();
  }
}

/* =====================================================
   AUTHORIZATION (OPTIONAL – ENABLE IN PRODUCTION)
===================================================== */

function authorize() {

  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error("Unauthorized");

  const sheet = getSheet(SHEETS.USERS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No allowed users configured");

  const emails = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .flat();

  if (!emails.includes(email)) {
    throw new Error("Access denied");
  }
}

/* =====================================================
   CORE UTILITIES
===================================================== */

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function getRowById(sheetName, idColumn, idValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      const obj = {};
      headers.forEach((h, j) => {
        obj[h] = DATE_COLUMNS.includes(h)
          ? formatCellDate(data[i][j])
          : data[i][j];
      });
      return obj;
    }
  }

  return { error: "Row not found" };
}

/* =====================================================
   SAFE PAGINATED READ WITH CACHE
===================================================== */

function getAllRows(sheetName, limit = DEFAULT_LIMIT, offset = 0) {

  const cacheKey = `${sheetName}_${limit}_${offset}`;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) return [];

  limit = Math.min(limit, MAX_LIMIT);

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const startRow = 2 + offset;
  const numRows = Math.min(limit, lastRow - offset - 1);

  if (numRows <= 0) return [];

  const values = sheet
    .getRange(startRow, 1, numRows, lastCol)
    .getValues();

  const result = values.map((row, index) => {
    const obj = {};
    headers.forEach((h, i) => {
      let value = row[i];
      if (DATE_COLUMNS.includes(h)) {
        value = formatCellDate(value);
      }
      obj[h] = value;
    });
    obj.__rowNumber = startRow + index;
    return obj;
  });

  try {
    cache.put(cacheKey, JSON.stringify(result), CACHE_TTL);
  } catch (err) {
    Logger.log("Cache put skipped for getAllRows (payload too large): " + err);
  }

  return result;
}

/* =====================================================
   STOCK DATA (VERTICAL + HORIZONTAL HYBRID)
===================================================== */

function getStockDataFast() {

  const cache = CacheService.getScriptCache();
  const cached = cache.get("stockData");

  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = getSheet(SHEETS.DASHBOARD);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 1) return [];

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  const stockData = [];
  const foundLocations = new Set();

  // Skip "Shahi Status" header row
  const headerKeywords = ["shahi status", "source wise"];
  
  // PART 1: VERTICAL FORMAT (Columns A-B)
  let currentSource = null;

  for (let i = 0; i < data.length; i++) {
    const label = String(data[i][0] || "").trim();
    const value = String(data[i][1] || "").trim();

    if (!label) continue;

    if (value.toLowerCase() === "count") {
      // Skip header rows
      if (headerKeywords.some(k => label.toLowerCase().includes(k))) {
        continue;
      }
      
      currentSource = label;
      if (!foundLocations.has(label)) {
        stockData.push({
          Location: currentSource,
          "device in use": 0,
          "device avilable": 0
        });
        foundLocations.add(label);
      }
      continue;
    }

    if (!currentSource) continue;

    const last = stockData[stockData.length - 1];

    if (label.toLowerCase() === "device in use") {
      last["device in use"] = parseInt(value) || 0;
    }

    if (label.toLowerCase() === "device avilable") {
      last["device avilable"] = parseInt(value) || 0;
    }
  }

  // PART 2: HORIZONTAL GRID (Columns C onwards)
  for (let row = 0; row < data.length; row++) {
    for (let col = 2; col < data[row].length; col++) {
      
      const cellValue = String(data[row][col] || "").trim();
      
      if (cellValue.toLowerCase() !== "count") continue;
      
      // Find source name in column to the LEFT of "Count"
      let sourceName = "";
      
      if (col > 0) {
        sourceName = String(data[row][col - 1] || "").trim();
      }
      
      // Skip headers and already found locations
      if (!sourceName || 
          foundLocations.has(sourceName) || 
          headerKeywords.some(k => sourceName.toLowerCase().includes(k))) {
        continue;
      }
      
      // Search for device metrics in LEFT column (col - 1), values in current column (col)
      let deviceInUse = 0;
      let deviceAvilable = 0;
      let foundAny = false;
      
      for (let searchRow = row + 1; searchRow < Math.min(row + 20, data.length); searchRow++) {
        const metricLabel = String(data[searchRow][col - 1] || "").trim().toLowerCase();
        const metricValue = data[searchRow][col];
        
        if (metricLabel === "device in use" && metricValue !== null) {
          deviceInUse = parseInt(metricValue) || 0;
          foundAny = true;
        } else if (metricLabel === "device avilable" && metricValue !== null) {
          deviceAvilable = parseInt(metricValue) || 0;
          foundAny = true;
        }
      }
      
      if (foundAny) {
        stockData.push({
          Location: sourceName,
          "device in use": deviceInUse,
          "device avilable": deviceAvilable
        });
        foundLocations.add(sourceName);
      }
    }
  }

  try {
    cache.put("stockData", JSON.stringify(stockData), CACHE_TTL);
  } catch (err) {
    Logger.log("Cache put skipped for stockData (payload too large): " + err);
  }

  return stockData;
}

/* =====================================================
   CRUD
===================================================== */

function createRow(sheetName, rowData) {
  const userEmail = getUserEmail();
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = headers.map(h => rowData[h] || "");

  // For TRIPS sheet, insert in correct position based on SR Number and Trip Creation Date
  if (sheetName === SHEETS.TRIPS) {
    const data = sheet.getDataRange().getValues();
    const srIndex = headers.indexOf("SR Number");
    const dateIndex = headers.indexOf("Trip Creation Date");

    // Only insert in sorted position if BOTH SR Number AND Trip Creation Date are defined
    const newSR = rowData["SR Number"];
    const newDate = rowData["Trip Creation Date"];

    if (srIndex !== -1 && dateIndex !== -1 && newSR && newDate) {
      const newSRNum = parseInt(newSR) || 0;

      let insertRow = data.length + 1; // Default: append at end

      // Find correct insertion point
      for (let i = 1; i < data.length; i++) {
        const existingSR = parseInt(data[i][srIndex]) || 0;

        if (newSRNum < existingSR) {
          insertRow = i + 1;
          break;
        } else if (newSRNum === existingSR) {
          // Same SR number: compare by date
          const existingDate = data[i][dateIndex];
          if (new Date(newDate) < new Date(existingDate)) {
            insertRow = i + 1;
            break;
          }
        }
      }

      sheet.insertRows(insertRow, 1);
      sheet.getRange(insertRow, 1, 1, headers.length).setValues([row]);
    } else {
      // If SR or Date not defined, just append at end
      sheet.appendRow(row);
    }
  } else {
    sheet.appendRow(row);
  }

  logAudit(userEmail, "CREATE", sheetName, "", JSON.stringify(rowData));
  clearCache();
  return { success: true };
}

function updateRow(sheetName, idColumn, idValue, updates) {
  const userEmail = getUserEmail();
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const targetRowNumber = Number(updates && updates.__rowNumber);

  if (targetRowNumber && targetRowNumber >= 2 && targetRowNumber <= data.length) {
    Object.keys(updates).forEach(key => {
      if (key === "__rowNumber") return;
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        sheet.getRange(targetRowNumber, colIndex + 1)
             .setValue(updates[key]);
      }
    });

    clearCache();
    return { success: true, updatedRow: targetRowNumber };
  }

  const idIndex = headers.indexOf(idColumn);

  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {

      Object.keys(updates).forEach(key => {
        if (key === "__rowNumber") return;
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1)
               .setValue(updates[key]);
        }
      });

      logAudit(userEmail, "UPDATE", sheetName, idValue, JSON.stringify(updates));
      clearCache();
      return { success: true };
    }
  }

  return { error: "Row not found" };
}

function deleteRow(sheetName, idColumn, idValue) {
  const userEmail = getUserEmail();
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idColumn);

  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      sheet.deleteRow(i + 1);
      logAudit(userEmail, "DELETE", sheetName, idValue, "");
      clearCache();
      return { success: true };
    }
  }

  return { error: "Row not found" };
}

/* =====================================================
   DEBUG UTILITIES (SAFE)
===================================================== */

function debugStockData() {
  const result = getStockDataFast();
  Logger.log("========================================");
  Logger.log("STOCK DATA RESULTS");
  Logger.log("========================================");
  Logger.log(JSON.stringify(result, null, 2));
  Logger.log("========================================");
  Logger.log("Total sources found: " + result.length);
}

function debugDashboardStructure() {
  const sheet = getSheet(SHEETS.DASHBOARD);
  const data = sheet.getDataRange().getValues();

  Logger.log("========================================");
  Logger.log("DASHBOARD STRUCTURE");
  Logger.log("========================================");
  Logger.log("Rows: " + data.length);
  Logger.log("Columns: " + data[0].length);
  Logger.log("========================================");

  for (let i = 0; i < Math.min(50, data.length); i++) {
    Logger.log("Row " + (i + 1).toString().padStart(3, ' ') + ": " + JSON.stringify(data[i]));
  }
}

/* =====================================================
   HELPERS
===================================================== */

function clearCache() {
  try {
    const cache = CacheService.getScriptCache();
    
    // Clear all known cache keys
    // Pattern: "SheetName_limit_offset" for getAllRows
    const possibleKeys = ["stockData"];
    
    // Add common trip data cache keys
    for (let limit of [100, 500, 2000]) {
      for (let offset of [0, 100, 500]) {
        possibleKeys.push(SHEETS.TRIPS + "_" + limit + "_" + offset);
        possibleKeys.push(SHEETS.DASHBOARD + "_" + limit + "_" + offset);
      }
    }
    
    cache.removeAll(possibleKeys);
    Logger.log("Cache cleared successfully");
  } catch (err) {
    Logger.log("Error clearing cache: " + err.message);
  }
}

function formatCellDate(value) {
  if (!value) return "";
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );
  }
  return value;
}

function parseBody(e) {
  // Method 1: URL-encoded form data (application/x-www-form-urlencoded)
  // Google Apps Script automatically parses this into e.parameter
  if (e.parameter && e.parameter.action) {
    Logger.log("Parsing URL-encoded form data from e.parameter...");
    
    const action = e.parameter.action;
    const sheet = e.parameter.sheet || "";
    const idColumn = e.parameter.idColumn || "";
    const idValue = e.parameter.idValue || "";
    
    // Parse nested objects (data, updates) if they're JSON strings
    let data = {};
    if (e.parameter.data) {
      try {
        data = typeof e.parameter.data === 'string' ? JSON.parse(e.parameter.data) : e.parameter.data;
      } catch (err) {
        data = e.parameter.data;
      }
    }
    
    let updates = {};
    if (e.parameter.updates) {
      try {
        updates = typeof e.parameter.updates === 'string' ? JSON.parse(e.parameter.updates) : e.parameter.updates;
      } catch (err) {
        updates = e.parameter.updates;
      }
    }
    
    return {
      action: action,
      sheet: sheet,
      idColumn: idColumn,
      idValue: idValue,
      data: data,
      updates: updates
    };
  }
  
  // Method 2: JSON POST (application/json)
  if (e.postData && e.postData.contents) {
    const contentType = e.postData.type;
    
    if (contentType === 'application/json' || contentType === 'text/plain') {
      try {
        return JSON.parse(e.postData.contents);
      } catch (err) {
        throw new Error("Invalid JSON in request body");
      }
    }
    
    // Fallback for other content types
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      throw new Error("Invalid request body format");
    }
  }
  
  throw new Error("No valid request body found");
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =====================================================
   USER UTILITIES
===================================================== */

function getUserEmail() {
  try {
    const email = Session.getActiveUser().getEmail();
    return email || "Unknown User";
  } catch (err) {
    return "Unknown User";
  }
}

/* =====================================================
   AUDIT LOGGING
===================================================== */

function logAudit(userEmail, action, sheetName, recordId, details) {
  try {
    const auditSheet = getSheet(SHEETS.AUDIT_LOG);
    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd/MM/yyyy HH:mm:ss"
    );

    auditSheet.appendRow([
      timestamp,           // AuditLogTimestamp
      userEmail,           // User Email
      action,              // Action
      sheetName,           // Sheet
      recordId,            // Record ID
      details              // Details
    ]);
  } catch (err) {
    Logger.log("Audit log error: " + err.message);
    // Don't throw - audit failure shouldn't stop the main operation
  }
}
