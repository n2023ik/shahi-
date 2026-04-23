/**
 * LOGISTICS PERFORMANCE
 * Transporter ranking and performance metrics
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, Award } from "lucide-react";
import { TransporterMetric } from "@/lib/metricsEngine";
import { cn } from "@/lib/utils";

interface LogisticsPerformanceProps {
  transporters: TransporterMetric[];
}

export default function LogisticsPerformance({ transporters }: LogisticsPerformanceProps) {
  const [sortBy, setSortBy] = useState<keyof TransporterMetric>("rank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (key: keyof TransporterMetric) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const sortedTransporters = [...transporters].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return 0;
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { variant: "default" as const, icon: Award, color: "text-yellow-600" };
    if (rank === 2) return { variant: "secondary" as const, icon: Award, color: "text-gray-400" };
    if (rank === 3) return { variant: "secondary" as const, icon: Award, color: "text-orange-600" };
    return { variant: "outline" as const, icon: null, color: "" };
  };

  const getPerformanceColor = (value: number, metric: string) => {
    switch (metric) {
      case "onTimeDeliveryRate":
      case "slaCompliance":
        if (value >= 90) return "text-green-600";
        if (value >= 70) return "text-yellow-600";
        return "text-red-600";
      case "avgDeliveryDelay":
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

  const getTrendIcon = (rate: number) => {
    if (rate >= 90) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (rate >= 70) return <Minus className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // Top 3 and Bottom 3
  const top3 = sortedTransporters.slice(0, 3);
  const bottom3 = sortedTransporters.slice(-3).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1">Logistics Performance</h3>
        <p className="text-sm text-muted-foreground">
          Transporter rankings and performance analysis
        </p>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((transporter, index) => {
          const rankData = getRankBadge(transporter.rank);
          const Icon = rankData.icon;
          
          return (
            <Card 
              key={transporter.transporterName}
              className={cn(
                "border-2",
                index === 0 && "bg-yellow-50 border-yellow-200",
                index === 1 && "bg-gray-50 border-gray-200",
                index === 2 && "bg-orange-50 border-orange-200"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={rankData.variant} className="gap-1">
                    {Icon && <Icon className={cn("w-3 h-3", rankData.color)} />}
                    #{transporter.rank}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {transporter.totalTrips} trips
                  </div>
                </div>
                <CardTitle className="text-base mt-2">
                  {transporter.transporterName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">On-Time</span>
                  <span className={cn("font-bold", getPerformanceColor(transporter.onTimeDeliveryRate, "onTimeDeliveryRate"))}>
                    {transporter.onTimeDeliveryRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={transporter.onTimeDeliveryRate} className="h-2" />
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                  <span>Avg Delay: {transporter.avgDeliveryDelay.toFixed(1)}d</span>
                  <span>RTO: {transporter.rtoRate.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Rankings</CardTitle>
          <CardDescription>Click column headers to sort</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <button
                      onClick={() => handleSort("rank")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Rank
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("transporterName")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Transporter
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort("totalTrips")}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      Trips
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort("onTimeDeliveryRate")}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      On-Time %
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort("avgDeliveryDelay")}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      Avg Delay
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort("rtoRate")}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      RTO %
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort("slaCompliance")}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      SLA Compliance
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransporters.map((transporter) => {
                  const rankData = getRankBadge(transporter.rank);
                  
                  return (
                    <TableRow key={transporter.transporterName}>
                      <TableCell>
                        <Badge variant={rankData.variant} className="gap-1">
                          {rankData.icon && <rankData.icon className={cn("w-3 h-3", rankData.color)} />}
                          {transporter.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {transporter.transporterName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{transporter.totalTrips}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-bold", getPerformanceColor(transporter.onTimeDeliveryRate, "onTimeDeliveryRate"))}>
                          {transporter.onTimeDeliveryRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-bold", getPerformanceColor(transporter.avgDeliveryDelay, "avgDeliveryDelay"))}>
                          {transporter.avgDeliveryDelay.toFixed(1)}d
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-bold", getPerformanceColor(transporter.rtoRate, "rtoRate"))}>
                          {transporter.rtoRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-bold", getPerformanceColor(transporter.slaCompliance, "slaCompliance"))}>
                          {transporter.slaCompliance.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getTrendIcon(transporter.onTimeDeliveryRate)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Performers Alert */}
      {bottom3.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base text-red-900">
              Underperforming Transporters
            </CardTitle>
            <CardDescription className="text-red-700">
              These transporters require attention and improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bottom3.map((transporter) => (
                <div
                  key={transporter.transporterName}
                  className="flex items-center justify-between p-3 bg-white rounded-lg"
                >
                  <div>
                    <div className="font-medium">{transporter.transporterName}</div>
                    <div className="text-xs text-muted-foreground">
                      Rank #{transporter.rank} • {transporter.totalTrips} trips
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-600">
                      {transporter.onTimeDeliveryRate.toFixed(1)}% on-time
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transporter.avgDeliveryDelay.toFixed(1)}d avg delay
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
