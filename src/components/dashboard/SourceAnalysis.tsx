import { useMemo, useState } from "react";
import { Trip } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SourceAnalysisProps {
  trips: Trip[];
}

const COLORS = [
  "hsl(152, 60%, 45%)",
  "hsl(190, 85%, 48%)",
  "hsl(38, 92%, 55%)",
  "hsl(215, 12%, 50%)",
];

export default function SourceAnalysis({ trips }: SourceAnalysisProps) {
  const [selectedSource, setSelectedSource] = useState("all");

  /* =========================
     SOURCE AGGREGATION
  ========================= */

  const sourceData = useMemo(() => {
    const map: Record<
      string,
      { total: number; completed: number; statuses: Record<string, number> }
    > = {};

    trips.forEach((trip) => {
      const source = trip.sourceAddress || "Unknown";
      const status = trip.tripStatus || "Unknown";

      if (!map[source]) {
        map[source] = { total: 0, completed: 0, statuses: {} };
      }

      map[source].total++;
      map[source].statuses[status] =
        (map[source].statuses[status] || 0) + 1;

      if (status === "Trip Completed") {
        map[source].completed++;
      }
    });

    return Object.entries(map)
      .map(([source, data]) => ({
        source,
        total: data.total,
        completed: data.completed,
        statuses: data.statuses,
        completionRate:
          data.total > 0
            ? Math.round((data.completed / data.total) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [trips]);

  /* =========================
     FILTERED TRIPS
  ========================= */

  const filteredTrips = useMemo(() => {
    if (selectedSource === "all") return trips;
    return trips.filter(
      (t) => (t.sourceAddress || "Unknown") === selectedSource
    );
  }, [selectedSource, trips]);

  /* =========================
     STATUS DISTRIBUTION
  ========================= */

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    const list =
      selectedSource === "all" ? trips : filteredTrips;

    list.forEach((t) => {
      const status = t.tripStatus || "Unknown";
      dist[status] = (dist[status] || 0) + 1;
    });

    return Object.entries(dist).map(([status, count]) => ({
      status,
      count,
    }));
  }, [selectedSource, trips, filteredTrips]);

  /* =========================
     PERFORMANCE DATA
  ========================= */

  const performanceData = useMemo(() => {
    return sourceData.slice(0, 10).map((d) => ({
      source: d.source.slice(0, 14),
      completion: d.completionRate,
    }));
  }, [sourceData]);

  /* =========================
     SUMMARY METRICS
  ========================= */

  const totalShipments = trips.length;
  const totalSources = sourceData.length;
  const totalCompleted = trips.filter(
    (t) => t.tripStatus === "Trip Completed"
  ).length;

  const avgShipmentsPerSource =
    totalSources > 0
      ? Math.round((totalShipments / totalSources) * 10) / 10
      : 0;

  const overallCompletionRate =
    totalShipments > 0
      ? Math.round((totalCompleted / totalShipments) * 100)
      : 0;

  /* =========================
     STOCK UTILIZATION
  ========================= */

  const stockUtilization = useMemo(() => {
    const map: Record<
      string,
      { total: number; active: number }
    > = {};

    trips.forEach((trip) => {
      const source = trip.sourceAddress || "Unknown";

      if (!map[source]) {
        map[source] = { total: 0, active: 0 };
      }

      map[source].total++;
      if (trip.tripStatus !== "Trip Completed") {
        map[source].active++;
      }
    });

    return Object.entries(map)
      .map(([source, data]) => ({
        source,
        total: data.total,
        active: data.active,
        utilization:
          data.total > 0
            ? Math.round((data.active / data.total) * 100)
            : 0,
      }))
      .filter((s) => s.utilization >= 70)
      .sort((a, b) => b.utilization - a.utilization);
  }, [trips]);

  const highUtilization = stockUtilization.filter(
    (s) => s.utilization >= 90
  );

  /* =========================
     CHART DATA
  ========================= */

  const pieData = sourceData.map((s) => ({
    name: s.source,
    value: s.total,
  }));

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="space-y-8">
      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Sources" value={totalSources} />
        <SummaryCard label="Shipments" value={totalShipments} />
        <SummaryCard
          label="Avg / Source"
          value={avgShipmentsPerSource}
        />
        <SummaryCard
          label="Completion %"
          value={`${overallCompletionRate}%`}
        />
      </div>

      {/* SOURCE FILTER */}
      <Select value={selectedSource} onValueChange={setSelectedSource}>
        <SelectTrigger className="w-80">
          <SelectValue placeholder="Select Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            All Sources ({totalSources})
          </SelectItem>
          {sourceData.map((s) => (
            <SelectItem key={s.source} value={s.source}>
              {s.source} • {s.total}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-center">Total</th>
              <th className="p-3 text-center">Completed</th>
              <th className="p-3 text-center">Success %</th>
            </tr>
          </thead>
          <tbody>
            {sourceData.map((item) => (
              <tr key={item.source} className="border-t">
                <td className="p-3">{item.source}</td>
                <td className="p-3 text-center">
                  <Badge>{item.total}</Badge>
                </td>
                <td className="p-3 text-center">
                  {item.completed}
                </td>
                <td className="p-3 text-center font-bold">
                  <span
                    className={
                      item.completionRate >= 80
                        ? "text-green-600"
                        : item.completionRate >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                    }
                  >
                    {item.completionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PIE CHART */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={pieData} dataKey="value" outerRadius={100}>
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      {/* BAR CHART */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={performanceData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="source" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="completion" fill="hsl(152,60%,45%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =========================
   REUSABLE SUMMARY CARD
========================= */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border rounded-lg p-4 bg-background">
      <div className="text-xs text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}