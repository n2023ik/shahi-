/*******************************************************
 * SHAHI DASHBOARD + TRIP DATA WEB API
 * CLEAN PRODUCTION VERSION WITH CORS FIX
 *******************************************************/

var SPREADSHEET_ID = "1CNF8nj-T9xTkzyb7JW02R7rwUg1MqxhAzPuM_2_7QQs";

var SHEETS = {
  DASHBOARD: "Shahi Dashboard",
  TRIPS: "Shahi Reverse Pickup/Trip Details",
  USERS: "AllowedUsers"
};

var DEFAULT_LIMIT = 100;
var MAX_LIMIT = 500;

var DATE_COLUMNS = [
  "Trip Creation Date",
  "Trip Completion Date",
  "Pick-up Raised On",
  "Actual Pick-up Date",
  "Delivered Date"
];

/* ===================================================== */
/* CRITICAL: Handle CORS Preflight Requests             */
/* ===================================================== */

function doOptions(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ===================================================== */

function doGet(e) {
  try {

    var action = e.parameter.action;

    if (action === "getTrips") {
      var limit = parseInt(e.parameter.limit) || DEFAULT_LIMIT;
      var offset = parseInt(e.parameter.offset) || 0;
      limit = Math.min(limit, MAX_LIMIT);
      return buildResponse(getAllRows(SHEETS.TRIPS, limit, offset));
    }

    if (action === "getDashboard") {
      return buildResponse(getAllRows(SHEETS.DASHBOARD));
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
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    // Parse body - support both URL-encoded and JSON
    var body = parseBody(e);

    if (body.action === "create") {
      return buildResponse(createRow(body.sheet, body.data));
    }

    if (body.action === "update") {
      return buildResponse(
        updateRow(body.sheet, body.idColumn, body.idValue, body.updates)
      );
    }

    if (body.action === "delete") {
      return buildResponse(
        deleteRow(body.sheet, body.idColumn, body.idValue)
      );
    }

    return buildResponse({ error: "Invalid POST action" });

  } catch (err) {
    Logger.log("POST Error: " + err.message);
    return buildResponse({ error: err.message });
  } finally {
    lock.releaseLock();
  }
}

/* ===================================================== */

function parseBody(e) {
  try {
    // Method 1: URL-encoded form data (from frontend)
    if (e.parameter && e.parameter.action) {
      Logger.log("Parsing URL-encoded form data...");
      
      var action = e.parameter.action;
      var sheet = e.parameter.sheet || SHEETS.TRIPS;
      var idColumn = e.parameter.idColumn || "Trip Id";
      var idValue = e.parameter.idValue || "";
      
      var data = {};
      if (e.parameter.data) {
        try {
          data = JSON.parse(e.parameter.data);
        } catch (err) {
          data = e.parameter.data;
        }
      }
      
      var updates = {};
      if (e.parameter.updates) {
        try {
          updates = JSON.parse(e.parameter.updates);
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
    
    // Method 2: JSON POST (fallback)
    if (e.postData && e.postData.contents) {
      Logger.log("Parsing JSON POST data...");
      return JSON.parse(e.postData.contents);
    }
    
    throw new Error("No valid request body found");
  } catch (err) {
    Logger.log("Parse error: " + err.message);
    throw new Error("Invalid request body: " + err.message);
  }
}

/* ===================================================== */

function getSheet(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function getAllRows(sheetName, limit, offset) {

  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();

  if (data.length < 2) return [];

  var headers = data[0];
  var result = [];

  for (var i = 1 + offset; i < data.length && result.length < limit; i++) {

    var obj = {};
    for (var j = 0; j < headers.length; j++) {

      var header = String(headers[j]).trim();
      var value = data[i][j];

      if (DATE_COLUMNS.indexOf(header) !== -1) {
        value = formatCellDate(value);
      }

      obj[header] = value;
    }

    result.push(obj);
  }

  return result;
}

function getRowById(sheetName, idColumn, idValue) {

  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idIndex = -1;

  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).trim() === String(idColumn).trim()) {
      idIndex = h;
      break;
    }
  }

  if (idIndex === -1) throw new Error("ID column not found");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === String(idValue).trim()) {

      var obj = {};
      for (var j = 0; j < headers.length; j++) {

        var header = String(headers[j]).trim();
        var value = data[i][j];

        if (DATE_COLUMNS.indexOf(header) !== -1) {
          value = formatCellDate(value);
        }

        obj[header] = value;
      }

      return obj;
    }
  }

  return { error: "Row not found" };
}

/* ================= CREATE ================= */

function createRow(sheetName, rowData) {

  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var row = [];

  for (var i = 0; i < headers.length; i++) {
    var header = String(headers[i]).trim();
    row.push(rowData[header] || "");
  }

  sheet.appendRow(row);

  return { success: true };
}

/* ================= UPDATE ================= */

function updateRow(sheetName, idColumn, idValue, updates) {

  var sheet = getSheet(sheetName);
  var range = sheet.getDataRange();
  var data = range.getValues();
  var headers = data[0];

  var idIndex = -1;

  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).trim() === String(idColumn).trim()) {
      idIndex = h;
      break;
    }
  }

  if (idIndex === -1) throw new Error("ID column not found");

  for (var i = 1; i < data.length; i++) {

    if (String(data[i][idIndex]).trim() === String(idValue).trim()) {

      // BUSINESS RULE
      if (updates["Trip Status"]) {

        var status = String(updates["Trip Status"]).toLowerCase().trim();

        if (status === "waiting to departure") {
          updates["Current Location"] = "Inside Source";
        }
      }

      for (var key in updates) {

        for (var col = 0; col < headers.length; col++) {

          if (String(headers[col]).trim() === String(key).trim()) {
            data[i][col] = updates[key];
            break;
          }
        }
      }

      range.setValues(data);
      return { success: true };
    }
  }

  return { error: "Row not found" };
}

/* ================= DELETE ================= */

function deleteRow(sheetName, idColumn, idValue) {

  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === String(idValue).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { error: "Row not found" };
}

/* ================= UTIL ================= */

function formatCellDate(value) {

  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );
  }

  return value;
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
