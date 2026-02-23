import { useMemo } from "react";
import { LocationMetrics } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface LocationComparisonProps {
  locations?: LocationMetrics[];
  metric:
    | "completedTrips"
    | "totalPickupCompleted"
    | "successRate"
    | "totalQuantity";
  maxItems?: number;
}

const COLORS = [
  "hsl(190, 85%, 48%)",
  "hsl(152, 60%, 45%)",
  "hsl(38, 92%, 55%)",
  "hsl(280, 70%, 60%)",
  "hsl(0, 70%, 55%)",
];

export default function LocationComparison({
  locations = [],
  metric,
  maxItems = 10,
}: LocationComparisonProps) {
  /* =============================
     DERIVED DATA (MEMOIZED)
  ============================= */

  const { chartData, metricLabel } = useMemo(() => {
    const labelMap = {
      completedTrips: "Completed Trips",
      totalPickupCompleted: "Pickups Completed",
      successRate: "Success Rate (%)",
      totalQuantity: "Total Quantity",
    } as const;

    const data = locations
      .map((location) => {
        let value = 0;

        if (metric === "completedTrips") {
          value = location.completedTrips;
        } else if (metric === "totalPickupCompleted") {
          value = location.totalPickupCompleted;
        } else if (metric === "totalQuantity") {
          value = location.totalQuantity;
        } else if (metric === "successRate") {
          const total =
            location.totalShipmentCount ??
            location.completedTrips + location.inTransitTrips;

          value = total > 0
            ? Math.round((location.completedTrips / total) * 100)
            : 0;
        }

        return {
          name:
            location.locationName.length > 15
              ? location.locationName.slice(0, 15) + "..."
              : location.locationName,
          fullName: location.locationName,
          value,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, maxItems);

    return {
      chartData: data,
      metricLabel: labelMap[metric],
    };
  }, [locations, metric, maxItems]);

  /* =============================
     EMPTY STATE
  ============================= */

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400 text-center">
          No data available
        </p>
      </div>
    );
  }

  /* =============================
     RENDER
  ============================= */

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          Location Comparison – {metricLabel}
        </h3>
        <p className="text-xs text-slate-400">
          Top {chartData.length} locations
        </p>
      </div>

      <ResponsiveContainer
        width="100%"
        height={Math.max(300, chartData.length * 40)}
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(220, 18%, 18%)"
          />

          <XAxis type="number" />

          <YAxis
            dataKey="name"
            type="category"
            width={140}
          />

          <Tooltip
            contentStyle={{
              background: "hsl(220, 25%, 12%)",
              border: "1px solid hsl(220, 18%, 18%)",
              borderRadius: "8px",
              color: "hsl(210, 20%, 92%)",
            }}
            formatter={(value: number, _name, props: any) => [
              `${value}${metric === "successRate" ? "%" : ""}`,
              props.payload.fullName,
            ]}
          />

          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {chartData.map((item, index) => (
              <Cell
                key={item.fullName}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* MINI LEGEND */}
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {chartData.slice(0, 5).map((item, index) => (
          <div
            key={item.fullName}
            className="flex items-center gap-1.5 text-xs"
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="text-slate-400">
              {item.fullName}
            </span>
            <span className="font-semibold">
              {item.value}
              {metric === "successRate" ? "%" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
