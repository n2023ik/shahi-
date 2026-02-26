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
import { isTripNotCreated } from "@/lib/tripUtils";

interface TripTableProps {
  trips: Trip[];
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onView: (trip: Trip) => void;
}

const PAGE_SIZE = 10;

const dateFields: (keyof Trip)[] = [
  "tripCreationDate",
  "tripCompletionDate",
  "pickupRaisedOn",
  "actualPickupDate",
  "deliveredDate",
];

/* ===============================
   SAFE DATE PARSER
================================ */
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;

  try {
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/").map(Number);
      if (!day || !month || !year) return null;
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/* ===============================
   DELAY = Actual Pickup - Raised
================================ */
function calculateDelay(
  pickupRaisedOn?: string,
  actualPickupDate?: string
): number | null {
  if (!pickupRaisedOn || !actualPickupDate) return null;

  const raised = parseDate(pickupRaisedOn);
  const actual = parseDate(actualPickupDate);

  if (!raised || !actual) return null;

  const diffMs = actual.getTime() - raised.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // negative allowed
}

const statusBadgeClass: Record<TripStatus, string> = {
  "Trip Completed":
    "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200",
  "In Transit":
    "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200",
  "Awaiting to Departure":
    "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border border-yellow-200",
  "Trip Not Created":
    "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200",
};

const SLA_DAYS = 3; // Red if delay > 3 days

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
      result = result.filter((t) =>
        statusFilter === "Trip Not Created"
          ? isTripNotCreated(t)
          : t.tripStatus === statusFilter
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();

      result = result.filter((t) =>
        [
          t.tripId,
          t.vehicleNo,
          t.transporterName,
          t.packetStatus,
          t.sourceAddress,
          t.destinationAddress,
          t.tripStatus,
        ]
          .filter(Boolean)
          .some((field) =>
            field!.toLowerCase().includes(q)
          )
      );
    }

    return result;
  }, [trips, statusFilter, search]);

  /* ===============================
     SORT (Deterministic)
  ================================ */
  const sortedTrips = useMemo(() => {
    const sorted = [...filteredTrips];

    sorted.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (dateFields.includes(sortField)) {
        const aDate = parseDate(aVal);
        const bDate = parseDate(bVal);
        aVal = aDate ? aDate.getTime() : null;
        bVal = bDate ? bDate.getTime() : null;
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;

      return 0;
    });

    return sorted;
  }, [filteredTrips, sortField, sortDir]);

  /* ===============================
     RESET PAGE
  ================================ */
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(sortedTrips.length / PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(0);
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
            placeholder="Search anything..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              <SortHeader field="actualPickupDate">Actual Pickup</SortHeader>
              <SortHeader field="vehicleNo">Vehicle</SortHeader>
              <SortHeader field="sourceAddress">Source</SortHeader>
              <SortHeader field="destinationAddress">Destination</SortHeader>
              <SortHeader field="transporterName">Transporter</SortHeader>
              <SortHeader field="tripStatus">Status</SortHeader>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
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
                <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                  No trips match your filters.
                </td>
              </tr>
            ) : (
              pagedTrips.map((trip) => {
                const delay = calculateDelay(
                  trip.pickupRaisedOn,
                  trip.actualPickupDate
                );

                return (
                  <tr
                    key={trip.tripId}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono">{trip.sNo}</td>
                    <td className="px-4 py-3 font-semibold text-primary font-mono">
                      {trip.tripId}
                    </td>
                    <td className="px-4 py-3">{trip.pickupRaisedOn || "—"}</td>
                    <td className="px-4 py-3">{trip.actualPickupDate || "—"}</td>
                    <td className="px-4 py-3 font-mono">{trip.vehicleNo}</td>
                    <td className="px-4 py-3">{trip.sourceAddress}</td>
                    <td className="px-4 py-3">{trip.destinationAddress}</td>
                    <td className="px-4 py-3">{trip.transporterName}</td>
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
                    <td className="px-4 py-3 font-bold">
                      {delay !== null ? (
                        <span
                          className={cn(
                            delay > SLA_DAYS
                              ? "text-red-600 bg-red-50/50 px-2 py-1 rounded"
                              : "text-green-600 bg-green-50/50 px-2 py-1 rounded"
                          )}
                        >
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
          {sortedTrips.length === 0 ? 0 : page * PAGE_SIZE + 1}—
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