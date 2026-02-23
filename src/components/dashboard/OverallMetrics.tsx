import { useMemo } from "react";
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

export default function OverallMetrics({
  metrics = null,
}: OverallMetricsProps) {
  const data = metrics ?? EMPTY_METRICS;

  // KPI metrics - focused on 8 key indicators
  const kpis = useMemo(() => [
    {
      key: "totalShipments",
      label: "Total Shipments",
      value: data.totalShipmentCount,
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      key: "inTransit",
      label: "In-Transit",
      value: data.inTransitTrips,
      icon: Truck,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      key: "completed",
      label: "Completed",
      value: data.completedTrips,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      key: "pickupDelayed",
      label: "Pickup Delayed (>3D)",
      value: data.delayedTripsOver3Days,
      icon: Clock,
      color: data.delayedTripsOver3Days > 0 ? "text-red-500" : "text-gray-500",
      bgColor: data.delayedTripsOver3Days > 0 ? "bg-red-50" : "bg-gray-50",
    },
    {
      key: "rto",
      label: "RTO Shipments",
      value: data.rtoShipments,
      icon: AlertTriangle,
      color: data.rtoShipments > 0 ? "text-red-500" : "text-gray-500",
      bgColor: data.rtoShipments > 0 ? "bg-red-50" : "bg-gray-50",
    },
    {
      key: "assetsTracked",
      label: "Assets Tracked",
      value: data.totalQuantity,
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      key: "lossDamage",
      label: "Loss/Damage",
      value: data.lost + data.nonRepairableDevices + data.offlineDevices,
      icon: AlertCircle,
      color: data.lost + data.nonRepairableDevices + data.offlineDevices > 0 ? "text-red-500" : "text-gray-500",
      bgColor: data.lost + data.nonRepairableDevices + data.offlineDevices > 0 ? "bg-red-50" : "bg-gray-50",
    },
    {
      key: "delivered",
      label: "Delivered (Shahi)",
      value: data.deliveredAtFactory,
      icon: CheckSquare2,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
  ], [data]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Key operational metrics at a glance
        </p>
      </div>

      {/* KPI Cards Grid - 4 columns on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.key}
              className={cn(
                "rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow",
                kpi.bgColor
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={cn("text-sm font-medium mb-2", kpi.color)}>
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {kpi.value.toLocaleString()}
                  </p>
                </div>
                <Icon className={cn("h-8 w-8 opacity-20", kpi.color)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
