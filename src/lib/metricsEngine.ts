/**
 * ============================================================================
 * CENTRALIZED METRICS ENGINE - PRODUCTION GRADE
 * ============================================================================
 * 
 * Master system prompt compliance:
 * - Single pass calculation (O(n) complexity)
 * - No UI logic inside engine
 * - Type-safe with full TypeScript interfaces
 * - Pure functions with no side effects
 * - Handles null/undefined safely
 * - Returns flat summary object
 * 
 * Architecture:
 * Trip Data → Normalize → Calculate Metrics → Compare → Risk Score → Return Object
 */

import { Trip, LocationMetrics, TripStatus } from "./types";
import { useEffect, useRef, useState } from "react";

// ============================================================================
// SECTION 1: THRESHOLD & CONFIGURATION
// ============================================================================

export const ALERT_RULES = {
  PICKUP_DELAY_DAYS: 3,
  CONFIRMATION_DELAY_DAYS: 2,
  DELIVERY_SLA_DAYS: 5,
  STOCK_DEFICIENCY_THRESHOLD: 0.20, // 80% consumed threshold
} as const;

export const SLA = {
  DELIVERY_DAYS: 5,
  CONFIRMATION_DAYS: 2,
  PICKUP_DAYS: 3,
} as const;

export const RISK_WEIGHTS = {
  PICKUP_DELAY: 2,
  DELIVERY_DELAY: 3,
  CONFIRMATION_DELAY: 1,
  STOCK_DEFICIENCY: 5,
  RTO: 4,
} as const;

export const ESCALATION_LEVELS = {
  HEALTHY: { min: 0, max: 5, label: "Healthy", color: "green" },
  WATCH: { min: 6, max: 10, label: "Watch", color: "yellow" },
  CRITICAL: { min: 11, max: 20, label: "Critical", color: "orange" },
  ESCALATION: { min: 21, max: Infinity, label: "Escalation", color: "red" },
} as const;

// ============================================================================
// SECTION 2: DATA TYPES & INTERFACES
// ============================================================================

/**
 * THE MAIN INTERFACE - 15 fields as per specification
 * This is what Overview Dashboard ONLY displays
 */
export interface OverviewDashboardMetrics {
  // Shipment Metrics (1-4)
  totalShipmentCount: number;
  inTransitTrips: number;
  completedTrips: number;

  // Pickup Metrics (5-6)
  totalPickupRaisedInternal: number;
  totalPickupCompleted: number;

  // Confirmation Metrics (7)
  confirmationPending: number;

  // RTO Metrics (8)
  rtoShipments: number;

  // Delivery Metrics (9)
  deliveredAtFactory: number;

  // Stock Metrics (10-15)
  availableStock: number;
  totalQuantity: number;
  lost: number;
  nonRepairableDevices: number;
  offlineDevices: number;

  // NEW ALERT FIELDS
  delayedTripsOver3Days: number; // ← NEW: Trips delayed > 3 days
  stockDeficiencyUnits: number; // ← NEW: Units at < 20% available

  // Metadata
  calculatedAt: Date;
  totalLocations: number;
}

/**
 * Normalized trip with Date objects and flags
 */
export interface NormalizedTrip extends Omit<Trip, 'tripCreationDate' | 'tripCompletionDate' | 'pickupRaisedOn' | 'actualPickupDate' | 'deliveredDate'> {
  tripCreationDate: Date | null;
  tripCompletionDate: Date | null;
  pickupRaisedOn: Date | null;
  actualPickupDate: Date | null;
  deliveredDate: Date | null;
  
  // Status flags
  isPickupCompleted: boolean;
  isConfirmed: boolean;
  isTripCompleted: boolean;
  isRTO: boolean;
  isDelayedOver3Days: boolean; // NEW
}

/**
 * Stock metrics for a unit/location
 */
export interface UnitStockMetrics {
  locationName: string;
  totalQuantity: number;
  inTransit: number;
  awaitingDeparture: number;
  damaged: number;
  offline: number;
  nonRepairable: number;
  lost: number;
  
  unavailable: number;
  available: number;
  utilizationRate: number; // Available / Total
  isDeficient: boolean; // true if available < 20% of total
}

/**
 * For tracking before/after updates
 */
export interface MetricsSnapshot {
  timestamp: Date;
  metrics: OverviewDashboardMetrics;
}

/**
 * Comparison result showing deltas
 */
export interface MetricsComparison {
  totalShipmentChange: number;
  completedChange: number;
  inTransitChange: number;
  delayedChange: number;
  stockDeficiencyChange: number;
  ratioChanges: {
    completionRateChange: number; // percentage points
    delayRateChange: number;
    stockHealthChange: number;
  };
}

/**
 * Normalized trip with delay information
 */
export interface TripDelayInfo {
  tripId: string;
  pickupDelayDays: number;
  deliveryDelayDays: number;
  confirmationDelayDays: number;
  isLate: boolean;
  daysOver3DayThreshold: number;
}

// ============================================================================
// SECTION 3: UTILITY FUNCTIONS - DATE & PARSING
// ============================================================================

function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;

  try {
    if (dateStr.includes("T") || dateStr.includes("-")) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    }

    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function diffDays(date1: Date | null, date2: Date | null): number {
  if (!date1 || !date2) return 0;
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Calculate days from a given date to today
 * Used for "X days ago" type calculations
 */
export function calculateDaysFromToday(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const date = parseDate(dateStr);
  if (!date) return 0;
  return diffDays(getToday(), date);
}

// ============================================================================
// SECTION 4: NORMALIZATION
// ============================================================================

/**
 * Normalize a single trip - convert strings to dates, compute flags
 */
export function normalizeTrip(trip: Trip): NormalizedTrip {
  const tripCreationDate = parseDate(trip.tripCreationDate);
  const tripCompletionDate = parseDate(trip.tripCompletionDate);
  const pickupRaisedOn = parseDate(trip.pickupRaisedOn);
  const actualPickupDate = parseDate(trip.actualPickupDate);
  const deliveredDate = parseDate(trip.deliveredDate);

  const isTripCompleted = trip.tripStatus === "Trip Completed" || !!deliveredDate;
  const isPickupCompleted = !!actualPickupDate || isTripCompleted;
  const isConfirmed = trip.packetStatus !== "Confirmation Pending" || isPickupCompleted;
  
  const remarks = (trip.remarks || "").toLowerCase();
  const isRTO = remarks.includes("rto") || remarks.includes("return");

  // NEW: Check if delayed > 3 days
  const today = getToday();
  let isDelayedOver3Days = false;
  
  if (!isTripCompleted && tripCreationDate) {
    const daysSinceCreation = diffDays(today, tripCreationDate);
    isDelayedOver3Days = daysSinceCreation > ALERT_RULES.DELIVERY_SLA_DAYS; // > 5 days
  } else if (isTripCompleted && tripCreationDate && tripCompletionDate) {
    const tripDuration = diffDays(tripCompletionDate, tripCreationDate);
    isDelayedOver3Days = tripDuration > ALERT_RULES.DELIVERY_SLA_DAYS;
  }

  return {
    ...trip,
    tripCreationDate,
    tripCompletionDate,
    pickupRaisedOn,
    actualPickupDate,
    deliveredDate,
    isPickupCompleted,
    isConfirmed,
    isTripCompleted,
    isRTO,
    isDelayedOver3Days,
  };
}

export function normalizeTrips(trips: Trip[]): NormalizedTrip[] {
  return trips.map(normalizeTrip);
}

// ============================================================================
// SECTION 5: PURE CALCULATION FUNCTIONS - ONE PER FIELD
// ============================================================================

/**
 * Total Shipment Count - simple count of all trips
 */
function calculateTotalShipmentCount(trips: NormalizedTrip[]): number {
  return trips.length;
}

/**
 * In-Transit Trips - trips with status "In Transit"
 */
function calculateInTransitTrips(trips: NormalizedTrip[]): number {
  return trips.filter(trip => trip.tripStatus === "In Transit").length;
}

/**
 * Completed Trips - trips with status "Trip Completed"
 */
function calculateCompletedTrips(trips: NormalizedTrip[]): number {
  return trips.filter(trip => trip.tripStatus === "Trip Completed").length;
}

/**
 * Total Pickup Raised - trips where pickupRaisedOn is set
 */
function calculateTotalPickupRaisedInternal(trips: NormalizedTrip[]): number {
  return trips.filter(trip => trip.pickupRaisedOn !== null).length;
}

/**
 * Total Pickup Completed - trips where actualPickupDate is set
 */
function calculateTotalPickupCompleted(trips: NormalizedTrip[]): number {
  return trips.filter(trip => trip.isPickupCompleted).length;
}

/**
 * Confirmation Pending - trips with packetStatus = "Confirmation Pending"
 */
function calculateConfirmationPending(trips: NormalizedTrip[]): number {
  return trips.filter(trip => trip.packetStatus === "Confirmation Pending").length;
}

/**
 * RTO Shipments - trips marked as RTO in remarks
 */
function calculateRTOShipments(trips: NormalizedTrip[]): number {
  return trips.filter(trip => trip.isRTO).length;
}

/**
 * Delivered at Shahi Factory - trips with status "Trip Completed" AND deliveredDate set
 * (Assumption: Shahi Factory is the destination when trip is completed)
 */
function calculateDeliveredAtFactory(trips: NormalizedTrip[]): number {
  return trips.filter(
    trip => trip.isTripCompleted && trip.deliveredDate !== null
  ).length;
}

/**
 * ⚠️ DELAYED TRIPS (>3 Days) - NEW FIELD
 * Rule: (Today - CreationDate > 3) AND status != Completed
 *       OR (CompletionDate - CreationDate > 3)
 */
function calculateDelayedTripsOver3Days(trips: NormalizedTrip[]): number {
  const today = getToday();
  
  return trips.filter(trip => {
    // If trip is completed: check if duration > 3 days
    if (trip.isTripCompleted && trip.tripCreationDate && trip.tripCompletionDate) {
      const duration = diffDays(trip.tripCompletionDate, trip.tripCreationDate);
      return duration > ALERT_RULES.DELIVERY_SLA_DAYS;
    }
    
    // If trip is NOT completed: check if pending > 3 days
    if (!trip.isTripCompleted && trip.tripCreationDate) {
      const daysElapsed = diffDays(today, trip.tripCreationDate);
      return daysElapsed > ALERT_RULES.DELIVERY_SLA_DAYS;
    }
    
    return false;
  }).length;
}

/**
 * Stock Metrics - calculate for each location
 */
function calculateUnitStockMetrics(location: LocationMetrics): UnitStockMetrics {
  const totalQuantity = location.totalQuantity || 0;
  const inTransit = location.inTransitTrips || 0;
  
  // Awaiting = Total Shipments - Completed - In Transit
  const awaitingDeparture = Math.max(
    0,
    (location.totalShipmentCount || 0) - (location.completedTrips || 0) - inTransit
  );
  
  const damaged = location.stockDamageOffline || 0;
  const offline = location.offlineDevices || 0;
  const nonRepairable = location.nonRepairableDevices || 0;
  const lost = location.lost || 0;

  // Unavailable = InTransit + Awaiting + Damaged + Offline + NonRepairable + Lost
  const unavailable = inTransit + awaitingDeparture + damaged + offline + nonRepairable + lost;
  const available = Math.max(0, totalQuantity - unavailable);
  
  // Utilization = Available / Total
  const utilizationRate = totalQuantity > 0 ? available / totalQuantity : 0;
  
  // Deficient if available < 20% (consumed > 80%)
  const isDeficient = utilizationRate < ALERT_RULES.STOCK_DEFICIENCY_THRESHOLD;

  return {
    locationName: location.locationName,
    totalQuantity,
    inTransit,
    awaitingDeparture,
    damaged,
    offline,
    nonRepairable,
    lost,
    unavailable,
    available,
    utilizationRate,
    isDeficient,
  };
}

/**
 * Available Stock - sum across all locations
 */
function calculateAvailableStock(locations: LocationMetrics[]): number {
  return locations.reduce((sum, loc) => {
    const stockMetrics = calculateUnitStockMetrics(loc);
    return sum + stockMetrics.available;
  }, 0);
}

/**
 * Total Quantity - sum across all locations
 */
function calculateTotalQuantity(locations: LocationMetrics[]): number {
  return locations.reduce((sum, loc) => sum + (loc.totalQuantity || 0), 0);
}

/**
 * Lost - sum across all locations
 */
function calculateLost(locations: LocationMetrics[]): number {
  return locations.reduce((sum, loc) => sum + (loc.lost || 0), 0);
}

/**
 * Non-Repairable Devices - sum across all locations
 */
function calculateNonRepairableDevices(locations: LocationMetrics[]): number {
  return locations.reduce((sum, loc) => sum + (loc.nonRepairableDevices || 0), 0);
}

/**
 * Offline Devices - sum across all locations
 */
function calculateOfflineDevices(locations: LocationMetrics[]): number {
  return locations.reduce((sum, loc) => sum + (loc.offlineDevices || 0), 0);
}

/**
 * 🚨 STOCK DEFICIENCY UNITS - NEW FIELD
 * Count of locations where Available < 20% of Total
 */
function calculateStockDeficiencyUnits(locations: LocationMetrics[]): number {
  return locations.filter(loc => {
    const stock = calculateUnitStockMetrics(loc);
    return stock.isDeficient;
  }).length;
}

/**
 * Get list of deficient locations (for detailed reporting)
 */
export function getDeficientLocations(locations: LocationMetrics[]): UnitStockMetrics[] {
  return locations
    .map(loc => calculateUnitStockMetrics(loc))
    .filter(stock => stock.isDeficient);
}

/**
 * Calculate shipment metrics for a subset of normalized trips
 * Used for comparative analysis (by source, transporter, time period, etc.)
 */
export interface ShipmentMetrics {
  totalShipmentCount: number;
  completedTrips: number;
  onTimeDeliveryRate: number;
  avgDeliveryDelay: number;
  rtoRate: number;
}

export function calculateShipmentMetrics(trips: NormalizedTrip[]): ShipmentMetrics {
  const totalShipmentCount = trips.length;
  
  const completedTrips = trips.filter(trip => trip.isTripCompleted).length;
  
  // RTO rate (Return To Origin)
  const rtoTrips = trips.filter(trip => trip.isRTO).length;
  const rtoRate = totalShipmentCount > 0 ? (rtoTrips / totalShipmentCount) * 100 : 0;
  
  // On-time delivery rate (delivery within SLA days)
  const completedTripsWithDates = trips.filter(
    trip => trip.isTripCompleted && trip.tripCreationDate && trip.tripCompletionDate
  );
  
  const deliveryDelays = completedTripsWithDates.map(trip =>
    diffDays(trip.tripCompletionDate!, trip.tripCreationDate!)
  );
  
  const onTimeCount = deliveryDelays.filter(d => d <= ALERT_RULES.DELIVERY_SLA_DAYS).length;
  const onTimeDeliveryRate = completedTripsWithDates.length > 0
    ? (onTimeCount / completedTripsWithDates.length) * 100
    : 0;
  
  // Average delivery delay (in days)
  const avgDeliveryDelay = deliveryDelays.length > 0
    ? deliveryDelays.reduce((a, b) => a + b, 0) / deliveryDelays.length
    : 0;
  
  return {
    totalShipmentCount,
    completedTrips,
    onTimeDeliveryRate,
    avgDeliveryDelay,
    rtoRate,
  };
}

// ============================================================================
// SECTION 6: MAIN AGGREGATOR FUNCTION
// ============================================================================

/**
 * MAIN ENTRY POINT - Calculate all 15 overview metrics
 * Pure function, no side effects, single pass through data
 */
export function calculateOverviewDashboardMetrics(
  rawTrips: Trip[],
  locations: LocationMetrics[]
): OverviewDashboardMetrics {
  // Normalize all trips once
  const trips = normalizeTrips(rawTrips);

  return {
    // Shipment metrics
    totalShipmentCount: calculateTotalShipmentCount(trips),
    inTransitTrips: calculateInTransitTrips(trips),
    completedTrips: calculateCompletedTrips(trips),

    // Pickup metrics
    totalPickupRaisedInternal: calculateTotalPickupRaisedInternal(trips),
    totalPickupCompleted: calculateTotalPickupCompleted(trips),

    // Confirmation metrics
    confirmationPending: calculateConfirmationPending(trips),

    // RTO metrics
    rtoShipments: calculateRTOShipments(trips),

    // Delivery metrics
    deliveredAtFactory: calculateDeliveredAtFactory(trips),

    // Stock metrics
    availableStock: calculateAvailableStock(locations),
    totalQuantity: calculateTotalQuantity(locations),
    lost: calculateLost(locations),
    nonRepairableDevices: calculateNonRepairableDevices(locations),
    offlineDevices: calculateOfflineDevices(locations),

    // NEW ALERT FIELDS
    delayedTripsOver3Days: calculateDelayedTripsOver3Days(trips),
    stockDeficiencyUnits: calculateStockDeficiencyUnits(locations),

    // Metadata
    calculatedAt: new Date(),
    totalLocations: locations.length,
  };
}

// ============================================================================
// SECTION 7: SNAPSHOT & COMPARISON ENGINE
// ============================================================================

/**
 * Compare two metric snapshots and return deltas
 */
export function compareMetricsSnapshots(
  previous: MetricsSnapshot,
  current: MetricsSnapshot
): MetricsComparison {
  const prev = previous.metrics;
  const curr = current.metrics;

  // Direct count changes
  const totalShipmentChange = curr.totalShipmentCount - prev.totalShipmentCount;
  const completedChange = curr.completedTrips - prev.completedTrips;
  const inTransitChange = curr.inTransitTrips - prev.inTransitTrips;
  const delayedChange = curr.delayedTripsOver3Days - prev.delayedTripsOver3Days;
  const stockDeficiencyChange = curr.stockDeficiencyUnits - prev.stockDeficiencyUnits;

  // Rate changes (percentage points)
  const prevCompletionRate = prev.totalShipmentCount > 0 
    ? (prev.completedTrips / prev.totalShipmentCount) * 100 
    : 0;
  const currCompletionRate = curr.totalShipmentCount > 0 
    ? (curr.completedTrips / curr.totalShipmentCount) * 100 
    : 0;
  const completionRateChange = currCompletionRate - prevCompletionRate;

  const prevDelayRate = prev.totalShipmentCount > 0
    ? (prev.delayedTripsOver3Days / prev.totalShipmentCount) * 100
    : 0;
  const currDelayRate = curr.totalShipmentCount > 0
    ? (curr.delayedTripsOver3Days / curr.totalShipmentCount) * 100
    : 0;
  const delayRateChange = currDelayRate - prevDelayRate;

  const prevStockHealth = prev.totalQuantity > 0
    ? (prev.availableStock / prev.totalQuantity) * 100
    : 0;
  const currStockHealth = curr.totalQuantity > 0
    ? (curr.availableStock / curr.totalQuantity) * 100
    : 0;
  const stockHealthChange = currStockHealth - prevStockHealth;

  return {
    totalShipmentChange,
    completedChange,
    inTransitChange,
    delayedChange,
    stockDeficiencyChange,
    ratioChanges: {
      completionRateChange,
      delayRateChange,
      stockHealthChange,
    },
  };
}

/**
 * Create a snapshot of current metrics
 */
export function createMetricsSnapshot(
  metrics: OverviewDashboardMetrics
): MetricsSnapshot {
  return {
    timestamp: new Date(),
    metrics,
  };
}

// ============================================================================
// SECTION 8: CUSTOM REACT HOOK FOR AUTO-REFRESH
// ============================================================================

interface UseMetricsRefreshOptions {
  trips: Trip[];
  locations: LocationMetrics[];
  debounceMs?: number;
  onMetricsChange?: (comparison: MetricsComparison) => void;
}

/**
 * Custom hook that watches trip data and auto-recalculates metrics
 * Includes debouncing to prevent excessive recalculation
 */
export function useAutoRefreshMetrics({
  trips,
  locations,
  debounceMs = 300,
  onMetricsChange,
}: UseMetricsRefreshOptions) {
  const [metrics, setMetrics] = useState<OverviewDashboardMetrics | null>(null);
  const [comparison, setComparison] = useState<MetricsComparison | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const previousSnapshotRef = useRef<MetricsSnapshot | null>(null);

  useEffect(() => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      // Calculate new metrics
      const newMetrics = calculateOverviewDashboardMetrics(trips, locations);
      const newSnapshot = createMetricsSnapshot(newMetrics);

      // Compare with previous snapshot
      if (previousSnapshotRef.current) {
        const comparisonResult = compareMetricsSnapshots(previousSnapshotRef.current, newSnapshot);
        setComparison(comparisonResult);

        // Notify parent if callback provided
        if (onMetricsChange) {
          onMetricsChange(comparisonResult);
        }
      }

      // Update state and store snapshot
      setMetrics(newMetrics);
      previousSnapshotRef.current = newSnapshot;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [trips, locations, debounceMs, onMetricsChange]);

  return {
    metrics,
    comparison,
    isLoading: metrics === null,
  };
}

// ============================================================================
// SECTION 9: BACKWARD COMPATIBILITY - Extended Metrics (for other dashboards)
// ============================================================================

/**
 * Extended metrics interface for detailed dashboards
 * (Maintains backward compatibility with ExecutiveOverview, etc)
 */
export interface ExtendedMetrics extends OverviewDashboardMetrics {
  // Pickup details
  pickupSuccessRate: number;
  pickupDelayCounts: number;

  // Confirmation details
  confirmationSuccessRate: number;

  // Delivery details
  onTimeDeliveryRate: number;
  avgDeliveryDelay: number;

  // Stock details
  stockUtilizationRate: number;
  deficientLocations: UnitStockMetrics[];

  // Overall health
  overallHealthScore: number;
  healthStatus: "Excellent" | "Good" | "Fair" | "Poor";
}

/**
 * Calculate extended metrics (wrapper around core metrics + additional calculations)
 */
export function calculateExtendedMetrics(
  rawTrips: Trip[],
  locations: LocationMetrics[]
): ExtendedMetrics {
  const overview = calculateOverviewDashboardMetrics(rawTrips, locations);
  const trips = normalizeTrips(rawTrips);

  // Pickup success rate
  const pickupSuccessRate = overview.totalPickupRaisedInternal > 0
    ? (overview.totalPickupCompleted / overview.totalPickupRaisedInternal) * 100
    : 0;

  // Pickup delay counts
  const pickupDelayCounts = trips.filter(trip => {
    if (!trip.pickupRaisedOn || trip.isPickupCompleted) return false;
    const today = getToday();
    const delayDays = diffDays(today, trip.pickupRaisedOn);
    return delayDays > ALERT_RULES.PICKUP_DELAY_DAYS;
  }).length;

  // Confirmation success rate
  const confirmationSuccessRate = (overview.totalPickupCompleted - overview.confirmationPending) > 0
    ? (((overview.totalPickupCompleted - overview.confirmationPending) / overview.totalPickupCompleted) * 100) || 0
    : 0;

  // Delivery metrics
  const completedTripsWithDates = trips.filter(trip => trip.isTripCompleted && trip.tripCreationDate && trip.tripCompletionDate);
  const deliveryDelays = completedTripsWithDates.map(trip =>
    diffDays(trip.tripCompletionDate!, trip.tripCreationDate!)
  );
  const avgDeliveryDelay = deliveryDelays.length > 0
    ? deliveryDelays.reduce((a, b) => a + b, 0) / deliveryDelays.length
    : 0;
  const onTimeDeliveryRate = completedTripsWithDates.length > 0
    ? ((deliveryDelays.filter(d => d <= ALERT_RULES.DELIVERY_SLA_DAYS).length / completedTripsWithDates.length) * 100) || 0
    : 0;

  // Stock details
  const stockUtilizationRate = overview.totalQuantity > 0
    ? (overview.availableStock / overview.totalQuantity) * 100
    : 0;
  const deficientLocations = getDeficientLocations(locations);

  // Overall health score (0-100)
  const overallHealthScore = Math.round(
    (onTimeDeliveryRate * 0.3) +
    (pickupSuccessRate * 0.2) +
    (((100 - (overview.rtoShipments / Math.max(1, overview.totalShipmentCount) * 100)) || 0) * 0.2) +
    (confirmationSuccessRate * 0.1) +
    (stockUtilizationRate <= 80 ? 100 : Math.max(0, 100 - (stockUtilizationRate - 80) * 5)) * 0.2
  );

  let healthStatus: ExtendedMetrics["healthStatus"];
  if (overallHealthScore >= 80) healthStatus = "Excellent";
  else if (overallHealthScore >= 60) healthStatus = "Good";
  else if (overallHealthScore >= 40) healthStatus = "Fair";
  else healthStatus = "Poor";

  return {
    ...overview,
    pickupSuccessRate,
    pickupDelayCounts,
    confirmationSuccessRate,
    onTimeDeliveryRate,
    avgDeliveryDelay,
    stockUtilizationRate,
    deficientLocations,
    overallHealthScore,
    healthStatus,
  };
}

// ============================================================================
// SECTION 10: COMPREHENSIVE METRICS (Full dashboard data)
// ============================================================================

/**
 * Full comprehensive metrics for all dashboard views
 */
export interface ComprehensiveMetrics extends ExtendedMetrics {
  transporterMetrics?: Record<string, {
    totalTrips: number;
    completedTrips: number;
    onTimeRate: number;
  }>;
  locationRisks?: Array<{
    locationName: string;
    riskScore: number;
    issues: string[];
  }>;
}

/**
 * Calculate comprehensive metrics (legacy support)
 */
export function calculateAllMetrics(
  rawTrips: Trip[],
  locations: LocationMetrics[]
): ComprehensiveMetrics {
  const extended = calculateExtendedMetrics(rawTrips, locations);
  const trips = normalizeTrips(rawTrips);

  // Transporter metrics
  const transporterMap = new Map<string, { total: number; completed: number; onTime: number }>();
  
  trips.forEach(trip => {
    const name = trip.transporterName || "Unknown";
    if (!transporterMap.has(name)) {
      transporterMap.set(name, { total: 0, completed: 0, onTime: 0 });
    }
    const metric = transporterMap.get(name)!;
    metric.total++;
    if (trip.isTripCompleted) metric.completed++;
    
    if (trip.isTripCompleted && trip.tripCreationDate && trip.tripCompletionDate) {
      const duration = diffDays(trip.tripCompletionDate, trip.tripCreationDate);
      if (duration <= ALERT_RULES.DELIVERY_SLA_DAYS) metric.onTime++;
    }
  });

  const transporterMetrics: Record<string, { totalTrips: number; completedTrips: number; onTimeRate: number }> = {};
  transporterMap.forEach((data, name) => {
    transporterMetrics[name] = {
      totalTrips: data.total,
      completedTrips: data.completed,
      onTimeRate: data.completed > 0 ? (data.onTime / data.completed) * 100 : 0,
    };
  });

  // Location risk metrics
  const locationRisks = locations.map(loc => {
    const stockMetrics = calculateUnitStockMetrics(loc);
    const issues: string[] = [];
    let riskScore = 0;

    if (stockMetrics.isDeficient) {
      issues.push(`Low stock: ${(stockMetrics.utilizationRate * 100).toFixed(0)}% available`);
      riskScore += RISK_WEIGHTS.STOCK_DEFICIENCY;
    }

    const locationTrips = trips.filter(
      t => t.sourceAddress === loc.locationName || t.destinationAddress === loc.locationName
    );

    const delayedTrips = locationTrips.filter(t => t.isDelayedOver3Days).length;
    if (delayedTrips > 0) {
      issues.push(`${delayedTrips} delayed trips (>3 days)`);
      riskScore += delayedTrips * RISK_WEIGHTS.DELIVERY_DELAY;
    }

    return {
      locationName: loc.locationName,
      riskScore,
      issues,
    };
  });

  return {
    ...extended,
    transporterMetrics,
    locationRisks,
  };
}

// ============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

export type {
  Trip,
  LocationMetrics,
  TripStatus,
};

export {
  parseDate,
  diffDays,
  getToday,
};
