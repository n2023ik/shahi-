import { useMemo } from "react";
import { LocationMetrics } from "@/lib/types";
import { AlertTriangle, Clock } from "lucide-react";

interface DelayedPickupsProps {
  locations?: LocationMetrics[]; // safe optional
}

interface DelayedPickup {
  location: string;
  daysDelayed: number;
  pickupRaisedDate: string;
  actualPickupDate: string;
  pendingCount: number;
}

/* =============================
   DATE HELPERS (Reusable + Safe)
============================= */

const parseDDMMYYYY = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  
  // Handle DD/MM/YYYY format
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;

    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = Number(parts[2]);

    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Handle ISO format (YYYY-MM-DD or full ISO string)
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const calculateDaysDelayed = (
  pickupRaisedDate?: string,
  actualPickupDate?: string
): number | null => {
  const raisedDate = parseDDMMYYYY(pickupRaisedDate);
  if (!raisedDate) return null;

  const actualDate = actualPickupDate
    ? parseDDMMYYYY(actualPickupDate)
    : new Date();

  if (!actualDate) return null;

  const diffTime = actualDate.getTime() - raisedDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/* =============================
   COMPONENT
============================= */

export default function DelayedPickups({
  locations = [],
}: DelayedPickupsProps) {
  const delayedPickups = useMemo<DelayedPickup[]>(() => {
    const result: DelayedPickup[] = [];

    locations.forEach((location) => {
      const daysDelayed = calculateDaysDelayed(
        location.pickupRaisedDate,
        location.actualPickupDate
      );

      const pendingCount =
        location.confirmationPending +
        Math.max(
          0,
          location.totalPickupRaisedInternal - location.totalPickupCompleted
        );

      if (daysDelayed !== null && daysDelayed > 3) {
        result.push({
          location: location.locationName,
          daysDelayed,
          pickupRaisedDate: location.pickupRaisedDate || "Unknown",
          actualPickupDate: location.actualPickupDate || "Pending",
          pendingCount,
        });
      } else if (pendingCount > 0) {
        // If no valid date but still pending pickups
        result.push({
          location: location.locationName,
          daysDelayed: 4, // conservative default
          pickupRaisedDate: location.pickupRaisedDate || "Unknown",
          actualPickupDate: "Pending",
          pendingCount,
        });
      }
    });

    return result.sort((a, b) => b.daysDelayed - a.daysDelayed);
  }, [locations]);

  if (delayedPickups.length === 0) {
    return (
      <div className="bg-slate-900 border border-green-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-green-500" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              No Delayed Pickups
            </h3>
            <p className="text-xs text-slate-400">
              All pickups are currently on schedule
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Delayed Pickups (&gt;3 Days)
          </h3>
          <p className="text-xs text-slate-400">
            {delayedPickups.length} location(s) affected
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {delayedPickups.map((item) => {
          const critical = item.daysDelayed > 3;

          return (
            <div
              key={item.location}
              className={`p-4 rounded-xl border transition-all ${
                critical
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">
                    {item.location}
                  </h4>
                  <div className="text-xs text-slate-400 space-x-4">
                    <span>Raised: {item.pickupRaisedDate}</span>
                    <span>Status: {item.actualPickupDate}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
                      critical ? "text-red-500" : "text-amber-400"
                    }`}
                  >
                    {item.daysDelayed} days
                  </div>
                  <div className="text-xs text-slate-400">delayed</div>
                </div>
              </div>

              {item.pendingCount > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
                  {item.pendingCount} pickup(s) pending confirmation
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
