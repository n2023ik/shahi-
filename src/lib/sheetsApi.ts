import { Trip, TripStatus } from "./types";
import { mockTrips } from "./mockData";

// Google Apps Script URL
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw5pY_BCP448aOvjcpjdupvdBF47bXQrL3EsKCBEige1TgzT4oE2gQKyvjbb_R0X64/exec";

/* ============================================================
   DIRECT GOOGLE APPS SCRIPT CALL
============================================================ */

async function callAppsScript(
  action: string,
  method: "GET" | "POST" = "POST",
  data?: Record<string, unknown>
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    let url = APPS_SCRIPT_URL;
    let init: RequestInit = { signal: controller.signal };

    if (method === "GET") {
      // For GET requests, append action to URL
      url = `${APPS_SCRIPT_URL}?action=${action}`;
      init.method = "GET";
    } else {
      // For POST requests, send data in body
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

    return await res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Apps Script call failed:", error);
    throw error;
  }
}

/* ============================================================
   NORMALIZATION
============================================================ */

function normalizeTripStatus(status: string): TripStatus {
  const s = status?.toLowerCase().trim() || "";

  if (s.includes("completed")) return "Completed";
  if (s.includes("transit")) return "In-Transit";
  if (s.includes("mapped")) return "Mapped";
  if (s.includes("not")) return "Trip Not Created";

  return "Mapped";
}

function formatDate(val: string): string {
  if (!val) return "";

  try {
    if (val.includes("T")) {
      return new Date(val).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
    return val;
  } catch {
    return val;
  }
}

/* ============================================================
   MAPPER
============================================================ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapObjectToTrip(row: any, index: number): Trip {
  return {
    sNo: row["S.No."] || index + 1,
    tripCreationDate: formatDate(row["Trip Creation Date"] || ""),
    tripCompletionDate: formatDate(row["Trip Completion Date"] || ""),
    tripId: row["Trip Id"] || "",
    vehicleNo: row["Vehicle No."] || "",
    assetTracker: String(row["Asset Tracker"] || ""),
    sourceAddress: row["Source Address"] || "",
    destinationAddress: row["Destination Address"] || "",
    transporterName: row["Transporter Name"] || "",
    tripStatus: normalizeTripStatus(row["Trip status"] || ""),
    packetStatus: row["Packet Status"] || "",
    pickupRaisedOn: formatDate(row["Pick-up Raised On"] || ""),
    taskId: row["Task ID"] || "",
    zohoTicketId: row["Zoho Ticket ID"] || "",
    actualPickupDate: formatDate(row["Actual Pick-up Date"] || ""),
    deliveredDate: formatDate(row["Delivered Date"] || ""),
    remarks: row["Remarks"] || "",
  };
}

/* ============================================================
   API METHODS
============================================================ */

export async function fetchTrips(): Promise<Trip[]> {
  try {
    const result = await callAppsScript("getAll", "GET");

    if (!Array.isArray(result)) {
      console.warn("Unexpected response format:", result);
      return [];
    }

    return result.map((row, index) => mapObjectToTrip(row, index));
  } catch (error) {
    console.error("Fetch failed. Using mock data.");
    return mockTrips;
  }
}

export async function createTrip(trip: Trip) {
  try {
    return await callAppsScript("create", "POST", {
      data: tripToSheetRow(trip),
    });
  } catch (error) {
    console.warn("Create failed:", error);
  }
}

export async function updateTrip(trip: Trip) {
  try {
    return await callAppsScript("update", "POST", {
      id: trip.sNo,
      data: tripToSheetRow(trip),
    });
  } catch (error) {
    console.warn("Update failed:", error);
  }
}

export async function deleteTrip(tripId: string) {
  try {
    return await callAppsScript("delete", "POST", {
      id: tripId,
    });
  } catch (error) {
    console.warn("Delete failed:", error);
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
