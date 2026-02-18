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
  pickupRaisedOn: string;
  taskId: string;
  zohoTicketId: string;
  actualPickupDate: string;
  deliveredDate: string;
  remarks: string;
}

export type TripStatus = "Completed" | "In-Transit" | "Mapped" | "Trip Not Created";

export interface KPIData {
  label: string;
  value: number;
  icon: string;
  change?: number;
  status?: TripStatus;
}
