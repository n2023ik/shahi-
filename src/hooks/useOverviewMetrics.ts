/**
 * Custom React Hook for Overview Dashboard Metrics
 * 
 * Automatically calculates and updates metrics when trip data changes.
 * Includes debouncing and before/after comparison.
 */

import { useEffect, useRef, useState } from "react";
import {
  calculateOverviewDashboardMetrics,
  createMetricsSnapshot,
  compareMetricsSnapshots,
  OverviewDashboardMetrics,
  MetricsSnapshot,
  MetricsComparison,
} from "@/lib/metricsEngine";
import { Trip, LocationMetrics } from "@/lib/types";

interface UseOverviewMetricsOptions {
  trips: Trip[];
  locations: LocationMetrics[];
  debounceMs?: number;
  onComparisonChange?: (comparison: MetricsComparison) => void;
}

interface UseOverviewMetricsReturn {
  metrics: OverviewDashboardMetrics | null;
  comparison: MetricsComparison | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  hasPreviousSnapshot: boolean;
  // Indicators for UI display (↑, ↓, →)
  indicators: {
    totalShipments: string;
    completed: string;
    delayed: string;
    stockDeficiency: string;
  };
}

/**
 * Hook to automatically calculate overview metrics with auto-refresh
 * 
 * Usage:
 * ```tsx
 * const { metrics, comparison, indicators, isLoading } = useOverviewMetrics({
 *   trips: tripData,
 *   locations: locationData,
 *   debounceMs: 300,
 * });
 * 
 * // Display metrics
 * <OverallMetrics metrics={metrics} />
 * 
 * // Show comparison badges
 * {comparison?.completedChange > 0 && <Badge>↑ +{comparison.completedChange}</Badge>}
 * ```
 */
export function useOverviewMetrics({
  trips,
  locations,
  debounceMs = 300,
  onComparisonChange,
}: UseOverviewMetricsOptions): UseOverviewMetricsReturn {
  const [metrics, setMetrics] = useState<OverviewDashboardMetrics | null>(null);
  const [comparison, setComparison] = useState<MetricsComparison | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const previousSnapshotRef = useRef<MetricsSnapshot | null>(null);

  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      try {
        // Calculate fresh metrics
        const newMetrics = calculateOverviewDashboardMetrics(trips, locations);
        const newSnapshot = createMetricsSnapshot(newMetrics);

        // Compare with previous snapshot if available
        if (previousSnapshotRef.current) {
          const comparisonResult = compareMetricsSnapshots(previousSnapshotRef.current, newSnapshot);
          setComparison(comparisonResult);
          
          // Notify parent if callback provided
          if (onComparisonChange) {
            onComparisonChange(comparisonResult);
          }
        }

        // Update state
        setMetrics(newMetrics);
        setLastUpdated(new Date());
        previousSnapshotRef.current = newSnapshot;
      } catch (error) {
        console.error("Error calculating overview metrics:", error);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [trips, locations, debounceMs, onComparisonChange]);

  // Generate display indicators (↑ ↓ →)
  const indicators: UseOverviewMetricsReturn["indicators"] = {
    totalShipments: comparison ? (comparison.totalShipmentChange > 0 ? "↑" : comparison.totalShipmentChange < 0 ? "↓" : "→") : "→",
    completed: comparison ? (comparison.completedChange > 0 ? "↑" : comparison.completedChange < 0 ? "↓" : "→") : "→",
    delayed: comparison ? (comparison.delayedChange > 0 ? "↑" : comparison.delayedChange < 0 ? "↓" : "→") : "→",
    stockDeficiency: comparison ? (comparison.stockDeficiencyChange > 0 ? "↑" : comparison.stockDeficiencyChange < 0 ? "↓" : "→") : "→",
  };

  return {
    metrics,
    comparison,
    isLoading: metrics === null,
    lastUpdated,
    hasPreviousSnapshot: previousSnapshotRef.current !== null,
    indicators,
  };
}

/**
 * Hook to display metric changes as badges (↑ +2, ↓ -1, etc)
 */
export function useMetricsChangeDisplay(comparison: MetricsComparison | null) {
  if (!comparison) return null;

  return {
    // Direct count changes
    totalShipmentsBadge: comparison.totalShipmentChange > 0 
      ? `↑ +${comparison.totalShipmentChange}` 
      : comparison.totalShipmentChange < 0 
      ? `↓ ${comparison.totalShipmentChange}` 
      : "→",
    
    completedBadge: comparison.completedChange > 0 
      ? `↑ +${comparison.completedChange}` 
      : comparison.completedChange < 0 
      ? `↓ ${comparison.completedChange}` 
      : "→",
    
    inTransitBadge: comparison.inTransitChange > 0 
      ? `↑ +${comparison.inTransitChange}` 
      : comparison.inTransitChange < 0 
      ? `↓ ${comparison.inTransitChange}` 
      : "→",
    
    delayedBadge: comparison.delayedChange > 0 
      ? `↑ +${comparison.delayedChange}` 
      : comparison.delayedChange < 0 
      ? `↓ ${comparison.delayedChange}` 
      : "→",
    
    stockDeficiencyBadge: comparison.stockDeficiencyChange > 0 
      ? `↑ +${comparison.stockDeficiencyChange}` 
      : comparison.stockDeficiencyChange < 0 
      ? `↓ ${comparison.stockDeficiencyChange}` 
      : "→",

    // Rate changes (percentage points)
    completionRateBadge: comparison.ratioChanges.completionRateChange > 0 
      ? `↑ +${comparison.ratioChanges.completionRateChange.toFixed(1)}%` 
      : comparison.ratioChanges.completionRateChange < 0 
      ? `↓ ${comparison.ratioChanges.completionRateChange.toFixed(1)}%` 
      : "→",
    
    delayRateBadge: comparison.ratioChanges.delayRateChange > 0 
      ? `↑ +${comparison.ratioChanges.delayRateChange.toFixed(1)}%` 
      : comparison.ratioChanges.delayRateChange < 0 
      ? `↓ ${comparison.ratioChanges.delayRateChange.toFixed(1)}%` 
      : "→",
    
    stockHealthBadge: comparison.ratioChanges.stockHealthChange > 0 
      ? `↑ +${comparison.ratioChanges.stockHealthChange.toFixed(1)}%` 
      : comparison.ratioChanges.stockHealthChange < 0 
      ? `↓ ${comparison.ratioChanges.stockHealthChange.toFixed(1)}%` 
      : "→",
  };
}
