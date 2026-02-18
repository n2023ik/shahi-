import { useMemo } from "react";
import { Trip } from "@/lib/types";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface AnalyticsChartsProps {
  trips: Trip[];
}

const COLORS = [
  "hsl(152, 60%, 45%)",     // Completed - Green
  "hsl(190, 85%, 48%)",     // In-Transit - Blue
  "hsl(38, 92%, 55%)",      // Mapped - Yellow
  "hsl(215, 12%, 50%)",     // Trip Not Created - Gray
];

export default function AnalyticsCharts({ trips }: AnalyticsChartsProps) {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    trips.forEach((t) => { counts[t.tripStatus] = (counts[t.tripStatus] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [trips]);

  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    trips.forEach((t) => { counts[t.sourceAddress] = (counts[t.sourceAddress] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [trips]);

  const dailyData = useMemo(() => {
    const counts: Record<string, number> = {};
    trips.forEach((t) => {
      if (t.tripCreationDate) counts[t.tripCreationDate] = (counts[t.tripCreationDate] || 0) + 1;
    });
    return Object.entries(counts).sort().slice(-14).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [trips]);

  const deliveryPerf = useMemo(() => {
    const completed = trips.filter((t) => t.tripStatus === "Completed").length;
    const inTransit = trips.filter((t) => t.tripStatus === "In-Transit").length;
    return [
      { name: "Delivered", value: completed },
      { name: "In Transit", value: inTransit },
    ];
  }, [trips]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Trips by Status */}
      <div className="glass-card rounded-xl p-5 animate-slide-up">
        <h3 className="text-sm font-semibold mb-4">Trips by Status</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
              {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(220, 25%, 12%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {statusData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-semibold">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trips by Source Location */}
      <div className="glass-card rounded-xl p-5 animate-slide-up">
        <h3 className="text-sm font-semibold mb-4">Trips by Source</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={locationData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 18%)" />
            <XAxis type="number" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} width={90} />
            <Tooltip contentStyle={{ background: "hsl(220, 25%, 12%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
            <Bar dataKey="value" fill="hsl(190, 85%, 48%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Pickups Trend */}
      <div className="glass-card rounded-xl p-5 animate-slide-up">
        <h3 className="text-sm font-semibold mb-4">Daily Trip Creation</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(190, 85%, 48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(190, 85%, 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 18%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(220, 25%, 12%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
            <Area type="monotone" dataKey="count" stroke="hsl(190, 85%, 48%)" fill="url(#colorTrips)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Delivery Performance */}
      <div className="glass-card rounded-xl p-5 animate-slide-up">
        <h3 className="text-sm font-semibold mb-4">Delivery Performance</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={deliveryPerf}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 18%)" />
            <XAxis dataKey="name" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(220, 25%, 12%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {deliveryPerf.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
