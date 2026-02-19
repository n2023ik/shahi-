import { useState, useMemo, useEffect } from "react";
import { Trip, TripStatus } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TripTableProps {
  trips: Trip[];
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onView: (trip: Trip) => void;
}

const PAGE_SIZE = 10;

// Calculate delay in days
function calculateDelay(pickupRaisedOn: string, actualPickupDate: string): number | null {
  if (!pickupRaisedOn || !actualPickupDate) return null;
  
  try {
    // Parse DD/MM/YYYY format
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split("/");
      if (parts.length !== 3) return null;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return new Date(year, month - 1, day); // month is 0-indexed in Date
    };
    
    const raised = parseDate(pickupRaisedOn);
    const actual = parseDate(actualPickupDate);
    
    if (!raised || !actual) return null;
    
    const diffTime = actual.getTime() - raised.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

const statusBadgeClass: Record<TripStatus, string> = {
  Completed: "status-badge-completed",
  "In-Transit": "status-badge-in-transit",
  Mapped: "bg-yellow-500/20 text-yellow-500",
  "Trip Not Created": "bg-gray-500/20 text-gray-400",
};

export default function TripTable({
  trips,
  onEdit,
  onDelete,
  onView,
}: TripTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<keyof Trip>("sNo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  /* ===============================
     FILTER
  ================================ */
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    if (statusFilter !== "all") {
      result = result.filter((t) => t.tripStatus === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.tripId?.toLowerCase().includes(q) ||
          t.vehicleNo?.toLowerCase().includes(q) ||
          t.transporterName?.toLowerCase().includes(q) ||
          t.packetStatus?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [trips, statusFilter, search]);

  /* ===============================
     SORT (robust comparison)
  ================================ */
  const sortedTrips = useMemo(() => {
    const sorted = [...filteredTrips];

    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Convert dates if possible
      if (typeof aVal === "string" && Date.parse(aVal)) {
        aVal = new Date(aVal).getTime() as any;
        bVal = new Date(bVal as string).getTime() as any;
      }

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredTrips, sortField, sortDir]);

  /* ===============================
     PAGINATION
  ================================ */
  const totalPages = Math.ceil(sortedTrips.length / PAGE_SIZE);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(totalPages - 1);
    }
  }, [totalPages, page]);

  const pagedTrips = sortedTrips.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const toggleSort = (field: keyof Trip) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHeader = ({
    field,
    children,
  }: {
    field: keyof Trip;
    children: React.ReactNode;
  }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
    >
      <span className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </th>
  );

  return (
    <div className="glass-card rounded-xl animate-slide-up">

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Trip ID, Vehicle, Transporter..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(statusBadgeClass).map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border">
              <SortHeader field="sNo">#</SortHeader>
              <SortHeader field="tripId">Trip ID</SortHeader>
              <SortHeader field="pickupRaisedOn">Pickup Raised</SortHeader>
              <SortHeader field="vehicleNo">Vehicle</SortHeader>
              <SortHeader field="sourceAddress">Source</SortHeader>
              <SortHeader field="destinationAddress">
                Destination
              </SortHeader>
              <SortHeader field="transporterName">
                Transporter
              </SortHeader>
              <SortHeader field="tripStatus">Status</SortHeader>
              <SortHeader field="packetStatus">Packet Status</SortHeader>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground cursor-pointer hover:text-foreground">
                Delay (Days)
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {pagedTrips.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No trips match your filters.
                </td>
              </tr>
            ) : (
              pagedTrips.map((trip) => {
                const delay = calculateDelay(trip.pickupRaisedOn, trip.actualPickupDate);
                return (
                  <tr
                    key={trip.tripId}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {trip.sNo}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary font-mono">
                      {trip.tripId}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {trip.pickupRaisedOn}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {trip.vehicleNo}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {trip.sourceAddress}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {trip.destinationAddress}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {trip.transporterName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-1 text-xs font-semibold",
                          statusBadgeClass[trip.tripStatus]
                        )}
                      >
                        {trip.tripStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-block rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">
                        {trip.packetStatus || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {delay !== null ? (
                        <span className={delay < 5 ? "text-green-500" : "text-red-500"}>
                          {delay} days
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => onView(trip)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onEdit(trip)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(trip)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          {sortedTrips.length === 0
            ? 0
            : page * PAGE_SIZE + 1}–
          {Math.min((page + 1) * PAGE_SIZE, sortedTrips.length)} of{" "}
          {sortedTrips.length}
        </p>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
