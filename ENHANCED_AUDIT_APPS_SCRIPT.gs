/*******************************************************
 * SHAHI DASHBOARD + TRIP DATA WEB API
 * ENHANCED AUDIT LOGGING VERSION
 * Shows Field-Level Changes for CREATE & UPDATE Operations
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

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.JSON);
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

      case "getAuditLog":
        // Get audit logs with optional filters
        const recordId = e.parameter.recordId;
        const auditAction = e.parameter.action;
        const logs = getAuditLogs({ 
          recordId: recordId, 
          action: auditAction,
          sheetName: e.parameter.sheetName 
        });
        return buildResponse({ auditLogs: formatAuditLogForDisplay(logs) });

      case "getRecordAuditTrail":
        // Get complete audit history for a specific record
        return buildResponse({ 
          auditTrail: getRecordAuditTrail(e.parameter.recordId, e.parameter.sheetName)
        });

      case "whoami":
        return buildResponse({
          userEmail: getUserEmail(),
          effectiveUser: Session.getEffectiveUser().getEmail(),
          activeUser: Session.getActiveUser().getEmail(),
          timestamp: new Date().toISOString()
        });

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
    const userEmail = body.userEmail || "Unknown User";
    
    Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Logger.log("📨 [POST] Action: " + body.action);
    Logger.log("📨 [POST] User: " + userEmail);
    Logger.log("📨 [POST] Sheet: " + body.sheet);
    if (body.action === "update") {
      Logger.log("📨 [POST] Update Data: " + JSON.stringify(body.updates).substring(0, 200));
    }
    Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    switch (body.action) {
      case "create":
        Logger.log("▶️ [CREATE] Starting create operation");
        const createResult = createRow(body.sheet, body.data, userEmail);
        Logger.log("✅ [CREATE] Completed: " + JSON.stringify(createResult));
        return buildResponse(createResult);

      case "update":
        Logger.log("▶️ [UPDATE] Starting update operation");
        Logger.log("▶️ [UPDATE] ID Column: " + body.idColumn);
        Logger.log("▶️ [UPDATE] ID Value: " + body.idValue);
        const updateResult = updateRow(body.sheet, body.idColumn, body.idValue, body.updates, userEmail);
        Logger.log("✅ [UPDATE] Completed: " + JSON.stringify(updateResult));
        return buildResponse(updateResult);

      case "delete":
        Logger.log("▶️ [DELETE] Starting delete operation");
        const deleteResult = deleteRow(body.sheet, body.idColumn, body.idValue, userEmail);
        Logger.log("✅ [DELETE] Completed: " + JSON.stringify(deleteResult));
        return buildResponse(deleteResult);

      default:
        Logger.log("❌ [ERROR] Invalid action: " + body.action);
        return buildResponse({ error: "Invalid POST action" });
    }

  } catch (err) {
    Logger.log("❌ [FATAL ERROR] " + err.message);
    Logger.log("❌ [FATAL ERROR] Stack: " + err.stack);
    return buildResponse({ error: err.message });
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

function normalizeKey(value) {
  return String(value == null ? "" : value).trim().toLowerCase();
}

function isSameRecordId(left, right) {
  // Compare both raw and normalized values to handle type/whitespace/case mismatches.
  if (left == right) return true;
  return normalizeKey(left) === normalizeKey(right);
}

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

  const values = sheet.getRange(startRow, 1, numRows, lastCol).getValues();

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
    Logger.log("Cache put skipped: " + err);
  }

  return result;
}

function getRowById(sheetName, idColumn, idValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (isSameRecordId(data[i][idIndex], idValue)) {
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
function createRow(sheetName, rowData, userEmail) {
  try {
    Logger.log("▶️ [CREATE] Starting create in sheet: " + sheetName);
    
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const row = headers.map(h => rowData[h] || "");

    // For TRIPS sheet, insert in correct position
    if (sheetName === SHEETS.TRIPS) {
      const data = sheet.getDataRange().getValues();
      const srIndex = headers.indexOf("SR Number");
      const dateIndex = headers.indexOf("Trip Creation Date");

      const newSR = rowData["SR Number"];
      const newDate = rowData["Trip Creation Date"];

      if (srIndex !== -1 && dateIndex !== -1 && newSR && newDate) {
        const newSRNum = parseInt(newSR) || 0;
        let insertRow = data.length + 1;

        for (let i = 1; i < data.length; i++) {
          const existingSR = parseInt(data[i][srIndex]) || 0;

          if (newSRNum < existingSR) {
            insertRow = i + 1;
            break;
          } else if (newSRNum === existingSR) {
            const existingDate = data[i][dateIndex];
            if (new Date(newDate) < new Date(existingDate)) {
              insertRow = i + 1;
              break;
            }
          }
        }

        sheet.insertRows(insertRow, 1);
        sheet.getRange(insertRow, 1, 1, headers.length).setValues([row]);
        Logger.log("▶️ [CREATE] Inserted at row: " + insertRow);
      } else {
        sheet.appendRow(row);
        Logger.log("▶️ [CREATE] Appended to end");
      }
    } else {
      sheet.appendRow(row);
      Logger.log("▶️ [CREATE] Appended to end");
    }

    // 🎯 ENHANCED: Log all fields created with their values
    const createDetails = {
      fieldsCreated: Object.keys(rowData).filter(k => rowData[k]),
      fieldValues: {},
      totalFields: 0
    };
    
    // Store field values for audit
    Object.keys(rowData).forEach(field => {
      if (rowData[field]) {
        createDetails.fieldValues[field] = rowData[field];
        createDetails.totalFields++;
      }
    });

    // Get record ID (first non-empty value)
    const recordId = Object.values(rowData)[0] || "";
    Logger.log("▶️ [CREATE] Record ID: " + recordId);
    Logger.log("▶️ [CREATE] Fields created: " + createDetails.totalFields);
    
    logAudit(userEmail, "CREATE", sheetName, JSON.stringify(createDetails), recordId);
    clearCache();
    return { success: true };
  } catch (err) {
    Logger.log("❌ [CREATE ERROR] " + err.message);
    Logger.log("❌ [CREATE ERROR] Stack: " + err.stack);
    throw err;
  }
}

/* -------- UPDATE -------- */
function updateRow(sheetName, idColumn, idValue, updates, userEmail) {
  try {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const targetRowNumber = Number(updates && updates.__rowNumber);

    let changesSummary = {};
    let rowNumber = null;
    let foundRow = false;

    Logger.log("🔍 [UPDATE] Starting update for: " + idValue + " by " + userEmail);
    Logger.log("🔍 [UPDATE] Target row number: " + targetRowNumber);

    if (targetRowNumber && targetRowNumber >= 2 && targetRowNumber <= data.length) {
      rowNumber = targetRowNumber;
      const rowData = data[targetRowNumber - 1];
      foundRow = true;
      
      Logger.log("🔍 [UPDATE] Using __rowNumber: " + targetRowNumber);
      
      // 🎯 TRACK EACH FIELD CHANGE: old value → new value
      Object.keys(updates).forEach(key => {
        if (key === "__rowNumber") return;
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          const oldValue = rowData[colIndex];
          const newValue = updates[key];
          
          if (String(oldValue) !== String(newValue)) {
            changesSummary[key] = {
              old: oldValue,
              new: newValue
            };
            Logger.log("🔍 [UPDATE] Change detected: " + key + " = " + oldValue + " → " + newValue);
          }
        }
      });

      // Apply updates
      Object.keys(updates).forEach(key => {
        if (key === "__rowNumber") return;
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(targetRowNumber, colIndex + 1).setValue(updates[key]);
        }
      });
    }

    // If rowNumber-based approach didn't find the row, search by ID
    if (!foundRow) {
      const idIndex = headers.indexOf(idColumn);
      if (idIndex === -1) throw new Error("ID column not found: " + idColumn);

      const normalizedRequestId = normalizeKey(idValue);
      Logger.log("🔍 [UPDATE] Searching by ID (normalized): " + normalizedRequestId);

      for (let i = 1; i < data.length; i++) {
        if (isSameRecordId(data[i][idIndex], idValue)) {
          rowNumber = i + 1;
          const rowData = data[i];
          foundRow = true;
          
          Logger.log("🔍 [UPDATE] Found row by ID at: " + rowNumber);
          
          // 🎯 TRACK EACH FIELD CHANGE
          Object.keys(updates).forEach(key => {
            if (key === "__rowNumber") return;
            const colIndex = headers.indexOf(key);
            if (colIndex !== -1) {
              const oldValue = rowData[colIndex];
              const newValue = updates[key];
              
              if (String(oldValue) !== String(newValue)) {
                changesSummary[key] = {
                  old: oldValue,
                  new: newValue
                };
                Logger.log("🔍 [UPDATE] Change detected: " + key + " = " + oldValue + " → " + newValue);
              }
            }
          });

          // Apply updates
          Object.keys(updates).forEach(key => {
            if (key === "__rowNumber") return;
            const colIndex = headers.indexOf(key);
            if (colIndex !== -1) {
              sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
            }
          });
          break;
        }
      }
    }

    if (!foundRow) {
      Logger.log("❌ [UPDATE] Row not found for: " + idValue);
      return { error: "Row not found" };
    }

    // Log with change details (ALWAYS log, even if no changes detected)
    const auditDetails = {
      entity: idValue,
      changes: changesSummary,
      fieldsChanged: Object.keys(changesSummary),
      totalFieldsChanged: Object.keys(changesSummary).length,
      rowUpdated: rowNumber,
      totalFieldsInUpdate: Object.keys(updates).length - 1 // exclude __rowNumber
    };
    
    Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Logger.log("🔔 [UPDATE] ABOUT TO CALL AUDIT LOG");
    Logger.log("   User Email: " + userEmail);
    Logger.log("   Action: UPDATE");
    Logger.log("   Sheet: " + sheetName);
    Logger.log("   Record ID: " + idValue);
    Logger.log("   Details Length: " + JSON.stringify(auditDetails).length);
    Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    Logger.log("✅ [UPDATE] About to log audit...");
    logAudit(userEmail, "UPDATE", sheetName, JSON.stringify(auditDetails), idValue);
    Logger.log("✅ [UPDATE] Audit logged successfully");
    
    clearCache();
    return { success: true, updatedRow: rowNumber };
  } catch (err) {
    Logger.log("❌ [UPDATE] Error: " + err.message);
    Logger.log("❌ [UPDATE] Stack: " + err.stack);
    throw err;
  }
}

/* -------- DELETE -------- */
function deleteRow(sheetName, idColumn, idValue, userEmail) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idColumn);

  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (isSameRecordId(data[i][idIndex], idValue)) {
      sheet.deleteRow(i + 1);
      logAudit(userEmail, "DELETE", sheetName, JSON.stringify({ deletedRecord: idValue }), idValue);
      clearCache();
      return { success: true };
    }
  }

  return { error: "Row not found" };
}

/* =====================================================
   AUDIT LOG FUNCTIONS
===================================================== */

/* =====================================================
   AUDIT LOG FUNCTIONS
===================================================== */

/**
 * Log to audit trail
 * @param {string} userEmail - User who made the change
 * @param {string} action - CREATE, UPDATE, DELETE
 * @param {string} sheetName - Which sheet was modified
 * @param {string} details - JSON string with change details
 * @param {string} recordId - ID of the record changed
 */
function logAudit(userEmail, action, sheetName, details, recordId) {
  Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Logger.log("📝 [AUDIT] STARTING AUDIT LOG");
  Logger.log("  Action: " + action);
  Logger.log("  User: " + userEmail);
  Logger.log("  Record ID: " + recordId);
  Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    // Validate inputs
    if (!userEmail) {
      userEmail = "Unknown User";
      Logger.log("⚠️ [AUDIT] No userEmail provided, using default");
    }
    
    if (!action) {
      Logger.log("❌ [AUDIT] Action is missing!");
      throw new Error("Action is required");
    }
    
    if (!sheetName) {
      Logger.log("❌ [AUDIT] Sheet name is missing!");
      throw new Error("Sheet name is required");
    }
    
    // Get audit sheet
    Logger.log("📋 [AUDIT] Looking for sheet: " + SHEETS.AUDIT_LOG);
    const auditSheet = getSheet(SHEETS.AUDIT_LOG);
    
    if (!auditSheet) {
      Logger.log("❌ [AUDIT] Audit log sheet not found!");
      throw new Error("Audit log sheet not found: " + SHEETS.AUDIT_LOG);
    }
    
    Logger.log("✅ [AUDIT] Found audit sheet");
    
    // Create timestamp
    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd/MM/yyyy HH:mm:ss"
    );
    Logger.log("⏰ [AUDIT] Timestamp: " + timestamp);
    
    // Build row
    const auditRow = [
      timestamp,
      userEmail,
      action,
      sheetName,
      recordId || "",
      details || ""
    ];
    
    Logger.log("📝 [AUDIT] Row to append: " + JSON.stringify(auditRow));
    Logger.log("📝 [AUDIT] Row length: " + auditRow.length + " columns");
    
    // Append row
    Logger.log("📝 [AUDIT] Appending to sheet...");
    const response = auditSheet.appendRow(auditRow);
    
    Logger.log("✅ [AUDIT] Row appended successfully!");
    Logger.log("✅ [AUDIT] Audit entry created:");
    Logger.log("   Action: " + action);
    Logger.log("   Record: " + recordId);
    Logger.log("   User: " + userEmail);
    Logger.log("   Time: " + timestamp);
    Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
  } catch (err) {
    Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Logger.log("❌ [AUDIT FATAL ERROR]");
    Logger.log("❌ Error Name: " + err.name);
    Logger.log("❌ Error Message: " + err.message);
    Logger.log("❌ Error Stack: " + err.stack);
    Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    // Don't throw - audit failure shouldn't stop the main operation
  }
}

/**
 * Retrieve audit logs with optional filters
 * @param {object} filterOptions - { recordId, action, sheetName, userEmail }
 * @returns {array} Array of audit log entries
 */
function getAuditLogs(filterOptions) {
  try {
    const auditSheet = getSheet(SHEETS.AUDIT_LOG);
    const data = auditSheet.getDataRange().getValues();
    
    if (data.length < 2) return [];
    
    const logs = [];
    
    for (let i = 1; i < data.length; i++) {
      const log = {
        timestamp: data[i][0],
        userEmail: data[i][1],
        action: data[i][2],
        sheetName: data[i][3],
        recordId: data[i][4],
        details: {}
      };
      
      try {
        log.details = JSON.parse(data[i][5] || "{}");
      } catch (err) {
        log.details = data[i][5];
      }
      
      // Apply filters
      if (filterOptions) {
        if (filterOptions.recordId && log.recordId !== filterOptions.recordId) continue;
        if (filterOptions.action && log.action !== filterOptions.action) continue;
        if (filterOptions.sheetName && log.sheetName !== filterOptions.sheetName) continue;
        if (filterOptions.userEmail && log.userEmail !== filterOptions.userEmail) continue;
      }
      
      logs.push(log);
    }
    
    return logs;
  } catch (err) {
    Logger.log("Error retrieving audit logs: " + err.message);
    return [];
  }
}

/**
 * Format audit logs for human-readable display
 * @param {array} logs - Array of audit log objects
 * @returns {array} Formatted display objects
 */
function formatAuditLogForDisplay(logs) {
  const formatted = [];
  
  logs.forEach((log, index) => {
    const entry = {
      "#": index + 1,
      "Timestamp": log.timestamp,
      "User": log.userEmail,
      "Action": log.action,
      "Sheet": log.sheetName,
      "Record ID": log.recordId
    };
    
    // Build readable summary
    if (log.action === "UPDATE" && log.details.changes) {
      const changes = log.details.changes;
      const changeSummaries = Object.keys(changes).map(field => 
        `${field}: "${changes[field].old}" → "${changes[field].new}"`
      );
      entry["What Changed"] = changeSummaries.join(" | \n");
      entry["Fields Modified"] = Object.keys(changes).length;
    } 
    else if (log.action === "CREATE" && log.details.fieldValues) {
      const fields = log.details.fieldValues;
      const fieldSummaries = Object.keys(fields).map(field => 
        `${field}: "${fields[field]}"`
      );
      entry["Fields Created"] = fieldSummaries.join(" | \n");
      entry["Total Fields"] = log.details.totalFields || 0;
    }
    else if (log.action === "DELETE") {
      entry["Action Details"] = "Record deleted";
    }
    
    formatted.push(entry);
  });
  
  return formatted;
}

/**
 * Get complete audit trail for a specific record
 * @param {string} recordId - Record ID to get history for
 * @param {string} sheetName - Sheet name
 * @returns {array} Formatted audit trail
 */
function getRecordAuditTrail(recordId, sheetName) {
  const logs = getAuditLogs({ recordId: recordId, sheetName: sheetName });
  return formatAuditLogForDisplay(logs);
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
    const contentType = e.postData ? e.postData.type : '';
    
    Logger.log("Content-Type: " + contentType);
    Logger.log("Has e.parameter: " + (e.parameter ? "Yes" : "No"));
    
    if (e.parameter && e.parameter.action) {
      Logger.log("Parsing URL-encoded form data...");
      
      const action = e.parameter.action;
      const sheet = e.parameter.sheet || SHEETS.TRIPS;
      const idColumn = e.parameter.idColumn || "Trip Id";
      const idValue = e.parameter.idValue || "";
      const userEmail = e.parameter.userEmail || "Unknown User";
      
      Logger.log("🔐 Extracted userEmail: " + userEmail);
      
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
        userEmail: userEmail,
        data: data,
        updates: updates
      };
    }
    
    if (e.postData && e.postData.contents && !e.parameter) {
      Logger.log("Parsing JSON POST data...");
      const body = JSON.parse(e.postData.contents);
      if (!body.userEmail) {
        body.userEmail = "Unknown User";
      }
      Logger.log("🔐 Extracted userEmail: " + body.userEmail);
      return body;
    }
    
    throw new Error("No valid request body found");
  } catch (err) {
    Logger.log("Error parsing body: " + err.message);
    throw new Error("Invalid request body: " + err.message);
  }
}

function buildResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getUserEmail() {
  try {
    let email = Session.getEffectiveUser().getEmail();
    if (!email || email === "") {
      email = Session.getActiveUser().getEmail();
    }
    Logger.log("Captured user email: " + email);
    return email || "Unknown User";
  } catch (err) {
    Logger.log("Error getting user email: " + err.message);
    return "Unknown User";
  }
}

function clearCache() {
  try {
    const cache = CacheService.getScriptCache();
    const possibleKeys = ["stockData"];
    
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

/* =====================================================
   STOCK DATA EXTRACTION (Source-wise from Dashboard)
===================================================== */

/**
 * Extract source-wise device data from the Dashboard sheet
 * HYBRID VERSION: Handles both vertical (A-B) and horizontal (C onwards) formats
 */
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
    Logger.log("Cache put skipped for stockData: " + err);
  }

  return stockData;
}

function listAllSheets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const sheetNames = sheets.map(sheet => sheet.getName());
    
    return {
      success: true,
      spreadsheetId: SPREADSHEET_ID,
      totalSheets: sheetNames.length,
      availableSheets: sheetNames,
      configuredSheets: SHEETS
    };
  } catch (err) {
    return {
      error: "Failed to list sheets: " + err.message
    };
  }
}

/* =====================================================
   TEST & DEBUG FUNCTIONS
===================================================== */

/**
 * Test function to verify audit logging works
 */
function testAuditLogging() {
  Logger.log("═════════════════════════════════════════════════════════════");
  Logger.log("🧪 [TEST] TESTING AUDIT LOGGING SYSTEM");
  Logger.log("═════════════════════════════════════════════════════════════");
  
  try {
    // Test 1: Verify AuditLog sheet exists
    Logger.log("📋 [TEST 1] Checking if AuditLog sheet exists...");
    const auditSheet = getSheet(SHEETS.AUDIT_LOG);
    if (!auditSheet) {
      Logger.log("❌ [TEST 1] AuditLog sheet NOT FOUND!");
      return { error: "AuditLog sheet not found" };
    }
    Logger.log("✅ [TEST 1] AuditLog sheet FOUND");
    Logger.log("   Name: " + auditSheet.getName());
    Logger.log("   Last row: " + auditSheet.getLastRow());
    
    // Test 2: Test creating an audit entry
    Logger.log("\n📝 [TEST 2] Testing audit log entry creation...");
    const testTimestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd/MM/yyyy HH:mm:ss"
    );
    const testRow = [
      testTimestamp,
      "test@email.com",
      "TEST",
      "Shahi Reverse Pickup/Trip Details",
      "TEST-001",
      '{"test": "This is a test entry"}'
    ];
    
    Logger.log("   Row to append: " + JSON.stringify(testRow));
    auditSheet.appendRow(testRow);
    Logger.log("✅ [TEST 2] Test entry appended successfully");
    Logger.log("   New last row: " + auditSheet.getLastRow());
    
    // Test 3: Verify the entry was created
    Logger.log("\n🔍 [TEST 3] Verifying test entry was created...");
    const updatedData = auditSheet.getDataRange().getValues();
    const lastRowData = updatedData[updatedData.length - 1];
    Logger.log("   Last row data: " + JSON.stringify(lastRowData));
    if (lastRowData[4] === "TEST-001") {
      Logger.log("✅ [TEST 3] Test entry verified - audit logging is working!");
    } else {
      Logger.log("⚠️ [TEST 3] Could not verify test entry");
    }
    
    // Test 4: Test logAudit function directly
    Logger.log("\n📝 [TEST 4] Testing logAudit function directly...");
    logAudit("debug@test.com", "UPDATE", "Shahi Reverse Pickup/Trip Details", '{"field":"test"}', "DEBUG-001");
    Logger.log("✅ [TEST 4] logAudit function executed");
    
    Logger.log("\n═════════════════════════════════════════════════════════════");
    Logger.log("✅ ALL TESTS COMPLETED - Check AuditLog sheet for entries");
    Logger.log("═════════════════════════════════════════════════════════════");
    
    return { 
      success: true, 
      message: "All tests passed. Check AuditLog sheet and Execution logs."
    };
    
  } catch (err) {
    Logger.log("═════════════════════════════════════════════════════════════");
    Logger.log("❌ TEST FAILED");
    Logger.log("   Error: " + err.message);
    Logger.log("   Stack: " + err.stack);
    Logger.log("═════════════════════════════════════════════════════════════");
    return { error: err.message };
  }
}

/**
 * Verify AuditLog sheet configuration
 */
function verifyAuditLogSheet() {
  Logger.log("🔍 [VERIFY] Checking AuditLog sheet configuration...\n");
  
  try {
    const auditSheet = getSheet(SHEETS.AUDIT_LOG);
    const headers = auditSheet.getRange(1, 1, 1, 6).getValues()[0];
    const lastRow = auditSheet.getLastRow();
    
    Logger.log("Sheet Name: " + auditSheet.getName());
    Logger.log("Total Rows: " + lastRow);
    Logger.log("Headers: " + JSON.stringify(headers));
    
    const expectedHeaders = ["Timestamp", "User Email", "Action", "Sheet Name", "Record ID", "Details"];
    let headersMatch = true;
    expectedHeaders.forEach((expected, idx) => {
      if (headers[idx] !== expected) {
        Logger.log("⚠️ Header mismatch at column " + (idx + 1) + ": expected '" + expected + "', got '" + headers[idx] + "'");
        headersMatch = false;
      }
    });
    
    if (headersMatch) {
      Logger.log("✅ All headers match!");
    }
    
    // Show last 5 entries
    Logger.log("\nLast 5 entries:");
    if (lastRow > 1) {
      const data = auditSheet.getRange(Math.max(2, lastRow - 4), 1, Math.min(5, lastRow - 1), 6).getValues();
      data.forEach((row, idx) => {
        Logger.log((lastRow - data.length + idx + 1) + ": " + row[2] + " | " + row[1] + " | " + row[4]);
      });
    }
    
    return { success: true };
  } catch (err) {
    Logger.log("❌ Verification failed: " + err.message);
    return { error: err.message };
  }
}
