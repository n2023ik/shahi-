import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardData } from "@/lib/types";
import { fetchDashboardData } from "@/lib/dashboardApi";
import { isNetworkError } from "@/lib/networkUtils";
import { NoInternet } from "@/components/NoInternet";
import { calculateOverviewDashboardMetrics } from "@/lib/metricsEngine";
import OverallMetrics from "./OverallMetrics";
import SuccessRateCard from "./SuccessRateCard";
import DelayedPickups from "./DelayedPickups";
import DelayedPickupsChart from "./DelayedPickupsChart";
import StockDeficiencyChart from "./StockDeficiencyChart";
import StockUtilization from "./StockUtilization";
import LocationComparison from "./LocationComparison";
import LocationGrid from "./LocationGrid";
import { useToast } from "@/hooks/use-toast";
import { useOverviewMetrics } from "@/hooks/useOverviewMetrics";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EnhancedDashboardContent() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkOffline, setIsNetworkOffline] = useState(false);
  const [activeView, setActiveView] = useState("overview");
  const { toast } = useToast();

  /* =============================
     DATA LOADING (STABLE CALLBACK)
  ============================= */

  const loadData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        else setRefreshing(true);
        
        setError(null);
        setIsNetworkOffline(false);

        const data = await fetchDashboardData();
        setDashboardData(data);

        if (showLoading) {
          toast({
            title: "Dashboard loaded",
            description: `Loaded data for ${data.locations?.length ?? 0} locations`,
          });
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        
        // Check if it's a network error
        if (isNetworkError(err)) {
          setIsNetworkOffline(true);
          setError("No internet connection");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
          toast({
            title: "Error loading dashboard",
            description: err instanceof Error ? err.message : "Failed to fetch data",
            variant: "destructive",
          });
        }
        
        setDashboardData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  /* =============================
     INITIAL LOAD + AUTO REFRESH
  ============================= */

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(false);
    }, 60000);

    return () => clearInterval(interval);
  }, [loadData]);

  /* =============================
     DERIVED DATA (MEMOIZED)
  ============================= */

  const locations = useMemo(
    () => dashboardData?.locations ?? [],
    [dashboardData]
  );

  const locationCount = locations.length;

  // Calculate overview metrics using new interface
  const overviewMetrics = useMemo(
    () => dashboardData ? calculateOverviewDashboardMetrics([], locations) : null,
    [dashboardData, locations]
  );

  /* =============================
     LOADING STATE
  ============================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Show NoInternet component when network is offline
  if (isNetworkOffline) {
    return <NoInternet onRetry={() => loadData(true)} />;
  }

  // Show error message for other errors
  if (error && !isNetworkOffline) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <div>
            <p className="text-lg font-medium">Failed to Load Dashboard</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
          <Button onClick={() => loadData(true)} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData || locationCount === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No data available</p>
          <Button onClick={() => loadData()}>Retry</Button>
        </div>
      </div>
    );
  }

  /* =============================
     RENDER
  ============================= */

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Shahi Enhanced Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time metrics and operational insights
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(false)}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* GLOBAL METRICS - NEW INTERFACE */}
      <OverallMetrics metrics={overviewMetrics} />

      {/* TABS */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="delayed">Delayed</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="success">Success</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DelayedPickups locations={locations} />
            <StockUtilization locations={locations} threshold={80} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">
              Location Success Rates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <SuccessRateCard
                  key={location.locationName}
                  location={location}
                  showTrend
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* DELAYED */}
        <TabsContent value="delayed" className="space-y-6">
          <DelayedPickupsChart trips={dashboardData.delayedTrips ?? []} />
        </TabsContent>

        {/* STOCK */}
        <TabsContent value="stock" className="space-y-6">
          <StockDeficiencyChart
            stockData={dashboardData.stockDeficiency ?? []}
          />
        </TabsContent>

        {/* LOCATIONS */}
        <TabsContent value="locations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">All Locations</h3>
              <p className="text-sm text-muted-foreground">
                {locationCount} total locations
              </p>
            </div>
          </div>
          <LocationGrid locations={locations} />
        </TabsContent>

        {/* SUCCESS */}
        <TabsContent value="success" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((location) => (
              <SuccessRateCard
                key={`success-${location.locationName}`}
                location={location}
                showTrend
              />
            ))}
          </div>
        </TabsContent>

        {/* ALERTS */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DelayedPickups locations={locations} />
            <StockUtilization locations={locations} threshold={80} />
          </div>
        </TabsContent>

        {/* COMPARISON */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LocationComparison
              locations={locations}
              metric="successRate"
              maxItems={10}
            />
            <LocationComparison
              locations={locations}
              metric="completedTrips"
              maxItems={10}
            />
            <LocationComparison
              locations={locations}
              metric="totalPickupCompleted"
              maxItems={10}
            />
            <LocationComparison
              locations={locations}
              metric="totalQuantity"
              maxItems={10}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
