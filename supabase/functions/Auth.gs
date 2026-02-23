/**
 * APPS SCRIPT AUTH BACKEND
 * 
 * This file contains the backend authentication logic for Shahi Dashboard.
 * Deploy this as a Web App in Google Apps Script:
 * 
 * Steps:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create/open your project linked to the Google Sheet with shipment data
 * 3. Create a new file named "Auth.gs"
 * 4. Copy the code below into Auth.gs (remove this comment block)
 * 5. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the deployment URL and save it as VITE_APPS_SCRIPT_AUTH_URL in .env
 * 
 * The code verifies:
 * 1. Google ID token is valid
 * 2. Email is verified by Google
 * 3. Email is in the whitelist (from sheet)
 */

/**
 * Fetch allowed emails from the "AllowedUsers" sheet
 * Sheet format: Column A with email addresses
 * Note: Sheet name should match SHEET_CONFIG.ALLOWED_USERS in Config.gs
 */
function getAllowedEmails() {
  try {
    // Use SHEET_CONFIG if available, otherwise fallback
    const sheetName = typeof SHEET_CONFIG !== 'undefined' ? SHEET_CONFIG.ALLOWED_USERS : "AllowedUsers";
    const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("AllowedUsers sheet not found: " + sheetName);
      return [];
    }

    const emails = sheet
      .getRange("A:A")
      .getValues()
      .flat()
      .filter((email) => email && typeof email === "string")
      .map((email) => email.trim().toLowerCase());

    return emails;
  } catch (error) {
    Logger.log("Error reading allowed emails: " + error);
    return [];
  }
}

/**
 * Check if email is in whitelist
 */
function isEmailAllowed(email) {
  const allowedEmails = getAllowedEmails();
  return allowedEmails.includes(email.trim().toLowerCase());
}

/**
 * Main authentication endpoint
 * Called by React frontend with Google ID token
 */
function doPost(e) {
  try {
    const token = e.parameter.token;

    if (!token) {
      return ContentService.createTextOutput("NO_TOKEN");
    }

    // ===================================
    // Step 1: Verify token with Google
    // ===================================
    const tokenUrl =
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token);
    const response = UrlFetchApp.fetch(tokenUrl, {
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      Logger.log("Token verification failed: " + response.getContentText());
      return ContentService.createTextOutput("INVALID_TOKEN");
    }

    const payload = JSON.parse(response.getContentText());

    // ===================================
    // Step 2: Check email is verified
    // ===================================
    if (!payload.email_verified) {
      Logger.log("Email not verified: " + payload.email);
      return ContentService.createTextOutput("EMAIL_NOT_VERIFIED");
    }

    // ===================================
    // Step 3: Check email in whitelist
    // ===================================
    const email = payload.email.toLowerCase();
    if (!isEmailAllowed(email)) {
      Logger.log("Email not in whitelist: " + email);
      return ContentService.createTextOutput("UNAUTHORIZED|" + email);
    }

    Logger.log("Auth successful for: " + email);
    return ContentService.createTextOutput("AUTHORIZED");
  } catch (error) {
    Logger.log("Auth error: " + error);
    return ContentService.createTextOutput("SERVER_ERROR");
  }
}

/**
 * Test endpoint (GET request)
 * Useful for checking if deployment is working
 */
function doGet(e) {
  return ContentService.createTextOutput("✅ Deployment is working! Auth.gs is running.");
}
