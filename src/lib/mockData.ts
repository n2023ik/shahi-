import { Trip, TripStatus } from "./types";

const statuses: TripStatus[] = ["Completed", "In-Transit", "Mapped", "Trip Not Created"];
const transporters = ["BlueDart Express", "Delhivery", "DTDC", "Ecom Express", "XpressBees", "Shadowfax", "Rivigo"];
const sources = ["Mumbai, MH", "Delhi, DL", "Bangalore, KA", "Hyderabad, TS", "Chennai, TN", "Pune, MH", "Kolkata, WB", "Ahmedabad, GJ"];
const destinations = ["Jaipur, RJ", "Lucknow, UP", "Chandigarh, CH", "Indore, MP", "Nagpur, MH", "Patna, BR", "Bhopal, MP", "Kochi, KL"];

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split("T")[0];
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockTrips(count = 47): Trip[] {
  return Array.from({ length: count }, (_, i) => {
    const status = randomPick(statuses);
    const creationDate = randomDate(new Date("2025-01-01"), new Date("2025-02-15"));
    const completionDate = status === "Completed" ? randomDate(new Date(creationDate), new Date("2025-02-18")) : "";
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
      packetStatus: status === "Completed" ? "Delivered" : status === "In-Transit" ? "In Transit" : "Pending",
      pickupRaisedOn: status === "Trip Not Created" ? "" : creationDate,
      taskId: `TSK-${Math.floor(10000 + Math.random() * 90000)}`,
      zohoTicketId: `ZH-${Math.floor(100000 + Math.random() * 900000)}`,
      actualPickupDate: (status === "In-Transit" || status === "Completed") ? randomDate(new Date(creationDate), new Date("2025-02-18")) : "",
      deliveredDate: status === "Completed" ? completionDate : "",
      remarks: "",
    };
  });
}

export const mockTrips = generateMockTrips(47);
