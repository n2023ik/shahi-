/*******************************************************
 * SHAHI DASHBOARD + TRIP DATA WEB API
 * FULL CRUD - PRODUCTION SAFE VERSION
 *******************************************************/

// ⚠️ IMPORTANT: Set your Google Sheet ID here
const SPREADSHEET_ID = "1CNF8nj-T9xTkzyb7JW02R7rwUg1MqxhAzPuM_2_7QQs";

const SHEETS = {
  DASHBOARD: "Shahi Dashboard",
  TRIPS: "Shahi Reverse Pickup/Trip Details",
  USERS: "AllowedUsers"
};

const DATE_COLUMNS = [
  "Trip Creation Date",
  "Trip Completion Date",
  "Pick-up Raised On",
  "Actual Pick-up Date",
  "Delivered Date"
];

function formatCellDate(value) {
  if (!value || value === "" || value === "NaN") return "";
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  if (typeof value === 'string') {
    const str = value.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return d + "/" + m + "/" + y;
    }
  }
  return value;
}

function doOptions() {
  return buildResponse({});
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === "getTrips") {
      return buildResponse(getAllRows(SHEETS.TRIPS));
    }
    if (action === "getDashboard") {
      return buildResponse(getAllRows(SHEETS.DASHBOARD));
    }
    if (action === "getRow") {
      return buildResponse(getRowById(
        e.parameter.sheet,
        e.parameter.idColumn,
        e.parameter.idValue
      ));
    }
    
    return buildResponse({ error: "Invalid GET action: " + action });
  } catch (err) {
    return buildResponse({ error: err.message, stack: err.stack });
  }
}

function doPost(e) {
  try {
    let body;
    
    if (e.parameter && e.parameter.action) {
      const dataStr = e.parameter.data || "{}";
      const updatesStr = e.parameter.updates || "{}";
      
      body = {
        action: e.parameter.action,
        sheet: e.parameter.sheet || SHEETS.TRIPS,
        idColumn: e.parameter.idColumn || "Trip Id",
        idValue: e.parameter.idValue,
        data: typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr,
        updates: typeof updatesStr === 'string' ? JSON.parse(updatesStr) : updatesStr
      };
    }
    else if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    else {
      return buildResponse({ error: "Could not parse request" });
    }
    
    const action = body.action;
    
    if (action === "create") {
      return buildResponse(createRow(body.sheet, body.data));
    }
    if (action === "update") {
      return buildResponse(updateRow(body.sheet, body.idColumn, body.idValue, body.updates));
    }
    if (action === "delete") {
      return buildResponse(deleteRow(body.sheet, body.idColumn, body.idValue));
    }
    
    return buildResponse({ error: "Invalid POST action: " + action });
  } catch (err) {
    return buildResponse({ error: err.message, stack: err.stack });
  }
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) return [];
  
  const headers = data[0];
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const rowObj = {};
    headers.forEach((h, index) => {
      let value = data[i][index];
      if (DATE_COLUMNS.indexOf(h) !== -1) {
        value = formatCellDate(value);
      }
      rowObj[h] = value;
    });
    result.push(rowObj);
  }
  
  return result;
}

function getRowById(sheetName, idColumn, idValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found: " + idColumn);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      const rowObj = {};
      headers.forEach((h, index) => {
        let value = data[i][index];
        if (DATE_COLUMNS.indexOf(h) !== -1) {
          value = formatCellDate(value);
        }
        rowObj[h] = value;
      });
      return rowObj;
    }
  }
  
  return { error: "Row not found" };
}

function createRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const row = headers.map(h => rowData[h] || "");
  sheet.appendRow(row);
  
  return { success: true, message: "Row created" };
}

function updateRow(sheetName, idColumn, idValue, updates) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found: " + idColumn);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      Object.keys(updates).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
        }
      });
      return { success: true, message: "Row updated" };
    }
  }
  
  return { error: "Row not found" };
}

function deleteRow(sheetName, idColumn, idValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found: " + idColumn);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Row deleted" };
    }
  }
  
  return { error: "Row not found" };
}

function buildResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
