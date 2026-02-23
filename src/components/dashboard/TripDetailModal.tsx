import { useMemo } from "react";
import { Trip } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TripDetailModalProps {
  open: boolean;
  onClose: () => void;
  trip: Trip | null;
}

/* =========================
   DATE UTILS
========================= */

function parseDDMMYYYY(dateStr?: string): Date | null {
  if (!dateStr) return null;

  // Handle DD/MM/YYYY format
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;

    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    if (
      !day ||
      !month ||
      !year ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    )
      return null;

    const date = new Date(year, month - 1, day);

    // Extra validation to prevent invalid rollovers
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // Handle ISO format (YYYY-MM-DD or full ISO string)
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function calculateDelay(
  raisedOn?: string,
  actualPickup?: string
): number | null {
  const raised = parseDDMMYYYY(raisedOn);
  const actual = parseDDMMYYYY(actualPickup);

  if (!raised || !actual) return null;

  const diff =
    (actual.getTime() - raised.getTime()) /
    (1000 * 60 * 60 * 24);

  if (diff < 0) return 0; // early pickup = 0 delay

  return Math.ceil(diff);
}

/* =========================
   STATUS STYLES
========================= */

const statusBadgeClass: Record<string, string> = {
  "Trip Completed":
    "bg-green-100 text-green-700 border border-green-200",
  "In Transit":
    "bg-blue-100 text-blue-700 border border-blue-200",
  "Awaiting to Departure":
    "bg-yellow-100 text-yellow-700 border border-yellow-200",
  "Trip Not Created":
    "bg-red-100 text-red-700 border border-red-200",
};

export default function TripDetailModal({
  open,
  onClose,
  trip,
}: TripDetailModalProps) {
  const delay = useMemo(
    () =>
      trip
        ? calculateDelay(
            trip.pickupRaisedOn,
            trip.actualPickupDate
          )
        : null,
    [trip]
  );

  const getDelayColor = (d: number | null) => {
    if (d === null) return "text-muted-foreground";
    if (d <= 3) return "text-green-500";
    return "text-red-500";
  };

  const fields: [string, string | number | undefined][] =
    trip
      ? [
          ["Trip ID", trip.tripId],
          ["Vehicle No.", trip.vehicleNo],
          ["Asset Tracker", trip.assetTracker],
          ["Transporter", trip.transporterName],
          ["Source", trip.sourceAddress],
          ["Destination", trip.destinationAddress],
          ["Trip Created", trip.tripCreationDate],
          ["Trip Completed", trip.tripCompletionDate],
          ["Pickup Raised On", trip.pickupRaisedOn],
          ["Actual Pickup", trip.actualPickupDate],
          ["Delivered", trip.deliveredDate],
          ["Packet Status", trip.packetStatus],
          ["Task ID", trip.taskId],
          ["Zoho Ticket", trip.zohoTicketId],
          ["Remarks", trip.remarks],
        ]
      : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-white shadow-xl border">
        <DialogHeader>
          <div className="flex items-center justify-between border-b pb-3">
            <DialogTitle className="text-xl font-bold">
              Trip Details
            </DialogTitle>

            {trip && (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  statusBadgeClass[trip.tripStatus] ??
                    "bg-gray-200 text-gray-700"
                )}
              >
                {trip.tripStatus}
              </span>
            )}
          </div>
        </DialogHeader>

        {!trip ? (
          <div className="py-10 text-center text-muted-foreground">
            No trip selected
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-6">
            {fields.map(([label, value]) => (
              <div
                key={label}
                className={
                  label === "Remarks"
                    ? "col-span-2 bg-slate-50 p-3 rounded-lg"
                    : "p-2"
                }
              >
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">
                  {label}
                </p>
                <p className="text-sm font-medium text-slate-800">
                  {value || "—"}
                </p>
              </div>
            ))}

            <div className="p-2">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">
                Delay (Days)
              </p>
              <p
                className={cn(
                  "text-sm font-bold",
                  getDelayColor(delay)
                )}
              >
                {delay !== null ? `${delay} days` : "—"}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}