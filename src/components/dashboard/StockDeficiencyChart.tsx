import { useMemo, useState } from "react";
import { AlertCircle, TrendingDown, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
import { StockDeficiency } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface StockDeficiencyChartProps {
  stockData: StockDeficiency[];
}

const THRESHOLD = 80;

const STATUS_COLORS = {
  critical: "#ef4444",
  warning: "#f97316",
  optimal: "#22c55e",
};

export default function StockDeficiencyChart({
  stockData,
}: StockDeficiencyChartProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  /* =========================
     SAFE AGGREGATIONS
  ========================= */

  const {
    criticalCount,
    warningCount,
    optimalCount,
    totalCapacity,
    totalCurrentStock,
    overallUtilization,
  } = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let optimal = 0;
    let capacity = 0;
    let current = 0;

    stockData.forEach((s) => {
      capacity += s.maxCapacity || 0;
      current += s.currentStock || 0;

      if (s.status === "critical") critical++;
      else if (s.status === "warning") warning++;
      else optimal++;
    });

    const utilization =
      capacity > 0 ? Math.round((current / capacity) * 100) : 0;

    return {
      criticalCount: critical,
      warningCount: warning,
      optimalCount: optimal,
      totalCapacity: capacity,
      totalCurrentStock: current,
      overallUtilization: utilization,
    };
  }, [stockData]);

  /* =========================
     FILTERED DATA
  ========================= */

  const filteredData = useMemo(() => {
    if (!selectedSource) return stockData;
    return stockData.filter((s) => s.source === selectedSource);
  }, [selectedSource, stockData]);

  /* =========================
     RESTOCK CALCULATION
  ========================= */

  const restockRecommendations = useMemo(() => {
    return stockData
      .filter((s) => s.deficiency > 0)
      .map((s) => {
        const requiredLevel = Math.ceil(
          (s.maxCapacity * THRESHOLD) / 100
        );
        const restockUnits = Math.max(
          0,
          requiredLevel - s.currentStock
        );

        return {
          ...s,
          restockUnits,
        };
      })
      .sort((a, b) => b.deficiency - a.deficiency);
  }, [stockData]);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="space-y-6">

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Overall Utilization"
          value={`${overallUtilization}%`}
          subtitle={`${totalCurrentStock} / ${totalCapacity} units`}
        />

        <StatusCard
          label="Critical"
          value={criticalCount}
          color="red"
          description="<50% capacity"
        />

        <StatusCard
          label="Warning"
          value={warningCount}
          color="orange"
          description="50-79% capacity"
        />

        <StatusCard
          label="Optimal"
          value={optimalCount}
          color="green"
          description="≥80% capacity"
        />
      </div>

      {/* BAR CHART */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Utilization by Source</CardTitle>
          <CardDescription>
            Threshold set at 80%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(val) => `${val}%`} />
                <ReferenceLine y={THRESHOLD} stroke="#666" strokeDasharray="4 4" />
                <Bar dataKey="utilization" radius={[6, 6, 0, 0]}>
                  {filteredData.map((entry) => (
                    <Cell
                      key={entry.source}
                      fill={STATUS_COLORS[entry.status]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Analysis</CardTitle>
          <CardDescription>
            {selectedSource
              ? `Showing ${selectedSource}`
              : "All Sources"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="text-right">Deficiency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Restock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((stock) => (
                <TableRow key={stock.source}>
                  <TableCell>{stock.source}</TableCell>
                  <TableCell className="text-right">
                    {stock.currentStock}
                  </TableCell>
                  <TableCell className="text-right">
                    {stock.maxCapacity}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {stock.utilization}%
                  </TableCell>
                  <TableCell className="text-right text-orange-600 font-semibold">
                    {stock.deficiency}%
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={stock.status} />
                  </TableCell>
                  <TableCell>
                    {stock.deficiency > 0
                      ? `${Math.max(
                          0,
                          Math.ceil(
                            (stock.maxCapacity * THRESHOLD) / 100
                          ) - stock.currentStock
                        )} units`
                      : "None"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* RESTOCK RECOMMENDATIONS */}
      {restockRecommendations.length > 0 && (
        <Card className="border border-orange-400/30 bg-orange-50">
          <CardHeader>
            <CardTitle>Restocking Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {restockRecommendations.map((s) => (
              <div
                key={s.source}
                className="p-3 rounded border bg-white"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">
                      {s.source}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Add {s.restockUnits} units to reach 80%
                    </div>
                  </div>
                  <div className="text-right font-bold text-orange-600">
                    {s.deficiency}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =========================
   SMALL REUSABLE COMPONENTS
========================= */

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCard({
  label,
  value,
  color,
  description,
}: {
  label: string;
  value: number;
  color: "red" | "orange" | "green";
  description: string;
}) {
  const colorMap = {
    red: "text-red-600",
    orange: "text-orange-600",
    green: "text-green-600",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold", colorMap[color])}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {description}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    critical: "bg-red-500/20 text-red-700",
    warning: "bg-orange-500/20 text-orange-700",
    optimal: "bg-green-500/20 text-green-700",
  };

  return (
    <span
      className={cn(
        "px-2 py-1 rounded text-xs font-semibold",
        styles[status as keyof typeof styles]
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}