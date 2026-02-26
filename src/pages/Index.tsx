import { useState, useCallback, useEffect } from "react";
import { Trip } from "@/lib/types";
import { generateMockTrips } from "@/lib/mockData";
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
  const [trips, setTrips] = useState<Trip[]>(() => generateMockTrips(47));
  const [activeTab, setActiveTab] = useState("overview");
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
        if (data.length > 0) {
          console.log("Sample trip date:", data[0].tripCreationDate, "Status:", data[0].tripStatus);
          setTrips(data);
          toast({ title: "Data loaded", description: `Showing ${data.length} trips from ${data.length < 10 ? 'API' : 'Mock Data'}` });
        } else {
          console.warn("No trips returned from fetchTrips");
          const fallbackTrips = generateMockTrips(47);
          console.log("Generated fallback trips:", fallbackTrips.length);
          setTrips(fallbackTrips);
        }
      } catch (err) {
        console.error("Failed to fetch trips:", err);
        const fallbackTrips = generateMockTrips(47);
        console.log("Generated error fallback trips:", fallbackTrips.length);
        setTrips(fallbackTrips);
      } finally {
        setLoading(false);
      }
    };

    // Background refresh without loading state
    const backgroundRefresh = async () => {
      try {
        const data = await fetchTrips();
        if (data.length > 0) {
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
    setOperationLoading(true);
    
    try {
      // Optimistic update
      setTrips((prev) => {
        const exists = prev.find((t) => t.tripId === trip.tripId);
        if (exists) return prev.map((t) => (t.tripId === trip.tripId ? trip : t));
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

  const handleStatusClick = (status: string | null) => {
    setSelectedStatus(status === "total" ? null : status);
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSelectedStatus(null); }} onNewTrip={handleNewTrip}>
      <div className="space-y-6">
        <div className="animate-fade-in">
          {activeTab !== "shahi" && activeTab !== "comprehensive" && (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "trips" && "Trip Management"}
                {activeTab === "by-source" && "Shipments by Source"}
                {activeTab === "analytics" && "Analytics & Reports"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === "overview" && "Monitor your logistics operations at a glance"}
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
            {(activeTab === "overview" || activeTab === "trips") && (
              <TripTable trips={filteredTrips} onEdit={handleEdit} onDelete={handleDeleteClick} onView={(t) => setViewTrip(t)} />
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
