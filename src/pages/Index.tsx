import { useState, useCallback, useEffect } from "react";
import { Trip } from "@/lib/types";
import { mockTrips } from "@/lib/mockData";
import { fetchTrips, createTrip as apiCreateTrip, updateTrip as apiUpdateTrip, deleteTrip as apiDeleteTrip } from "@/lib/sheetsApi";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards from "@/components/dashboard/KPICards";
import TripTable from "@/components/dashboard/TripTable";
import TripFormModal from "@/components/dashboard/TripFormModal";
import TripDetailModal from "@/components/dashboard/TripDetailModal";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [activeTab, setActiveTab] = useState("overview");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Initial load with loading state
    const initialLoad = async () => {
      try {
        setLoading(true);
        const data = await fetchTrips();
        if (data.length > 0) {
          setTrips(data);
          toast({ title: "Data loaded", description: `Showing ${data.length} trips. (API: ${data === mockTrips ? 'Mock data' : 'Google Sheets'})` });
        }
      } catch (err) {
        console.error("Failed to fetch trips:", err);
        setTrips(mockTrips);
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

  const handleDelete = useCallback(async (trip: Trip) => {
    setTrips((prev) => prev.filter((t) => t.tripId !== trip.tripId));
    toast({ title: "Trip deleted", description: `${trip.tripId} has been removed.` });
    try { await apiDeleteTrip(trip.sNo); } catch (e) { console.error("Delete API error:", e); }
  }, [toast]);

  const handleSave = useCallback(async (trip: Trip) => {
    const isEdit = !!editingTrip;
    setTrips((prev) => {
      const exists = prev.find((t) => t.tripId === trip.tripId);
      if (exists) return prev.map((t) => (t.tripId === trip.tripId ? trip : t));
      return [...prev, { ...trip, sNo: prev.length + 1 }];
    });
    setFormOpen(false);
    toast({ title: isEdit ? "Trip updated" : "Trip created", description: `${trip.tripId} saved successfully.` });
    try {
      if (isEdit) await apiUpdateTrip(trip);
      else await apiCreateTrip(trip);
    } catch (e) { console.error("Save API error:", e); }
  }, [editingTrip, toast]);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} onNewTrip={handleNewTrip}>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold tracking-tight">
            {activeTab === "overview" && "Dashboard Overview"}
            {activeTab === "trips" && "Trip Management"}
            {activeTab === "analytics" && "Analytics & Reports"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === "overview" && "Monitor your logistics operations at a glance"}
            {activeTab === "trips" && "View, create, and manage all trip records"}
            {activeTab === "analytics" && "Insights and performance metrics"}
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && (
          <>
            {(activeTab === "overview" || activeTab === "trips") && <KPICards trips={trips} />}
            {(activeTab === "overview" || activeTab === "trips") && (
              <TripTable trips={trips} onEdit={handleEdit} onDelete={handleDelete} onView={(t) => setViewTrip(t)} />
            )}
            {(activeTab === "overview" || activeTab === "analytics") && <AnalyticsCharts trips={trips} />}
          </>
        )}
      </div>

      <TripFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        trip={editingTrip}
        nextSNo={trips.length + 1}
      />
      <TripDetailModal open={!!viewTrip} onClose={() => setViewTrip(null)} trip={viewTrip} />
    </DashboardLayout>
  );
};

export default Index;
