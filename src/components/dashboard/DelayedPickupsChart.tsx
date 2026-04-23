import { useMemo, useState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DelayedPickupTrip {
  tripId: string;
  creationDate: string;
  vehicleNo: string;
  source: string;
  destination: string;
  pickupRaised: string;
  actualPickup: string;
  delayDays: number;
  tripStatus: string;
  packetStatus: string;
}

interface DelayedPickupsChartProps {
  trips?: DelayedPickupTrip[]; // safe optional
}

type SourceChartData = {
  source: string;
  count: number;
  totalDelay: number;
};

const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

export default function DelayedPickupsChart({
  trips = [],
}: DelayedPickupsChartProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  /* =============================
     DERIVED DATA (MEMOIZED)
  ============================= */

  const delayedTrips = useMemo(
    () => trips.filter((trip) => trip.delayDays > 3),
    [trips]
  );

  const sourceData = useMemo<SourceChartData[]>(() => {
    const map = new Map<string, SourceChartData>();

    delayedTrips.forEach((trip) => {
      const existing = map.get(trip.source) ?? {
        source: trip.source,
        count: 0,
        totalDelay: 0,
      };

      existing.count += 1;
      existing.totalDelay += trip.delayDays;
      map.set(trip.source, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [delayedTrips]);

  const filteredTrips = useMemo(
    () =>
      selectedSource
        ? delayedTrips.filter((t) => t.source === selectedSource)
        : delayedTrips,
    [delayedTrips, selectedSource]
  );

  /* =============================
     EMPTY STATE
  ============================= */

  if (delayedTrips.length === 0) {
    return (
      <Card className="border border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Pickup Delayed (&gt;3 Days)
          </CardTitle>
          <CardDescription>
            All pickups are currently on schedule
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  /* =============================
     RENDER
  ============================= */

  return (
    <div className="space-y-8">
      {/* SUMMARY + CHART */}
      <Card className="border border-red-500/20 bg-red-500/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Pickup Delayed (&gt;3 Days)
              </CardTitle>
              <CardDescription>
                {delayedTrips.length} pickup(s) delayed beyond SLA
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sourceData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/50"
                />
                <XAxis
                  dataKey="source"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Delayed Pickups"
                  radius={[8, 8, 0, 0]}
                >
                  {sourceData.map((entry) => (
                    <Cell
                      key={entry.source}
                      fill={
                        COLORS[
                          sourceData.indexOf(entry) % COLORS.length
                        ]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Source Filter */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSource(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                selectedSource === null
                  ? "bg-red-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-red-500/20"
              }`}
            >
              All Sources ({delayedTrips.length})
            </button>

            {sourceData.map((data) => (
              <button
                key={data.source}
                onClick={() => setSelectedSource(data.source)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  selectedSource === data.source
                    ? "bg-red-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-red-500/20"
                }`}
              >
                {data.source} ({data.count})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* DETAIL TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Delayed Pickup Details</CardTitle>
          <CardDescription>
            {selectedSource
              ? `Showing delays for ${selectedSource}`
              : "Showing all delayed pickups"}
          </CardDescription>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip ID</TableHead>
                <TableHead>Creation Date</TableHead>
                <TableHead>Vehicle No.</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Pickup Raised</TableHead>
                <TableHead>Actual Pickup</TableHead>
                <TableHead className="text-right">
                  Delay (Days)
                </TableHead>
                <TableHead>Trip Status</TableHead>
                <TableHead>Packet Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredTrips.length > 0 ? (
                filteredTrips.map((trip) => (
                  <TableRow
                    key={trip.tripId}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-sm text-blue-600">
                      {trip.tripId}
                    </TableCell>
                    <TableCell>{trip.creationDate}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {trip.vehicleNo}
                    </TableCell>
                    <TableCell>{trip.source}</TableCell>
                    <TableCell>{trip.destination}</TableCell>
                    <TableCell>{trip.pickupRaised}</TableCell>
                    <TableCell>{trip.actualPickup}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-bold px-2 py-1 rounded ${
                          trip.delayDays > 7
                            ? "bg-red-500/20 text-red-700"
                            : trip.delayDays > 5
                            ? "bg-orange-500/20 text-orange-700"
                            : "bg-yellow-500/20 text-yellow-700"
                        }`}
                      >
                        {trip.delayDays}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          trip.tripStatus === "Trip Completed"
                            ? "bg-green-500/20 text-green-700"
                            : trip.tripStatus === "In Transit"
                            ? "bg-blue-500/20 text-blue-700"
                            : "bg-yellow-500/20 text-yellow-700"
                        }`}
                      >
                        {trip.tripStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-muted">
                        {trip.packetStatus}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No delayed pickups for the selected source
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
