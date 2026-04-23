/**
 * ========================================================
 * CENTRALIZED SHEET CONFIGURATION
 * ========================================================
 * 
 * This file contains all sheet names/IDs used across all
 * Google Apps Script functions. Copy this into any .gs file
 * that needs to access sheets.
 * 
 * HOW TO USE:
 * 1. Copy this entire file content into your Apps Script project
 * 2. All .gs files in the same project can access SHEET_CONFIG
 * 3. Update sheet names here when adding/renaming sheets
 * 
 * ========================================================
 */

/**
 * Master configuration for all Google Sheets
 * Add new sheets here as your application grows
 */
const SHEET_CONFIG = {
  // Main dashboard metrics and location data
  DASHBOARD: "Shahi Dashboard",
  
  // Trip/shipment tracking details
  TRIP_DETAILS: "Shahi Reverse PickupTrip Detail",
  
  // User authentication whitelist
  ALLOWED_USERS: "AllowedUsers",
  
  // Add more sheets below as needed:
  // INVENTORY: "Inventory Management",
  // REPORTS: "Monthly Reports",
  // ANALYTICS: "Analytics Data",
  // SUPPLIERS: "Supplier List",
};

/**
 * Helper function to get sheet by config key
 * @param {string} configKey - Key from SHEET_CONFIG (e.g., "DASHBOARD")
 * @returns {Sheet} Google Sheets Sheet object
 */
function getSheetByConfig(configKey) {
  const sheetName = SHEET_CONFIG[configKey];
  if (!sheetName) {
    throw new Error("Sheet config key not found: " + configKey);
  }
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Sheet not found: " + sheetName);
  }
  
  return sheet;
}

/**
 * Get all available sheet names
 * @returns {Array<string>} Array of all configured sheet names
 */
function getAllSheetNames() {
  return Object.values(SHEET_CONFIG);
}

/**
 * Get all sheet config keys
 * @returns {Array<string>} Array of all config keys
 */
function getAllSheetKeys() {
  return Object.keys(SHEET_CONFIG);
}

/**
 * Check if a sheet exists in the spreadsheet
 * @param {string} configKey - Key from SHEET_CONFIG
 * @returns {boolean} True if sheet exists
 */
function sheetExists(configKey) {
  try {
    const sheetName = SHEET_CONFIG[configKey];
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    return sheet !== null;
  } catch (error) {
    return false;
  }
}
