import { Trip } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TripDetailModalProps {
  open: boolean;
  onClose: () => void;
  trip: Trip | null;
}

// Calculate delay in days
function calculateDelay(pickupRaisedOn: string, actualPickupDate: string): number | null {
  if (!pickupRaisedOn || !actualPickupDate) return null;
  
  try {
    const raised = new Date(pickupRaisedOn);
    const actual = new Date(actualPickupDate);
    const diffTime = actual.getTime() - raised.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

const statusBadgeClass: Record<string, string> = {
  Completed: "status-badge-completed",
  "In-Transit": "status-badge-in-transit",
  Mapped: "bg-yellow-500/20 text-yellow-500",
  "Trip Not Created": "bg-gray-500/20 text-gray-400",
};

export default function TripDetailModal({ open, onClose, trip }: TripDetailModalProps) {
  if (!trip) return null;

  const delay = calculateDelay(trip.pickupRaisedOn, trip.actualPickupDate);

  const fields: [string, string | number | null][] = [
    ["Trip ID", trip.tripId],
    ["Vehicle No.", trip.vehicleNo],
    ["Asset Tracker", trip.assetTracker],
    ["Transporter", trip.transporterName],
    ["Source", trip.sourceAddress],
    ["Destination", trip.destinationAddress],
    ["Trip Created", trip.tripCreationDate],
    ["Trip Completed", trip.tripCompletionDate || "—"],
    ["Pickup Raised On", trip.pickupRaisedOn],
    ["Actual Pickup", trip.actualPickupDate || "—"],
    ["Delivered", trip.deliveredDate || "—"],
    ["Packet Status", trip.packetStatus],
    ["Delay (Days)", delay !== null ? `${delay} days` : "—"],
    ["Task ID", trip.taskId],
    ["Zoho Ticket", trip.zohoTicketId],
    ["Remarks", trip.remarks || "—"],
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">Trip Details</DialogTitle>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusBadgeClass[trip.tripStatus])}>
              {trip.tripStatus}
            </span>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
          {fields.map(([label, value]) => (
            <div key={label} className={label === "Remarks" ? "col-span-2" : ""}>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
              <p className="text-sm mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
