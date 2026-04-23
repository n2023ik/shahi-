import { Trip, TripStatus } from "@/lib/types";
import {
  Package,
  Truck,
  CheckCircle2,
  ArrowRight,
  XCircle,
  Layers,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isTripNotCreated } from "@/lib/tripUtils";

interface KPICardsProps {
  trips: Trip[];
  selectedStatus?: string | null;
  onStatusClick?: (status: string | null) => void;
}

type KpiItem = {
  label: string;
  status?: TripStatus;
  icon: typeof Package;
  bg: string;
  iconBg: string;
};

const kpiConfig: KpiItem[] = [
  {
    label: "TOTAL SHIPMENTS",
    icon: Package,
    bg: "bg-[#1a5276]",
    iconBg: "bg-[#0e2f44]",
  },
  {
    label: "TRIP COMPLETED",
    status: "Trip Completed",
    icon: CheckCircle2,
    bg: "bg-[#1e7e5b]",
    iconBg: "bg-[#0f4a35]",
  },
  {
    label: "IN TRANSIT",
    status: "In Transit",
    icon: Truck,
    bg: "bg-[#1a6b8a]",
    iconBg: "bg-[#0d3f55]",
  },
  {
    label: "AWAITING DEPARTURE",
    status: "Awaiting to Departure",
    icon: ArrowRight,
    bg: "bg-[#9d6c1a]",
    iconBg: "bg-[#5e3f0e]",
  },
  {
    label: "TRIP NOT CREATED",
    status: "Trip Not Created",
    icon: Layers,
    bg: "bg-[#922b21]",
    iconBg: "bg-[#5b1a14]",
  },
  {
    label: "TRIP CANCELLED",
    status: "Trip Cancel",
    icon: XCircle,
    bg: "bg-[#7d3c8c]",
    iconBg: "bg-[#4e2358]",
  },
];

export default function KPICards({ trips, selectedStatus, onStatusClick }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpiConfig.map((kpi, index) => {
        const count = kpi.status
          ? kpi.status === "Trip Not Created"
            ? trips.filter((t) => isTripNotCreated(t)).length
            : trips.filter((t) => t.tripStatus === kpi.status).length
          : trips.length;

        const isSelected = selectedStatus === (kpi.status || "total");
        const Icon = kpi.icon;

        return (
          <div
            key={kpi.label}
            onClick={() => onStatusClick?.(kpi.status || null)}
            style={{ animationDelay: `${index * 60}ms` }}
            className={cn(
              "relative overflow-hidden rounded-xl p-4 select-none transition-all duration-200",
              kpi.bg,
              onStatusClick && "cursor-pointer",
              isSelected
                ? "ring-[3px] ring-white/60 brightness-110 shadow-2xl scale-[1.03]"
                : "hover:brightness-110 hover:shadow-lg"
            )}
          >
            {/* Icon — top right */}
            <div
              className={cn(
                "absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-full",
                kpi.iconBg
              )}
            >
              <Icon className="h-[18px] w-[18px] text-white/90" />
            </div>

            {/* Label */}
            <p className="text-[9px] font-bold tracking-[0.12em] text-white/65 uppercase leading-tight pr-10 mb-2">
              {kpi.label}
            </p>

            {/* Number */}
            <p className="text-[2.6rem] font-black text-white leading-none tracking-tight">
              {count}
            </p>

            {/* Footer */}
            <p className="text-[10px] text-white/40 mt-2 leading-none">
              {count === 1 ? "record" : "records"}
            </p>

            {/* Selected pulse dot */}
            {isSelected && (
              <span className="absolute bottom-2.5 right-3 w-2 h-2 rounded-full bg-white animate-pulse" />
            )}

            {/* Decorative circle */}
            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
}
