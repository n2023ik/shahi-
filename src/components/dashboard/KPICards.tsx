import { Trip, TripStatus } from "@/lib/types";
import {
  Package,
  Truck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  trips: Trip[];
  selectedStatus?: string | null;
  onStatusClick?: (status: string | null) => void;
}

const kpiConfig: { label: string; status?: TripStatus; icon: typeof Package; colorClass: string; bgColor: string }[] = [
  { label: "Total Shipments", icon: Package, colorClass: "text-primary", bgColor: "bg-primary/5 hover:bg-primary/10" },
  { label: "Completed", status: "Completed", icon: CheckCircle2, colorClass: "text-status-completed", bgColor: "bg-status-completed/5 hover:bg-status-completed/10" },
  { label: "In-Transit", status: "In-Transit", icon: Truck, colorClass: "text-status-in-transit", bgColor: "bg-status-in-transit/5 hover:bg-status-in-transit/10" },
  { label: "Mapped", status: "Mapped", icon: Truck, colorClass: "text-yellow-500", bgColor: "bg-yellow-500/5 hover:bg-yellow-500/10" },
  { label: "Trip Not Created", status: "Trip Not Created", icon: Package, colorClass: "text-gray-400", bgColor: "bg-gray-500/5 hover:bg-gray-500/10" },
];

export default function KPICards({ trips, selectedStatus, onStatusClick }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {kpiConfig.map((kpi) => {
        const count = kpi.status ? trips.filter((t) => t.tripStatus === kpi.status).length : trips.length;
        const isSelected = selectedStatus === (kpi.status || "total");
        
        return (
          <div
            key={kpi.label}
            onClick={() => onStatusClick?.(kpi.status || null)}
            className={cn(
              "glass-card rounded-xl p-4 animate-slide-up transition-all duration-200",
              onStatusClick && "cursor-pointer",
              isSelected && "ring-2 ring-primary bg-primary/10",
              onStatusClick && !isSelected && kpi.bgColor
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2 rounded-lg", kpi.bgColor)}>
                <kpi.icon className={`h-5 w-5 ${kpi.colorClass}`} />
              </div>
              <span className={`text-2xl font-bold ${kpi.colorClass}`}>{count}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
            {isSelected && (
              <div className="flex items-center gap-1 mt-2 text-xs text-primary font-semibold">
                <span>Filtered</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
