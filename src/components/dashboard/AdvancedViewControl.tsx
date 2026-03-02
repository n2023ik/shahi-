/**
 * ADVANCED VIEW CONTROL - LOGISTICS & FLEET MANAGEMENT DASHBOARD
 * Real-time data from Google Sheets via authenticated backend (No CORS issues!)
 * 
 * Features:
 * - Fetch data using Google Apps Script backend (sheetsApi.ts)
 * - Dynamic filtering by Origin, Destination, Transporter, Status
 * - Real-time status cards with counts
 * - Responsive design with Tailwind CSS & Lucide-React icons
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Trash2,
  MapPin,
  Archive,
  Navigation,
  RefreshCw,
  Filter,
  RotateCcw,
  AlertTriangle,
  TrendingDown,
  X,
} from "lucide-react";
import { Trip, StockDeficiency, DeviceUtilization, OverallDeviceMetrics, PickupStatusMetrics } from "@/lib/types";
import { fetchTrips, fetchStockDeficiency } from "@/lib/sheetsApi";

// Add this helper function at the top (after imports)
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/").map(Number);
      if (!day || !month || !year) return null;
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function calculatePickupDelay(pickupRaisedOn?: string, actualPickupDate?: string): number | null {
  if (!pickupRaisedOn || !actualPickupDate) return null;
  const raised = parseDate(pickupRaisedOn);
  const actual = parseDate(actualPickupDate);
  if (!raised || !actual) return null;
  const diffMs = actual.getTime() - raised.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FilterState {
  origin: string;
  destination: string;
  transporter: string;
  status: string;
}

interface DashboardMetrics {
  totalTrips: number;
  completed: number;
  inTransit: number;
  pickupDelay: number;
  delivered: number;
  pending: number;
  awaitingDeparture: number;
  pickupRaisedInternally: number;
  pickupCompleted: number;
  offline: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdvancedViewControl() {
  // State Management
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stockDeficiency, setStockDeficiency] = useState<StockDeficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [selectedStatusModal, setSelectedStatusModal] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deviceMetrics, setDeviceMetrics] = useState<OverallDeviceMetrics | null>(null);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    origin: "All",
    destination: "All",
    transporter: "All",
    status: "All",
  });

  // Auto-refresh state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // seconds
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);

  // =========================================================================
  // LOAD DATA FROM GOOGLE SHEETS (via sheetsApi.ts - uses Google Apps Script)
  // =========================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch trips (critical) and stock data (optional) in parallel
      const [tripsData, stockDataResult] = await Promise.allSettled([
        fetchTrips(),
        fetchStockDeficiency()
      ]);

      // Handle trips data (critical)
      if (tripsData.status === 'fulfilled' && tripsData.value && tripsData.value.length > 0) {
        setTrips(tripsData.value);
        console.log(`✓ Loaded ${tripsData.value.length} trips from Google Sheets`);
      } else if (tripsData.status === 'rejected') {
        throw tripsData.reason;
      } else {
        setError("No trip data found in Google Sheets");
        setTrips([]);
      }

      // Handle stock data (non-critical)
      if (stockDataResult.status === 'fulfilled' && stockDataResult.value && stockDataResult.value.length > 0) {
        setStockDeficiency(stockDataResult.value);
        console.log(`✓ Loaded stock data for ${stockDataResult.value.length} locations`);
      } else if (stockDataResult.status === 'rejected') {
        const stockError = stockDataResult.reason instanceof Error 
          ? stockDataResult.reason.message 
          : 'Unknown error';
        console.warn(`⚠️ Stock data unavailable: ${stockError}`);
        // Don't fail completely, just show a warning if trips loaded successfully
        if (tripsData.status === 'fulfilled' && !error) {
          setError(`Stock data unavailable: ${stockError}`);
        }
      }

      setLastFetchTime(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Failed to load data: ${errorMessage}`);
      console.error("Data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================================================================
  // LOAD DATA ON COMPONENT MOUNT
  // =========================================================================

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================================
  // DERIVED DATA: UNIQUE FILTER OPTIONS
  // =========================================================================

  const uniqueOrigins = useMemo(() => {
    const origins = new Set(
      trips
        .map((t) => t.sourceAddress)
        .filter((s) => s && s.trim())
    );
    return ["All", ...Array.from(origins).sort()];
  }, [trips]);

  const uniqueDestinations = useMemo(() => {
    const destinations = new Set(
      trips
        .map((t) => t.destinationAddress)
        .filter((d) => d && d.trim())
    );
    return ["All", ...Array.from(destinations).sort()];
  }, [trips]);

  const uniqueTransporters = useMemo(() => {
    const transporters = new Set(
      trips
        .map((t) => t.transporterName)
        .filter((t) => t && t.trim())
    );
    return ["All", ...Array.from(transporters).sort()];
  }, [trips]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(
      trips
        .map((t) => t.tripStatus)
        .filter((s) => s && s.trim())
    );
    return ["All", ...Array.from(statuses).sort()];
  }, [trips]);

  // =========================================================================
  // FILTER LOGIC
  // =========================================================================

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const originMatch =
        filters.origin === "All" ||
        trip.sourceAddress === filters.origin;
      const destMatch =
        filters.destination === "All" ||
        trip.destinationAddress === filters.destination;
      const transporterMatch =
        filters.transporter === "All" ||
        trip.transporterName === filters.transporter;
      const statusMatch =
        filters.status === "All" || trip.tripStatus === filters.status;

      return originMatch && destMatch && transporterMatch && statusMatch;
    });
  }, [trips, filters]);

  // =========================================================================
  // CALCULATE METRICS FROM FILTERED DATA
  // =========================================================================

  const calculateMetrics = useMemo((): DashboardMetrics => {      
    const metrics: DashboardMetrics = {
      totalTrips: filteredTrips.length,
      completed: 0,
      inTransit: 0,
      pickupDelay: 0,
      delivered: 0,
      pending: 0,
      awaitingDeparture: 0,
      pickupRaisedInternally: 0,
      pickupCompleted: 0,
      offline: 0,
    };

    filteredTrips.forEach((trip) => {
      const statusLower = trip.tripStatus?.toLowerCase().trim() || "";
      const packetLower = trip.packetStatus?.toLowerCase().trim() || ""; 

      // ✅ Count completed trips FIRST (before validation) 
      if (statusLower.includes("completed") && !statusLower.includes("not")) {
        metrics.completed++;
      }

      // ✅ STRICT CHECK: For other metrics, trip mein actual data hona chahiye
      // Agar Trip ID nahi hai = empty row = skip karo for other counts
      if (!trip.tripId || trip.tripId === "-" || trip.tripId.trim() === "") {
        return; // Skip empty rows
      }

      if (!trip.tripCreationDate || trip.tripCreationDate === "-" || trip.tripCreationDate.trim() === "") {
        return; // Skip agar Trip Creation Date empty hai
      }

      // Count statuses
      if (statusLower.includes("offline")) metrics.offline++;
      else if (statusLower.includes("transit")) metrics.inTransit++;
      else if (statusLower.includes("awaiting")) metrics.awaitingDeparture++;

      if (packetLower.includes("delivered")) metrics.delivered++; 
      else if (packetLower.includes("pending") || packetLower === "pending confirmation") metrics.pending++;

      // Pickup Delay
      const delayDays = calculatePickupDelay(trip.pickupRaisedOn, trip.actualPickupDate);
      if (delayDays !== null && delayDays > 3) {
        metrics.pickupDelay++;
      }

      // Pickup Raised Internally (if pickupRaisedOn date exists)
      if (trip.pickupRaisedOn && trip.pickupRaisedOn.trim() && trip.pickupRaisedOn !== "-") {
        metrics.pickupRaisedInternally++;
      }

      // Pickup Completed (if actualPickupDate exists)
      if (trip.actualPickupDate && trip.actualPickupDate.trim() && trip.actualPickupDate !== "-") {
        metrics.pickupCompleted++;
      }
    });

    return metrics;
  }, [filteredTrips]);

  // =========================================================================
  // CALCULATE ASSET TRACKER UTILIZATION METRICS (Overall & Source-wise)
  // =========================================================================

  const calculateDeviceMetrics = useMemo((): OverallDeviceMetrics => {
    // Use asset trackers in use and available directly from Google Sheets (stockDeficiency data)
    // No need to calculate from trips - the sheets already have accurate "asset tracker in use" and "asset tracker available" fields
    
    const sourceBreakdown: DeviceUtilization[] = stockDeficiency.map((stock) => {
      const devicesInUse = stock.devicesInUse || 0;
      const devicesAvailable = stock.availableDevices || 0;
      const totalDevices = stock.maxCapacity || (devicesInUse + devicesAvailable);
      
      // Utilization = (asset trackers in use / total asset trackers) * 100
      const utilizationPercentage = totalDevices > 0
        ? (devicesInUse / totalDevices) * 100
        : 0;

      return {
        source: stock.source,
        devicesInUse,
        devicesAvailable,
        totalDevices,
        utilizationPercentage,
        isHighUtilization: utilizationPercentage >= 80, // Red alert threshold
      };
    });

    // Sort by utilization percentage (highest first)
    sourceBreakdown.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

    // Calculate overall metrics
    const totalDevicesInUse = sourceBreakdown.reduce((sum, s) => sum + s.devicesInUse, 0);
    const totalDevicesAvailable = sourceBreakdown.reduce((sum, s) => sum + s.devicesAvailable, 0);
    const totalDevices = sourceBreakdown.reduce((sum, s) => sum + s.totalDevices, 0);
    const overallUtilization = totalDevices > 0
      ? (totalDevicesInUse / totalDevices) * 100
      : 0;

    return {
      totalDevicesInUse,
      totalDevicesAvailable,
      totalDevices,
      overallUtilization,
      sourceBreakdown,
    };
  }, [stockDeficiency]);

  // =========================================================================
  // CALCULATE SOURCE-WISE PICKUP STATUS METRICS
  // =========================================================================

  const calculatePickupStatusMetrics = useMemo((): PickupStatusMetrics => {
    const sourceMap = new Map<string, { pickupRaised: number; pickupDone: number }>();
    
    // Debug: Log first few trips and their packet statuses
    if (filteredTrips.length > 0) {
      console.log(`[calculatePickupStatusMetrics] Processing ${filteredTrips.length} filtered trips`);
      filteredTrips.slice(0, 5).forEach((trip, idx) => {
        console.log(`[Trip ${idx}] ID: ${trip.tripId}, packetStatus: "${trip.packetStatus}", destination: "${trip.destinationAddress}"`);
      });
    }

    filteredTrips.forEach((trip) => {
      // Get source (using destinationAddress as per Google Sheets column G)
      const source = trip.destinationAddress || "Unknown";
      
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { pickupRaised: 0, pickupDone: 0 });
      }

      const metrics = sourceMap.get(source)!;

      // Check Packet Status for "Pickup Raised" or "Pickup Done" (case-insensitive, trim whitespace)
      const status = trip.packetStatus?.toLowerCase().trim() || "";
      
      if (status === "pickup raised") {
        metrics.pickupRaised++;
      }

      if (status === "pickup done") {
        metrics.pickupDone++;
      }
    });

    // Convert map to array and sort by total trips
    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([source, metrics]) => ({
        source,
        pickupRaised: metrics.pickupRaised,
        pickupDone: metrics.pickupDone,
        total: metrics.pickupRaised + metrics.pickupDone,
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate totals
    const totalPickupRaised = sourceBreakdown.reduce((sum, s) => sum + s.pickupRaised, 0);
    const totalPickupDone = sourceBreakdown.reduce((sum, s) => sum + s.pickupDone, 0);

    console.log(`[calculatePickupStatusMetrics] Source Breakdown:`, sourceBreakdown);
    console.log(`[calculatePickupStatusMetrics] Totals - Raised: ${totalPickupRaised}, Done: ${totalPickupDone}`);

    return {
      sourceBreakdown,
      totalPickupRaised,
      totalPickupDone,
    };
  }, [filteredTrips]);

  // =========================================================================
  // AUTO-REFRESH EFFECT
  // =========================================================================

  // =========================================================================
  // AUTO-REFRESH EFFECT
  // =========================================================================

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadData();
    }, autoRefreshInterval * 1000); // Convert seconds to milliseconds

    return () => clearInterval(interval); // Cleanup on unmount or interval change
  }, [autoRefreshEnabled, autoRefreshInterval, loadData]);

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      origin: "All",
      destination: "All",
      transporter: "All",
      status: "All",
    });
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleKPIClick = (status: string) => {
    setSelectedStatusModal(status);
    setModalOpen(true);
  };

  const getTripsForStatus = (status: string): Trip[] => {
    if (status === "total") return filteredTrips;
    if (status === "offline") return filteredTrips.filter(t => t.tripStatus?.toLowerCase().trim().includes("offline"));
    if (status === "intransit") return filteredTrips.filter(t => t.tripStatus?.toLowerCase().trim().includes("transit"));
    if (status === "completed") return filteredTrips.filter(t => {
      const s = t.tripStatus?.toLowerCase().trim() || "";
      return s.includes("completed") && !s.includes("not");
    });
    if (status === "awaiting") return filteredTrips.filter(t => t.tripStatus?.toLowerCase().trim().includes("awaiting"));
    if (status === "delivered") return filteredTrips.filter(t => t.packetStatus?.toLowerCase().trim().includes("delivered"));
    if (status === "pending") return filteredTrips.filter(t => {
      const pStatus = t.packetStatus?.toLowerCase().trim() || "";
      return pStatus.includes("pending") || pStatus === "pending confirmation";
    });
    
    // ✅ FIXED: Properly filter trips with pickup delay > 3 days
    if (status === "pickupdelay") {
      return filteredTrips.filter(trip => {
        const delayDays = calculatePickupDelay(trip.pickupRaisedOn, trip.actualPickupDate);
        return delayDays !== null && delayDays > 3;
      });
    }

    // Pickup Raised Internally
    if (status === "pickupraisedinterally") {
      return filteredTrips.filter(trip => trip.pickupRaisedOn && trip.pickupRaisedOn.trim() && trip.pickupRaisedOn !== "-");
    }

    // Pickup Completed
    if (status === "pickupcompleted") {
      return filteredTrips.filter(trip => trip.actualPickupDate && trip.actualPickupDate.trim() && trip.actualPickupDate !== "-");
    }
    
    // Pickup Status - Pickup Raised
    if (status === "pickupraised") {
      return filteredTrips.filter(trip => trip.packetStatus?.toLowerCase().trim() === "pickup raised");
    }

    // Pickup Status - Pickup Done
    if (status === "pickupdone") {
      return filteredTrips.filter(trip => trip.packetStatus?.toLowerCase().trim() === "pickup done");
    }

    return filteredTrips;
  };

  // =========================================================================
  // RENDER JSX
  // =========================================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-600 p-2">
            <Navigation className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Advanced View Control
            </h1>
            <p className="text-sm text-slate-600">
              Logistics & Fleet Management Dashboard
            </p>
          </div>
        </div>
        <button
          onClick={handleResetFilters}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 border border-slate-200"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Filters
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Data Loading Issue</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {error.includes('Invalid GET action') || error.includes('Stock data endpoint') ? (
                <div className="mt-3 p-3 bg-white rounded border border-red-200">
                  <p className="text-sm font-medium text-slate-900 mb-2">
                    🔧 How to fix:
                  </p>
                  <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside">
                    <li>Open Google Apps Script (script.google.com)</li>
                    <li>Deploy <code className="bg-slate-100 px-1 rounded">DashboardData_v2.gs</code> as Web App</li>
                    <li>Copy the new URL to your .env file</li>
                    <li>Restart your dev server</li>
                  </ol>
                  <p className="text-xs text-slate-600 mt-2">
                    📖 See <code className="bg-slate-100 px-1 rounded">DEPLOY_APPS_SCRIPT.md</code> for detailed steps
                  </p>
                </div>
              ) : (
                <p className="text-xs text-red-600 mt-2">
                  Make sure Google Apps Script endpoint is configured correctly in your .env file.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Origin Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Origin
            </label>
            <select
              value={filters.origin}
              onChange={(e) => handleFilterChange("origin", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {uniqueOrigins.map((origin) => (
                <option key={origin} value={origin}>
                  {origin}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Destination
            </label>
            <select
              value={filters.destination}
              onChange={(e) => handleFilterChange("destination", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {uniqueDestinations.map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
          </div>

          {/* Hub Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Transporter
            </label>
            <select
              value={filters.transporter}
              onChange={(e) => handleFilterChange("transporter", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {uniqueTransporters.map((transporter) => (
                <option key={transporter} value={transporter}>
                  {transporter}
                </option>
              ))}
            </select>
          </div>

          {/* Pieces Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading & Last Update Info */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <div>
              {loading && (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Loading data...
                </span>
              )}
              {!loading && lastFetchTime && (
                <span>
                  Last updated: {lastFetchTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            {/* Auto-Refresh Toggle & Interval */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600">Auto-Refresh</span>
              </label>
              {autoRefreshEnabled && (
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                  className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                >
                  <option value={5}>Every 5s</option>
                  <option value={10}>Every 10s</option>
                  <option value={30}>Every 30s</option>
                  <option value={60}>Every 1m</option>
                  <option value={300}>Every 5m</option>
                </select>
              )}
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-indigo-600 hover:text-indigo-700 disabled:text-slate-400"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (8 Status Metrics) */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Trips */}
        <button
          onClick={() => handleKPIClick("total")}
          className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all hover:border-indigo-300 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            Total Trips
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {calculateMetrics.totalTrips}
            </p>
            <div className="rounded-lg bg-indigo-100 p-3">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </button>

        {/* In Transit */}
        <button
          onClick={() => handleKPIClick("intransit")}
          className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all hover:border-amber-300 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            In Transit
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {calculateMetrics.inTransit}
            </p>
            <div className="rounded-lg bg-amber-100 p-3">
              <Truck className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </button>

        {/* Completed */}
        <button
          onClick={() => handleKPIClick("completed")}
          className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all hover:border-emerald-300 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            Completed
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {calculateMetrics.completed}
            </p>
            <div className="rounded-lg bg-emerald-100 p-3">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </button>

        {/* Awaiting Departure */}
        <button
          onClick={() => handleKPIClick("awaiting")}
          className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all hover:border-red-300 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            Awaiting Departure
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {calculateMetrics.awaitingDeparture}
            </p>
            <div className="rounded-lg bg-red-100 p-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </button>

        {/* Delivered */}
        <button
          onClick={() => handleKPIClick("delivered")}
          className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all hover:border-blue-300 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            Delivered
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {calculateMetrics.delivered}
            </p>
            <div className="rounded-lg bg-blue-100 p-3">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </button>

        {/* Pending Confirmation */}
        <button
          onClick={() => handleKPIClick("pending")}
          className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all hover:border-teal-300 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            Pending Confirmation
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {calculateMetrics.pending}
            </p>
            <div className="rounded-lg bg-teal-100 p-3">
              <Archive className="h-5 w-5 text-teal-600" />
            </div>
          </div>
        </button>

        {/* Pickup Delay */}
        <button
          onClick={() => handleKPIClick("pickupdelay")}
          className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all hover:border-orange-300 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            Pickup Delay
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {calculateMetrics.pickupDelay}
            </p>
            <div className="rounded-lg bg-orange-100 p-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </button>

        {/* Offline Status */}
        <button
          onClick={() => handleKPIClick("offline")}
          className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all hover:border-slate-400 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            Offline
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {calculateMetrics.offline}
            </p>
            <div className="rounded-lg bg-slate-100 p-3">
              <Navigation className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </button>
      </div>

      {/* Pickup Status Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Pickup Raised */}
        <button
          onClick={() => handleKPIClick("pickupraised")}
          className="rounded-lg bg-amber-50 border border-amber-200 p-6 shadow-sm hover:shadow-lg hover:scale-105 transition-all hover:border-amber-400 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-amber-600">Total Pickup Raised</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-amber-700">
              {calculatePickupStatusMetrics.totalPickupRaised}
            </p>
            <div className="rounded-lg bg-amber-100 p-3">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </button>

        {/* Total Pickup Done */}
        <button
          onClick={() => handleKPIClick("pickupdone")}
          className="rounded-lg bg-emerald-50 border border-emerald-200 p-6 shadow-sm hover:shadow-lg hover:scale-105 transition-all hover:border-emerald-400 cursor-pointer text-left"
        >
          <p className="text-xs font-semibold uppercase text-emerald-600">Total Pickup Done</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-emerald-700">
              {calculatePickupStatusMetrics.totalPickupDone}
            </p>
            <div className="rounded-lg bg-emerald-100 p-3">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </button>

        {/* Overall Rate */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-blue-600">Overall Rate</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-700">
                {calculateMetrics.totalTrips > 0
                  ? (
                      (calculateMetrics.delivered /
                        calculateMetrics.totalTrips) *
                      100
                    ).toFixed(1)
                  : "0"}%
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {calculateMetrics.delivered} of {calculateMetrics.totalTrips} completed
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <TrendingDown className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ASSET TRACKER UTILIZATION OVERVIEW - Overall Metrics */}
      <div className="mb-8 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-6 shadow-sm border border-indigo-200">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-600 p-3">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Asset Tracker Utilization Overview
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Real-time tracking of asset trackers in use and available across all locations
              </p>
            </div>
          </div>
          {calculateDeviceMetrics.overallUtilization >= 80 && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-red-900">High Utilization Alert</p>
                <p className="text-xs text-red-700">
                  {calculateDeviceMetrics.overallUtilization.toFixed(1)}% overall utilization
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Total Asset Trackers in Use */}
          <div className="rounded-lg bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Asset Trackers In Use
              </p>
              <div className="rounded-lg bg-amber-100 p-2">
                <Truck className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {calculateDeviceMetrics.totalDevicesInUse}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Currently in transit or awaiting
            </p>
          </div>

          {/* Total Asset Trackers Available */}
          <div className="rounded-lg bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Asset Trackers Available
              </p>
              <div className="rounded-lg bg-emerald-100 p-2">
                <Archive className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {calculateDeviceMetrics.totalDevicesAvailable}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Ready for deployment
            </p>
          </div>

          {/* Total Asset Trackers */}
          <div className="rounded-lg bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Total Asset Trackers
              </p>
              <div className="rounded-lg bg-indigo-100 p-2">
                <Package className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {calculateDeviceMetrics.totalDevices}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Across all locations
            </p>
          </div>

          {/* Overall Utilization */}
          <div className={`rounded-lg p-5 shadow-sm border-2 ${
            calculateDeviceMetrics.overallUtilization >= 80
              ? "bg-red-50 border-red-300"
              : calculateDeviceMetrics.overallUtilization >= 60
              ? "bg-amber-50 border-amber-300"
              : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Overall Utilization
              </p>
              <div className={`rounded-lg p-2 ${
                calculateDeviceMetrics.overallUtilization >= 80
                  ? "bg-red-200"
                  : calculateDeviceMetrics.overallUtilization >= 60
                  ? "bg-amber-200"
                  : "bg-blue-100"
              }`}>
                {calculateDeviceMetrics.overallUtilization >= 80 ? (
                  <AlertTriangle className="h-4 w-4 text-red-700" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </div>
            <p className={`text-3xl font-bold ${
              calculateDeviceMetrics.overallUtilization >= 80
                ? "text-red-700"
                : "text-slate-900"
            }`}>
              {calculateDeviceMetrics.overallUtilization.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {calculateDeviceMetrics.overallUtilization >= 80
                ? "⚠️ High utilization"
                : "Within normal range"}
            </p>
          </div>
        </div>

        {/* Source-wise Breakdown */}
        <div className="rounded-lg bg-white p-5 border border-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Source-wise Asset Tracker Breakdown
            </h3>
            {calculateDeviceMetrics.sourceBreakdown.filter(s => s.isHighUtilization).length > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700">
                  {calculateDeviceMetrics.sourceBreakdown.filter(s => s.isHighUtilization).length} location(s) at 80%+
                </span>
              </div>
            )}
          </div>

          {calculateDeviceMetrics.sourceBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                      Location
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                      In Use
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                      Available
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                      Utilization
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {calculateDeviceMetrics.sourceBreakdown.map((source, index) => (
                    <tr
                      key={index}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        source.isHighUtilization ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {source.isHighUtilization && (
                            <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
                          )}
                          {source.source}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-700">
                          {source.devicesInUse}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                          {source.devicesAvailable}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                        {source.totalDevices}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${
                                source.isHighUtilization
                                  ? "bg-red-600"
                                  : source.utilizationPercentage >= 60
                                  ? "bg-amber-500"
                                  : "bg-emerald-600"
                              }`}
                              style={{ width: `${Math.min(source.utilizationPercentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-bold ${
                            source.isHighUtilization ? "text-red-700" : "text-slate-700"
                          }`}>
                            {source.utilizationPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {source.isHighUtilization ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border-2 border-red-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            HIGH UTILIZATION
                          </span>
                        ) : source.utilizationPercentage >= 60 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Moderate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-8 text-center">
              <Package className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">
                No asset tracker data available
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Connect to Google Sheets to track asset tracker utilization
              </p>
            </div>
          )}
        </div>

        {/* Critical Utilization Alert Banner */}
        {calculateDeviceMetrics.sourceBreakdown.filter(s => s.isHighUtilization).length > 0 && (
          <div className="mt-6 rounded-lg bg-red-50 border-2 border-red-300 p-5 shadow-sm">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <p className="font-bold text-red-900 text-lg mb-2">
                  ⚠️ Critical Utilization Alert - 80% Threshold Reached
                </p>
                <p className="text-sm text-red-800 mb-3">
                  The following locations have reached or exceeded 80% asset tracker utilization. Immediate action recommended:
                </p>
                <div className="space-y-2">
                  {calculateDeviceMetrics.sourceBreakdown
                    .filter(s => s.isHighUtilization)
                    .map((source, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-200">
                        <div>
                          <p className="font-semibold text-red-900">{source.source}</p>
                          <p className="text-xs text-red-700 mt-1">
                            {source.devicesInUse} in use • {source.devicesAvailable} available • {source.totalDevices} total
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-700">
                            {source.utilizationPercentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-red-600 font-semibold">UTILIZATION</p>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-900">
                    📋 Recommended Actions:
                  </p>
                  <ul className="text-xs text-red-800 mt-2 space-y-1 ml-4 list-disc">
                    <li>Reallocate asset trackers from lower-utilization locations</li>
                    <li>Expedite return of asset trackers from completed trips</li>
                    <li>Consider procuring additional asset trackers for high-demand locations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {modalOpen && selectedStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 capitalize">
                  {selectedStatusModal === "total" && "All Trips"}
                  {selectedStatusModal === "offline" && "Offline Trips"}
                  {selectedStatusModal === "intransit" && "In Transit Trips"}
                  {selectedStatusModal === "completed" && "Completed Trips"}
                  {selectedStatusModal === "awaiting" && "Awaiting Departure Trips"}
                  {selectedStatusModal === "delivered" && "Delivered"}
                  {selectedStatusModal === "pending" && "Pending Confirmation"}
                  {selectedStatusModal === "pickupdelay" && "Pickup Delay"}
                  {selectedStatusModal === "pickupraised" && "Pickup Raised"}
                  {selectedStatusModal === "pickupdone" && "Pickup Done"}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Total: {getTripsForStatus(selectedStatusModal).length} trips
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
              >
                <X className="h-6 w-6 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {getTripsForStatus(selectedStatusModal).length > 0 ? (
                <div className="space-y-3">
                  {getTripsForStatus(selectedStatusModal).map((trip, index) => (
                    <div
                      key={`trip-${index}-${trip.tripId || 'no-id'}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Trip ID</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {trip.tripId && trip.tripId.trim() && trip.tripId !== "-" 
                              ? trip.tripId 
                              : <span className="text-slate-400 italic">No Trip ID</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                          <div className="mt-1">
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                              {trip.tripStatus}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Packet Status</p>
                          <p className="text-sm text-slate-700 mt-1 font-medium">{trip.packetStatus || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Origin</p>
                          <p className="text-sm text-slate-700 mt-1">{trip.sourceAddress}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Destination</p>
                          <p className="text-sm text-slate-700 mt-1">{trip.destinationAddress}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Transporter</p>
                          <p className="text-sm text-slate-700 mt-1">{trip.transporterName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Creation Date</p>
                          <p className="text-sm text-slate-700 mt-1">{trip.tripCreationDate}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Asset Trackers</p>
                          <p className="text-xs text-slate-700 mt-1 max-h-12 overflow-y-auto">
                            {trip.serialNumbers && trip.serialNumbers.length > 0
                              ? trip.serialNumbers.join(", ")
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-900">No trips found</p>
                  <p className="text-sm text-slate-600 mt-1">
                    There are no trips in this category with the current filters applied.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STOCK DEFICIENCY SECTION - 80% THRESHOLD */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Stock Deficiency Monitor (80% Threshold)
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Asset trackers needed at each location to reach 80% capacity
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              {stockDeficiency.filter(s => s.status === 'critical').length} Critical
            </p>
            <p className="text-xs text-red-600">
              {stockDeficiency.reduce((sum, s) => sum + s.deficiency, 0)} total needed
            </p>
          </div>
        </div>

        {stockDeficiency.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                    Location
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    In Use
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Available
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Max Capacity
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Utilization
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Asset Trackers Needed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockDeficiency.map((stock, index) => (
                  <tr
                    key={index}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      stock.status === "critical" ? "bg-red-50" : stock.status === "warning" ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {stock.source}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-1 rounded text-sm font-bold bg-amber-100 text-amber-700">
                        {stock.devicesInUse}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-1 rounded text-sm font-bold bg-emerald-100 text-emerald-700">
                        {stock.availableDevices}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700">
                      {stock.maxCapacity}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              stock.status === "critical"
                                ? "bg-red-600"
                                : stock.status === "warning"
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                            style={{ width: `${Math.min(stock.utilization, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-10">
                          {stock.utilization.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        stock.deficiency === 0
                          ? "bg-emerald-100 text-emerald-700"
                          : stock.deficiency <= 10
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {stock.deficiency > 0 ? `+${stock.deficiency}` : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        stock.status === "critical"
                          ? "bg-red-100 text-red-700"
                          : stock.status === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {stock.status === "critical" && <AlertTriangle className="h-3 w-3" />}
                        {stock.status === "warning" && <AlertCircle className="h-3 w-3" />}
                        {stock.status === "optimal" && <CheckCircle className="h-3 w-3" />}
                        {stock.status.charAt(0).toUpperCase() + stock.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-6 text-center">
            <TrendingDown className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              No stock data available. Connect to Google Sheets to see stock deficiency information.
            </p>
          </div>
        )}

        {/* Critical Alerts */}
        {stockDeficiency.filter(s => s.status === 'critical').length > 0 && (
          <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Critical Stock Alert</p>
                <p className="text-sm text-red-700 mt-1">
                  {stockDeficiency
                    .filter(s => s.status === 'critical')
                    .map(s => `${s.source}: ${s.deficiency} asset trackers needed`)
                    .join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stock Deficiency Monitor Section */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pending & Awaiting Trips
            </h2>
            <p className="text-sm text-slate-600">
              Trips awaiting departure or confirmation
            </p>
          </div>
          {filteredTrips.filter(
            (s) =>
              s.tripStatus?.toLowerCase().includes("awaiting") ||
              s.packetStatus?.toLowerCase().includes("pending")
          ).length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-red-600"></div>
              <span className="text-sm font-medium text-red-700">
                {
                  filteredTrips.filter(
                    (s) =>
                      s.tripStatus?.toLowerCase().includes("awaiting") ||
                      s.packetStatus?.toLowerCase().includes("pending")
                  ).length
                }{" "}
                Pending
              </span>
            </div>
          )}
        </div>

        {filteredTrips.filter(
          (s) =>
            s.tripStatus?.toLowerCase().includes("awaiting") ||
            s.packetStatus?.toLowerCase().includes("pending")
        ).length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredTrips
              .filter(
                (s) =>
                  s.tripStatus?.toLowerCase().includes("awaiting") ||
                  s.packetStatus?.toLowerCase().includes("pending")
              )
              .slice(0, 4)
              .map((trip, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-red-50 p-4 border border-red-200"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {trip.tripId}
                    </p>
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                      {trip.tripStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    {trip.sourceAddress} → {trip.destinationAddress}
                  </p>
                  <p className="text-xs text-slate-600">
                    Packet: <span className="font-medium">{trip.packetStatus}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Transporter: <span className="font-medium">{trip.transporterName}</span>
                  </p>
                </div>
              ))}
          </div>
        ) : (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
            <p className="text-sm font-medium text-emerald-900">
              All trips are on track
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              No pending or awaiting trips
            </p>
          </div>
        )}
      </div>
      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500">
        <p>Displaying {filteredTrips.length} of {trips.length} trips</p>
      </div>
    </div>
  );
}
