/**
 * OPERATIONS CONTROL PANEL
 * Real-time alerts and operational issues requiring immediate action
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Clock,
  AlertTriangle,
  Package,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Trip } from "@/lib/types";
import { ComprehensiveMetrics, SLA, calculateDaysFromToday } from "@/lib/metricsEngine";
import { cn } from "@/lib/utils";

interface OperationsControlPanelProps {
  metrics: ComprehensiveMetrics;
  trips: Trip[];
}

export default function OperationsControlPanel({ metrics, trips }: OperationsControlPanelProps) {
  const { shipment, pickup, confirmation, inventory, locationRisks } = metrics;

  // Identify critical trips
  const tripsExceedingSLA = trips.filter(trip => {
    if (trip.tripStatus === "In Transit" && trip.tripCreationDate) {
      const daysInTransit = calculateDaysFromToday(trip.tripCreationDate);
      return daysInTransit > SLA.DELIVERY_DAYS;
    }
    return false;
  });

  const pickupsPendingBeyondSLA = trips.filter(trip => {
    if (trip.pickupRaisedOn && !trip.actualPickupDate) {
      const daysPending = calculateDaysFromToday(trip.pickupRaisedOn);
      return daysPending > SLA.PICKUP_DAYS;
    }
    return false;
  });

  const confirmationsPendingBeyondSLA = trips.filter(trip => {
    if (trip.packetStatus === "Confirmation Pending" && trip.tripCreationDate) {
      const daysPending = calculateDaysFromToday(trip.tripCreationDate);
      return daysPending > SLA.CONFIRMATION_DAYS;
    }
    return false;
  });

  const highUtilizationLocations = locationRisks.filter(loc => 
    loc.stockUtilization < 20 // Less than 20% available (80%+ deficiency)
  );

  // Alert cards data
  const alerts = [
    {
      title: "SLA Violations",
      count: tripsExceedingSLA.length,
      description: `${tripsExceedingSLA.length} trips exceeding delivery SLA`,
      severity: tripsExceedingSLA.length > 10 ? "critical" : tripsExceedingSLA.length > 5 ? "warning" : "info",
      icon: AlertCircle,
      details: tripsExceedingSLA.slice(0, 3).map(t => ({
        label: t.tripId,
        value: `${calculateDaysFromToday(t.tripCreationDate)} days in transit`,
      })),
    },
    {
      title: "Pickup Delays",
      count: pickupsPendingBeyondSLA.length,
      description: `${pickupsPendingBeyondSLA.length} pickups pending > 2 days`,
      severity: pickupsPendingBeyondSLA.length > 5 ? "critical" : pickupsPendingBeyondSLA.length > 2 ? "warning" : "info",
      icon: Clock,
      details: pickupsPendingBeyondSLA.slice(0, 3).map(t => ({
        label: t.tripId,
        value: `${calculateDaysFromToday(t.pickupRaisedOn)} days pending`,
      })),
    },
    {
      title: "Confirmation Backlog",
      count: confirmationsPendingBeyondSLA.length,
      description: `${confirmationsPendingBeyondSLA.length} confirmations pending > 24 hrs`,
      severity: confirmationsPendingBeyondSLA.length > 10 ? "critical" : confirmationsPendingBeyondSLA.length > 5 ? "warning" : "info",
      icon: Package,
      details: confirmationsPendingBeyondSLA.slice(0, 3).map(t => ({
        label: t.tripId,
        value: `${calculateDaysFromToday(t.tripCreationDate)} days pending`,
      })),
    },
    {
      title: "Stock Alerts",
      count: highUtilizationLocations.length,
      description: `${highUtilizationLocations.length} locations with low stock`,
      severity: highUtilizationLocations.length > 3 ? "critical" : highUtilizationLocations.length > 1 ? "warning" : "info",
      icon: AlertTriangle,
      details: highUtilizationLocations.slice(0, 3).map(loc => ({
        label: loc.locationName,
        value: `${loc.stockUtilization.toFixed(0)}% available`,
      })),
    },
  ];

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          bg: "bg-red-50 border-red-200",
          text: "text-red-900",
          badge: "bg-red-100 text-red-800",
          icon: "text-red-600",
        };
      case "warning":
        return {
          bg: "bg-yellow-50 border-yellow-200",
          text: "text-yellow-900",
          badge: "bg-yellow-100 text-yellow-800",
          icon: "text-yellow-600",
        };
      default:
        return {
          bg: "bg-blue-50 border-blue-200",
          text: "text-blue-900",
          badge: "bg-blue-100 text-blue-800",
          icon: "text-blue-600",
        };
    }
  };

  // Overall status
  const totalIssues = alerts.reduce((sum, alert) => sum + alert.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-1">Operations Control Panel</h3>
          <p className="text-sm text-muted-foreground">
            Real-time alerts and action items
          </p>
        </div>
        <Badge
          variant={totalIssues > 20 ? "destructive" : totalIssues > 10 ? "default" : "secondary"}
          className="text-lg px-4 py-2"
        >
          {totalIssues} Issues
        </Badge>
      </div>

      {/* Overall Status Alert */}
      {totalIssues > 0 ? (
        <Alert variant={totalIssues > 20 ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {totalIssues} operational issues require immediate attention.
            Review the cards below for details.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">All Clear</AlertTitle>
          <AlertDescription className="text-green-700">
            No critical operational issues detected. All systems performing within SLA.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;
          const colors = getSeverityColors(alert.severity);

          return (
            <Card key={index} className={cn("border-2", colors.bg)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors.badge)}>
                      <Icon className={cn("w-5 h-5", colors.icon)} />
                    </div>
                    <div>
                      <CardTitle className={cn("text-base", colors.text)}>
                        {alert.title}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {alert.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={colors.badge}>
                    {alert.count}
                  </Badge>
                </div>
              </CardHeader>
              {alert.details.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {alert.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm bg-white/50 rounded p-2"
                      >
                        <span className="font-medium">{detail.label}</span>
                        <span className="text-muted-foreground text-xs">
                          {detail.value}
                        </span>
                      </div>
                    ))}
                    {alert.count > 3 && (
                      <div className="text-xs text-center text-muted-foreground pt-1">
                        +{alert.count - 3} more...
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{shipment.inTransitTrips}</div>
              <div className="text-xs text-muted-foreground mt-1">In Transit</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{pickup.pickupsPending}</div>
              <div className="text-xs text-muted-foreground mt-1">Pending Pickups</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{confirmation.confirmationPending}</div>
              <div className="text-xs text-muted-foreground mt-1">Pending Confirmations</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{shipment.rtoShipments}</div>
              <div className="text-xs text-muted-foreground mt-1">RTO Shipments</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
