import { DashboardData, LocationMetrics, GlobalSummary } from "./types";
import { mockDashboardData } from "./mockData";
import { config, getAppsScriptUrl, isGoogleConfigured } from "./config";

// Get Apps Script URL from centralized config
const APPS_SCRIPT_URL = getAppsScriptUrl();

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
    let init: RequestInit = { signal: controller.signal };

    if (method === "GET") {
      url = `${APPS_SCRIPT_URL}?action=${action}`;
      init.method = "GET";
    } else {
      init.method = "POST";
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify({ action, ...data });
    }

    const res = await fetch(url, init);
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
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
        `This might indicate: 1) Wrong Apps Script URL, 2) Authentication redirect, or 3) CORS issue. ` +
        `Check your VITE_GOOGLE_SHEETS_API_URL in .env file.`
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Apps Script call failed:", error);
    throw error;
  }
}

/* ============================================================
   DATA NORMALIZATION
============================================================ */

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Handle #REF! errors and empty strings
    if (value.includes("#REF!") || value.trim() === "" || value === "-") return 0;
    const parsed = parseFloat(value.replace(/,/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseDate(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return "";
}

/* ============================================================
   MAPPER - Location Metrics
============================================================ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToLocationMetrics(row: any, locationName: string): LocationMetrics {
  return {
    locationName: locationName || "Unknown",
    totalShipmentCount: parseNumber(row["Total Shipment Count"] || row["Count"] || row.totalShipmentCount || 0),
    inTransitTrips: parseNumber(row["In-Transit Trips"] || row["In Transit"] || row.inTransitTrips || 0),
    completedTrips: parseNumber(row["Completed Trips"] || row["Completed"] || row.completedTrips || 0),
    totalPickupRaisedInternal: parseNumber(row["Total Pickup Raised (Internal)"] || row["Pickup Raised"] || row.totalPickupRaisedInternal || 0),
    totalPickupCompleted: parseNumber(row["Total Pickup Completed"] || row["Pickup Completed"] || row.totalPickupCompleted || 0),
    confirmationPending: parseNumber(row["Confirmation Pending"] || row["Pending"] || row.confirmationPending || 0),
    rtoShipments: parseNumber(row["RTO Shipments"] || row["RTO"] || row.rtoShipments || 0),
    deliveredAtShahiFactory: parseNumber(row["Delivered at Shahi Factory"] || row["Delivered"] || row.deliveredAtShahiFactory || 0),
    available: parseNumber(row["Available"] || row.available || 0),
    stockDamageOffline: parseNumber(row["Available Stock(Damage+Offline)"] || row["Stock(Damage+Offline)"] || row["Stock"] || row.stockDamageOffline || 0),
    totalQuantity: parseNumber(row["Total Quantity"] || row["Quantity"] || row.totalQuantity || 0),
    lost: parseNumber(row["Lost"] || row.lost || 0),
    nonRepairableDevices: parseNumber(row["Non-repairable Devices"] || row["Non-repairable"] || row.nonRepairableDevices || 0),
    offlineDevices: parseNumber(row["Offline Devices"] || row["Offline"] || row.offlineDevices || 0),
    pickupRaisedDate: parseDate(row["Pickup Raised Date"] || row["Raised On"] || row.pickupRaisedDate),
    actualPickupDate: parseDate(row["Actual Pickup Date"] || row["Pickup Date"] || row.actualPickupDate),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToGlobalSummary(data: any): GlobalSummary {
  return {
    completedTrips: parseNumber(data["Completed Trips"] || data.completedTrips || 0),
    totalPickupRaisedInternal: parseNumber(data["Total Pickup Raised (Internal)"] || data.totalPickupRaisedInternal || data.totalPickupRaised || 0),
    totalPickupCompleted: parseNumber(data["Total Pickup Completed"] || data.totalPickupCompleted || data.pickupCompleted || 0),
    confirmationPending: parseNumber(data["Confirmation Pending"] || data.confirmationPending || data.pending || 0),
    rtoShipments: parseNumber(data["RTO Shipments"] || data.rtoShipments || data.rto || 0),
    deliveredAtShahiFactory: parseNumber(data["Delivered at Shahi Factory"] || data.deliveredAtShahiFactory || data.delivered || 0),
    available: parseNumber(data["Available"] || data.available || 0),
    stockDamageOffline: parseNumber(data["Available Stock(Damage+Offline)"] || data["Stock(Damage+Offline)"] || data.stockDamageOffline || data.stock || 0),
    totalQuantity: parseNumber(data["Total Quantity"] || data.totalQuantity || 100),
    lost: parseNumber(data["Lost"] || data.lost || 0),
    nonRepairableDevices: parseNumber(data["Non-repairable Devices"] || data.nonRepairableDevices || data.nonRepairable || 0),
    offlineDevices: parseNumber(data["Offline Devices"] || data.offlineDevices || data.offline || 0),
  };
}

/* ============================================================
   API METHODS
============================================================ */

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    // Check if Apps Script URL is configured
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "NOT_CONFIGURED" || APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT")) {
      console.warn(
        "⚠️ Google Apps Script not configured. Using mock data.\n" +
        "To connect to Google Sheets:\n" +
        "1. Deploy DashboardData.gs as a Web App\n" +
        "2. Create .env file with: VITE_GOOGLE_SHEETS_API_URL=your_deployment_url\n" +
        "3. Restart the dev server\n" +
        "See GOOGLE_SHEETS_SETUP.md for detailed instructions."
      );
      return mockDashboardData;
    }

    // Fetch from the new unified API
    const result = await callAppsScript("getDashboard", "GET");

    console.log("✅ Dashboard API Response:", result);

    // Handle new API structure: { globalSummary, locations }
    if (result && result.locations && Array.isArray(result.locations)) {
      const locations = result.locations.map((loc: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const locData = loc as any;
        const locationName = locData.locationName || locData["Location Name"] || locData.name || "Unknown";
        return mapToLocationMetrics(locData, locationName);
      });

      const globalSummary = result.globalSummary 
        ? mapToGlobalSummary(result.globalSummary)
        : calculateGlobalSummaryFromLocations(locations);

      console.log(`✅ Loaded ${locations.length} locations from Google Sheets`);
      return { globalSummary, locations };
    }

    // Fallback: Try parsing as array of location rows
    if (Array.isArray(result) && result.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const locations = result.map((row: any) => {
        const locationName = row["Location"] || row["Location Name"] || row.locationName || row.name || "Unknown";
        return mapToLocationMetrics(row, locationName);
      });

      const globalSummary = calculateGlobalSummaryFromLocations(locations);

      console.log(`✅ Loaded ${locations.length} locations from Google Sheets (legacy format)`);
      return { globalSummary, locations };
    }

    // Return mock data if data format is unexpected
    console.warn("⚠️ Unexpected response format, using mock data:", result);
    return mockDashboardData;
  } catch (error) {
    console.error("❌ Failed to fetch dashboard data:", error);
    console.warn("ℹ️ Using mock dashboard data as fallback");
    console.warn(
      "To fix this:\n" +
      "1. Check that DashboardData.gs is deployed as a Web App\n" +
      "2. Verify VITE_GOOGLE_SHEETS_API_URL in .env file\n" +
      "3. Ensure the deployment has 'Anyone' access\n" +
      "See GOOGLE_SHEETS_SETUP.md for help."
    );
    return mockDashboardData;
  }
}

/* ============================================================
   HELPER: Calculate Global Summary from Locations
============================================================ */
function calculateGlobalSummaryFromLocations(locations: LocationMetrics[]): GlobalSummary {
  return {
    completedTrips: locations.reduce((sum, loc) => sum + loc.completedTrips, 0),
    totalPickupRaisedInternal: locations.reduce((sum, loc) => sum + loc.totalPickupRaisedInternal, 0),
    totalPickupCompleted: locations.reduce((sum, loc) => sum + loc.totalPickupCompleted, 0),
    confirmationPending: locations.reduce((sum, loc) => sum + loc.confirmationPending, 0),
    rtoShipments: locations.reduce((sum, loc) => sum + loc.rtoShipments, 0),
    deliveredAtShahiFactory: locations.reduce((sum, loc) => sum + loc.deliveredAtShahiFactory, 0),
    available: locations.reduce((sum, loc) => sum + loc.available, 0),
    stockDamageOffline: locations.reduce((sum, loc) => sum + loc.stockDamageOffline, 0),
    totalQuantity: locations.reduce((sum, loc) => sum + loc.totalQuantity, 0),
    lost: locations.reduce((sum, loc) => sum + loc.lost, 0),
    nonRepairableDevices: locations.reduce((sum, loc) => sum + loc.nonRepairableDevices, 0),
    offlineDevices: locations.reduce((sum, loc) => sum + loc.offlineDevices, 0),
  };
}
