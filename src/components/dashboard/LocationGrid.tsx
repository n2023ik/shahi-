import { useMemo } from "react";
import { LocationMetrics } from "@/lib/types";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Box,
  XCircle,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationGridProps {
  locations?: LocationMetrics[];
}

export default function LocationGrid({ locations = [] }: LocationGridProps) {
  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No location data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {locations.map((location) => (
        <LocationCard
          key={location.locationName}
          location={location}
        />
      ))}
    </div>
  );
}

/* =============================
   LOCATION CARD
============================= */

interface LocationCardProps {
  location: LocationMetrics;
}

function LocationCard({ location }: LocationCardProps) {
  const utilizationPercent = useMemo(() => {
    if (!location.totalShipmentCount) return 0;

    return Math.round(
      ((location.totalShipmentCount - location.completedTrips) /
        location.totalShipmentCount) *
        100
    );
  }, [location.totalShipmentCount, location.completedTrips]);

  const isHigh = utilizationPercent >= 90;
  const isMedium = utilizationPercent >= 70 && utilizationPercent < 90;

  const metrics = useMemo(
    () => [
      {
        icon: Package,
        label: "Total Shipments",
        value: location.totalShipmentCount,
        color: "text-blue-500",
      },
      {
        icon: Truck,
        label: "In Transit",
        value: location.inTransitTrips,
        color: "text-cyan-500",
      },
      {
        icon: CheckCircle2,
        label: "Completed",
        value: location.completedTrips,
        color: "text-green-500",
      },
      {
        icon: Clock,
        label: "Pickup Raised",
        value: location.totalPickupRaisedInternal,
        color: "text-amber-500",
        sub:
          location.totalPickupCompleted > 0
            ? `${location.totalPickupCompleted} completed`
            : undefined,
      },
      {
        icon: AlertCircle,
        label: "Pending Confirm",
        value: location.confirmationPending,
        color:
          location.confirmationPending > 0
            ? "text-orange-500"
            : "text-slate-400",
        highlight: location.confirmationPending > 0,
      },
      {
        icon: CheckCircle2,
        label: "At Shahi Factory",
        value: location.deliveredAtShahiFactory,
        color: "text-emerald-500",
      },
    ],
    [location]
  );

  const stockMetrics = useMemo(
    () => [
      {
        icon: Box,
        label: "Total Quantity",
        value: location.totalQuantity,
        color: "text-purple-500",
      },
      {
        icon: XCircle,
        label: "Lost",
        value: location.lost,
        color: "text-red-500",
      },
      {
        icon: Wrench,
        label: "Non-repairable",
        value: location.nonRepairableDevices,
        color: "text-red-500",
      },
      {
        icon: AlertCircle,
        label: "Offline",
        value: location.offlineDevices,
        color: "text-orange-500",
      },
    ],
    [location]
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900 shadow-sm transition-all hover:border-slate-600",
        isHigh && "ring-2 ring-red-500/50",
        isMedium && "ring-2 ring-amber-500/40"
      )}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 line-clamp-2">
          {location.locationName}
        </h3>

        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Utilization</span>
            <span
              className={cn(
                "font-semibold",
                isHigh
                  ? "text-red-500"
                  : isMedium
                  ? "text-amber-400"
                  : "text-blue-400"
              )}
            >
              {utilizationPercent}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                isHigh
                  ? "bg-red-500"
                  : isMedium
                  ? "bg-amber-500"
                  : "bg-blue-500"
              )}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* MAIN METRICS */}
      <div className="p-4 space-y-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={cn(
              "flex items-center justify-between text-sm",
              m.highlight && "bg-orange-500/10 p-2 rounded-md"
            )}
          >
            <div className="flex items-center gap-2">
              <m.icon className={cn("h-4 w-4", m.color)} />
              <div>
                <div className="text-slate-400 text-xs">{m.label}</div>
                {m.sub && (
                  <div className="text-[10px] text-slate-500">{m.sub}</div>
                )}
              </div>
            </div>
            <div className={cn("font-bold", m.color)}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* STOCK SECTION */}
      <div className="border-t border-slate-800 p-4">
        <div className="text-[11px] uppercase text-slate-500 font-semibold mb-3">
          Stock Details
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stockMetrics.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-2 text-xs"
            >
              <m.icon className={cn("h-3.5 w-3.5", m.color)} />
              <div className="flex-1">
                <div className="text-slate-500">{m.label}</div>
                <div className={cn("font-semibold", m.color)}>
                  {m.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
