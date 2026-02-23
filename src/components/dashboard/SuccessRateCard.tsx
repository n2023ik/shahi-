import { useMemo } from "react";
import { LocationMetrics } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessRateCardProps {
  location: LocationMetrics;
  showTrend?: boolean;
}

export default function SuccessRateCard({
  location,
  showTrend = false,
}: SuccessRateCardProps) {

  /* =========================
     DERIVED METRICS
  ========================= */

  const {
    totalShipments,
    successRate,
    pickupSuccessRate,
  } = useMemo(() => {
    const completed = location.completedTrips ?? 0;
    const inTransit = location.inTransitTrips ?? 0;
    const explicitTotal = location.totalShipmentCount ?? 0;

    // Only trust explicit total if > 0
    const total =
      explicitTotal > 0
        ? explicitTotal
        : completed + inTransit;

    const rate =
      total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    const pickupRaised = location.totalPickupRaisedInternal ?? 0;
    const pickupCompleted = location.totalPickupCompleted ?? 0;

    const pickupRate =
      pickupRaised > 0
        ? Math.round((pickupCompleted / pickupRaised) * 100)
        : 0;

    return {
      totalShipments: total,
      successRate: rate,
      pickupSuccessRate: pickupRate,
    };
  }, [location]);

  /* =========================
     COLOR HELPERS
  ========================= */

  const getColor = (rate: number) => {
    if (rate >= 80) return "text-green-500";
    if (rate >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getBg = (rate: number) => {
    if (rate >= 80) return "bg-green-500/10 border-green-500/20";
    if (rate >= 60) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  const getTrendIcon = (rate: number) => {
    if (rate >= 80)
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (rate >= 60)
      return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  /* =========================
     UI
  ========================= */

  return (
    <div
      className={cn(
        "glass-card rounded-xl p-5 border transition-all",
        getBg(successRate)
      )}
    >
      <div className="flex justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold mb-1">
            {location.locationName}
          </h3>
          <p className="text-xs text-muted-foreground">
            Trip Success Rate
          </p>
        </div>

        {showTrend && getTrendIcon(successRate)}
      </div>

      <div className="space-y-4">

        {/* Trip Completion */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Trip Completion
            </span>
            <span
              className={cn(
                "text-2xl font-bold",
                getColor(successRate)
              )}
            >
              {successRate}%
            </span>
          </div>

          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                successRate >= 80
                  ? "bg-green-500"
                  : successRate >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
              )}
              style={{
                width: `${Math.min(successRate, 100)}%`,
              }}
            />
          </div>

          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{location.completedTrips ?? 0} completed</span>
            <span>{totalShipments} total</span>
          </div>
        </div>

        {/* Pickup Completion */}
        {location.totalPickupRaisedInternal &&
          location.totalPickupRaisedInternal > 0 && (
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Pickup Completion
                </span>
                <span
                  className={cn(
                    "text-lg font-semibold",
                    getColor(pickupSuccessRate)
                  )}
                >
                  {pickupSuccessRate}%
                </span>
              </div>

              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    pickupSuccessRate >= 80
                      ? "bg-green-500"
                      : pickupSuccessRate >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  )}
                  style={{
                    width: `${Math.min(
                      pickupSuccessRate,
                      100
                    )}%`,
                  }}
                />
              </div>

              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>
                  {location.totalPickupCompleted ?? 0} completed
                </span>
                <span>
                  {location.totalPickupRaisedInternal} raised
                </span>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}