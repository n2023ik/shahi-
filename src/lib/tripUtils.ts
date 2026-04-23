import type { Trip } from "./types";

export function isTripNotCreated(trip: Trip): boolean {
  return Boolean(trip.isTripNotCreated || trip.tripStatus === "Trip Not Created");
}
