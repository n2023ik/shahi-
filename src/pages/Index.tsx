import { useState, useCallback, useEffect, useMemo } from "react";
import { Trip } from "@/lib/types";
import { fetchTrips, createTrip as apiCreateTrip, updateTrip as apiUpdateTrip, deleteTrip as apiDeleteTrip } from "@/lib/sheetsApi";
import { isTripNotCreated } from "@/lib/tripUtils";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards from "@/components/dashboard/KPICards";
import TripTable from "@/components/dashboard/TripTable";
import TripFormModal from "@/components/dashboard/TripFormModal";
import TripDetailModal from "@/components/dashboard/TripDetailModal";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import SourceAnalysis from "@/components/dashboard/SourceAnalysis";
import AdvancedViewControl from "@/components/dashboard/AdvancedViewControl";
import DailyAutoSummary from "@/components/dashboard/DailyAutoSummary";
import LiveDeliveryTracker from "@/components/dashboard/LiveDeliveryTracker";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Index = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTab, setActiveTab] = useState("tracker");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initial load with loading state
    const initialLoad = async () => {
      try {
        setLoading(true);
        const data = await fetchTrips();
        console.log("Fetched trips:", data.length);
        if (Array.isArray(data) && data.length > 0) {
          console.log("Sample trip date:", data[0].tripCreationDate, "Status:", data[0].tripStatus);
          setTrips(data);
          toast({ title: "Data loaded", description: `Showing ${data.length} trips from API` });
        } else {
          console.warn("No trips returned from fetchTrips");
          setTrips([]);
          toast({ title: "No data found", description: "API returned 0 trips." });
        }
      } catch (err) {
        console.error("Failed to fetch trips:", err);
        setTrips([]);
        toast({
          title: "Data load failed",
          description: "Could not fetch trips from API. Check Apps Script URL/deployment.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    // Background refresh without loading state
    const backgroundRefresh = async () => {
      try {
        const data = await fetchTrips();
        if (Array.isArray(data)) {
          setTrips(data);
        }
      } catch (err) {
        console.error("Background refresh failed:", err);
      }
    };

    // Load on mount
    initialLoad();

    // Auto-refresh every 30 seconds (silent updates)
    const interval = setInterval(backgroundRefresh, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [toast]);

  const handleNewTrip = () => { setEditingTrip(null); setFormOpen(true); };
  const handleEdit = (trip: Trip) => { setEditingTrip(trip); setFormOpen(true); };

  const handleDeleteClick = (trip: Trip) => {
    setTripToDelete(trip);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!tripToDelete) return;
    
    setOperationLoading(true);
    const tripId = tripToDelete.tripId;
    
    try {
      // Optimistic update - remove from UI immediately
      setTrips((prev) => prev.filter((t) => t.tripId !== tripId));
      setDeleteConfirmOpen(false);
      setTripToDelete(null);
      
      toast({ 
        title: "Deleting trip...", 
        description: `Removing ${tripId} from database...` 
      });
      
      // Call API to delete from Google Sheets using Trip ID (not S.No)
      await apiDeleteTrip(tripId);
      
      toast({ 
        title: "Trip deleted successfully", 
        description: `${tripId} has been permanently removed.`,
        variant: "default"
      });
      
      // Wait a moment for Google Sheets cache to clear, then refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data from server to ensure consistency
      const data = await fetchTrips();
      if (data.length > 0) {
        setTrips(data);
      }
    } catch (error) {
      console.error("Delete API error:", error);
      
      // Revert the optimistic update on error
      const data = await fetchTrips();
      setTrips(data);
      
      // Better error message based on error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNotFound = errorMessage.includes('Row not found') || errorMessage.includes('not found');
      
      toast({ 
        title: "Delete failed", 
        description: isNotFound 
          ? `Trip ${tripId} not found in database. It may have been already deleted.`
          : `Could not delete ${tripId}. ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setOperationLoading(false);
    }
  }, [tripToDelete, toast]);

  const handleSave = useCallback(async (trip: Trip) => {
    const isEdit = !!editingTrip;
    const originalTripId = editingTrip?.tripId;
    setOperationLoading(true);
    
    try {
      // Optimistic update
      setTrips((prev) => {
        const exists = prev.find((t) => t.tripId === (isEdit ? originalTripId : trip.tripId));
        if (exists) {
          return prev.map((t) =>
            t.tripId === (isEdit ? originalTripId : trip.tripId) ? trip : t
          );
        }
        return [...prev, { ...trip, sNo: prev.length + 1 }];
      });
      
      setFormOpen(false);
      
      toast({ 
        title: isEdit ? "Updating trip..." : "Creating trip...", 
        description: `Saving ${trip.tripId} to database...` 
      });
      
      // Call API
      if (isEdit) {
        await apiUpdateTrip(trip);
      } else {
        await apiCreateTrip(trip);
      }
      
      toast({ 
        title: isEdit ? "Trip updated successfully" : "Trip created successfully", 
        description: `${trip.tripId} has been saved to the database.`,
        variant: "default"
      });
      
      // Wait a moment for Google Sheets cache to clear, then refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data from server
      const data = await fetchTrips();
      if (data.length > 0) {
        setTrips(data);
      }
    } catch (error) {
      console.error("Save API error:", error);
      
      // Revert on error
      const data = await fetchTrips();
      setTrips(data);
      
      // Better error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({ 
        title: isEdit ? "Update failed" : "Create failed", 
        description: `Could not save ${trip.tripId}. ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setOperationLoading(false);
    }
  }, [editingTrip, toast]);

  const getFilteredTrips = () => {
    if (!selectedStatus) return trips;
    if (selectedStatus === "total") return trips;
    return trips.filter((t) =>
      selectedStatus === "Trip Not Created"
        ? isTripNotCreated(t)
        : t.tripStatus === selectedStatus
    );
  };

  const filteredTrips = getFilteredTrips();

  const sourceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          trips
            .map((trip) => (trip.sourceAddress || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [trips]
  );

  const destinationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          trips
            .map((trip) => (trip.destinationAddress || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [trips]
  );

  const handleStatusClick = (status: string | null) => {
    setSelectedStatus(status === "total" ? null : status);
  };

  const modeCounts = useMemo(() => {
    return trips.reduce(
      (acc, trip) => {
        const mode = String(trip.mode || "").trim().toUpperCase();

        if (mode === "LSD") acc.lsd += 1;
        if (mode === "KNITS") acc.knits += 1;
        if (mode === "MNB" || mode === "M&D" || mode === "M&B" || mode === "M AND D" || mode === "M AND B") {
          acc.mnb += 1;
        }

        return acc;
      },
      { lsd: 0, knits: 0, mnb: 0 }
    );
  }, [trips]);

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => { setActiveTab(tab); setSelectedStatus(null); }}
      onNewTrip={handleNewTrip}
      modeCounts={modeCounts}
    >
      <div className="space-y-6">
        <div className="animate-fade-in">
          {activeTab !== "tracker" && activeTab !== "shahi" && activeTab !== "comprehensive" && (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "daily-summary" && "Daily Summary"}
                {activeTab === "trips" && "Trip Management"}
                {activeTab === "by-source" && "Shipments by Source"}
                {activeTab === "analytics" && "Analytics & Reports"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === "overview" && "Monitor your logistics operations at a glance"}
                {activeTab === "daily-summary" && "Open the report-style summary and second page view"}
                {activeTab === "trips" && "View, create, and manage all trip records"}
                {activeTab === "by-source" && "Analyze shipments by their origin locations"}
                {activeTab === "analytics" && "Insights and performance metrics"}
              </p>
            </>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && (
          <>
            {(activeTab === "overview" || activeTab === "trips") && (
              <KPICards 
                trips={trips} 
                selectedStatus={selectedStatus}
                onStatusClick={handleStatusClick}
              />
            )}
            {activeTab === "overview" && (
              <div className="rounded-2xl border border-cyan-300/30 bg-cyan-950/20 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Quick access</p>
                    <h3 className="text-lg font-bold text-white">Open the daily summary report</h3>
                    <p className="text-sm text-slate-300">This is the page-2 style summary view you asked for.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("daily-summary")}
                    className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    Open Daily Summary
                  </button>
                </div>
              </div>
            )}
            {activeTab === "tracker" && <LiveDeliveryTracker />}
            {(activeTab === "overview" || activeTab === "trips") && (
              <TripTable trips={filteredTrips} onEdit={handleEdit} onDelete={handleDeleteClick} onView={(t) => setViewTrip(t)} />
            )}
            {activeTab === "daily-summary" && (
              <DailyAutoSummary trips={trips} />
            )}
            {activeTab === "by-source" && <SourceAnalysis trips={trips} />}
            {(activeTab === "overview" || activeTab === "analytics") && <AnalyticsCharts trips={trips} />}
            {activeTab === "shahi" && <AdvancedViewControl />}
          </>
        )}
      </div>

      <TripFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        trip={editingTrip}
        nextSNo={trips.length + 1}
        loading={operationLoading}
        sourceOptions={sourceOptions}
        destinationOptions={destinationOptions}
      />
      <TripDetailModal open={!!viewTrip} onClose={() => setViewTrip(null)} trip={viewTrip} />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{tripToDelete?.tripId}</strong> from the database.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={operationLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {operationLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  <span>Deleting...</span>
                </div>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Index;
