export interface Trip {
  sNo: number;
  tripCreationDate: string;
  tripCompletionDate: string;
  tripId: string;
  vehicleNo: string;
  assetTracker: string;
  sourceAddress: string;
  destinationAddress: string;
  transporterName: string;
  tripStatus: TripStatus;
  packetStatus: string;
  pickupStatus: string; // "Pickup Raised", "Pickup Done", etc.
  pickupRaisedOn: string;
  taskId: string;
  zohoTicketId: string;
  actualPickupDate: string;
  deliveredDate: string;
  remarks: string;
  isTripNotCreated?: boolean;
  deviceCount?: number;
  serialNumbers?: string[];
}

export type TripStatus = "Trip Completed" | "In Transit" | "Awaiting to Departure" | "Trip Not Created" | "Offline";

export interface KPIData {
  label: string;
  value: number;
  icon: string;
  change?: number;
  status?: TripStatus;
}

// Shahi Dashboard Location Data Structure
export interface LocationMetrics {
  locationName: string;
  totalShipmentCount: number;
  inTransitTrips: number;
  completedTrips: number;
  totalPickupRaisedInternal: number;
  totalPickupCompleted: number;
  confirmationPending: number;
  rtoShipments: number;
  deliveredAtShahiFactory: number;
  available: number;
  stockDamageOffline: number;
  totalQuantity: number;
  lost: number;
  nonRepairableDevices: number;
  offlineDevices: number;
  maxCapacity?: number; // Optional: for stock utilization calculation
  pickupRaisedDate?: string; // For delay calculation
  actualPickupDate?: string; // For delay calculation
}

export interface GlobalSummary {
  completedTrips: number;
  totalPickupRaisedInternal: number;
  totalPickupCompleted: number;
  confirmationPending: number;
  rtoShipments: number;
  deliveredAtShahiFactory: number;
  available: number;
  stockDamageOffline: number;
  totalQuantity: number;
  lost: number;
  nonRepairableDevices: number;
  offlineDevices: number;
}

export interface DashboardData {
  globalSummary: GlobalSummary;
  locations: LocationMetrics[];
}

export interface StockDeficiency {
  source: string;
  devicesInUse: number;     // device in use from sheets
  availableDevices: number; // device avilable from sheets
  maxCapacity: number;
  utilization: number; // percentage (0-100)
  deficiency: number;  // devices below 80% threshold
  status: "critical" | "warning" | "optimal";
}

export interface DeviceUtilization {
  source: string;
  devicesInUse: number;
  devicesAvailable: number;
  totalDevices: number;
  utilizationPercentage: number;
  isHighUtilization: boolean; // true if >= 80%
}

export interface OverallDeviceMetrics {
  totalDevicesInUse: number;
  totalDevicesAvailable: number;
  totalDevices: number;
  overallUtilization: number;
  sourceBreakdown: DeviceUtilization[];
}

export interface SourcePickupMetrics {
  source: string;
  pickupRaised: number;   // "Pickup Raised" count
  pickupDone: number;     // "Pickup Done" count
  total: number;
}

export interface PickupStatusMetrics {
  sourceBreakdown: SourcePickupMetrics[];
  totalPickupRaised: number;
  totalPickupDone: number;
}

