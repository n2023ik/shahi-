import { OverviewDashboardMetrics } from "@/lib/metricsEngine";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  AlertCircle,
  CheckSquare2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MetricCard = {
  key: string;
  label: string;
  value: number | string;
  icon: typeof Package;
  bg: string;
  iconBg: string;
  alert?: boolean;
};

interface OverallMetricsProps {
  metrics?: OverviewDashboardMetrics | null;
}

// Safe fallback object
const EMPTY_METRICS: OverviewDashboardMetrics = {
  totalShipmentCount: 0,
  inTransitTrips: 0,
  completedTrips: 0,
  totalPickupRaisedInternal: 0,
  totalPickupCompleted: 0,
  confirmationPending: 0,
  rtoShipments: 0,
  deliveredAtFactory: 0,
  availableStock: 0,
  totalQuantity: 0,
  lost: 0,
  nonRepairableDevices: 0,
  offlineDevices: 0,
  delayedTripsOver3Days: 0,
  stockDeficiencyUnits: 0,
  calculatedAt: new Date(),
  totalLocations: 0,
};

const CARD_DEFS: Array<{
  key: keyof typeof EMPTY_METRICS | "lossDamage";
  label: string;
  icon: typeof Package;
  bg: string;
  iconBg: string;
  alert?: boolean;
}> = [
  { key: "totalShipmentCount",   label: "TOTAL SHIPMENTS",      icon: Package,       bg: "bg-[#1a5276]", iconBg: "bg-[#0e2f44]" },
  { key: "inTransitTrips",       label: "IN TRANSIT",           icon: Truck,         bg: "bg-[#1a6b8a]", iconBg: "bg-[#0d3f55]" },
  { key: "completedTrips",       label: "TRIP COMPLETED",       icon: CheckCircle2,  bg: "bg-[#1e7e5b]", iconBg: "bg-[#0f4a35]" },
  { key: "delayedTripsOver3Days",label: "PICKUP DELAYED >3D",   icon: Clock,         bg: "bg-[#922b21]", iconBg: "bg-[#5b1a14]", alert: true },
  { key: "rtoShipments",         label: "RTO SHIPMENTS",        icon: AlertTriangle, bg: "bg-[#7d3c1a]", iconBg: "bg-[#4e2410]", alert: true },
  { key: "totalQuantity",        label: "ASSETS TRACKED",       icon: BarChart3,     bg: "bg-[#5b3c8a]", iconBg: "bg-[#38245e]" },
  { key: "lossDamage",           label: "LOSS / DAMAGE",        icon: AlertCircle,   bg: "bg-[#7b1e3a]", iconBg: "bg-[#4e1225]", alert: true },
  { key: "deliveredAtFactory",   label: "DELIVERED (SHAHI)",    icon: CheckSquare2,  bg: "bg-[#1e6b5b]", iconBg: "bg-[#0f3e34]" },
];

export default function OverallMetrics({ metrics = null }: OverallMetricsProps) {
  const data = metrics ?? EMPTY_METRICS;

  const getValue = (key: string): number => {
    if (key === "lossDamage") return data.lost + data.nonRepairableDevices + data.offlineDevices;
    return (data as Record<string, unknown>)[key] as number ?? 0;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Overview</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Key operational metrics</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {CARD_DEFS.map((card, i) => {
          const Icon = card.icon;
          const value = getValue(card.key);
          const isAlert = card.alert && value > 0;

          return (
            <div
              key={card.key}
              style={{ animationDelay: `${i * 50}ms` }}
              className={cn(
                "relative overflow-hidden rounded-xl p-3.5 transition-all duration-200 hover:brightness-110 hover:shadow-lg",
                isAlert ? "bg-[#7f1d1d]" : card.bg
              )}
            >
              {/* icon */}
              <div
                className={cn(
                  "absolute top-2.5 right-2.5 flex items-center justify-center w-8 h-8 rounded-full",
                  isAlert ? "bg-black/30" : card.iconBg
                )}
              >
                <Icon className="h-4 w-4 text-white/90" />
              </div>

              {/* label */}
              <p className="text-[8px] font-bold tracking-[0.1em] text-white/60 uppercase leading-tight pr-9 mb-1.5">
                {card.label}
              </p>

              {/* value */}
              <p className={cn(
                "text-[2.1rem] font-black text-white leading-none tracking-tight",
                isAlert && "text-red-200"
              )}>
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>

              {isAlert && (
                <p className="text-[9px] text-red-300 font-semibold mt-1 uppercase tracking-wide">
                  Alert
                </p>
              )}

              {/* decorative circle */}
              <div className="absolute -bottom-5 -right-5 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
