/*******************************************************
 * SHAHI DASHBOARD + TRIP DATA WEB API
 * INTERNAL PRODUCTION VERSION (OPTIMIZED)
 *******************************************************/

const SPREADSHEET_ID = "1CNF8nj-T9xTkzyb7JW02R7rwUg1MqxhAzPuM_2_7QQs";

const SHEETS = {
  DASHBOARD: "Shahi Dashboard",
  TRIPS: "Shahi Reverse Pickup/Trip Details",
  USERS: "AllowedUsers"
};

const DEFAULT_LIMIT = 100;  // Reduced from 500 to prevent "Argument too large" error
const MAX_LIMIT = 500;      // Also reduced MAX_LIMIT for safety

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

function doOptions(e) {
  // Handle CORS preflight requests
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}

function doGet(e) {
  try {
    // authorize();

    const action = e.parameter.action;

    if (action === "getTrips") {
      const limit = parseInt(e.parameter.limit) || DEFAULT_LIMIT;
      const offset = parseInt(e.parameter.offset) || 0;
      return buildResponse(getAllRows(SHEETS.TRIPS, limit, offset));
    }

    if (action === "getDashboard") {
      return buildResponse(getAllRows(SHEETS.DASHBOARD));
    }

    if (action === "getStockData") {
      return buildResponse({ stockData: getStockData() });
    }

    if (action === "getRow") {
      return buildResponse(
        getRowById(
          e.parameter.sheet,
          e.parameter.idColumn,
          e.parameter.idValue
        )
      );
    }

    return buildResponse({ error: "Invalid GET action" });

  } catch (err) {
    return buildResponse({ error: err.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    // authorize();
    lock.waitLock(10000);

    const body = parseBody(e);
    const action = body.action;
    
    Logger.log("Processing POST action: " + action);

    if (action === "create") {
      const result = createRow(body.sheet, body.data);
      Logger.log("Create result: " + JSON.stringify(result));
      return buildResponse(result);
    }

    if (action === "update") {
      const result = updateRow(body.sheet, body.idColumn, body.idValue, body.updates);
      Logger.log("Update result: " + JSON.stringify(result));
      return buildResponse(result);
    }

    if (action === "delete") {
      const result = deleteRow(body.sheet, body.idColumn, body.idValue);
      Logger.log("Delete result: " + JSON.stringify(result));
      return buildResponse(result);
    }

    Logger.log("Invalid POST action: " + action);
    return buildResponse({ error: "Invalid POST action: " + action });

  } catch (err) {
    Logger.log("POST Error: " + err.message);
    Logger.log("Stack: " + err.stack);
    return buildResponse({ error: err.message, details: err.stack });
  } finally {
    lock.releaseLock();
  }
}

/* =====================================================
   AUTHORIZATION
===================================================== */

function authorize() {
  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error("Unauthorized");

  const sheet = getSheet(SHEETS.USERS);
  const emails = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .flat();

  if (!emails.includes(email)) {
    throw new Error("Access denied");
  }
}

/* =====================================================
   CORE FUNCTIONS
===================================================== */

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function getAllRows(sheetName, limit = DEFAULT_LIMIT, offset = 0) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) return [];

  limit = Math.min(limit, MAX_LIMIT);

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Find columns that have at least some data (not all empty)
  const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const nonEmptyColIndices = [];
  
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().trim() !== "") {
      // Check if this column has any data
      const hasData = dataRange.some(row => row[i] && row[i].toString().trim() !== "");
      if (hasData) {
        nonEmptyColIndices.push(i);
      }
    }
  }

  const startRow = 2 + offset;
  const endRow = Math.min(startRow + limit - 1, lastRow);
  const numRows = endRow - startRow + 1;

  if (numRows <= 0) return [];

  const values = sheet.getRange(startRow, 1, numRows, lastCol).getValues();

  return values
    .filter(row => {
      // Filter out completely empty rows
      return nonEmptyColIndices.some(i => row[i] && row[i].toString().trim() !== "");
    })
    .map(row => {
      const obj = {};
      // Only include non-empty columns
      nonEmptyColIndices.forEach(i => {
        const h = headers[i];
        let value = row[i];
        if (DATE_COLUMNS.includes(h)) {
          value = formatCellDate(value);
        }
        obj[h] = value;
      });
      return obj;
    });
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

/* -------- CREATE -------- */
function createRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = headers.map(h => rowData[h] || "");
  sheet.appendRow(row);

  return { success: true };
}

/* -------- UPDATE -------- */
function updateRow(sheetName, idColumn, idValue, updates) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {

      Object.keys(updates).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
        }
      });

      return { success: true };
    }
  }

  return { error: "Row not found" };
}

/* -------- DELETE -------- */
function deleteRow(sheetName, idColumn, idValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { error: "Row not found" };
}

/* =====================================================
   STOCK DATA EXTRACTION (Source-wise from Dashboard)
===================================================== */

/**
 * Extract source-wise device data from the Dashboard sheet
 * HYBRID VERSION: Handles both vertical (A-B) and horizontal (C onwards) formats
 */
function getStockData() {
  const sheet = getSheet(SHEETS.DASHBOARD);
  const data = sheet.getDataRange().getValues();
  
  const stockData = [];
  const foundLocations = new Set(); // Avoid duplicates
  
  const metricKeywords = [
    "shipment", "transit", "completed", "pickup", "confirmation",
    "rto", "delivered", "quantity", "lost", "offline", "repairable",
    "status", "trips", "pending", "shahi", "damage", "factory", "non-repairable",
    "source wise"
  ];
  
  // ===== PART 1: VERTICAL FORMAT (Columns A-B) =====
  Logger.log("🔍 Scanning Vertical Format (Columns A-B)...");
  
  for (let row = 0; row < data.length; row++) {
    const labelA = String(data[row][0] || "").trim();
    const valueB = data[row][1];
    
    if (!labelA) continue;
    
    const lowerA = labelA.toLowerCase();
    
    // Check if this is a source name (not a metric)
    const isMetric = metricKeywords.some(k => lowerA.includes(k)) ||
                    lowerA === "device in use" ||
                    lowerA === "device avilable" ||
                    lowerA === "count";
    
    // If valueB is "Count" and labelA is not a metric, labelA is a source name
    if (!isMetric && String(valueB).trim().toLowerCase() === "count") {
      const sourceName = labelA;
      let deviceInUse = 0;
      let deviceAvilable = 0;
      let foundAny = false;
      
      // Look ahead for device metrics
      for (let j = row + 1; j < Math.min(row + 30, data.length); j++) {
        const metricName = String(data[j][0] || "").trim().toLowerCase();
        const metricValue = data[j][1];
        
        if (metricName === "device in use") {
          deviceInUse = parseInt(metricValue) || 0;
          foundAny = true;
        } else if (metricName === "device avilable") {
          deviceAvilable = parseInt(metricValue) || 0;
          foundAny = true;
        }
        
        // Stop if we hit another source
        if (String(data[j][1]).trim().toLowerCase() === "count" && j > row + 1) {
          break;
        }
      }
      
      if (foundAny && !foundLocations.has(sourceName)) {
        stockData.push({
          "Location": sourceName,
          "device in use": deviceInUse,
          "device avilable": deviceAvilable
        });
        foundLocations.add(sourceName);
        Logger.log("✓ [Vertical] " + sourceName + " → In Use: " + deviceInUse + ", Available: " + deviceAvilable);
      }
    }
  }
  
  // ===== PART 2: HORIZONTAL GRID (Columns C onwards) =====
  Logger.log("🔍 Scanning Horizontal Grid (Columns C onwards)...");
  
  for (let row = 0; row < data.length; row++) {
    for (let col = 2; col < data[row].length; col++) { // Start from column C (index 2)
      const cellValue = String(data[row][col] || "").trim();
      
      if (!cellValue || cellValue.toLowerCase() !== "count") continue;
      
      // Found "Count" header - look for source name
      let sourceName = "";
      
      // Check one cell to the left
      if (col > 0) {
        const leftCell = String(data[row][col - 1] || "").trim();
        if (leftCell && leftCell.toLowerCase() !== "count") {
          sourceName = leftCell;
        }
      }
      
      // If not found, check one row above
      if (!sourceName && row > 0) {
        const aboveCell = String(data[row - 1][col] || "").trim();
        if (aboveCell && aboveCell.toLowerCase() !== "count") {
          sourceName = aboveCell;
        }
      }
      
      // Skip if it's a general metric
      const isGeneralMetric = metricKeywords.some(k => sourceName.toLowerCase().includes(k));
      
      if (sourceName && !isGeneralMetric && !foundLocations.has(sourceName)) {
        // Search for device metrics - metrics are in col-1 (left), values in col
        let deviceInUse = 0;
        let deviceAvilable = 0;
        let foundAny = false;
        
        for (let searchRow = row; searchRow < Math.min(row + 20, data.length); searchRow++) {
          const metricLabel = String(data[searchRow][col - 1] || "").trim().toLowerCase();
          const metricValue = data[searchRow][col];
          
          if (metricLabel === "device in use") {
            deviceInUse = parseInt(metricValue) || 0;
            foundAny = true;
          } else if (metricLabel === "device avilable") {
            deviceAvilable = parseInt(metricValue) || 0;
            foundAny = true;
          }
        }
        
        if (foundAny) {
          stockData.push({
            "Location": sourceName,
            "device in use": deviceInUse,
            "device avilable": deviceAvilable
          });
          foundLocations.add(sourceName);
          Logger.log("✓ [Horizontal] " + sourceName + " → In Use: " + deviceInUse + ", Available: " + deviceAvilable);
        }
      }
    }
  }
  
  Logger.log("========================================");
  Logger.log("Total locations found: " + stockData.length);
  Logger.log("========================================");
  
  return stockData;
}

/**
 * Enhanced test function - shows first 200 rows
 */
function testStockDataParsing() {
  const sheet = getSheet(SHEETS.DASHBOARD);
  const data = sheet.getDataRange().getValues();
  
  Logger.log("📊 SHEET STRUCTURE ANALYSIS");
  Logger.log("========================================");
  Logger.log("Total rows: " + data.length);
  Logger.log("Total columns: " + (data.length > 0 ? data[0].length : 0));
  Logger.log("========================================");
  Logger.log("");
  
  // Print first 200 rows to see complete structure
  Logger.log("📋 FIRST 200 ROWS:");
  Logger.log("========================================");
  for (let i = 0; i < Math.min(200, data.length); i++) {
    const cellA = String(data[i][0] || "").trim();
    const cellB = data[i][1];
    if (cellA || cellB) {
      Logger.log("Row " + (i+1).toString().padStart(3, ' ') + ": [" + cellA + "] = [" + cellB + "]");
    }
  }
  
  Logger.log("========================================");
  Logger.log("");
  Logger.log("🔍 NOW RUNNING getStockData()...");
  Logger.log("========================================");
  
  const result = getStockData();
  
  Logger.log("");
  Logger.log("========================================");
  Logger.log("📦 FINAL RESULT:");
  Logger.log("========================================");
  Logger.log(JSON.stringify(result, null, 2));
}

/* =====================================================
   UTILITIES
===================================================== */

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
  try {
    // Check content type to determine parsing method
    const contentType = e.postData ? e.postData.type : '';
    
    Logger.log("Content-Type: " + contentType);
    Logger.log("Has e.parameter: " + (e.parameter ? "Yes" : "No"));
    Logger.log("Has e.postData: " + (e.postData ? "Yes" : "No"));
    
    // Method 1: URL-encoded form data (application/x-www-form-urlencoded)
    // This comes through e.parameter
    if (e.parameter && e.parameter.action) {
      Logger.log("Parsing URL-encoded form data...");
      
      const action = e.parameter.action;
      const sheet = e.parameter.sheet || SHEETS.TRIPS;
      const idColumn = e.parameter.idColumn || "Trip Id";
      const idValue = e.parameter.idValue || "";
      
      // Parse data object if present
      let data = {};
      if (e.parameter.data) {
        try {
          data = typeof e.parameter.data === 'string' ? JSON.parse(e.parameter.data) : e.parameter.data;
        } catch (err) {
          Logger.log("Data is not JSON, using as-is: " + err.message);
          data = e.parameter.data;
        }
      }
      
      // Parse updates object if present
      let updates = {};
      if (e.parameter.updates) {
        try {
          updates = typeof e.parameter.updates === 'string' ? JSON.parse(e.parameter.updates) : e.parameter.updates;
        } catch (err) {
          Logger.log("Updates is not JSON, using as-is: " + err.message);
          updates = e.parameter.updates;
        }
      }
      
      const body = {
        action: action,
        sheet: sheet,
        idColumn: idColumn,
        idValue: idValue,
        data: data,
        updates: updates
      };
      
      Logger.log("Parsed form data body: " + JSON.stringify(body));
      return body;
    }
    
    // Method 2: JSON POST (application/json or text/plain)
    // Only try JSON parsing if we don't have e.parameter
    if (e.postData && e.postData.contents && !e.parameter) {
      Logger.log("Parsing JSON POST data...");
      const body = JSON.parse(e.postData.contents);
      Logger.log("Parsed JSON POST body: " + JSON.stringify(body));
      return body;
    }
    
    Logger.log("No valid request format detected");
    Logger.log("e.parameter: " + JSON.stringify(e.parameter));
    throw new Error("No valid request body found");
  } catch (err) {
    Logger.log("Error parsing body: " + err.message);
    Logger.log("Error stack: " + err.stack);
    throw new Error("Invalid request body: " + err.message);
  }
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}