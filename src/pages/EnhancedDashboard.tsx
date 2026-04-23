import { useState, useEffect, useMemo, useCallback } from "react";
import { DashboardData, Trip } from "@/lib/types";
import { fetchDashboardData } from "@/lib/dashboardApi";
import { fetchTrips } from "@/lib/sheetsApi";
import { calculateOverviewDashboardMetrics } from "@/lib/metricsEngine";
import { isTripNotCreated } from "@/lib/tripUtils";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import OverallMetrics from "@/components/dashboard/OverallMetrics";
import SuccessRateCard from "@/components/dashboard/SuccessRateCard";
import DelayedPickups from "@/components/dashboard/DelayedPickups";
import StockUtilization from "@/components/dashboard/StockUtilization";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Filters {
  dateRange: "all" | "today" | "7days" | "30days";
  source: string;
  destination: string;
  tripStatus: string;
  packetStatus: string;
  transporter: string;
}

export default function EnhancedDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    dateRange: "all",
    source: "all",
    destination: "all",
    tripStatus: "all",
    packetStatus: "all",
    transporter: "all",
  });
  const { toast } = useToast();

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      // Fetch both dashboard metrics and trip details
      const [dashData, tripsData] = await Promise.all([
        fetchDashboardData(),
        fetchTrips(),
      ]);

      setDashboardData(dashData);
      setAllTrips(tripsData);

      if (showLoading) {
        toast({
          title: "Dashboard loaded",
          description: `Loaded data for ${dashData.locations.length} locations and ${tripsData.length} trips`,
        });
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to fetch data from Google Sheets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Build dropdown options
  const dropdownOptions = useMemo(() => {
    const tripStatuses = new Set(
      allTrips.map((t) => t.tripStatus).filter(Boolean)
    );
    if (allTrips.some((t) => isTripNotCreated(t))) {
      tripStatuses.add("Trip Not Created");
    }
    return {
      sources: ["all", ...new Set(allTrips.map(t => t.sourceAddress).filter(Boolean))],
      destinations: ["all", ...new Set(allTrips.map(t => t.destinationAddress).filter(Boolean))],
      tripStatuses: ["all", ...Array.from(tripStatuses)],
      packetStatuses: ["all", ...new Set(allTrips.map(t => t.packetStatus).filter(Boolean))],
      transporters: ["all", ...new Set(allTrips.map(t => t.transporterName).filter(Boolean))],
    };
  }, [allTrips]);

  // Filter trips based on all filters
  const filteredTrips = useMemo(() => {
    const now = new Date();
    
    return allTrips.filter(trip => {
      // Date Range Filter
      let matchesDateRange = true;
      if (filters.dateRange !== "all" && trip.tripCreationDate) {
        const tripDate = new Date(trip.tripCreationDate);
        const daysDiff = (now.getTime() - tripDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (filters.dateRange === "today") matchesDateRange = daysDiff <= 1;
        else if (filters.dateRange === "7days") matchesDateRange = daysDiff <= 7;
        else if (filters.dateRange === "30days") matchesDateRange = daysDiff <= 30;
      }

      // Source Filter
      const matchesSource = filters.source === "all" || trip.sourceAddress === filters.source;

      // Destination Filter
      const matchesDestination = filters.destination === "all" || trip.destinationAddress === filters.destination;

      // Trip Status Filter
      const matchesTripStatus =
        filters.tripStatus === "all" ||
        (filters.tripStatus === "Trip Not Created"
          ? isTripNotCreated(trip)
          : trip.tripStatus === filters.tripStatus);

      // Packet Status Filter
      const matchesPacketStatus = filters.packetStatus === "all" || trip.packetStatus === filters.packetStatus;

      // Transporter Filter
      const matchesTransporter = filters.transporter === "all" || trip.transporterName === filters.transporter;

      return matchesDateRange && matchesSource && matchesDestination && matchesTripStatus && matchesPacketStatus && matchesTransporter;
    });
  }, [allTrips, filters]);

  // Filter locations (locations don't have trip details, just use the location data as-is)
  const filteredLocations = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.locations;
  }, [dashboardData]);

  const resetFilters = () => {
    setFilters({
      dateRange: "all",
      source: "all",
      destination: "all",
      tripStatus: "all",
      packetStatus: "all",
      transporter: "all",
    });
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(false);
    }, 60000);

    return () => clearInterval(interval);
  }, [toast]);

  if (loading) {
    return (
      <DashboardLayout activeTab="enhanced" onTabChange={() => {}} onNewTrip={() => {}}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout activeTab="enhanced" onTabChange={() => {}} onNewTrip={() => {}}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No data available</p>
            <Button onClick={() => loadData()}>Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const overviewMetrics = calculateOverviewDashboardMetrics(filteredTrips, filteredLocations);

  const calculateDelay = useCallback((pickupRaisedOn?: string, actualPickupDate?: string): number | null => {
    if (!pickupRaisedOn || !actualPickupDate) return null;
    
    try {
      const parseDate = (str: string) => {
        if (str.includes('/')) {
          const [d, m, y] = str.split('/');
          return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        }
        return new Date(str);
      };
      
      const raised = parseDate(pickupRaisedOn);
      const actual = parseDate(actualPickupDate);
      
      if (isNaN(raised.getTime()) || isNaN(actual.getTime())) return null;
      
      const diffTime = actual.getTime() - raised.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 ? diffDays : 0;
    } catch {
      return null;
    }
  }, []);

  return (
    <DashboardLayout activeTab="enhanced" onTabChange={() => {}} onNewTrip={() => {}}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Shipment Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time operations and logistics metrics
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(false)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Overview Metrics */}
        <OverallMetrics metrics={overviewMetrics} />

        {/* Advanced View Controls */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-800">Advanced View Controls</h3>
            </div>
            <button 
              onClick={resetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Reset All Filters
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Timeframe Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">TIMEFRAME</label>
              <Select value={filters.dateRange} onValueChange={(v: any) => setFilters({...filters, dateRange: v})}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">SOURCE</label>
              <Select value={filters.source} onValueChange={(v) => setFilters({...filters, source: v})}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.sources.map(s => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All Origins" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">DESTINATION</label>
              <Select value={filters.destination} onValueChange={(v) => setFilters({...filters, destination: v})}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.destinations.map(d => (
                    <SelectItem key={d} value={d}>
                      {d === "all" ? "All Endpoints" : d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trip Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">TRIP STATUS</label>
              <Select value={filters.tripStatus} onValueChange={(v) => setFilters({...filters, tripStatus: v})}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.tripStatuses.map(s => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All Trip States" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Packet Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">PACKET STATUS</label>
              <Select value={filters.packetStatus} onValueChange={(v) => setFilters({...filters, packetStatus: v})}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.packetStatuses.map(p => (
                    <SelectItem key={p} value={p}>
                      {p === "all" ? "All Packet States" : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transporter Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">TRANSPORTER</label>
              <Select value={filters.transporter} onValueChange={(v) => setFilters({...filters, transporter: v})}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.transporters.map(t => (
                    <SelectItem key={t} value={t}>
                      {t === "all" ? "All Carriers" : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <DelayedPickups locations={filteredLocations} />
          </div>
          <div>
            <StockUtilization locations={filteredLocations} threshold={80} />
          </div>
        </div>

        {/* Location Success Rates */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Location Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((location, idx) => (
              <SuccessRateCard key={idx} location={location} showTrend />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
