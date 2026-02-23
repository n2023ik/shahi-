/**
 * INVENTORY CONTROL
 * Warehouse inventory management and capacity monitoring
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  PackageX,
  Archive,
  BarChart3,
} from "lucide-react";
import { LocationMetrics } from "@/lib/types";
import { InventoryMetrics } from "@/lib/metricsEngine";
import { cn } from "@/lib/utils";

interface InventoryControlProps {
  inventory: InventoryMetrics;
  locations: LocationMetrics[];
}

export default function InventoryControl({ inventory, locations }: InventoryControlProps) {
  // Calculate stock by age buckets (mock - would need dates in real data)
  const agingBuckets = [
    { label: "0-7 days", count: Math.floor(inventory.availableStock * 0.6), status: "good" },
    { label: "8-15 days", count: Math.floor(inventory.availableStock * 0.3), status: "warn" },
    { label: "16+ days", count: Math.floor(inventory.availableStock * 0.1), status: "alert" },
  ];

  // Identify locations with capacity issues
  const criticalLocations = locations.filter(loc => {
    const maxCap = loc.maxCapacity || loc.totalQuantity || 100;
    const utilization = (loc.totalQuantity / maxCap) * 100;
    return utilization > 90;
  });

  const lowStockLocations = locations.filter(loc => {
    const available = loc.available || 0;
    const total = loc.totalQuantity || 1;
    return (available / total) < 0.3;
  });

  // Capacity status
  const getCapacityStatus = () => {
    if (inventory.stockUtilizationRate > 90) return { label: "Critical", color: "red", variant: "destructive" as const };
    if (inventory.stockUtilizationRate > 75) return { label: "High", color: "yellow", variant: "default" as const };
    return { label: "Optimal", color: "green", variant: "secondary" as const };
  };

  const capacityStatus = getCapacityStatus();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1">Inventory Control</h3>
        <p className="text-sm text-muted-foreground">
          Warehouse stock management and capacity monitoring
        </p>
      </div>

      {/* Overall Inventory Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-blue-600" />
              <Badge variant="secondary">{inventory.totalQuantity}</Badge>
            </div>
            <div className="text-sm font-medium text-blue-900">Total Stock</div>
            <div className="text-xs text-blue-600 mt-1">All inventory items</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Archive className="w-8 h-8 text-green-600" />
              <Badge variant="secondary">{inventory.availableStock}</Badge>
            </div>
            <div className="text-sm font-medium text-green-900">Available</div>
            <div className="text-xs text-green-600 mt-1">
              {((inventory.availableStock / inventory.totalQuantity) * 100).toFixed(0)}% of total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <PackageX className="w-8 h-8 text-orange-600" />
              <Badge variant="secondary">
                {inventory.damageStock + inventory.offlineStock}
              </Badge>
            </div>
            <div className="text-sm font-medium text-orange-900">Damage/Offline</div>
            <div className="text-xs text-orange-600 mt-1">
              {(((inventory.damageStock + inventory.offlineStock) / inventory.totalQuantity) * 100).toFixed(0)}% defective
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <Badge variant="secondary">{inventory.lostStock}</Badge>
            </div>
            <div className="text-sm font-medium text-red-900">Lost Items</div>
            <div className="text-xs text-red-600 mt-1">Require investigation</div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization & Deficiency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Stock Utilization
              <Badge variant={capacityStatus.variant}>{capacityStatus.label}</Badge>
            </CardTitle>
            <CardDescription>Current capacity usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Utilization Rate</span>
                <span className="text-2xl font-bold">
                  {inventory.stockUtilizationRate.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={inventory.stockUtilizationRate} 
                className={cn(
                  "h-3",
                  inventory.stockUtilizationRate > 90 && "bg-red-200",
                  inventory.stockUtilizationRate > 75 && inventory.stockUtilizationRate <= 90 && "bg-yellow-200"
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Current</div>
                <div className="text-xl font-bold">{inventory.totalQuantity}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Max Capacity</div>
                <div className="text-xl font-bold">{inventory.maxCapacity}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Deficiency</CardTitle>
            <CardDescription>Availability vs demand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Deficiency Rate</span>
                <span className="text-2xl font-bold">
                  {inventory.stockDeficiencyRate.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={inventory.stockDeficiencyRate} 
                className={cn(
                  "h-3",
                  inventory.stockDeficiencyRate > 50 && "bg-red-200"
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Available</div>
                <div className="text-xl font-bold">{inventory.availableStock}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Unavailable</div>
                <div className="text-xl font-bold">
                  {inventory.maxCapacity - inventory.availableStock}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Buckets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory Aging</CardTitle>
          <CardDescription>Stock distribution by age</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agingBuckets.map((bucket, index) => (
              <div key={index}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{bucket.label}</span>
                  <span className="text-sm font-bold">{bucket.count} units</span>
                </div>
                <Progress 
                  value={(bucket.count / inventory.availableStock) * 100} 
                  className={cn(
                    "h-2",
                    bucket.status === "alert" && "bg-red-200",
                    bucket.status === "warn" && "bg-yellow-200"
                  )}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capacity Alerts */}
      {(criticalLocations.length > 0 || lowStockLocations.length > 0) && (
        <div className="space-y-4">
          {criticalLocations.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Capacity Alert</AlertTitle>
              <AlertDescription>
                {criticalLocations.length} location(s) exceeding 90% capacity:
                <div className="mt-2 space-y-1">
                  {criticalLocations.slice(0, 3).map((loc) => {
                    const maxCap = loc.maxCapacity || loc.totalQuantity || 100;
                    const utilization = (loc.totalQuantity / maxCap) * 100;
                    return (
                      <div key={loc.locationName} className="text-sm flex justify-between">
                        <span>{loc.locationName}</span>
                        <Badge variant="destructive">{utilization.toFixed(0)}%</Badge>
                      </div>
                    );
                  })}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {lowStockLocations.length > 0 && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-900">Low Stock Warning</AlertTitle>
              <AlertDescription className="text-yellow-800">
                {lowStockLocations.length} location(s) below 30% availability:
                <div className="mt-2 space-y-1">
                  {lowStockLocations.slice(0, 3).map((loc) => {
                    const available = loc.available || 0;
                    const total = loc.totalQuantity || 1;
                    const percent = (available / total) * 100;
                    return (
                      <div key={loc.locationName} className="text-sm flex justify-between">
                        <span>{loc.locationName}</span>
                        <Badge variant="outline">{percent.toFixed(0)}% available</Badge>
                      </div>
                    );
                  })}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Detail Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Damage Stock</span>
              <Badge variant="destructive">{inventory.damageStock}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Offline Devices</span>
              <Badge variant="secondary">{inventory.offlineStock}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Non-Repairable</span>
              <Badge variant="outline">{inventory.nonRepairableDevices}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Lost</span>
              <Badge variant="destructive">{inventory.lostStock}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
