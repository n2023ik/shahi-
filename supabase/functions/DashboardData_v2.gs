/*******************************************************
 * SHAHI DASHBOARD + TRIP DATA WEB API
 * FULL PRODUCTION VERSION + DEBUG UTILITIES
 *******************************************************/

const SPREADSHEET_ID = "1CNF8nj-T9xTkzyb7JW02R7rwUg1MqxhAzPuM_2_7QQs";

const SHEETS = {
  DASHBOARD: "Shahi Dashboard",
  TRIPS: "Shahi Reverse Pickup/Trip Details",
  USERS: "AllowedUsers"
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

  const result = values.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let value = row[i];
      if (DATE_COLUMNS.includes(h)) {
        value = formatCellDate(value);
      }
      obj[h] = value;
    });
    return obj;
  });

  cache.put(cacheKey, JSON.stringify(result), CACHE_TTL);

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

  cache.put("stockData", JSON.stringify(stockData), CACHE_TTL);

  return stockData;
}

/* =====================================================
   CRUD
===================================================== */

function createRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = headers.map(h => rowData[h] || "");
  sheet.appendRow(row);

  clearCache();
  return { success: true };
}

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
          sheet.getRange(i + 1, colIndex + 1)
               .setValue(updates[key]);
        }
      });

      clearCache();
      return { success: true };
    }
  }

  return { error: "Row not found" };
}

function deleteRow(sheetName, idColumn, idValue) {

  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idColumn);

  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      sheet.deleteRow(i + 1);
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
  CacheService.getScriptCache().removeAll(["stockData"]);
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
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  throw new Error("Invalid request body");
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
