/**
 * COMPARATIVE ANALYTICS
 * Compare performance across sources, time periods, and transporters
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";
import { Trip, LocationMetrics } from "@/lib/types";
import { calculateShipmentMetrics, normalizeTrips } from "@/lib/metricsEngine";
import { cn } from "@/lib/utils";

interface ComparativeAnalyticsProps {
  trips: Trip[];
  locations: LocationMetrics[];
}

export default function ComparativeAnalytics({ trips, locations }: ComparativeAnalyticsProps) {
  const [compareBy, setCompareBy] = useState<"source" | "transporter" | "time">("source");

  // Source Comparison
  const sourceComparison = useMemo(() => {
    const sourceMap = new Map<string, Trip[]>();
    
    trips.forEach(trip => {
      const source = trip.sourceAddress || "Unknown";
      if (!sourceMap.has(source)) {
        sourceMap.set(source, []);
      }
      sourceMap.get(source)!.push(trip);
    });

    return Array.from(sourceMap.entries()).map(([source, sourceTrips]) => {
      const normalizedTrips = normalizeTrips(sourceTrips);
      const metrics = calculateShipmentMetrics(normalizedTrips);
      return {
        name: source,
        totalTrips: metrics.totalShipmentCount,
        completedTrips: metrics.completedTrips,
        onTimeRate: metrics.onTimeDeliveryRate,
        avgDelay: metrics.avgDeliveryDelay,
        rtoRate: metrics.rtoRate,
      };
    }).sort((a, b) => b.onTimeRate - a.onTimeRate);
  }, [trips]);

  // Transporter Comparison (Top 5)
  const transporterComparison = useMemo(() => {
    const transporterMap = new Map<string, Trip[]>();
    
    trips.forEach(trip => {
      const transporter = trip.transporterName || "Unknown";
      if (!transporterMap.has(transporter)) {
        transporterMap.set(transporter, []);
      }
      transporterMap.get(transporter)!.push(trip);
    });

    return Array.from(transporterMap.entries())
      .map(([transporter, transporterTrips]) => {
        const normalizedTrips = normalizeTrips(transporterTrips);
        const metrics = calculateShipmentMetrics(normalizedTrips);
        return {
          name: transporter,
          totalTrips: metrics.totalShipmentCount,
          completedTrips: metrics.completedTrips,
          onTimeRate: metrics.onTimeDeliveryRate,
          avgDelay: metrics.avgDeliveryDelay,
          rtoRate: metrics.rtoRate,
        };
      })
      .sort((a, b) => b.totalTrips - a.totalTrips)
      .slice(0, 5);
  }, [trips]);

  // Time Comparison (This Week vs Last Week)
  const timeComparison = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekTrips = trips.filter(trip => {
      if (!trip.tripCreationDate) return false;
      const date = new Date(trip.tripCreationDate);
      return date >= sevenDaysAgo && date <= today;
    });

    const lastWeekTrips = trips.filter(trip => {
      if (!trip.tripCreationDate) return false;
      const date = new Date(trip.tripCreationDate);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    });

    const thisWeekMetrics = calculateShipmentMetrics(normalizeTrips(thisWeekTrips));
    const lastWeekMetrics = calculateShipmentMetrics(normalizeTrips(lastWeekTrips));

    return {
      thisWeek: {
        label: "This Week",
        totalTrips: thisWeekMetrics.totalShipmentCount,
        completedTrips: thisWeekMetrics.completedTrips,
        onTimeRate: thisWeekMetrics.onTimeDeliveryRate,
        avgDelay: thisWeekMetrics.avgDeliveryDelay,
        rtoRate: thisWeekMetrics.rtoRate,
      },
      lastWeek: {
        label: "Last Week",
        totalTrips: lastWeekMetrics.totalShipmentCount,
        completedTrips: lastWeekMetrics.completedTrips,
        onTimeRate: lastWeekMetrics.onTimeDeliveryRate,
        avgDelay: lastWeekMetrics.avgDeliveryDelay,
        rtoRate: lastWeekMetrics.rtoRate,
      },
      change: {
        totalTrips: thisWeekMetrics.totalShipmentCount - lastWeekMetrics.totalShipmentCount,
        completedTrips: thisWeekMetrics.completedTrips - lastWeekMetrics.completedTrips,
        onTimeRate: thisWeekMetrics.onTimeDeliveryRate - lastWeekMetrics.onTimeDeliveryRate,
        avgDelay: thisWeekMetrics.avgDeliveryDelay - lastWeekMetrics.avgDeliveryDelay,
        rtoRate: thisWeekMetrics.rtoRate - lastWeekMetrics.rtoRate,
      },
    };
  }, [trips]);

  const renderComparisonIcon = (value: number, inverse = false) => {
    if (Math.abs(value) < 0.1) return <Minus className="w-4 h-4 text-gray-400" />;
    
    const isPositive = inverse ? value < 0 : value > 0;
    
    return isPositive ? (
      <ArrowUp className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-red-600" />
    );
  };

  const getPerformanceColor = (value: number, metric: string) => {
    switch (metric) {
      case "onTimeRate":
        if (value >= 80) return "text-green-600";
        if (value >= 60) return "text-yellow-600";
        return "text-red-600";
      case "avgDelay":
        if (value <= 5) return "text-green-600";
        if (value <= 7) return "text-yellow-600";
        return "text-red-600";
      case "rtoRate":
        if (value <= 3) return "text-green-600";
        if (value <= 7) return "text-yellow-600";
        return "text-red-600";
      default:
        return "text-gray-900";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1">Comparative Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Performance comparison across sources, transporters, and time periods
        </p>
      </div>

      <Tabs value={compareBy} onValueChange={(val) => setCompareBy(val as "source" | "transporter" | "time")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="source">By Source</TabsTrigger>
          <TabsTrigger value="transporter">By Transporter</TabsTrigger>
          <TabsTrigger value="time">Week vs Week</TabsTrigger>
        </TabsList>

        {/* Source Comparison */}
        <TabsContent value="source" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source Location Comparison</CardTitle>
              <CardDescription>Performance metrics by source location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Location</TableHead>
                      <TableHead className="text-right">Total Trips</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">On-Time %</TableHead>
                      <TableHead className="text-right">Avg Delay</TableHead>
                      <TableHead className="text-right">RTO %</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceComparison.map((source, index) => (
                      <TableRow key={source.name}>
                        <TableCell className="font-medium">
                          {index < 3 && <Badge variant="outline" className="mr-2">#{index + 1}</Badge>}
                          {source.name}
                        </TableCell>
                        <TableCell className="text-right">{source.totalTrips}</TableCell>
                        <TableCell className="text-right">{source.completedTrips}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold", getPerformanceColor(source.onTimeRate, "onTimeRate"))}>
                            {source.onTimeRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold", getPerformanceColor(source.avgDelay, "avgDelay"))}>
                            {source.avgDelay.toFixed(1)}d
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold", getPerformanceColor(source.rtoRate, "rtoRate"))}>
                            {source.rtoRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Progress value={source.onTimeRate} className="h-2 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transporter Comparison */}
        <TabsContent value="transporter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 Transporters Comparison</CardTitle>
              <CardDescription>Performance metrics by transporter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transporter</TableHead>
                      <TableHead className="text-right">Total Trips</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">On-Time %</TableHead>
                      <TableHead className="text-right">Avg Delay</TableHead>
                      <TableHead className="text-right">RTO %</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transporterComparison.map((transporter, index) => (
                      <TableRow key={transporter.name}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="mr-2">#{index + 1}</Badge>
                          {transporter.name}
                        </TableCell>
                        <TableCell className="text-right">{transporter.totalTrips}</TableCell>
                        <TableCell className="text-right">{transporter.completedTrips}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold", getPerformanceColor(transporter.onTimeRate, "onTimeRate"))}>
                            {transporter.onTimeRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold", getPerformanceColor(transporter.avgDelay, "avgDelay"))}>
                            {transporter.avgDelay.toFixed(1)}d
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold", getPerformanceColor(transporter.rtoRate, "rtoRate"))}>
                            {transporter.rtoRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Progress value={transporter.onTimeRate} className="h-2 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Comparison */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* This Week */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">This Week</CardTitle>
                <CardDescription>Current week performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Trips</span>
                  <span className="text-2xl font-bold">{timeComparison.thisWeek.totalTrips}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">On-Time Rate</span>
                  <span className={cn("text-lg font-bold", getPerformanceColor(timeComparison.thisWeek.onTimeRate, "onTimeRate"))}>
                    {timeComparison.thisWeek.onTimeRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Delay</span>
                  <Badge variant={timeComparison.thisWeek.avgDelay <= 5 ? "default" : "destructive"}>
                    {timeComparison.thisWeek.avgDelay.toFixed(1)}d
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">RTO Rate</span>
                  <Badge variant={timeComparison.thisWeek.rtoRate <= 5 ? "secondary" : "destructive"}>
                    {timeComparison.thisWeek.rtoRate.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Last Week */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-base">Last Week</CardTitle>
                <CardDescription>Previous week performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Trips</span>
                  <span className="text-2xl font-bold">{timeComparison.lastWeek.totalTrips}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">On-Time Rate</span>
                  <span className={cn("text-lg font-bold", getPerformanceColor(timeComparison.lastWeek.onTimeRate, "onTimeRate"))}>
                    {timeComparison.lastWeek.onTimeRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Delay</span>
                  <Badge variant={timeComparison.lastWeek.avgDelay <= 5 ? "default" : "destructive"}>
                    {timeComparison.lastWeek.avgDelay.toFixed(1)}d
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">RTO Rate</span>
                  <Badge variant={timeComparison.lastWeek.rtoRate <= 5 ? "secondary" : "destructive"}>
                    {timeComparison.lastWeek.rtoRate.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Week over Week Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Week-over-Week Changes</CardTitle>
              <CardDescription>Performance trends and comparisons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Total Trips</span>
                  <div className="flex items-center gap-2">
                    {renderComparisonIcon(timeComparison.change.totalTrips)}
                    <span className="font-bold">
                      {timeComparison.change.totalTrips > 0 ? "+" : ""}
                      {timeComparison.change.totalTrips}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">On-Time Rate</span>
                  <div className="flex items-center gap-2">
                    {renderComparisonIcon(timeComparison.change.onTimeRate)}
                    <span className="font-bold">
                      {timeComparison.change.onTimeRate > 0 ? "+" : ""}
                      {timeComparison.change.onTimeRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Avg Delay</span>
                  <div className="flex items-center gap-2">
                    {renderComparisonIcon(timeComparison.change.avgDelay, true)}
                    <span className="font-bold">
                      {timeComparison.change.avgDelay > 0 ? "+" : ""}
                      {timeComparison.change.avgDelay.toFixed(1)}d
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">RTO Rate</span>
                  <div className="flex items-center gap-2">
                    {renderComparisonIcon(timeComparison.change.rtoRate, true)}
                    <span className="font-bold">
                      {timeComparison.change.rtoRate > 0 ? "+" : ""}
                      {timeComparison.change.rtoRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
