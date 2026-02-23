import { Trip, TripStatus, DashboardData, LocationMetrics, GlobalSummary } from "./types";

const statuses: TripStatus[] = ["Trip Completed", "In Transit", "Awaiting to Departure", "Trip Not Created"];
const transporters = ["BlueDart Express", "Delhivery", "DTDC", "Ecom Express", "XpressBees", "Shadowfax", "Rivigo"];
const sources = ["Mumbai, MH", "Delhi, DL", "Bangalore, KA", "Hyderabad, TS", "Chennai, TN", "Pune, MH", "Kolkata, WB", "Ahmedabad, GJ"];
const destinations = ["Jaipur, RJ", "Lucknow, UP", "Chandigarh, CH", "Indore, MP", "Nagpur, MH", "Patna, BR", "Bhopal, MP", "Kochi, KL"];

export interface DelayedPickupTrip {
  tripId: string;
  creationDate: string;
  vehicleNo: string;
  source: string;
  destination: string;
  pickupRaised: string;
  actualPickup: string;
  delayDays: number;
  tripStatus: string;
  packetStatus: string;
}

export interface StockDeficiency {
  source: string;
  currentStock: number;
  maxCapacity: number;
  utilization: number;
  deficiency: number;
  status: "critical" | "warning" | "optimal";
}
function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split("T")[0];
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockTrips(count = 47): Trip[] {
  // Generate dates for last 30 days (to accommodate various date filters)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return Array.from({ length: count }, (_, i) => {
    const status = randomPick(statuses);
    
    // Distribute trips across last 30 days, with more recent trips
    const daysAgo = Math.floor(Math.random() * 30);
    const creationDateObj = new Date(today);
    creationDateObj.setDate(creationDateObj.getDate() - daysAgo);
    const creationDate = creationDateObj.toISOString().split('T')[0];
    
    const completionDateObj = status === "Trip Completed" ? new Date(creationDateObj.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) : null;
    const completionDate = completionDateObj ? completionDateObj.toISOString().split('T')[0] : "";
    
    return {
      sNo: i + 1,
      tripCreationDate: creationDate,
      tripCompletionDate: completionDate,
      tripId: `TRP${String(10000 + i).padStart(6, "0")}`,
      vehicleNo: `${randomPick(["MH", "DL", "KA", "TN", "GJ"])}${Math.floor(10 + Math.random() * 90)}${randomPick(["AB", "CD", "EF", "GH"])}${Math.floor(1000 + Math.random() * 9000)}`,
      assetTracker: `AT-${Math.floor(1000 + Math.random() * 9000)}`,
      sourceAddress: randomPick(sources),
      destinationAddress: randomPick(destinations),
      transporterName: randomPick(transporters),
      tripStatus: status,
      packetStatus: status === "Trip Completed" ? "Delivered" : status === "In Transit" ? "Pickup Done" : status === "Awaiting to Departure" ? "Pickup Raised" : "Confirmation Pending",
      pickupRaisedOn: status === "Trip Not Created" ? "" : creationDate,
      taskId: `TSK-${Math.floor(10000 + Math.random() * 90000)}`,
      zohoTicketId: `ZH-${Math.floor(100000 + Math.random() * 900000)}`,
      actualPickupDate: (status === "In Transit" || status === "Trip Completed") ? 
        (() => {
          const pickupDateObj = new Date(creationDateObj.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
          return pickupDateObj.toISOString().split('T')[0];
        })() : "",
      deliveredDate: status === "Trip Completed" ? completionDate : "",
      remarks: "",
    };
  });
}

// Export a getter function instead of a constant to ensure fresh data
export const mockTrips = generateMockTrips(47);

// Mock Dashboard Data
export function generateMockDashboardData(): DashboardData {
  const locations: LocationMetrics[] = [
    {
      locationName: "Faridabad F1",
      totalShipmentCount: 2,
      inTransitTrips: 1,
      completedTrips: 1,
      totalPickupRaisedInternal: 0,
      totalPickupCompleted: 1,
      confirmationPending: 1,
      rtoShipments: 0,
      deliveredAtShahiFactory: 0,
      available: 0,
      stockDamageOffline: 0,
      totalQuantity: 10,
      lost: 0,
      nonRepairableDevices: 0,
      offlineDevices: 0,
      pickupRaisedDate: "2026-02-20",
      actualPickupDate: "2026-02-20",
    },
    {
      locationName: "Faridabad F2",
      totalShipmentCount: 0,
      inTransitTrips: 0,
      completedTrips: 0,
      totalPickupRaisedInternal: 0,
      totalPickupCompleted: 0,
      confirmationPending: 0,
      rtoShipments: 0,
      deliveredAtShahiFactory: 0,
      available: 0,
      stockDamageOffline: 0,
      totalQuantity: 6,
      lost: 0,
      nonRepairableDevices: 0,
      offlineDevices: 0,
      pickupRaisedDate: "2026-02-20",
      actualPickupDate: "2026-02-20",
    },
    {
      locationName: "Noida - A7",
      totalShipmentCount: 0,
      inTransitTrips: 0,
      completedTrips: 0,
      totalPickupRaisedInternal: 0,
      totalPickupCompleted: 0,
      confirmationPending: 0,
      rtoShipments: 0,
      deliveredAtShahiFactory: 0,
      available: 0,
      stockDamageOffline: 0,
      totalQuantity: 10,
      lost: 0,
      nonRepairableDevices: 0,
      offlineDevices: 0,
      pickupRaisedDate: "2026-02-20",
      actualPickupDate: "2026-02-20",
    },
    {
      locationName: "Noida - E10",
      totalShipmentCount: 3,
      inTransitTrips: 0,
      completedTrips: 2,
      totalPickupRaisedInternal: 1,
      totalPickupCompleted: 1,
      confirmationPending: 1,
      rtoShipments: 0,
      deliveredAtShahiFactory: 0,
      available: 0,
      stockDamageOffline: 0,
      totalQuantity: 10,
      lost: 0,
      nonRepairableDevices: 0,
      offlineDevices: 0,
      pickupRaisedDate: "2026-02-20",
      actualPickupDate: "2026-02-20",
    },
    {
      locationName: "Krishnagiri - Unit 27",
      totalShipmentCount: 12,
      inTransitTrips: 0,
      completedTrips: 11,
      totalPickupRaisedInternal: 1,
      totalPickupCompleted: 4,
      confirmationPending: 4,
      rtoShipments: 0,
      deliveredAtShahiFactory: 2,
      available: 0,
      stockDamageOffline: 0,
      totalQuantity: 10,
      lost: 0,
      nonRepairableDevices: 0,
      offlineDevices: 0,
      pickupRaisedDate: "2026-02-20",
      actualPickupDate: "2026-02-20",
    },
    {
      locationName: "Banglore UNIT -46",
      totalShipmentCount: 2,
      inTransitTrips: 0,
      completedTrips: 2,
      totalPickupRaisedInternal: 0,
      totalPickupCompleted: 2,
      confirmationPending: 0,
      rtoShipments: 0,
      deliveredAtShahiFactory: 0,
      available: 0,
      stockDamageOffline: 0,
      totalQuantity: 9,
      lost: 0,
      nonRepairableDevices: 0,
      offlineDevices: 0,
      pickupRaisedDate: "2026-02-20",
      actualPickupDate: "2026-02-20",
    },
    {
      locationName: "Banglore UNIT - 28",
      totalShipmentCount: 8,
      inTransitTrips: 0,
      completedTrips: 6,
      totalPickupRaisedInternal: 1,
      totalPickupCompleted: 3,
      confirmationPending: 1,
      rtoShipments: 0,
      deliveredAtShahiFactory: 2,
      available: 0,
      stockDamageOffline: 0,
      totalQuantity: 8,
      lost: 0,
      nonRepairableDevices: 0,
      offlineDevices: 0,
      pickupRaisedDate: "2026-02-20",
      actualPickupDate: "2026-02-20",
    },
    {
      locationName: "Banglore UNIT - 9",
      totalShipmentCount: 8,
      inTransitTrips: 1,
      completedTrips: 5,
      totalPickupRaisedInternal: 2,
      totalPickupCompleted: 3,
      confirmationPending: 1,
      rtoShipments: 0,
      deliveredAtShahiFactory: 0,
      available: 0,
      stockDamageOffline: 0,
      totalQuantity: 9,
      lost: 0,
      nonRepairableDevices: 0,
      offlineDevices: 0,
      pickupRaisedDate: "2026-02-20",
      actualPickupDate: "2026-02-20",
    },
  ];

  const globalSummary: GlobalSummary = {
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

  return { globalSummary, locations };
}

export const mockDashboardData = generateMockDashboardData();
// Generate Delayed Pickup Trips Data
export function generateDelayedPickupTrips(): DelayedPickupTrip[] {
  const trips: DelayedPickupTrip[] = [];
  const baseDate = new Date("2026-02-05");

  // Create 15 delayed pickup records
  const tripData = [
    { source: "Mumbai, MH", destination: "Jaipur, RJ", vehicleNo: "MH02AB1234", delayDays: 5 },
    { source: "Mumbai, MH", destination: "Lucknow, UP", vehicleNo: "MH05CD5678", delayDays: 4 },
    { source: "Mumbai, MH", destination: "Indore, MP", vehicleNo: "MH08EF9101", delayDays: 6 },
    { source: "Delhi, DL", destination: "Jaipur, RJ", vehicleNo: "DL03GH1112", delayDays: 7 },
    { source: "Delhi, DL", destination: "Chandigarh, CH", vehicleNo: "DL06AB1314", delayDays: 5 },
    { source: "Delhi, DL", destination: "Lucknow, UP", vehicleNo: "DL09CD1516", delayDays: 8 },
    { source: "Bangalore, KA", destination: "Kochi, KL", vehicleNo: "KA04EF1718", delayDays: 4 },
    { source: "Bangalore, KA", destination: "Nagpur, MH", vehicleNo: "KA07GH1920", delayDays: 5 },
    { source: "Bangalore, KA", destination: "Bhopal, MP", vehicleNo: "KA10AB2122", delayDays: 9 },
    { source: "Hyderabad, TS", destination: "Patna, BR", vehicleNo: "TS05CD2324", delayDays: 6 },
    { source: "Hyderabad, TS", destination: "Indore, MP", vehicleNo: "TS08EF2526", delayDays: 5 },
    { source: "Chennai, TN", destination: "Kochi, KL", vehicleNo: "TN02GH2728", delayDays: 7 },
    { source: "Chennai, TN", destination: "Nagpur, MH", vehicleNo: "TN06AB2930", delayDays: 4 },
    { source: "Pune, MH", destination: "Indore, MP", vehicleNo: "MH03CD3132", delayDays: 5 },
    { source: "Kolkata, WB", destination: "Patna, BR", vehicleNo: "WB07EF3334", delayDays: 6 },
  ];

  tripData.forEach((data, idx) => {
    const creationDate = new Date(baseDate);
    creationDate.setDate(creationDate.getDate() - (15 - idx));

    const pickupRaisedDate = new Date(creationDate);
    const actualPickupDate = new Date(creationDate);
    actualPickupDate.setDate(actualPickupDate.getDate() + data.delayDays);

    const tripStatus = data.delayDays > 6 ? "Awaiting to Departure" : "In Transit";
    const packetStatus = data.delayDays > 6 ? "Pickup Raised" : "Pickup Done";

    trips.push({
      tripId: `TRP${String(15000 + idx).padStart(6, "0")}`,
      creationDate: creationDate.toISOString().split("T")[0],
      vehicleNo: data.vehicleNo,
      source: data.source,
      destination: data.destination,
      pickupRaised: pickupRaisedDate.toISOString().split("T")[0],
      actualPickup: actualPickupDate.toISOString().split("T")[0],
      delayDays: data.delayDays,
      tripStatus: tripStatus,
      packetStatus: packetStatus,
    });
  });

  return trips;
}

export const mockDelayedPickupTrips = generateDelayedPickupTrips();

// Generate Stock Deficiency Data by Source
export function generateStockDeficiency(): StockDeficiency[] {
  const stockData = [
    { source: "Mumbai, MH", currentStock: 45, maxCapacity: 100 },
    { source: "Delhi, DL", currentStock: 62, maxCapacity: 120 },
    { source: "Bangalore, KA", currentStock: 72, maxCapacity: 110 },
    { source: "Hyderabad, TS", currentStock: 55, maxCapacity: 100 },
    { source: "Chennai, TN", currentStock: 68, maxCapacity: 90 },
    { source: "Pune, MH", currentStock: 78, maxCapacity: 105 },
    { source: "Kolkata, WB", currentStock: 48, maxCapacity: 95 },
    { source: "Ahmedabad, GJ", currentStock: 82, maxCapacity: 115 },
  ];

  const threshold = 80; // 80% capacity threshold

  return stockData.map((data) => {
    const utilization = (data.currentStock / data.maxCapacity) * 100;
    const deficiency = Math.max(0, threshold - utilization);
    
    let status: "critical" | "warning" | "optimal";
    if (utilization < 50) {
      status = "critical";
    } else if (utilization < threshold) {
      status = "warning";
    } else {
      status = "optimal";
    }

    return {
      source: data.source,
      currentStock: data.currentStock,
      maxCapacity: data.maxCapacity,
      utilization: Math.round(utilization),
      deficiency: Math.round(deficiency),
      status: status,
    };
  });
}

export const mockStockDeficiency = generateStockDeficiency();