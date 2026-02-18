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
    // Parse MM/DD/YYYY format
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split("/");
      if (parts.length !== 3) return null;
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return new Date(year, month - 1, day); // month is 0-indexed in Date
    };
    
    const raised = parseDate(pickupRaisedOn);
    const actual = parseDate(actualPickupDate);
    
    if (!raised || !actual) return null;
    
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
    ["Task ID", trip.taskId],
    ["Zoho Ticket", trip.zohoTicketId],
    ["Remarks", trip.remarks || "—"],
  ];

  const getDelayColor = (delayDays: number | null) => {
    if (delayDays === null) return "text-muted-foreground";
    return delayDays < 5 ? "text-green-500" : "text-red-500";
  };

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
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Delay (Days)</p>
            <p className={cn("text-sm mt-0.5 font-semibold", getDelayColor(delay))}>
              {delay !== null ? `${delay} days` : "—"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
