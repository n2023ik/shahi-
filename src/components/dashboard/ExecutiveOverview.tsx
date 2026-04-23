/**
 * EXECUTIVE OVERVIEW
 * High-level metrics for management reporting
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  XCircle,
} from "lucide-react";
import { ComprehensiveMetrics } from "@/lib/metricsEngine";
import { cn } from "@/lib/utils";

interface ExecutiveOverviewProps {
  metrics: ComprehensiveMetrics;
}

export default function ExecutiveOverview({ metrics }: ExecutiveOverviewProps) {
  const { shipment, pickup, inventory, locationRisks } = metrics;

  const highRiskLocations = locationRisks.filter(
    loc => loc.escalationLevel === "Escalation Required" || loc.escalationLevel === "Critical"
  );

  const kpis = [
    {
      label: "Total Shipments",
      value: shipment.totalShipmentCount,
      icon: Package,
      color: "blue",
      description: "All shipments tracked",
      trend: null,
    },
    {
      label: "On-Time Delivery",
      value: `${shipment.onTimeDeliveryRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: shipment.onTimeDeliveryRate >= 80 ? "green" : shipment.onTimeDeliveryRate >= 60 ? "yellow" : "red",
      description: "Within SLA (5 days)",
      trend: shipment.onTimeDeliveryRate >= 80 ? "up" : "down",
    },
    {
      label: "Avg Delivery Delay",
      value: `${shipment.avgDeliveryDelay.toFixed(1)} days`,
      icon: Clock,
      color: shipment.avgDeliveryDelay <= 5 ? "green" : shipment.avgDeliveryDelay <= 7 ? "yellow" : "red",
      description: "Average delay per shipment",
      trend: null,
    },
    {
      label: "RTO Rate",
      value: `${shipment.rtoRate.toFixed(1)}%`,
      icon: XCircle,
      color: shipment.rtoRate <= 3 ? "green" : shipment.rtoRate <= 7 ? "yellow" : "red",
      description: `${shipment.rtoShipments} returns`,
      trend: shipment.rtoRate <= 5 ? "up" : "down",
    },
    {
      label: "Stock Utilization",
      value: `${inventory.stockUtilizationRate.toFixed(1)}%`,
      icon: BarChart3,
      color: inventory.stockUtilizationRate >= 70 && inventory.stockUtilizationRate <= 90 
        ? "green" 
        : inventory.stockUtilizationRate > 90 
        ? "red" 
        : "yellow",
      description: `${inventory.availableStock}/${inventory.totalQuantity} available`,
      trend: null,
    },
    {
      label: "High-Risk Locations",
      value: highRiskLocations.length,
      icon: AlertTriangle,
      color: highRiskLocations.length === 0 ? "green" : highRiskLocations.length <= 2 ? "yellow" : "red",
      description: "Require immediate attention",
      trend: null,
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return "bg-green-50 text-green-700 border-green-200";
      case "yellow":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "red":
        return "bg-red-50 text-red-700 border-red-200";
      case "blue":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getIconColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return "text-green-600 bg-green-100";
      case "yellow":
        return "text-yellow-600 bg-yellow-100";
      case "red":
        return "text-red-600 bg-red-100";
      case "blue":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1">Executive Overview</h3>
        <p className="text-sm text-muted-foreground">
          Strategic metrics for management decision-making
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={index}
              className={cn(
                "border-2 transition-all hover:shadow-md",
                getColorClasses(kpi.color)
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium opacity-80 mb-1">
                      {kpi.label}
                    </p>
                    <p className="text-3xl font-bold mb-2">{kpi.value}</p>
                    <p className="text-xs opacity-70">{kpi.description}</p>
                  </div>
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      getIconColorClasses(kpi.color)
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                {kpi.trend && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp
                        className={cn(
                          "w-4 h-4",
                          kpi.trend === "down" && "rotate-180"
                        )}
                      />
                      <span className="font-medium">
                        {kpi.trend === "up" ? "Above" : "Below"} target
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pickup Performance</CardTitle>
            <CardDescription>Internal pickup operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <span className="text-lg font-bold">{pickup.pickupSuccessRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Delay</span>
              <Badge variant={pickup.avgPickupDelay <= 2 ? "default" : "destructive"}>
                {pickup.avgPickupDelay.toFixed(1)} days
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Pickups</span>
              <Badge variant={pickup.pickupsPending > 5 ? "destructive" : "secondary"}>
                {pickup.pickupsPending}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Delayed Pickups</span>
              <Badge variant={pickup.pickupsDelayed > 0 ? "destructive" : "outline"}>
                {pickup.pickupsDelayed}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Health</CardTitle>
            <CardDescription>Warehouse stock status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Stock</span>
              <span className="text-lg font-bold">{inventory.totalQuantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available</span>
              <Badge variant="default">{inventory.availableStock}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Damage/Offline</span>
              <Badge variant={inventory.damageStock + inventory.offlineStock > 10 ? "destructive" : "outline"}>
                {inventory.damageStock + inventory.offlineStock}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Deficiency Rate</span>
              <Badge variant={inventory.stockDeficiencyRate > 50 ? "destructive" : "secondary"}>
                {inventory.stockDeficiencyRate.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
