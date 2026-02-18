import { Trip, TripStatus } from "@/lib/types";
import {
  Package,
  Truck,
  CheckCircle2,
} from "lucide-react";

interface KPICardsProps {
  trips: Trip[];
}

const kpiConfig: { label: string; status?: TripStatus; icon: typeof Package; colorClass: string }[] = [
  { label: "Total Shipments", icon: Package, colorClass: "text-primary" },
  { label: "Completed", status: "Completed", icon: CheckCircle2, colorClass: "text-status-completed" },
  { label: "In-Transit", status: "In-Transit", icon: Truck, colorClass: "text-status-in-transit" },
  { label: "Mapped", status: "Mapped", icon: Truck, colorClass: "text-yellow-500" },
  { label: "Trip Not Created", status: "Trip Not Created", icon: Package, colorClass: "text-gray-400" },
];

export default function KPICards({ trips }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {kpiConfig.map((kpi) => {
        const count = kpi.status ? trips.filter((t) => t.tripStatus === kpi.status).length : trips.length;
        return (
          <div
            key={kpi.label}
            className="glass-card rounded-xl p-4 animate-slide-up"
          >
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className={`h-5 w-5 ${kpi.colorClass}`} />
              <span className={`text-2xl font-bold ${kpi.colorClass}`}>{count}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
          </div>
        );
      })}
    </div>
  );
}
