/**
 * FILTER AND EXPORT CONTROLS
 * Advanced filtering and data export functionality
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Filter,
  X,
  Calendar,
  MapPin,
  Truck,
  PackageSearch,
} from "lucide-react";
import { Trip } from "@/lib/types";
import { ComprehensiveMetrics } from "@/lib/metricsEngine";
import { exportToCSV, exportToJSON } from "@/lib/exportUtils";

export interface FilterOptions {
  dateRange: "all" | "today" | "week" | "month" | "custom";
  location: string;
  transporter: string;
  status: string;
  searchTerm: string;
  customStartDate?: string;
  customEndDate?: string;
}

interface FilterAndExportProps {
  trips: Trip[];
  metrics: ComprehensiveMetrics;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onExport: (format: "csv" | "json") => void;
}

export default function FilterAndExport({
  trips,
  metrics,
  filters,
  onFilterChange,
  onExport,
}: FilterAndExportProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique values for filters
  const locations = ["all", ...new Set(trips.map(t => t.sourceAddress).filter(Boolean))];
  const transporters = ["all", ...new Set(trips.map(t => t.transporterName).filter(Boolean))];
  const statuses = ["all", "Trip Completed", "In Transit", "Awaiting to Departure", "Trip Not Created"];

  // Count active filters
  const activeFiltersCount = [
    filters.dateRange !== "all",
    filters.location !== "all",
    filters.transporter !== "all",
    filters.status !== "all",
    filters.searchTerm !== "",
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFilterChange({
      dateRange: "all",
      location: "all",
      transporter: "all",
      status: "all",
      searchTerm: "",
    });
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters & Export
              {activeFiltersCount > 0 && (
                <Badge variant="default">{activeFiltersCount} active</Badge>
              )}
            </CardTitle>
            <CardDescription>Filter data and export reports</CardDescription>
          </div>
          <div className="flex gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      {showFilters && (
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <PackageSearch className="w-4 h-4" />
              Search
            </Label>
            <Input
              id="search"
              placeholder="Search by Trip ID, Vehicle No, Source, Destination..."
              value={filters.searchTerm}
              onChange={(e) =>
                onFilterChange({ ...filters, searchTerm: e.target.value })
              }
            />
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="dateRange" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value: FilterOptions["dateRange"]) =>
                  onFilterChange({ ...filters, dateRange: value })
                }
              >
                <SelectTrigger id="dateRange">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <Select
                value={filters.location}
                onValueChange={(value) =>
                  onFilterChange({ ...filters, location: value })
                }
              >
                <SelectTrigger id="location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc === "all" ? "All Locations" : loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transporter */}
            <div className="space-y-2">
              <Label htmlFor="transporter" className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Transporter
              </Label>
              <Select
                value={filters.transporter}
                onValueChange={(value) =>
                  onFilterChange({ ...filters, transporter: value })
                }
              >
                <SelectTrigger id="transporter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transporters.map((trans) => (
                    <SelectItem key={trans} value={trans}>
                      {trans === "all" ? "All Transporters" : trans}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center gap-2">
                Status
              </Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  onFilterChange({ ...filters, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "All Statuses" : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.customStartDate || ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      customStartDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.customEndDate || ""}
                  onChange={(e) =>
                    onFilterChange({ ...filters, customEndDate: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Export current view ({trips.length} records)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("csv")}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("json")}
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}


