import { useMemo } from "react";
import { LocationMetrics } from "@/lib/types";
import { Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockUtilizationProps {
  locations?: LocationMetrics[];
  threshold?: number; // default 90%
}

export default function StockUtilization({
  locations = [],
  threshold = 90,
}: StockUtilizationProps) {

  /* =========================
     DERIVED STOCK DATA
  ========================= */

  const stockData = useMemo(() => {
    return locations
      .map((location) => {
        const maxCapacity = location.maxCapacity ?? null;
        const currentStock = location.totalQuantity ?? 0;

        // If capacity missing, skip — don't fabricate numbers
        if (!maxCapacity || maxCapacity <= 0) return null;

        const utilizationPercent = Math.round(
          (currentStock / maxCapacity) * 100
        );

        return {
          key: location.locationName,
          location: location.locationName,
          currentStock,
          maxCapacity,
          utilizationPercent,
          available: location.available ?? 0,
          stockDamageOffline: location.stockDamageOffline ?? 0,
        };
      })
      .filter(
        (data): data is NonNullable<typeof data> =>
          !!data && data.utilizationPercent >= threshold
      )
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  }, [locations, threshold]);

  /* =========================
     EMPTY STATE
  ========================= */

  if (stockData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Package className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">
              Stock Levels Normal
            </h3>
            <p className="text-xs text-muted-foreground">
              No locations exceeding {threshold}% capacity
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     ALERT STATE
  ========================= */

  return (
    <div className="glass-card rounded-xl p-6 border border-orange-500/20 bg-orange-500/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <AlertCircle className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">
            High Stock Utilization
          </h3>
          <p className="text-xs text-muted-foreground">
            {stockData.length} location(s) ≥{threshold}% capacity
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {stockData.map((data) => {
          const isCritical = data.utilizationPercent >= 95;

          return (
            <div
              key={data.key}
              className={cn(
                "p-4 rounded-lg border transition-all",
                isCritical
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-orange-500/10 border-orange-500/30"
              )}
            >
              <div className="flex justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {data.location}
                  </h4>
                  <div className="text-xs text-muted-foreground flex gap-4">
                    <span>Stock: {data.currentStock}</span>
                    <span>Capacity: {data.maxCapacity}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={cn(
                      "text-lg font-bold",
                      isCritical
                        ? "text-red-500"
                        : "text-orange-500"
                    )}
                  >
                    {data.utilizationPercent}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    utilized
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mb-2">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    isCritical
                      ? "bg-red-500"
                      : "bg-orange-500"
                  )}
                  style={{
                    width: `${Math.min(
                      data.utilizationPercent,
                      100
                    )}%`,
                  }}
                />
              </div>

              {/* Breakdown */}
              <div className="flex gap-4 text-xs pt-2 border-t border-border/50">
                <div>
                  <span className="text-muted-foreground">
                    Available:
                  </span>{" "}
                  <span className="font-semibold text-green-500">
                    {data.available}
                  </span>
                </div>

                {data.stockDamageOffline > 0 && (
                  <div>
                    <span className="text-muted-foreground">
                      Damage/Offline:
                    </span>{" "}
                    <span className="font-semibold text-red-500">
                      {data.stockDamageOffline}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}