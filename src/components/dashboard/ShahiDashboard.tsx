import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, X, Package, Eye, ArrowRight, 
  AlertCircle, Calendar, Filter, 
  CheckCircle2, Clock, Truck, ShieldAlert,
  ChevronDown, Download, BarChart3
} from 'lucide-react';
import { fetchTrips } from '@/lib/sheetsApi';
import { isNetworkError } from '@/lib/networkUtils';
import { NoInternet, NoInternetBanner } from '@/components/NoInternet';

/**
 * CUSTOM HOOK: useDebounce
 * Prevents the application from re-filtering the entire trip array 
 * on every single keystroke, which causes lag.
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/**
 * DASHBOARD WITH NETWORK ERROR HANDLING
 * Shows proper error states when internet connection is lost
 * Never shows mock data - only real data or error messages
 */
const ShahiDashboard = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNetworkOffline, setIsNetworkOffline] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const [filters, setFilters] = useState({
    source: 'all',
    destination: 'all',
    tripStatus: 'all',
    packetStatus: 'all',
    transporter: 'all',
    dateRange: 'all' // all, today, 7days, 30days
  });

  // UI State
  const [activeTab, setActiveTab] = useState('trips');
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [showKpiModal, setShowKpiModal] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsNetworkOffline(false);
      
      // Fetch trips from API - will throw error if network is down
      const data = await fetchTrips();
      
      setTrips(Array.isArray(data) ? data : []);
      
      if (data.length === 0) {
        setError("No trip data available.");
      }
    } catch (err) {
      console.error("Failed to load trips:", err);
      
      // Check if it's a network error
      if (isNetworkError(err)) {
        setIsNetworkOffline(true);
        setError("No internet connection");
      } else {
        setError(err.message || "Failed to load trip data");
      }
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * DELAY CALCULATION: Actual Pickup - Pickup Raised
   */
  const calculateDelay = useCallback((pickupRaisedOn, actualPickupDate) => {
    if (!pickupRaisedOn || !actualPickupDate) return null;
    
    try {
      const parseDate = (str) => {
        if (str.includes('/')) {
          const [d, m, y] = str.split('/');
          return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        }
        return new Date(str);
      };
      
      const raised = parseDate(pickupRaisedOn);
      const actual = parseDate(actualPickupDate);
      
      if (isNaN(raised.getTime()) || isNaN(actual.getTime())) return null;
      
      const diffTime = actual.getTime() - raised.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 ? diffDays : 0;
    } catch { 
      return null; 
    }
  }, []);

  /**
   * DATE UTILITY: calculateDaysDifference (kept for backward compatibility)
   * Hardened to handle multiple date formats and null values.    
   */
  const calculateDaysDifference = useCallback((date1, date2) => { 
    if (!date1 || !date2) return 0;
    try {
      const parseDate = (str) => {
        if (str.includes('/')) {
          const [d, m, y] = str.split('/');
          return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        }
        return new Date(str);
      };
      const d1 = parseDate(date1);
      const d2 = parseDate(date2);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;   
      const diff = Math.abs(d2.getTime() - d1.getTime());
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch { return 0; }
  }, []);

  /**
   * KPI CALCULATION: Optimized Single-Pass
   * We iterate through the array ONCE (O(n)) to gather all stats.
   */
  const kpiData = useMemo(() => {
    const stats = {
      total: 0,
      inTransit: 0,
      completed: 0,
      delayed: 0,
      pickupRaised: 0,
      pickupDone: 0,
      pending: 0,
      rto: 0,
      delivered: 0,
      defective: 0,
      lost: 0,
      nonRepairable: 0,
      offline: 0,
      uniqueAssets: new Set()
    };

    trips.forEach(t => {
      stats.total++;
      if (t.tripStatus === 'In Transit') stats.inTransit++;       
      if (t.tripStatus === 'Trip Completed') stats.completed++;   
      if (t.packetStatus === 'Pickup Raised') stats.pickupRaised++;
      if (t.packetStatus === 'Pickup Done') stats.pickupDone++;   
      if (t.packetStatus === 'Confirmation Pending') stats.pending++;
      if (t.packetStatus === 'Delivered') stats.delivered++;      

      const remarks = (t.remarks || '').toLowerCase();
      if (remarks.includes('rto')) stats.rto++;
      if (remarks.includes('lost')) stats.lost++;
      if (remarks.includes('non-repairable')) stats.nonRepairable++;
      if (remarks.includes('offline')) stats.offline++;

      if (t.assetTracker) stats.uniqueAssets.add(t.assetTracker); 

      // Use new calculateDelay function
      const delay = calculateDelay(t.pickupRaisedOn, t.actualPickupDate);
      if (delay !== null && delay > 3) stats.delayed++;
    });

    return [
      { label: 'Total Shipments', value: stats.total, icon: Package, color: 'blue' },
      { label: 'In-Transit', value: stats.inTransit, icon: Truck, color: 'indigo' },
      { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'green' },
      { label: 'Pickup Delayed (>3D)', value: stats.delayed, icon: Clock, color: 'red', alert: stats.delayed > 0 },
      { label: 'RTO Shipments', value: stats.rto, icon: ShieldAlert, color: 'orange' },
      { label: 'Assets Tracked', value: stats.uniqueAssets.size, icon: BarChart3, color: 'cyan' },
      { label: 'Loss/Damage', value: stats.lost + stats.nonRepairable, icon: AlertCircle, color: 'rose' },
      { label: 'Delivered (Shahi)', value: stats.delivered, icon: CheckCircle2, color: 'emerald' },
    ];
  }, [trips, calculateDelay]);

  /**
   * FILTER LOGIC: Hardened & Multi-dimensional
   */
  const filteredTrips = useMemo(() => {
    const search = debouncedSearch.toLowerCase();
    const now = new Date();

    return trips.filter(t => {
      // 1. Search (Safe Access)
      const matchesSearch = !search || [
        t.tripId, t.vehicleNo, t.sourceAddress, t.destinationAddress, t.assetTracker
      ].some(field => String(field || '').toLowerCase().includes(search));

      // 2. Dropdowns
      const matchesSource = filters.source === 'all' || t.sourceAddress === filters.source;
      const matchesDest = filters.destination === 'all' || t.destinationAddress === filters.destination;
      const matchesTripSt = filters.tripStatus === 'all' || t.tripStatus === filters.tripStatus;
      const matchesPackSt = filters.packetStatus === 'all' || t.packetStatus === filters.packetStatus;
      const matchesTrans = filters.transporter === 'all' || t.transporterName === filters.transporter;

      // 3. Date Range Filter
      let matchesDate = true;
      if (filters.dateRange !== 'all' && t.tripCreationDate) {    
        const createDate = new Date(t.tripCreationDate);
        const diffDays = (now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24);
        if (filters.dateRange === 'today') matchesDate = diffDays <= 1;
        else if (filters.dateRange === '7days') matchesDate = diffDays <= 7;
        else if (filters.dateRange === '30days') matchesDate = diffDays <= 30;
      }

      return matchesSearch && matchesSource && matchesDest && matchesTripSt && matchesPackSt && matchesTrans && matchesDate;        
    });
  }, [trips, debouncedSearch, filters]);

  // Unique Dropdown Values (Filtered to remove empty/nulls)      
  const dropdowns = useMemo(() => {
    const get = (key) => ['all', ...new Set(trips.map(t => t[key]).filter(Boolean))];
    return {
      sources: get('sourceAddress'),
      destinations: get('destinationAddress'),
      tripStatuses: get('tripStatus'),
      packetStatuses: get('packetStatus'),
      transporters: get('transporterName')
    };
  }, [trips]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      source: 'all', destination: 'all', tripStatus: 'all',       
      packetStatus: 'all', transporter: 'all', dateRange: 'all'   
    });
  };

  const handleKpiClick = (kpi) => {
    if (kpi.value === 0) return;
    setSelectedKpi(kpi);
    setShowKpiModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium animate-pulse">Syncing Shahi Logistics Data...</p>
      </div>
    );
  }

  // Show NoInternet component when network is offline
  if (isNetworkOffline) {
    return (
      <div className="min-h-screen bg-slate-950">
        <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-4">
          <div className="max-w-[1600px] mx-auto flex items-center gap-2">        
            <div className="bg-blue-600 p-1.5 rounded-lg">      
              <Truck className="text-white w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Shahi Logistics Monitor</h1>
          </div>
        </header>
        <NoInternet onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
      {/* Show banner if there's an error but not a network error */}
      {error && !isNetworkOffline && (
        <div className="bg-yellow-900/20 border-b border-yellow-500/50 p-4">
          <div className="max-w-[1600px] mx-auto flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <p className="text-yellow-200">{error}</p>
          </div>
        </div>
      )}
      
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">        
          <div>
            <div className="flex items-center gap-2 mb-1">        
              <div className="bg-blue-600 p-1.5 rounded-lg">      
                <Truck className="text-white w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Shahi Logistics Monitor</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${trips.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                <span className={`w-2 h-2 rounded-full ${trips.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>  
                {trips.length > 0 ? 'Live Connection' : 'No Data'}
              </span>
              <span className="text-slate-400 text-xs font-medium">Last Sync: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search trip, vehicle, asset..."      
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full md:w-80 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}   
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-colors shadow-sm">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8"> 
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, idx) => (
            <div
              key={idx}
              onClick={() => handleKpiClick(kpi)}
              className={`group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${kpi.alert ? 'border-red-200 bg-red-50/30' : ''}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <div className={`p-2.5 rounded-xl bg-${kpi.color}-50 text-${kpi.color}-600 group-hover:scale-110 transition-transform`}>
                  <kpi.icon className="w-6 h-6" />
                </div>
                {kpi.value > 0 && <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />}   
              </div>
              <div className="mt-4 relative z-10">
                <p className="text-slate-500 text-sm font-medium">{kpi.label}</p>
                <p className={`text-3xl font-bold mt-1 ${kpi.alert ? 'text-red-600' : 'text-slate-800'}`}>
                  {kpi.value}
                </p>
              </div>
              {/* Background Decoration */}
              <div className={`absolute -right-4 -bottom-4 opacity-5 text-${kpi.color}-600 group-hover:scale-125 transition-transform`}>
                <kpi.icon size={100} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />        
              <h3 className="font-bold text-slate-800">Advanced View Controls</h3>
            </div>
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset All Filters
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <FilterSelect label="Timeframe" value={filters.dateRange} onChange={v => setFilters(f => ({...f, dateRange: v}))}>      
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>        
            </FilterSelect>

            <FilterSelect label="Source" value={filters.source} onChange={v => setFilters(f => ({...f, source: v}))}>
              {dropdowns.sources.map(s => <option key={s} value={s}>{s === 'all' ? 'All Origins' : s}</option>)}
            </FilterSelect>

            <FilterSelect label="Destination" value={filters.destination} onChange={v => setFilters(f => ({...f, destination: v}))}>
              {dropdowns.destinations.map(d => <option key={d} value={d}>{d === 'all' ? 'All Endpoints' : d}</option>)}
            </FilterSelect>

            <FilterSelect label="Trip Status" value={filters.tripStatus} onChange={v => setFilters(f => ({...f, tripStatus: v}))}>  
              {dropdowns.tripStatuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Trip States' : s}</option>)}
            </FilterSelect>

            <FilterSelect label="Packet Status" value={filters.packetStatus} onChange={v => setFilters(f => ({...f, packetStatus: v}))}>
              {dropdowns.packetStatuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Packet States' : s}</option>)}       
            </FilterSelect>

            <FilterSelect label="Transporter" value={filters.transporter} onChange={v => setFilters(f => ({...f, transporter: v}))}>
              {dropdowns.transporters.map(t => <option key={t} value={t}>{t === 'all' ? 'All Carriers' : t}</option>)}
            </FilterSelect>
          </div>
        </div>

        {/* Data Table Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-800">Trip Ledger</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                {filteredTrips.length} Results Found
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="px-6 py-4 whitespace-nowrap">ID / Vehicle</th>
                  <th className="px-6 py-4">Route Details</th>    
                  <th className="px-6 py-4 whitespace-nowrap">Status Lifecycle</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4 whitespace-nowrap">Delay (Days)</th>
                  <th className="px-6 py-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">       
                {filteredTrips.length > 0 ? filteredTrips.map((trip, i) => {
                  const delay = calculateDelay(trip.pickupRaisedOn, trip.actualPickupDate);
                  
                  return (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-blue-600">{trip.tripId || 'N/A'}</div>
                      <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <ShieldAlert className="w-3 h-3" /> {trip.vehicleNo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="font-semibold truncate max-w-[120px]" title={trip.sourceAddress}>{trip.sourceAddress}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="font-semibold truncate max-w-[120px]" title={trip.destinationAddress}>{trip.destinationAddress}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{trip.transporterName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge type="trip" status={trip.tripStatus} />
                      <div className="mt-1.5">
                        <StatusBadge type="packet" status={trip.packetStatus} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-600">Created: {trip.tripCreationDate || '-'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Raised: {trip.pickupRaisedOn || '-'}</div>
                      <div className="text-xs text-slate-500">Actual: {trip.actualPickupDate || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {delay !== null ? (
                        <span className={`font-bold text-sm ${delay > 3 ? 'text-red-500' : 'text-green-500'}`}>
                          {delay} days
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">
                      {trip.remarks || '-'}
                    </td>
                  </tr>
                )}) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">No trips match your current filter criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* KPI Detail Modal Placeholder */}
      {showKpiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-blue-50 text-blue-600`}>
                  <selectedKpi.icon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedKpi.label}</h2>
                  <p className="text-sm text-slate-500 font-medium">Breakdown of {selectedKpi.value} entries</p>
                </div>
              </div>
              <button onClick={() => setShowKpiModal(false)} className="bg-white border border-slate-200 p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Modal Table Content would go here - simplified version */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Management Insight
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    This view lists specific trips contributing to the <strong>{selectedKpi.label}</strong> metric.
                    Data is pulled directly from the current production tracking sheet.
                  </p>
                </div>

                {/* List items */}
                <div className="divide-y divide-slate-100">       
                  {filteredTrips.slice(0, 10).map((t, i) => (     
                    <div key={i} className="py-3 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700">{t.tripId}</span>
                      <span className="text-slate-400">{t.sourceAddress} → {t.destinationAddress}</span>
                      <StatusBadge type="packet" status={t.packetStatus} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * UI SUB-COMPONENTS
 */

const FilterSelect = ({ label, value, onChange, children }) => (  
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold appearance-none focus:ring-2 focus:ring-blue-500 outline-none pr-8 cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

const StatusBadge = ({ type, status }) => {
  if (!status) return null;

  const colors = {
    'Trip Completed': 'bg-green-100 text-green-700 border-green-200',
    'In Transit': 'bg-blue-100 text-blue-700 border-blue-200',    
    'Delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Pickup Done': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Confirmation Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'Trip Not Created': 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const colorClass = colors[status] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass} whitespace-nowrap`}>
      {status}
    </span>
  );
};

export default ShahiDashboard;