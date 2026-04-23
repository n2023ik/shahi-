/**
 * COMPREHENSIVE LOGISTICS CONTROL DASHBOARD
 * Complete decision-making and risk monitoring system
 * 
 * This dashboard integrates all operational metrics and provides
 * real-time insights for management, operations, and logistics teams.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Trip, LocationMetrics, DashboardData } from "@/lib/types";
import {
  ComprehensiveMetrics,
  calculateAllMetrics,
  calculateDaysFromToday,
} from "@/lib/metricsEngine";
import { isTripNotCreated } from "@/lib/tripUtils";
import { fetchDashboardData } from "@/lib/dashboardApi";
import { isNetworkError } from "@/lib/networkUtils";
import { NoInternet } from "@/components/NoInternet";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Import all dashboard sections
import DailyAutoSummary from "./DailyAutoSummary";
import AdvancedViewControl from "./AdvancedViewControl";
import ExecutiveOverview from "./ExecutiveOverview";
import OperationsControlPanel from "./OperationsControlPanel";
import LogisticsPerformance from "./LogisticsPerformance";
import InventoryControl from "./InventoryControl";
import ComparativeAnalytics from "./ComparativeAnalytics";
import FilterAndExport, {
  FilterOptions,
} from "./FilterAndExport";
import { exportToCSV, exportToJSON } from "@/lib/exportUtils";
import DashboardLayout from "./DashboardLayout";

export default function ComprehensiveLogisticsDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [locations, setLocations] = useState<LocationMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkOffline, setIsNetworkOffline] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const { toast } = useToast();

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: "all",
    location: "all",
    transporter: "all",
    status: "all",
    searchTerm: "",
  });

  /**
   * Load data from API - shows network error if connection is lost
   */
  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      
      setError(null);
      setIsNetworkOffline(false);

      // Fetch real data from API
      const dashboardData = await fetchDashboardData();
      setLocations(dashboardData.locations);
      
      // TODO: Fetch trips from API when available
      // For now, set empty trips array
      setTrips([]);

      toast({
        title: "Dashboard loaded",
        description: `Loaded ${dashboardData.locations.length} locations`,
      });
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      
      // Check if it's a network error
      if (isNetworkError(err)) {
        setIsNetworkOffline(true);
        setError("No internet connection");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      }
      
      setLocations([]);
      setTrips([]);

      if (!isNetworkError(err)) {
        toast({
          title: "Error loading dashboard",
          description: err instanceof Error ? err.message : "Failed to load data",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadData(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Apply filters to trips
   */
  const filteredTrips = useMemo(() => {
    let filtered = [...trips];

    // Search filter
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.tripId?.toLowerCase().includes(search) ||
          trip.vehicleNo?.toLowerCase().includes(search) ||
          trip.sourceAddress?.toLowerCase().includes(search) ||
          trip.destinationAddress?.toLowerCase().includes(search) ||
          trip.transporterName?.toLowerCase().includes(search)
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const today = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case "today":
          startDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "custom":
          if (filters.customStartDate) {
            startDate = new Date(filters.customStartDate);
          } else {
            startDate = new Date(0);
          }
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((trip) => {
        if (!trip.tripCreationDate) return false;
        const tripDate = new Date(trip.tripCreationDate);
        
        if (filters.dateRange === "custom" && filters.customEndDate) {
          const endDate = new Date(filters.customEndDate);
          return tripDate >= startDate && tripDate <= endDate;
        }
        
        return tripDate >= startDate;
      });
    }

    // Location filter
    if (filters.location !== "all") {
      filtered = filtered.filter(
        (trip) =>
          trip.sourceAddress === filters.location ||
          trip.destinationAddress === filters.location
      );
    }

    // Transporter filter
    if (filters.transporter !== "all") {
      filtered = filtered.filter(
        (trip) => trip.transporterName === filters.transporter
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((trip) =>
        filters.status === "Trip Not Created"
          ? isTripNotCreated(trip)
          : trip.tripStatus === filters.status
      );
    }

    return filtered;
  }, [trips, filters]);

  /**
   * Calculate comprehensive metrics
   */
  const metrics: ComprehensiveMetrics = useMemo(() => {
    return calculateAllMetrics(filteredTrips, locations);
  }, [filteredTrips, locations]);

  /**
   * Export handlers
   */
  const handleExport = (format: "csv" | "json") => {
    try {
      const exportData = filteredTrips.map((trip) => ({
        "Trip ID": trip.tripId,
        "Creation Date": trip.tripCreationDate,
        "Completion Date": trip.tripCompletionDate,
        "Vehicle No": trip.vehicleNo,
        "Source": trip.sourceAddress,
        "Destination": trip.destinationAddress,
        "Transporter": trip.transporterName,
        "Status": trip.tripStatus,
        "Packet Status": trip.packetStatus,
        "Pickup Raised": trip.pickupRaisedOn,
        "Actual Pickup": trip.actualPickupDate,
        "Delivered Date": trip.deliveredDate,
        "Remarks": trip.remarks,
      }));

      if (format === "csv") {
        exportToCSV(exportData, "logistics_dashboard");
        toast({
          title: "Export successful",
          description: `Exported ${exportData.length} records to CSV`,
        });
      } else {
        exportToJSON(exportData, "logistics_dashboard");
        toast({
          title: "Export successful",
          description: `Exported ${exportData.length} records to JSON`,
        });
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeTab="comprehensive" onTabChange={() => {}} onNewTrip={() => {}}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <div>
              <p className="text-lg font-medium">Loading Logistics Dashboard</p>
              <p className="text-sm text-muted-foreground">
                Calculating comprehensive metrics...
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show NoInternet component when network is offline
  if (isNetworkOffline) {
    return (
      <DashboardLayout activeTab="comprehensive" onTabChange={() => {}} onNewTrip={() => {}}>
        <NoInternet onRetry={() => loadData(true)} />
      </DashboardLayout>
    );
  }

  // Show error message for other errors
  if (error && !isNetworkOffline) {
    return (
      <DashboardLayout activeTab="comprehensive" onTabChange={() => {}} onNewTrip={() => {}}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 max-w-md">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <div>
              <p className="text-lg font-medium">Failed to Load Dashboard</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={() => loadData(true)} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="comprehensive" onTabChange={() => {}} onNewTrip={() => {}}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Logistics Control Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive decision-making and risk monitoring system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleExport("csv")}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab("summary-next")}
            >
              Summary Page 2
            </Button>
          </div>
        </div>

        {/* Filter and Export */}
        <FilterAndExport
          trips={filteredTrips}
          metrics={metrics}
          filters={filters}
          onFilterChange={setFilters}
          onExport={handleExport}
        />

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-8 lg:overflow-visible lg:pb-0">
            <TabsTrigger value="summary" className="shrink-0 whitespace-nowrap">Daily Summary</TabsTrigger>
            <TabsTrigger value="summary-next" className="shrink-0 whitespace-nowrap">Summary Page 2</TabsTrigger>
            <TabsTrigger value="advanced" className="shrink-0 whitespace-nowrap">Advanced View</TabsTrigger>
            <TabsTrigger value="executive" className="shrink-0 whitespace-nowrap">Executive</TabsTrigger>
            <TabsTrigger value="operations" className="shrink-0 whitespace-nowrap">Operations</TabsTrigger>
            <TabsTrigger value="logistics" className="shrink-0 whitespace-nowrap">Logistics</TabsTrigger>
            <TabsTrigger value="inventory" className="shrink-0 whitespace-nowrap">Inventory</TabsTrigger>
            <TabsTrigger value="analytics" className="shrink-0 whitespace-nowrap">Analytics</TabsTrigger>
          </TabsList>

          {/* Daily Auto Summary */}
          <TabsContent value="summary" className="space-y-6">
            <DailyAutoSummary
              metrics={metrics}
              trips={filteredTrips}
              onGoToNextPage={() => setActiveTab("summary-next")}
            />
          </TabsContent>

          <TabsContent value="summary-next" className="space-y-6">
            <DailyAutoSummary page="next" metrics={metrics} trips={filteredTrips} />
          </TabsContent>

          {/* Advanced View Control */}
          <TabsContent value="advanced" className="space-y-6">
            <AdvancedViewControl />
          </TabsContent>

          {/* Executive Overview */}
          <TabsContent value="executive" className="space-y-6">
            <ExecutiveOverview metrics={metrics} />
          </TabsContent>

          {/* Operations Control Panel */}
          <TabsContent value="operations" className="space-y-6">
            <OperationsControlPanel metrics={metrics} trips={filteredTrips} />
          </TabsContent>

          {/* Logistics Performance */}
          <TabsContent value="logistics" className="space-y-6">
            <LogisticsPerformance transporters={metrics.transporters} />
          </TabsContent>

          {/* Inventory Control */}
          <TabsContent value="inventory" className="space-y-6">
            <InventoryControl
              inventory={metrics.inventory}
              locations={locations}
            />
          </TabsContent>

          {/* Comparative Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <ComparativeAnalytics trips={filteredTrips} locations={locations} />
          </TabsContent>
        </Tabs>

        {/* Footer Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">{filteredTrips.length}</div>
            <div className="text-xs text-muted-foreground">Trips Analyzed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{locations.length}</div>
            <div className="text-xs text-muted-foreground">Locations Tracked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{metrics.transporters.length}</div>
            <div className="text-xs text-muted-foreground">Transporters</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {metrics.shipment.onTimeDeliveryRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">On-Time Rate</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
