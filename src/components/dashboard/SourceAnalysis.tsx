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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SourceAnalysisProps {
  trips: Trip[];
}

const statusBadgeClass: Record<string, string> = {
  Completed: "status-badge-completed",
  "In-Transit": "status-badge-in-transit",
  Mapped: "bg-yellow-500/20 text-yellow-500",
  "Trip Not Created": "bg-gray-500/20 text-gray-400",
};

const COLORS = [
  "hsl(152, 60%, 45%)",     // Green
  "hsl(190, 85%, 48%)",     // Blue
  "hsl(38, 92%, 55%)",      // Yellow
  "hsl(215, 12%, 50%)",     // Gray
];

export default function SourceAnalysis({ trips }: SourceAnalysisProps) {
  const [selectedSource, setSelectedSource] = useState<string>("all");

  const sourceData = useMemo(() => {
    const data: Record<string, { total: number; statuses: Record<string, number>; completion: number }> = {};
    
    trips.forEach((trip) => {
      const source = trip.sourceAddress || "Unknown";
      if (!data[source]) {
        data[source] = { total: 0, statuses: {}, completion: 0 };
      }
      data[source].total += 1;
      data[source].statuses[trip.tripStatus] = (data[source].statuses[trip.tripStatus] || 0) + 1;
      if (trip.tripStatus === "Completed") data[source].completion += 1;
    });

    return Object.entries(data)
      .map(([source, stats]) => ({ 
        source, 
        ...stats,
        completionRate: ((stats.completion / stats.total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.total - a.total);
  }, [trips]);

  const filteredTrips = useMemo(() => {
    if (selectedSource === "all") return trips;
    return trips.filter((t) => t.sourceAddress === selectedSource);
  }, [trips, selectedSource]);

  // Chart data for pie chart
  const sourceChartData = useMemo(() => {
    return sourceData.map(d => ({ name: d.source, value: d.total }));
  }, [sourceData]);

  // Status distribution chart
  const statusDistribution = useMemo(() => {
    if (selectedSource === "all") {
      const dist: Record<string, number> = {};
      trips.forEach(t => {
        dist[t.tripStatus] = (dist[t.tripStatus] || 0) + 1;
      });
      return Object.entries(dist).map(([status, count]) => ({ status, count }));
    } else {
      const dist: Record<string, number> = {};
      filteredTrips.forEach(t => {
        dist[t.tripStatus] = (dist[t.tripStatus] || 0) + 1;
      });
      return Object.entries(dist).map(([status, count]) => ({ status, count }));
    }
  }, [selectedSource, trips, filteredTrips]);

  // Performance metrics by source
  const performanceData = useMemo(() => {
    return sourceData.slice(0, 10).map(d => ({
      source: d.source.slice(0, 12),
      completion: parseFloat(d.completionRate as string),
      total: d.total
    }));
  }, [sourceData]);

  const totalShipments = trips.length;
  const totalSources = sourceData.length;
  const avgShipmentsPerSource = (totalShipments / totalSources).toFixed(1);
  const totalCompleted = trips.filter(t => t.tripStatus === "Completed").length;
  const completionRate = ((totalCompleted / totalShipments) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Cards with Progress Bars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="glass-card rounded-xl p-4 animate-slide-up hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase">📍 Sources</span>
            <span className="text-3xl font-bold text-primary">{totalSources}</span>
          </div>
          <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-full"></div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 animate-slide-up hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase">📦 Shipments</span>
            <span className="text-3xl font-bold text-blue-500">{totalShipments}</span>
          </div>
          <div className="h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full"></div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 animate-slide-up hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase">📊 Avg</span>
            <span className="text-3xl font-bold text-yellow-500">{avgShipmentsPerSource}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">per source</div>
        </div>
        <div className="glass-card rounded-xl p-4 animate-slide-up hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase">✅ Done</span>
            <span className="text-3xl font-bold text-green-500">{completionRate}%</span>
          </div>
          <div className="h-1.5 bg-green-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-full" style={{width: `${completionRate}%`}}></div>
          </div>
        </div>
      </div>

      {/* Source Filter & Stats Table */}
      <div className="glass-card rounded-xl p-5 animate-slide-up">
        <div className="mb-5">
          <label className="text-sm font-semibold mb-2 block">🔍 Select Source</label>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-full md:w-96 bg-secondary border-border">
              <SelectValue placeholder="Select a source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources ({sourceData.length})</SelectItem>
              {sourceData.map((item) => (
                <SelectItem key={item.source} value={item.source}>
                  {item.source} • {item.total} shipments
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Statistics Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">✅ Completed</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">🚚 In Transit</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">📋 Mapped</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">⏳ Pending</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Success %</th>
              </tr>
            </thead>
            <tbody>
              {sourceData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No data available
                  </td>
                </tr>
              ) : (
                sourceData.map((item) => (
                  <tr
                    key={item.source}
                    className={cn(
                      "border-b border-border/50 transition-all",
                      selectedSource === item.source
                        ? "bg-primary/15 font-semibold"
                        : "hover:bg-secondary/40"
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{item.source}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className="bg-primary/20 text-primary font-bold text-xs">
                        {item.total}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.statuses["Completed"] ? (
                        <Badge className="bg-green-500/20 text-green-500 font-semibold text-xs">
                          {item.statuses["Completed"]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.statuses["In-Transit"] ? (
                        <Badge className="bg-blue-500/20 text-blue-500 font-semibold text-xs">
                          {item.statuses["In-Transit"]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.statuses["Mapped"] ? (
                        <Badge className="bg-yellow-500/20 text-yellow-500 font-semibold text-xs">
                          {item.statuses["Mapped"]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.statuses["Trip Not Created"] ? (
                        <Badge className="bg-gray-500/20 text-gray-400 font-semibold text-xs">
                          {item.statuses["Trip Not Created"]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold">
                      <span className={item.completion / item.total >= 0.8 ? "text-green-500 text-lg" : item.completion / item.total >= 0.5 ? "text-yellow-500 text-lg" : "text-red-500 text-lg"}>
                        {item.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtered View */}
      {selectedSource !== "all" && (
        <div className="glass-card rounded-xl p-5 animate-slide-up">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <span className="text-lg">📍</span>
            <span>Shipments from <span className="text-primary font-bold text-base">{selectedSource}</span></span>
            <Badge className="bg-primary/20 text-primary font-bold ml-auto">{filteredTrips.length} trips</Badge>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Trip ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Transporter</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No trips found
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => (
                    <tr key={trip.tripId} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-primary font-semibold">{trip.tripId}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{trip.vehicleNo}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{trip.destinationAddress}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-semibold", statusBadgeClass[trip.tripStatus])}>
                          {trip.tripStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{trip.transporterName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{trip.tripCreationDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts at Bottom - Easy to Understand Analytics */}
      <div className="space-y-6 pt-4 border-t border-border">
        <h2 className="text-lg font-bold">📈 Visual Analytics</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Source Distribution Pie Chart */}
          <div className="glass-card rounded-xl p-5 animate-slide-up">
            <h3 className="text-sm font-semibold mb-4 text-center">📍 Shipments by Location</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={sourceChartData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={85} 
                  paddingAngle={2} 
                  dataKey="value" 
                  stroke="none"
                  label={({ name, value }) => `${name.slice(0, 10)}: ${value}`}
                >
                  {sourceChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(220, 25%, 12%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution - Easy to Read */}
          <div className="lg:col-span-2 glass-card rounded-xl p-5 animate-slide-up">
            <h3 className="text-sm font-semibold mb-4 text-center">📊 Status Breakdown {selectedSource !== "all" && `(${selectedSource.slice(0, 15)})`}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusDistribution} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 18%)" />
                <XAxis 
                  dataKey="status" 
                  tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12, fontWeight: "bold" }} 
                  angle={-20} 
                  textAnchor="end" 
                  height={100}
                />
                <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} label={{ value: "Count", angle: -90, position: "insideLeft" }} />
                <Tooltip 
                  contentStyle={{ background: "hsl(220, 25%, 12%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)", fontSize: 14, fontWeight: "bold" }} 
                  cursor={{ fill: "rgba(255,255,255,0.1)" }}
                />
                <Bar dataKey="count" fill="hsl(190, 85%, 48%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="glass-card rounded-xl p-5 animate-slide-up">
          <h3 className="text-sm font-semibold mb-4 text-center">⚡ Top Sources by Completion Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData} layout="vertical" margin={{ left: 150 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 18%)" />
              <XAxis type="number" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} label={{ value: "Completion %", position: "bottom", offset: 10 }} />
              <YAxis dataKey="source" type="category" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11, fontWeight: "bold" }} width={140} />
              <Tooltip 
                contentStyle={{ background: "hsl(220, 25%, 12%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} 
                formatter={(value) => [`${value}%`, "Success Rate`]}
              />
              <Bar dataKey="completion" fill="hsl(152, 60%, 45%)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
            📈 Shows top 10 sources by number of shipments with their completion percentages
          </div>
        </div>
      </div>
    </div>
  );
}
