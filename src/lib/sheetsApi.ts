import { Trip, TripStatus, StockDeficiency } from "./types";
import { mockTrips, generateMockTrips } from "./mockData";
import { config, getAppsScriptUrl, isGoogleConfigured } from "./config";

// Get Apps Script URL from centralized config
const APPS_SCRIPT_URL = getAppsScriptUrl();

/**
 * ========================================================
 * SHEET CONFIGURATION (matches Config.gs in Apps Script)
 * ========================================================
 */
export const SHEET_CONFIG = {
  DASHBOARD: "DASHBOARD",
  TRIP_DETAILS: "TRIP_DETAILS",
  ALLOWED_USERS: "ALLOWED_USERS",
} as const;

export type SheetConfigKey = keyof typeof SHEET_CONFIG;

/* ============================================================
   DIRECT GOOGLE APPS SCRIPT CALL
============================================================ */

async function callAppsScript(
  action: string,
  method: "GET" | "POST" = "POST",
  data?: Record<string, unknown>
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);

  try {
    let url = APPS_SCRIPT_URL;
    let init: RequestInit = {
      signal: controller.signal,
      // CRITICAL: Avoid CORS preflight by not sending custom headers for GET requests
      // and using simple headers for POST
    };

    if (method === "GET") {
      // For GET requests: NO custom headers to avoid CORS preflight
      url = `${APPS_SCRIPT_URL}?action=${action}`;
      init.method = "GET";
    } else {
      // For POST requests: Use form-data to avoid CORS preflight
      // instead of JSON which triggers preflight
      
      // Convert to FormData to avoid preflight (Content-Type will be auto-set)
      const formData = new FormData();
      
      // Flatten data into FormData - each field becomes a separate parameter
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        });
      }
      
      init.method = "POST";
      init.body = formData;
      // Don't set Content-Type header - browser will set it with boundary
    }

    console.log(`[sheetsApi] Calling Apps Script: ${method} ${url.substring(0, 100)}...`);

    const res = await fetch(url, init);

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      console.error(
        `[sheetsApi] Apps Script returned ${res.status}:`,
        err.substring(0, 200)
      );
      throw new Error(`Apps Script error (${res.status}): ${err}`);
    }

    // Get response as text first to handle non-JSON responses
    const responseText = await res.text();

    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error("❌ Invalid JSON response from Apps Script:", responseText.substring(0, 200));
      throw new Error(
        `Apps Script returned invalid JSON. Response starts with: "${responseText.substring(0, 50)}...". ` +
        `This might indicate: 1) Wrong Apps Script URL, 2) Script not deployed, or 3) Invalid response format. ` +
        `Check: 1) VITE_GOOGLE_SHEETS_API_URL in .env, 2) Google Apps Script deployed with "Execute as me" and "Anyone" access`
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);

    // Better error messaging
    if (error instanceof TypeError) {
      console.error(
        "❌ Network Error: Could not reach Google Apps Script.\n" +
        "Fix: 1) Check VITE_GOOGLE_SHEETS_API_URL in .env, 2) Verify deployment URL is correct, " +
        "3) Check browser console for CORS errors"
      );
    }

    console.error("Apps Script call failed:", error);
    throw error;
  }
}

/* ============================================================
   NORMALIZATION
============================================================ */

function normalizeTripStatus(status: string): TripStatus {
  const s = status?.toLowerCase().trim() || "";

  if (s.includes("completed") && !s.includes("not")) return "Trip Completed";
  if (s.includes("transit") || s.includes("in-transit")) return "In Transit";
  if (s.includes("awaiting") || s.includes("departure")) return "Awaiting to Departure";
  if (s.includes("not") && (s.includes("completed") || s.includes("created"))) return "Trip Not Created";

  return "Awaiting to Departure";
}

function formatDate(val: string | any): string {
  if (!val) return "";
  
  // Convert to string and trim
  const strVal = String(val).trim();
  if (!strVal || strVal === "NaN" || strVal === "undefined" || strVal === "null") return "";

  try {
    // If already in dd/mm/yyyy format, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(strVal)) {
      return strVal;
    }

    // If in ISO format or other date format, convert to dd/mm/yyyy
    if (strVal.includes("T") || strVal.includes("-")) {
      const date = new Date(strVal);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // If in ddmmyyyy format (8 digits), convert to dd/mm/yyyy
    if (/^\d{8}$/.test(strVal)) {
      const day = strVal.substring(0, 2);
      const month = strVal.substring(2, 4);
      const year = strVal.substring(4, 8);
      return `${day}/${month}/${year}`;
    }

    // If it's a number (like Excel date serial), try to convert
    if (/^\d+$/.test(strVal)) {
      const dateNum = parseInt(strVal, 10);
      if (dateNum > 0 && dateNum < 100000) { // Reasonable date serial range
        // Excel stores dates as days since 1/1/1900
        const baseDate = new Date(1900, 0, 1);
        const date = new Date(baseDate.getTime() + (dateNum - 1) * 24 * 60 * 60 * 1000);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
      }
    }

    return strVal;
  } catch {
    return "";
  }
}

/* ============================================================
   MAPPER
============================================================ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapObjectToTrip(row: any, index: number): Trip {
  const trip = {
    sNo: row["S.No."] || row.sNo || index + 1,
    tripCreationDate: formatDate(row["Trip Creation Date"] || row.tripCreationDate || ""),
    tripCompletionDate: formatDate(row["Trip Completion Date"] || row.tripCompletionDate || ""),
    tripId: row["Trip Id"] || row.tripId || "",
    vehicleNo: row["Vehicle No."] || row.vehicleNo || "",
    assetTracker: String(row["Asset Tracker"] || row.assetTracker || ""),
    sourceAddress: row["Source Address"] || row.sourceAddress || "",
    destinationAddress: row["Destination Address"] || row.destinationAddress || "",
    transporterName: row["Transporter Name"] || row.transporterName || "",
    tripStatus: normalizeTripStatus(row["Trip status"] || row.tripStatus || ""),
    packetStatus: row["Packet Status"] || row.packetStatus || "",
    pickupRaisedOn: formatDate(row["Pick-up Raised On"] || row.pickupRaisedOn || ""),
    taskId: row["Task ID"] || row.taskId || "",
    zohoTicketId: row["Zoho Ticket ID"] || row.zohoTicketId || "",
    actualPickupDate: formatDate(row["Actual Pick-up Date"] || row.actualPickupDate || ""),
    deliveredDate: formatDate(row["Delivered Date"] || row.deliveredDate || ""),
    remarks: row["Remarks"] || row.remarks || "",
  };

  // Debug log for first trip
  if (index === 0) {
    console.log("[mapObjectToTrip] Raw input row:", row);
    console.log("[mapObjectToTrip] Mapped trip:", trip);
    console.log("[mapObjectToTrip] Date fields mapping:");
    console.log("  - Trip Creation Date input:", row["Trip Creation Date"], "→ output:", trip.tripCreationDate);
    console.log("  - Trip Completion Date input:", row["Trip Completion Date"], "→ output:", trip.tripCompletionDate);
  }

  return trip;
}

/* ============================================================
   API METHODS
============================================================ */

export async function fetchTrips(): Promise<Trip[]> {
  try {
    // Check if Apps Script URL is configured
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "NOT_CONFIGURED" || APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT")) {
      console.warn(
        "⚠️ Google Apps Script not configured.\n" +
        "Using mock trip data. To connect to Google Sheets:\n" +
        "1. Deploy your Apps Script as a Web App\n" +
        "2. Add VITE_GOOGLE_SHEETS_API_URL to .env file\n" +
        "See GOOGLE_SHEETS_SETUP.md for instructions."
      );
      // Return freshly generated mock trips with current dates
      return generateMockTrips(47);
    }

    console.log("[fetchTrips] Calling Google Apps Script...");
    
    // Use "getTrips" action from the new Apps Script API
    const result = await callAppsScript("getTrips", "GET");

    console.log("[fetchTrips] Raw API response:", result);

    // Handle both array response and object with trips property
    let tripsData = result;
    if (!Array.isArray(result) && result.trips && Array.isArray(result.trips)) {
      tripsData = result.trips;
    }

    if (!Array.isArray(tripsData)) {
      console.warn("⚠️ Unexpected response format:", result);
      console.warn("ℹ️ Falling back to mock data");
      return generateMockTrips(47);
    }

    console.log(`[fetchTrips] Got ${tripsData.length} raw trip records from API`);
    
    if (tripsData.length > 0) {
      console.log("[fetchTrips] First raw record:", tripsData[0]);
    }

    const allTrips = tripsData.map((row, index) => {
      const trip = mapObjectToTrip(row, index);
      if (index === 0) {
        console.log("[fetchTrips] First mapped trip:", trip);
      }
      return trip;
    });

    // Don't filter out trips - keep all trips including "Trip Not Created" which may not have dates
    console.log(
      `✅ Successfully loaded ${allTrips.length} trips from Google Sheets`
    );
    
    if (allTrips.length > 0) {
      console.log("[fetchTrips] Trip statuses:", allTrips.map(t => ({ id: t.tripId, status: t.tripStatus, date: t.tripCreationDate })));
    }
    
    return allTrips;
  } catch (error) {
    console.error("❌ Failed to fetch trips from Google Sheets:", error);
    console.warn("ℹ️ Using mock trip data as fallback");
    console.warn(
      "To fix this:\n" +
      "1. Verify Apps Script deployment URL\n" +
      "2. Check .env file configuration\n" +
      "3. Ensure deployment has proper permissions"
    );
    return generateMockTrips(47);
  }
}

export async function createTrip(trip: Trip) {
  try {
    // Use "create" action from the new Apps Script API
    const rowData = tripToSheetRow(trip);
    console.log("[createTrip] Creating trip:", trip.tripId);
    return await callAppsScript("create", "POST", {
      action: "create",
      sheet: "Shahi Reverse Pickup/Trip Details",
      data: rowData,
    });
  } catch (error) {
    console.error("Create trip failed:", error);
    throw error;
  }
}

export async function updateTrip(trip: Trip) {
  try {
    // Use "update" action from the new Apps Script API
    const rowData = tripToSheetRow(trip);
    console.log("[updateTrip] Updating trip:", trip.tripId);
    return await callAppsScript("update", "POST", {
      action: "update",
      sheet: "Shahi Reverse Pickup/Trip Details",
      idColumn: "Trip Id",
      idValue: trip.tripId,
      updates: rowData,
    });
  } catch (error) {
    console.error("Update trip failed:", error);
    throw error;
  }
}

export async function deleteTrip(tripId: string) {
  try {
    console.log("[deleteTrip] Deleting trip:", tripId);
    return await callAppsScript("delete", "POST", {
      action: "delete",
      sheet: "Shahi Reverse Pickup/Trip Details",
      idColumn: "Trip Id",
      idValue: tripId,
    });
  } catch (error) {
    console.error("Delete trip failed:", error);
    throw error;
  }
}

/* ============================================================
   SHEET FORMATTER
============================================================ */

function tripToSheetRow(trip: Trip) {
  return {
    "S.No.": trip.sNo,
    "Trip Creation Date": trip.tripCreationDate,
    "Trip Completion Date": trip.tripCompletionDate,
    "Trip Id": trip.tripId,
    "Vehicle No.": trip.vehicleNo,
    "Asset Tracker": trip.assetTracker,
    "Source Address": trip.sourceAddress,
    "Destination Address": trip.destinationAddress,
    "Transporter Name": trip.transporterName,
    "Trip status": trip.tripStatus,
    "Packet Status": trip.packetStatus,
    "Pick-up Raised On": trip.pickupRaisedOn,
    "Task ID": trip.taskId,
    "Zoho Ticket ID": trip.zohoTicketId,
    "Actual Pick-up Date": trip.actualPickupDate,
    "Delivered Date": trip.deliveredDate,
    "Remarks": trip.remarks,
  };
}

/* ============================================================
   STOCK DEFICIENCY FETCH
============================================================ */

/**
 * Fetches stock data from dashboard sheet and calculates deficiency
 * based on 80% threshold
 * 
 * Sheet name comes from config (VITE_SHEET_DASHBOARD in .env)
 */
export async function fetchStockDeficiency(): Promise<StockDeficiency[]> {
  try {
    // Check if Apps Script URL is configured
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "NOT_CONFIGURED" || APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT")) {
      console.warn(
        "⚠️ Google Apps Script not configured.\n" +
        "Using mock stock data. To connect to Google Sheets:\n" +
        "1. Deploy your Apps Script as a Web App\n" +
        "2. Add VITE_GOOGLE_SHEETS_API_URL to .env file"
      );
      return generateMockStockDeficiency();
    }

    // Fetch stock data using "getStockData" action
    const result = await callAppsScript("getStockData", "GET");

    // Handle both array response and object with stockData property
    let stockData = result;
    if (!Array.isArray(result) && result.stockData && Array.isArray(result.stockData)) {
      stockData = result.stockData;
    }

    if (!Array.isArray(stockData)) {
      console.warn("⚠️ Unexpected stock data response format:", result);
      return generateMockStockDeficiency();
    }

    // Map and calculate stock deficiency
    const deficiencies = stockData
      .map((row: any, index: number) => mapStockDeficiency(row, index))
      .filter((item): item is StockDeficiency => item !== null);

    console.log(`✅ Successfully loaded ${deficiencies.length} stock locations`);
    return deficiencies;
  } catch (error) {
    console.error("❌ Failed to fetch stock data from Google Sheets:", error);
    console.warn("ℹ️ Using mock stock data as fallback");
    return generateMockStockDeficiency();
  }
}

function mapStockDeficiency(row: any, index: number): StockDeficiency | null {
  // Extract source/location name
  const source = row["Location"] || row["Source"] || row["sourceAddress"] || row["locationName"] || `Location ${index + 1}`;
  
  // Extract "device in use" from sheets (various possible field names)
  const devicesInUse = parseInt(
    row["device in use"] || 
    row["Device in use"] || 
    row["Devices In Use"] ||
    row["devicesInUse"] || 
    "0"
  );
  
  // Extract "device avilable" from sheets (note: misspelling in sheets)
  const availableDevices = parseInt(
    row["device avilable"] || // Typo in original sheet
    row["device available"] || 
    row["Device available"] ||
    row["Available Devices"] || 
    row["Available"] || 
    row["Current Stock"] || 
    "0"
  );
  
  // Max capacity = devices in use + devices available
  const maxCapacity = devicesInUse + availableDevices;

  if (!source || maxCapacity <= 0) {
    return null;
  }

  // Calculate utilization percentage: (devices in use / total) * 100
  const utilization = (devicesInUse / maxCapacity) * 100;
  
  // Calculate deficiency: how many devices needed to reach 80%
  const threshold80Percent = (maxCapacity * 80) / 100;
  const deficiency = Math.max(0, Math.ceil(threshold80Percent - availableDevices));

  // Determine status based on utilization (devices in use)
  let status: "critical" | "warning" | "optimal";
  if (utilization >= 80) {
    status = "critical"; // 80%+ utilization = critical
  } else if (utilization >= 60) {
    status = "warning";  // 60-79% = warning
  } else {
    status = "optimal";  // <60% = normal
  }

  if (index === 0) {
    console.log("[mapStockDeficiency] First row mapping:", {
      source,
      devicesInUse,
      availableDevices,
      maxCapacity,
      utilization: utilization.toFixed(1) + "%",
      status
    });
  }

  return {
    source: source.trim(),
    devicesInUse,
    availableDevices,
    maxCapacity,
    utilization: Math.round(utilization * 10) / 10, // Round to 1 decimal
    deficiency,
    status,
  };
}

function generateMockStockDeficiency(): StockDeficiency[] {
  return [
    {
      source: "Bangalore, KA",
      devicesInUse: 0,
      availableDevices: 45,
      maxCapacity: 100,
      utilization: 0,
      deficiency: 35,
      status: "optimal",
    },
    {
      source: "Delhi, DL",
      devicesInUse: 0,
      availableDevices: 72,
      maxCapacity: 100,
      utilization: 0,
      deficiency: 8,
      status: "optimal",
    },
    {
      source: "Mumbai, MH",
      devicesInUse: 0,
      availableDevices: 89,
      maxCapacity: 100,
      utilization: 0,
      deficiency: 0,
      status: "optimal",
    },
    {
      source: "Hyderabad, TS",
      devicesInUse: 0,
      availableDevices: 62,
      maxCapacity: 100,
      utilization: 0,
      deficiency: 18,
      status: "optimal",
    },
    {
      source: "Chennai, TN",
      devicesInUse: 0,
      availableDevices: 38,
      maxCapacity: 100,
      utilization: 0,
      deficiency: 42,
      status: "optimal",
    },
  ];
}

/* ============================================================
   FETCH ALL SHEETS DATA
============================================================ */

/**
 * Fetch data from all configured sheets in one API call
 * Returns a comprehensive object with all sheet data
 */
export async function fetchAllSheetsData(): Promise<{
  sheetNames: string[];
  sheets: Record<string, {
    sheetName: string;
    rowCount: number;
    data: unknown[];
    error?: string;
  }>;
}> {
  try {
    // Check if Apps Script URL is configured
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "NOT_CONFIGURED" || APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT")) {
      console.warn(
        "⚠️ Google Apps Script not configured.\n" +
        "Using mock data. See GOOGLE_SHEETS_CONFIG_SETUP.md for setup instructions."
      );
      
      // Return mock structure
      return {
        sheetNames: Object.keys(SHEET_CONFIG),
        sheets: {
          [SHEET_CONFIG.DASHBOARD]: {
            sheetName: config.sheets.dashboard,
            rowCount: 0,
            data: [],
            error: "Not configured"
          },
          [SHEET_CONFIG.TRIP_DETAILS]: {
            sheetName: config.sheets.tripDetails,
            rowCount: 0,
            data: [],
            error: "Not configured"
          }
        }
      };
    }

    const result = await callAppsScript("getAllSheets", "GET");

    if (result && result.sheets) {
      console.log(`✅ Successfully fetched data from ${Object.keys(result.sheets).length} sheets`);
      return result;
    }

    throw new Error("Invalid response format from getAllSheets");
  } catch (error) {
    console.error("❌ Failed to fetch all sheets data:", error);
    throw error;
  }
}

/**
 * Get list of all configured sheet names from the API
 */
export async function fetchSheetNames(): Promise<string[]> {
  try {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "NOT_CONFIGURED" || APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT")) {
      return Object.values(SHEET_CONFIG);
    }

    const result = await callAppsScript("getSheetNames", "GET");
    
    if (result && Array.isArray(result.sheets)) {
      console.log(`✅ Available sheets: ${result.sheets.join(", ")}`);
      return result.sheets;
    }

    return Object.values(SHEET_CONFIG);
  } catch (error) {
    console.error("❌ Failed to fetch sheet names:", error);
    return Object.values(SHEET_CONFIG);
  }
}
