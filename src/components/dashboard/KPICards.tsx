import { Trip, TripStatus } from "@/lib/types";
import {
  Package,
  Truck,
  CheckCircle2,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isTripNotCreated } from "@/lib/tripUtils";

interface KPICardsProps {
  trips: Trip[];
  selectedStatus?: string | null;
  onStatusClick?: (status: string | null) => void;
}

const kpiConfig: { label: string; status?: TripStatus; icon: typeof Package; colorClass: string; bgColor: string; gradient: string }[] = [
  { 
    label: "Total Shipments", 
    icon: Package, 
    colorClass: "text-blue-600", 
    bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200",
    gradient: "from-blue-400 to-blue-600"
  },
  { 
    label: "Trip Completed", 
    status: "Trip Completed", 
    icon: CheckCircle2, 
    colorClass: "text-green-600", 
    bgColor: "bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200",
    gradient: "from-green-400 to-green-600"
  },
  { 
    label: "In Transit", 
    status: "In Transit", 
    icon: Truck, 
    colorClass: "text-cyan-600", 
    bgColor: "bg-gradient-to-br from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200",
    gradient: "from-cyan-400 to-cyan-600"
  },
  { 
    label: "Awaiting to Departure", 
    status: "Awaiting to Departure", 
    icon: ArrowRight, 
    colorClass: "text-amber-600", 
    bgColor: "bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200",
    gradient: "from-amber-400 to-amber-600"
  },
  { 
    label: "Trip Not Created", 
    status: "Trip Not Created", 
    icon: XCircle, 
    colorClass: "text-red-600", 
    bgColor: "bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200",
    gradient: "from-red-400 to-red-600"
  },
];

export default function KPICards({ trips, selectedStatus, onStatusClick }: KPICardsProps) {
  console.log("[KPICards] Received trips:", trips.length);
  if (trips.length > 0) {
    console.log("[KPICards] First trip:", { date: trips[0].tripCreationDate, status: trips[0].tripStatus, id: trips[0].tripId });
    console.log("[KPICards] All statuses:", trips.map(t => t.tripStatus));
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
      {kpiConfig.map((kpi, index) => {
        const count = kpi.status
          ? kpi.status === "Trip Not Created"
            ? trips.filter((t) => isTripNotCreated(t)).length
            : trips.filter((t) => t.tripStatus === kpi.status).length
          : trips.length;
        console.log(`[KPICards] ${kpi.label}: count=${count}, status="${kpi.status}"`);
        const isSelected = selectedStatus === (kpi.status || "total");
        
        return (
          <div
            key={kpi.label}
            onClick={() => onStatusClick?.(kpi.status || null)}
            style={{ animationDelay: `${index * 100}ms` }}
            className={cn(
              "relative overflow-hidden rounded-2xl p-5 shadow-lg transition-all duration-300 animate-slide-up",
              "border-2 border-transparent",
              onStatusClick && "cursor-pointer hover:scale-105 hover:shadow-xl",
              isSelected ? "ring-4 ring-primary/50 border-primary scale-105 shadow-2xl" : kpi.bgColor
            )}
          >
            {/* Gradient background overlay */}
            {isSelected && (
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", kpi.gradient)} />
            )}
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "p-3 rounded-xl shadow-md transition-transform duration-300",
                  `bg-gradient-to-br ${kpi.gradient}`,
                  isSelected && "scale-110"
                )}>
                  <kpi.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-3xl font-bold tracking-tight transition-all duration-300",
                    kpi.colorClass,
                    isSelected && "scale-110"
                  )}>
                    {count}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">{kpi.label}</p>
                {isSelected && (
                  <div className="flex items-center gap-1.5 text-xs text-primary font-bold animate-pulse">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span>Active Filter</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Decorative corner accent */}
            <div className={cn(
              "absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-20",
              `bg-gradient-to-br ${kpi.gradient}`
            )} />
          </div>
        );
      })}
    </div>
  );
}
