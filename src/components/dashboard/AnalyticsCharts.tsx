import React, { useMemo, useState } from "react";
import { Trip } from "@/lib/types";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { AlertCircle, TrendingUp, Package } from "lucide-react";

interface AnalyticsChartsProps {
  trips?: Trip[]; // make optional for safety
}

const CARD_CLASS =
  "bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm";

const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  color: "#e2e8f0",
};

const STATUS_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

const parseDDMMYYYY = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  
  const strVal = String(dateStr).trim();
  
  // Reject invalid values
  if (!strVal || strVal === "NaN" || strVal === "undefined" || strVal === "null" || strVal === "") {
    return null;
  }
  
  // Handle DD/MM/YYYY format
  if (strVal.includes("/")) {
    const parts = strVal.split("/");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // Validate ranges
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const date = new Date(year, month - 1, day);
    
    // Verify the date was created correctly
    if (isNaN(date.getTime()) || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day || 
        date.getFullYear() !== year) {
      return null;
    }
    
    return date;
  }
  
  // Handle ISO format (YYYY-MM-DD or full ISO string)
  try {
    const date = new Date(strVal);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const calculateDelay = (
  creationDate?: string,
  completionDate?: string
): number | null => {
  const created = parseDDMMYYYY(creationDate);
  const completed = parseDDMMYYYY(completionDate);
  if (!created || !completed) return null;
  const diffTime = completed.getTime() - created.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

function MetricCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: "red" | "blue";
}) {
  const colorMap = {
    red: "text-red-500",
    blue: "text-blue-500",
  };

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${colorMap[highlight || "blue"]}`}>
            {value}
          </p>
        </div>
        <div className="text-slate-500">{icon}</div>
      </div>
    </div>
  );
}

export default function AnalyticsCharts({ trips = [] }: AnalyticsChartsProps) {
  const [rangeType, setRangeType] = useState<"1d" | "7d" | "custom">("7d");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  console.log("[AnalyticsCharts] Received trips:", trips.length);
  if (trips.length > 0) {
    console.log("[AnalyticsCharts] First trip:", {
      date: trips[0].tripCreationDate,
      status: trips[0].tripStatus,
      id: trips[0].tripId
    });
  }

  const filteredTrips = useMemo(() => {
    if (!trips || trips.length === 0) {
      console.log("[AnalyticsCharts] No trips to filter");
      return [];
    }
    
    const now = new Date();
    console.log("[AnalyticsCharts] Filtering with range:", rangeType, "Current date:", now.toISOString().split('T')[0]);

    const filtered = trips.filter((t) => {
      const created = parseDDMMYYYY(t.tripCreationDate);
      if (!created) {
        console.log("[AnalyticsCharts] Failed to parse date:", t.tripCreationDate);
        return false;
      }

      const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      if (rangeType === "1d") {
        return daysDiff >= 0 && daysDiff <= 1;
      }

      if (rangeType === "7d") {
        const matches = daysDiff >= 0 && daysDiff <= 7;
        return matches;
      }

      if (rangeType === "custom" && fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        return created >= from && created <= to;
      }

      return true;
    });

    console.log("[AnalyticsCharts] Filtered trips:", filtered.length, "from", trips.length);
    return filtered;
  }, [trips, rangeType, fromDate, toDate]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTrips.forEach((t) => {
      counts[t.tripStatus] = (counts[t.tripStatus] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTrips]);

  const tripDelayData = useMemo(() => {
    const buckets: Record<string, number> = {
      "0-2": 0,
      "3-5": 0,
      "6-10": 0,
      "11+": 0,
    };

    filteredTrips.forEach((t) => {
      if (t.tripStatus === "Trip Completed") {
        const delay = calculateDelay(t.tripCreationDate, t.tripCompletionDate);
        if (delay !== null) {
          if (delay <= 2) buckets["0-2"]++;
          else if (delay <= 5) buckets["3-5"]++;
          else if (delay <= 10) buckets["6-10"]++;
          else buckets["11+"]++;
        }
      }
    });

    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [filteredTrips]);

  const dailyTrendData = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredTrips.forEach((t) => {
      if (t.tripCreationDate) {
        counts[t.tripCreationDate] =
          (counts[t.tripCreationDate] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => {
        const d1 = parseDDMMYYYY(a[0]);
        const d2 = parseDDMMYYYY(b[0]);
        return (d1?.getTime() || 0) - (d2?.getTime() || 0);
      })
      .slice(-14)
      .map(([date, count]) => ({ date: date.slice(0, 5), count }));
  }, [filteredTrips]);

  const criticalMetrics = useMemo(() => {
    console.log("[AnalyticsCharts] Calculating criticalMetrics from filteredTrips:", filteredTrips.length);
    
    const delayedTrips = filteredTrips.filter((t) => {
      const delay = calculateDelay(t.tripCreationDate, t.tripCompletionDate);
      return delay !== null && delay > 5;
    }).length;

    const completed = filteredTrips.filter(
      (t) => t.tripStatus === "Trip Completed"
    ).length;

    console.log("[AnalyticsCharts] criticalMetrics:", { 
      totalTrips: filteredTrips.length, 
      completed, 
      delayedTrips 
    });

    return {
      totalTrips: filteredTrips.length,
      completed,
      delayedTrips,
    };
  }, [filteredTrips]);

  return (
    <div className="space-y-10 bg-slate-950 p-6 rounded-3xl">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs text-slate-400">Range</label>
          <select
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="1d">Last 1 Day</option>
            <option value="7d">Last 7 Days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {rangeType === "custom" && (
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MetricCard
          title="Total Trips"
          value={criticalMetrics.totalTrips}
          icon={<Package size={20} />}
          highlight="blue"
        />
        <MetricCard
          title="Completed"
          value={criticalMetrics.completed}
          icon={<TrendingUp size={20} />}
          highlight="blue"
        />
        <MetricCard
          title="Delayed (>5d)"
          value={criticalMetrics.delayedTrips}
          icon={<AlertCircle size={20} />}
          highlight="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={CARD_CLASS}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Completion Delay Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tripDelayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="range" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Trip Creation Trend (Last 14 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#22c55e"
                fill="#22c55e33"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">
          Trip Status Distribution
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
            >
              {statusData.map((_, i) => (
                <Cell
                  key={i}
                  fill={STATUS_COLORS[i % STATUS_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
