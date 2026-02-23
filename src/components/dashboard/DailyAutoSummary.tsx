/**
 * DAILY AUTO SUMMARY
 * Automatically generated daily control summary
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  TrendingDown,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { Trip } from "@/lib/types";
import { ComprehensiveMetrics, calculateDaysFromToday, SLA } from "@/lib/metricsEngine";
import { cn } from "@/lib/utils";

interface DailyAutoSummaryProps {
  metrics: ComprehensiveMetrics;
  trips: Trip[];
}

export default function DailyAutoSummary({ metrics, trips }: DailyAutoSummaryProps) {
  const { locationRisks, transporters, shipment, pickup, confirmation, inventory } = metrics;

  // Top 3 Risky Locations
  const top3RiskyLocations = locationRisks.slice(0, 3);

  // Top 3 Worst Transporters
  const worst3Transporters = [...transporters]
    .sort((a, b) => a.onTimeDeliveryRate - b.onTimeDeliveryRate)
    .slice(0, 3);

  // Trips Delayed Beyond SLA
  const delayedTrips = trips.filter(trip => {
    if (trip.tripStatus === "In Transit" && trip.tripCreationDate) {
      const daysInTransit = calculateDaysFromToday(trip.tripCreationDate);
      return daysInTransit > SLA.DELIVERY_DAYS;
    }
    return false;
  });

  // Stock Below 80%
  const lowStockLocations = locationRisks.filter(loc => {
    return loc.stockUtilization < 80;
  });

  // Confirmations Pending Beyond SLA
  const pendingConfirmations = trips.filter(trip => {
    if (trip.packetStatus === "Confirmation Pending" && trip.tripCreationDate) {
      const daysPending = calculateDaysFromToday(trip.tripCreationDate);
      return daysPending > SLA.CONFIRMATION_DAYS;
    }
    return false;
  });

  // Overall Health Score
  const healthScore = Math.round(
    (shipment.onTimeDeliveryRate * 0.3) +
    (pickup.pickupSuccessRate * 0.2) +
    ((100 - shipment.rtoRate) * 0.2) +
    (inventory.stockUtilizationRate > 90 ? 50 : inventory.stockUtilizationRate * 0.3)
  );

  const getHealthStatus = () => {
    if (healthScore >= 80) return { label: "Excellent", color: "green", icon: CheckCircle2 };
    if (healthScore >= 60) return { label: "Good", color: "blue", icon: CheckCircle2 };
    if (healthScore >= 40) return { label: "Fair", color: "yellow", icon: Clock };
    return { label: "Poor", color: "red", icon: XCircle };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  // Executive Summary Text
  const generateSummaryText = () => {
    const issues = [];
    
    if (top3RiskyLocations.length > 0) {
      issues.push(`${top3RiskyLocations.length} high-risk locations`);
    }
    if (delayedTrips.length > 0) {
      issues.push(`${delayedTrips.length} trips exceeding SLA`);
    }
    if (worst3Transporters.length > 0 && worst3Transporters[0].onTimeDeliveryRate < 70) {
      issues.push("Poor transporter performance");
    }
    if (lowStockLocations.length > 0) {
      issues.push(`${lowStockLocations.length} locations low on stock`);
    }
    if (pendingConfirmations.length > 5) {
      issues.push(`${pendingConfirmations.length} pending confirmations`);
    }

    if (issues.length === 0) {
      return "Operations are running smoothly. All metrics within acceptable ranges.";
    }

    return `Attention required: ${issues.join(", ")}.`;
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-1">Daily Control Summary</h3>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Health Score</div>
            <div className="text-2xl font-bold">{healthScore}/100</div>
          </div>
          <Badge
            className={cn(
              "text-base px-4 py-2",
              healthStatus.color === "green" && "bg-green-100 text-green-800 border-green-200",
              healthStatus.color === "blue" && "bg-blue-100 text-blue-800 border-blue-200",
              healthStatus.color === "yellow" && "bg-yellow-100 text-yellow-800 border-yellow-200",
              healthStatus.color === "red" && "bg-red-100 text-red-800 border-red-200"
            )}
          >
            <HealthIcon className="w-4 h-4 mr-1" />
            {healthStatus.label}
          </Badge>
        </div>
      </div>

      {/* Executive Summary */}
      <Alert className={cn(
        healthScore >= 60 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"
      )}>
        <FileText className={cn(
          "h-4 w-4",
          healthScore >= 60 ? "text-blue-600" : "text-red-600"
        )} />
        <AlertTitle className={cn(
          healthScore >= 60 ? "text-blue-900" : "text-red-900"
        )}>
          Executive Summary
        </AlertTitle>
        <AlertDescription className={cn(
          healthScore >= 60 ? "text-blue-800" : "text-red-800"
        )}>
          {generateSummaryText()}
        </AlertDescription>
      </Alert>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Risky Locations */}
        <Card className={cn(
          "border-2",
          top3RiskyLocations.length > 0 && top3RiskyLocations[0].escalationLevel === "Escalation Required" 
            ? "bg-red-50 border-red-200" 
            : "bg-yellow-50 border-yellow-200"
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <Badge variant="destructive">{top3RiskyLocations.length}</Badge>
            </div>
            <CardTitle className="text-base">Top Risky Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {top3RiskyLocations.length > 0 ? (
              top3RiskyLocations.map((loc, index) => (
                <div
                  key={loc.locationName}
                  className="flex justify-between items-center p-2 bg-white rounded"
                >
                  <div>
                    <div className="text-sm font-medium">{loc.locationName}</div>
                    <div className="text-xs text-muted-foreground">
                      {loc.issues.slice(0, 1).join(", ")}
                    </div>
                  </div>
                  <Badge
                    variant={
                      loc.escalationLevel === "Escalation Required" ? "destructive" :
                      loc.escalationLevel === "Critical" ? "default" : "secondary"
                    }
                  >
                    {loc.riskScore.toFixed(0)}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No high-risk locations
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worst Transporters */}
        <Card className="border-2 bg-orange-50 border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <TrendingDown className="w-6 h-6 text-orange-600" />
              <Badge variant="default">{worst3Transporters.length}</Badge>
            </div>
            <CardTitle className="text-base">Worst Transporters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {worst3Transporters.length > 0 ? (
              worst3Transporters.map((transporter) => (
                <div
                  key={transporter.transporterName}
                  className="flex justify-between items-center p-2 bg-white rounded"
                >
                  <div>
                    <div className="text-sm font-medium">{transporter.transporterName}</div>
                    <div className="text-xs text-muted-foreground">
                      {transporter.totalTrips} trips
                    </div>
                  </div>
                  <Badge variant={transporter.onTimeDeliveryRate < 50 ? "destructive" : "secondary"}>
                    {transporter.onTimeDeliveryRate.toFixed(0)}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                All transporters performing well
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delayed Trips */}
        <Card className="border-2 bg-purple-50 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Clock className="w-6 h-6 text-purple-600" />
              <Badge variant="default">{delayedTrips.length}</Badge>
            </div>
            <CardTitle className="text-base">Trips Beyond SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {delayedTrips.length > 0 ? (
              delayedTrips.slice(0, 3).map((trip) => (
                <div
                  key={trip.tripId}
                  className="flex justify-between items-center p-2 bg-white rounded"
                >
                  <div>
                    <div className="text-sm font-medium">{trip.tripId}</div>
                    <div className="text-xs text-muted-foreground">
                      {trip.transporterName}
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {calculateDaysFromToday(trip.tripCreationDate)}d
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                All trips within SLA
              </div>
            )}
            {delayedTrips.length > 3 && (
              <div className="text-xs text-center text-muted-foreground">
                +{delayedTrips.length - 3} more...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Locations */}
        <Card className="border-2 bg-indigo-50 border-indigo-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Package className="w-6 h-6 text-indigo-600" />
              <Badge variant="default">{lowStockLocations.length}</Badge>
            </div>
            <CardTitle className="text-base">Stock Below 80%</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStockLocations.length > 0 ? (
              lowStockLocations.slice(0, 3).map((loc) => {
                return (
                  <div
                    key={loc.locationName}
                    className="flex justify-between items-center p-2 bg-white rounded"
                  >
                    <div>
                      <div className="text-sm font-medium">{loc.locationName}</div>
                      <div className="text-xs text-muted-foreground">
                        Stock availability
                      </div>
                    </div>
                    <Badge variant={loc.stockUtilization < 50 ? "destructive" : "secondary"}>
                      {loc.stockUtilization.toFixed(0)}%
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                All locations adequately stocked
              </div>
            )}
            {lowStockLocations.length > 3 && (
              <div className="text-xs text-center text-muted-foreground">
                +{lowStockLocations.length - 3} more...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Confirmations */}
        <Card className="border-2 bg-cyan-50 border-cyan-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-6 h-6 text-cyan-600" />
              <Badge variant="default">{pendingConfirmations.length}</Badge>
            </div>
            <CardTitle className="text-base">Confirmations Beyond SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingConfirmations.length > 0 ? (
              pendingConfirmations.slice(0, 3).map((trip) => (
                <div
                  key={trip.tripId}
                  className="flex justify-between items-center p-2 bg-white rounded"
                >
                  <div>
                    <div className="text-sm font-medium">{trip.tripId}</div>
                    <div className="text-xs text-muted-foreground">
                      {trip.sourceAddress}
                    </div>
                  </div>
                  <Badge variant="default">
                    {calculateDaysFromToday(trip.tripCreationDate)}d
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                All confirmations up to date
              </div>
            )}
            {pendingConfirmations.length > 3 && (
              <div className="text-xs text-center text-muted-foreground">
                +{pendingConfirmations.length - 3} more...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics Summary */}
        <Card className="border-2 bg-gray-50 border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FileText className="w-6 h-6 text-gray-600" />
              <Badge variant="outline">Summary</Badge>
            </div>
            <CardTitle className="text-base">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="text-sm">Total Shipments</span>
              <Badge variant="outline">{shipment.totalShipmentCount}</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="text-sm">On-Time Rate</span>
              <Badge variant={shipment.onTimeDeliveryRate >= 80 ? "default" : "destructive"}>
                {shipment.onTimeDeliveryRate.toFixed(1)}%
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="text-sm">RTO Rate</span>
              <Badge variant={shipment.rtoRate <= 5 ? "secondary" : "destructive"}>
                {shipment.rtoRate.toFixed(1)}%
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="text-sm">Stock Utilization</span>
              <Badge variant="outline">
                {inventory.stockUtilizationRate.toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      { (top3RiskyLocations.length > 0 || delayedTrips.length > 5 || pendingConfirmations.length > 10) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Immediate Action Required</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {top3RiskyLocations.length > 0 && (
                <li>Review and address issues at {top3RiskyLocations[0].locationName}</li>
              )}
              {delayedTrips.length > 5 && (
                <li>Escalate {delayedTrips.length} trips exceeding delivery SLA</li>
              )}
              {pendingConfirmations.length > 10 && (
                <li>Process {pendingConfirmations.length} pending confirmations</li>
              )}
              {lowStockLocations.length > 2 && (
                <li>Replenish stock at {lowStockLocations.length} locations</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
