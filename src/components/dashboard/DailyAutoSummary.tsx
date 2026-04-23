import React, { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Truck, CheckCircle, Package, ArrowRight, Clock, XCircle, 
  TrendingUp, TrendingDown, Info, Lightbulb, MapPin, ClipboardList,
  AlertTriangle, Filter, Download
} from 'lucide-react';
import { Trip } from '@/lib/types';

interface DailyAutoSummaryProps {
  page?: 'summary' | 'next';
  metrics?: unknown;
  trips?: Trip[];
  onGoToNextPage?: () => void;
}

type TrendPoint = { name: string; Created: number; Completed: number; Delivered: number };
type StatusPoint = { name: string; value: number; color: string };
type DelayBucketPoint = { name: string; count: number; percentage: number };
type TransporterPoint = { name: string; trips: number; tat: number; onTime: string };
type RoutePoint = { source: string; dest: string; tat: number; trips: number };
type TripPoint = {
  id: string;
  date: string;
  src: string;
  dest: string;
  name: string;
  status: string;
  pickup: number | string;
  delivery: number | string;
  packet: string;
};

// --- MOCK DATA ---
const defaultTrendData: TrendPoint[] = [
  { name: '10 May', Created: 180, Completed: 160, Delivered: 140 },
  { name: '11 May', Created: 210, Completed: 190, Delivered: 175 },
  { name: '12 May', Created: 215, Completed: 185, Delivered: 165 },
  { name: '13 May', Created: 220, Completed: 200, Delivered: 180 },
  { name: '14 May', Created: 240, Completed: 215, Delivered: 205 },
  { name: '15 May', Created: 245, Completed: 225, Delivered: 210 },
  { name: '16 May', Created: 237, Completed: 221, Delivered: 198 },
];

const defaultStatusData: StatusPoint[] = [
  { name: 'Completed', value: 221, color: '#10b981' },
  { name: 'Delivered', value: 198, color: '#3b82f6' },
  { name: 'In Transit', value: 8, color: '#6366f1' },
  { name: 'Awaiting Departure', value: 4, color: '#f59e0b' },
  { name: 'Cancelled', value: 4, color: '#ef4444' },
];

const defaultDelayBucketData: DelayBucketPoint[] = [
  { name: '0 - 1 Day', count: 97, percentage: 50.0 },
  { name: '1 - 2 Days', count: 54, percentage: 28.3 },
  { name: '2 - 3 Days', count: 28, percentage: 14.7 },
  { name: '> 3 Days', count: 12, percentage: 6.3 },
];

const tatDistributionData = [
  { name: '0-2', count: 12 },
  { name: '2-4', count: 28 },
  { name: '4-6', count: 45 },
  { name: '6-8', count: 62 },
  { name: '8-10', count: 40 },
  { name: '10-12', count: 22 },
  { name: '12-15', count: 16 },
  { name: '15+', count: 12 },
];

const defaultTransporterPerformance: TransporterPoint[] = [
  { name: 'Lynkit Logistics', trips: 45, tat: 4.2, onTime: '91.1%' },
  { name: 'SpeedX Logistics', trips: 38, tat: 4.8, onTime: '89.3%' },
  { name: 'FastMove Transport', trips: 32, tat: 5.6, onTime: '87.5%' },
  { name: 'SafeTrack Logistics', trips: 28, tat: 6.3, onTime: '82.1%' },
  { name: 'QuickShip Carriers', trips: 24, tat: 7.1, onTime: '75.0%' },
];

const defaultWorstTransporterPerformance: TransporterPoint[] = [
  { name: 'Global Freight Movers', trips: 18, tat: 8.4, onTime: '66.7%' },
  { name: 'Express Linkers', trips: 16, tat: 8.1, onTime: '68.8%' },
  { name: 'Rapid Roadways', trips: 14, tat: 7.6, onTime: '71.4%' },
  { name: 'MoveRight Logistics', trips: 12, tat: 7.2, onTime: '75.0%' },
  { name: 'City Connect Logistics', trips: 10, tat: 6.9, onTime: '70.0%' },
];

const defaultRouteData: RoutePoint[] = [
  { source: 'Mumbai', dest: 'Delhi', tat: 8.6, trips: 28 },
  { source: 'Bangalore', dest: 'Hyderabad', tat: 7.8, trips: 24 },
  { source: 'Chennai', dest: 'Kolkata', tat: 7.2, trips: 22 },
  { source: 'Pune', dest: 'Delhi', tat: 6.9, trips: 20 },
  { source: 'Ahmedabad', dest: 'Mumbai', tat: 6.5, trips: 18 },
];

const defaultDetailedTrips: TripPoint[] = [
  { id: 'TRF10001', date: '16 May 2025', src: 'Mumbai', dest: 'Delhi', name: 'Lynkit Logistics', status: 'Delivered', pickup: 0.8, delivery: 4.1, packet: 'Delivered' },
  { id: 'TRF10002', date: '16 May 2025', src: 'Bangalore', dest: 'Hyderabad', name: 'SpeedX Logistics', status: 'Delivered', pickup: 1.1, delivery: 4.3, packet: 'Delivered' },
  { id: 'TRF10003', date: '16 May 2025', src: 'Chennai', dest: 'Kolkata', name: 'FastMove Transport', status: 'Delivered', pickup: 0.9, delivery: 4.6, packet: 'Delivered' },
  { id: 'TRF10004', date: '16 May 2025', src: 'Pune', dest: 'Delhi', name: 'SafeTrack Logistics', status: 'In Transit', pickup: 1.3, delivery: '-', packet: 'In Transit' },
  { id: 'TRF10005', date: '16 May 2025', src: 'Ahmedabad', dest: 'Mumbai', name: 'QuickShip Carriers', status: 'Awaiting Departure', pickup: '-', delivery: '-', packet: 'Pending' },
  { id: 'TRF10006', date: '16 May 2025', src: 'Delhi', dest: 'Lucknow', name: 'Lynkit Logistics', status: 'Delivered', pickup: 0.7, delivery: 3.8, packet: 'Delivered' },
];

function parseTripDate(dateValue?: string): Date | null {
  if (!dateValue) return null;

  const normalized = dateValue.trim();
  if (!normalized || normalized === '-') return null;

  if (normalized.includes('/')) {
    const [day, month, year] = normalized.split('/').map(Number);
    if (!day || !month || !year) return null;
    const parsedSlash = new Date(year, month - 1, day);
    return Number.isNaN(parsedSlash.getTime()) ? null : parsedSlash;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const match = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const fallback = new Date(year, month, day);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatShortDate(dateValue: Date): string {
  return dateValue.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function daysBetween(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function calculatePickupDelayDays(pickupRaisedOn?: string, actualPickupDate?: string): number | null {
  if (!pickupRaisedOn) return null;

  const raised = parseTripDate(pickupRaisedOn);
  if (!raised) return null;

  const actual = actualPickupDate ? parseTripDate(actualPickupDate) : null;
  const compareDate = actual || new Date();
  const diffMs = compareDate.getTime() - raised.getTime();

  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

function normalizeDate(value: Date): Date {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function normalizeLocationKey(value?: string): string {
  return String(value || 'Unknown').trim().replace(/\s+/g, ' ').toLowerCase();
}

function formatLocationLabel(value?: string): string {
  const normalized = String(value || 'Unknown').trim().replace(/\s+/g, ' ');
  return normalized
    .split(' ')
    .map((word) => {
      if (/^[A-Z0-9&-]{2,5}$/.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function getTripOverviewStats(sourceTrips: Trip[]) {
  if (!sourceTrips.length) {
    return {
      totalTrips: 0,
      completedTrips: 0,
      deliveredTrips: 0,
      inTransitTrips: 0,
      pendingTrips: 0,
      cancelledTrips: 0,
      avgTripTatCreation: 0,
      avgTripTatCompletion: 0,
      avgPickupTat: 0,
      avgDeliveredTat: 0,
      pickupDelayedTrips: 0,
      efficiencyIndex: 0,
      delayedOver3Days: 0,
    };
  }

  const toDate = (value?: string) => parseTripDate(value);

  const dayDiff = (start?: string, end?: string): number | null => {
    const startDate = toDate(start);
    const endDate = toDate(end);
    if (!startDate || !endDate) return null;
    return Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const completedTrips = sourceTrips.filter((trip) => {
    const statusLower = String(trip.tripStatus || '').toLowerCase();
    return statusLower.includes('completed') && !statusLower.includes('not');
  }).length;
  const deliveredTrips = sourceTrips.filter((trip) => String(trip.packetStatus || '').toLowerCase().includes('delivered')).length;
  const inTransitTrips = sourceTrips.filter((trip) => String(trip.tripStatus || '').toLowerCase().includes('transit')).length;
  const pendingTrips = sourceTrips.filter((trip) => String(trip.tripStatus || '').toLowerCase().includes('awaiting')).length;
  const cancelledTrips = sourceTrips.filter((trip) => String(trip.tripStatus || '').toLowerCase().includes('cancel')).length;

  const creationTatValues = sourceTrips
    .map((trip) => dayDiff(trip.tripCreationDate, trip.deliveredDate))
    .filter((value): value is number => value !== null);

  const completionTatValues = sourceTrips
    .map((trip) => dayDiff(trip.tripCompletionDate, trip.deliveredDate))
    .filter((value): value is number => value !== null);

  const pickupTatValues = sourceTrips
    .map((trip) => dayDiff(trip.pickupRaisedOn, trip.actualPickupDate))
    .filter((value): value is number => value !== null);

  const deliveredTatValues = sourceTrips
    .map((trip) => dayDiff(trip.pickupRaisedOn, trip.deliveredDate))
    .filter((value): value is number => value !== null);

  const pickupDelayedTrips = sourceTrips.filter((trip) => {
    const raisedDate = toDate(trip.pickupRaisedOn);
    if (!raisedDate) return false;
    const actualDate = toDate(trip.actualPickupDate) || new Date();
    const delay = Math.floor((actualDate.getTime() - raisedDate.getTime()) / (1000 * 60 * 60 * 24));
    return delay > 3;
  }).length;

  const delayedOver3Days = deliveredTatValues.filter((value) => value > 3).length;

  const avg = (values: number[]) => values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0;

  return {
    totalTrips: sourceTrips.length,
    completedTrips,
    deliveredTrips,
    inTransitTrips,
    pendingTrips,
    cancelledTrips,
    avgTripTatCreation: avg(creationTatValues),
    avgTripTatCompletion: avg(completionTatValues),
    avgPickupTat: avg(pickupTatValues),
    avgDeliveredTat: avg(deliveredTatValues),
    pickupDelayedTrips,
    efficiencyIndex: sourceTrips.length ? Number((((deliveredTrips / sourceTrips.length) * 100)).toFixed(1)) : 0,
    delayedOver3Days,
  };
}

function getTrendDirection(currentValue: number, previousValue: number): 'up' | 'down' | 'neutral' {
  if (currentValue > previousValue) return 'up';
  if (currentValue < previousValue) return 'down';
  return 'neutral';
}

function buildSummaryData(sourceTrips: Trip[]) {
  if (!sourceTrips.length) {
    return {
      trendData: [],
      statusData: [],
      delayBucketData: [],
      transporterPerformance: [],
      worstTransporterPerformance: [],
      routeData: [],
      detailedTrips: [],
    };
  }

  const normalizedTrips = sourceTrips.map((trip) => {
    const createdAt = parseTripDate(trip.tripCreationDate);
    const completedAt = parseTripDate(trip.tripCompletionDate);
    const deliveredAt = parseTripDate(trip.deliveredDate);
    const pickupAt = parseTripDate(trip.actualPickupDate);
    const tatDate = deliveredAt || completedAt || pickupAt;

    return {
      trip,
      createdAt,
      completedAt,
      deliveredAt,
      pickupAt,
      tatDays: daysBetween(createdAt, tatDate),
    };
  });

  const deliveredTatTrips = normalizedTrips.filter(({ createdAt, deliveredAt }) => createdAt && deliveredAt);

  const toDateKey = (date: Date | null): string | null => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateKey = (dateKey: string): Date => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const createdCounts = new Map<string, number>();
  const completedCounts = new Map<string, number>();
  const deliveredCounts = new Map<string, number>();

  normalizedTrips.forEach((item) => {
    const createdKey = toDateKey(item.createdAt);
    const completedKey = toDateKey(item.completedAt);
    const deliveredKey = toDateKey(item.deliveredAt);

    if (createdKey) createdCounts.set(createdKey, (createdCounts.get(createdKey) || 0) + 1);
    if (completedKey) completedCounts.set(completedKey, (completedCounts.get(completedKey) || 0) + 1);
    if (deliveredKey) deliveredCounts.set(deliveredKey, (deliveredCounts.get(deliveredKey) || 0) + 1);
  });

  const allActivityKeys = Array.from(new Set([
    ...createdCounts.keys(),
    ...completedCounts.keys(),
    ...deliveredCounts.keys(),
  ])).sort();

  const anchorDate = new Date();
  anchorDate.setHours(0, 0, 0, 0);

  const trendSeries = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchorDate);
    date.setDate(anchorDate.getDate() - (6 - index));
    const key = toDateKey(date) || '';

    return {
      name: formatShortDate(date),
      Created: createdCounts.get(key) || 0,
      Completed: completedCounts.get(key) || 0,
      Delivered: deliveredCounts.get(key) || 0,
    };
  });

  const statusMap = new Map<string, number>([
    ['Completed', 0],
    ['Delivered', 0],
    ['In Transit', 0],
    ['Awaiting Departure', 0],
    ['Cancelled', 0],
  ]);

  normalizedTrips.forEach(({ trip }) => {
    const status = String(trip.tripStatus || '').toLowerCase();
    if (status.includes('completed')) {
      statusMap.set('Completed', (statusMap.get('Completed') || 0) + 1);
    } else if (status.includes('transit')) {
      statusMap.set('In Transit', (statusMap.get('In Transit') || 0) + 1);
    } else if (status.includes('awaiting')) {
      statusMap.set('Awaiting Departure', (statusMap.get('Awaiting Departure') || 0) + 1);
    } else if (status.includes('cancel')) {
      statusMap.set('Cancelled', (statusMap.get('Cancelled') || 0) + 1);
    }

    if (String(trip.packetStatus || '').toLowerCase().includes('delivered')) {
      statusMap.set('Delivered', (statusMap.get('Delivered') || 0) + 1);
    }
  });

  const statusSeries = [
    { name: 'Completed', value: statusMap.get('Completed') || 0, color: '#10b981' },
    { name: 'Delivered', value: statusMap.get('Delivered') || 0, color: '#3b82f6' },
    { name: 'In Transit', value: statusMap.get('In Transit') || 0, color: '#6366f1' },
    { name: 'Awaiting Departure', value: statusMap.get('Awaiting Departure') || 0, color: '#f59e0b' },
    { name: 'Cancelled', value: statusMap.get('Cancelled') || 0, color: '#ef4444' },
  ];

  const pickupDelayValues = sourceTrips
    .map((trip) => calculatePickupDelayDays(trip.pickupRaisedOn, trip.actualPickupDate))
    .filter((value): value is number => value !== null);

  const delayBuckets = [
    { name: '0 - 1 Day', count: pickupDelayValues.filter((value) => value <= 1).length, percentage: 0 },
    { name: '1 - 2 Days', count: pickupDelayValues.filter((value) => value > 1 && value <= 2).length, percentage: 0 },
    { name: '2 - 3 Days', count: pickupDelayValues.filter((value) => value > 2 && value <= 3).length, percentage: 0 },
    { name: '> 3 Days', count: pickupDelayValues.filter((value) => value > 3).length, percentage: 0 },
  ].map((bucket) => ({
    ...bucket,
    percentage: Number(((bucket.count / sourceTrips.length) * 100).toFixed(1)),
  }));

  const transporterMap = new Map<string, { trips: number; totalTat: number; onTime: number }>();
  const routeMap = new Map<string, { source: string; dest: string; trips: number; totalTat: number }>();

  deliveredTatTrips.forEach(({ trip, createdAt, deliveredAt }) => {
    const tatDays = daysBetween(createdAt, deliveredAt);
    const transporter = trip.transporterName || 'Unknown';
    const transporterEntry = transporterMap.get(transporter) || { trips: 0, totalTat: 0, onTime: 0 };
    transporterEntry.trips += 1;
    transporterEntry.totalTat += tatDays;
    transporterEntry.onTime += tatDays <= 5 ? 1 : 0;
    transporterMap.set(transporter, transporterEntry);

    const routeSource = trip.sourceAddress || 'Unknown';
    const routeDest = trip.destinationAddress || 'Unknown';
    const routeKey = `${normalizeLocationKey(routeSource)}→${normalizeLocationKey(routeDest)}`;
    const routeEntry = routeMap.get(routeKey) || {
      source: formatLocationLabel(routeSource),
      dest: formatLocationLabel(routeDest),
      trips: 0,
      totalTat: 0,
    };
    routeEntry.trips += 1;
    routeEntry.totalTat += tatDays;
    routeMap.set(routeKey, routeEntry);
  });

  const transporterPerformance = Array.from(transporterMap.entries())
    .map(([name, data]) => ({
      name,
      trips: data.trips,
      tat: Number((data.totalTat / data.trips).toFixed(1)),
      onTime: `${((data.onTime / data.trips) * 100).toFixed(1)}%`,
    }))
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 5);

  const worstTransporterPerformance = Array.from(transporterMap.entries())
    .map(([name, data]) => ({
      name,
      trips: data.trips,
      tat: Number((data.totalTat / data.trips).toFixed(1)),
      onTime: `${((data.onTime / data.trips) * 100).toFixed(1)}%`,
    }))
    .sort((a, b) => Number(a.onTime) - Number(b.onTime))
    .slice(0, 5);

  const routeData = Array.from(routeMap.values())
    .map((route) => ({
      source: route.source,
      dest: route.dest,
      tat: Number((route.totalTat / route.trips).toFixed(1)),
      trips: route.trips,
    }))
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 5);

  const detailedTrips = [...normalizedTrips]
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
    .slice(0, 6)
    .map(({ trip }) => ({
      id: trip.tripId,
      date: trip.tripCreationDate || '',
      src: trip.sourceAddress || '-',
      dest: trip.destinationAddress || '-',
      name: trip.transporterName || '-',
      status: trip.tripStatus || '-',
      pickup: trip.actualPickupDate ? daysBetween(parseTripDate(trip.tripCreationDate), parseTripDate(trip.actualPickupDate)) : '-',
      delivery: trip.deliveredDate ? daysBetween(parseTripDate(trip.tripCreationDate), parseTripDate(trip.deliveredDate)) : '-',
      packet: trip.packetStatus || '-',
    }));

  return {
    trendData: trendSeries,
    statusData: statusSeries,
    delayBucketData: delayBuckets,
    transporterPerformance,
    worstTransporterPerformance,
    routeData,
    detailedTrips,
  };
}

// --- COMPONENTS ---

const StatCard = ({ title, value, subValue, trend, trendValue, icon: Icon, color }) => (
  <div className="bg-white border rounded shadow-sm p-3 flex flex-col items-center text-center">
    <div className="flex items-center gap-2 mb-1">
      <div className={`p-1.5 rounded-full ${color.bg}`}>
        <Icon className={`w-4 h-4 ${color.text}`} />
      </div>
      <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider whitespace-nowrap">{title}</span>
    </div>
    <div className="text-2xl font-black text-slate-800 leading-tight">{value}</div>
    {trend && (
      <div className={`flex items-center gap-1 text-[10px] mt-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
        {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <Clock size={12} />}
        <span className="font-medium">{trendValue} vs Yesterday ({subValue})</span>
      </div>
    )}
  </div>
);

const MetricItem = ({ label, value, trend, trendValue, subValue }) => (
  <div className="flex flex-col items-center border-r last:border-r-0 px-3 flex-1">
    <span className="text-[9px] font-bold text-gray-400 uppercase text-center h-8 flex items-center leading-tight">{label}</span>
    <span className="text-lg font-black text-slate-700 leading-none mb-1">{value}</span>
    <div className={`flex items-center gap-0.5 text-[9px] font-semibold ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
      {trend === 'up' ? <TrendingUp size={10} /> : trend === 'down' ? <TrendingDown size={10} /> : null}
      {trendValue} <span className="text-gray-400 font-normal">({subValue})</span>
    </div>
  </div>
);

export default function DailyAutoSummary({ page = 'summary', onGoToNextPage, trips }: DailyAutoSummaryProps) {
  const pdfLayoutRef = useRef(null);
  const [filters, setFilters] = useState({
    origin: 'all',
    destination: 'all',
    transporter: 'all',
    mode: 'all',
    status: 'all',
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const hasActiveFilters = useMemo(() => (
    filters.origin !== 'all'
    || filters.destination !== 'all'
    || filters.transporter !== 'all'
    || filters.mode !== 'all'
    || filters.status !== 'all'
    || filters.datePreset !== 'all'
    || Boolean(filters.dateFrom)
    || Boolean(filters.dateTo)
  ), [filters]);

  const filterOptions = useMemo(() => {
    const sourceTrips = trips || [];

    const toUniqueSorted = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

    return {
      origins: toUniqueSorted(sourceTrips.map((trip) => trip.sourceAddress || '').map((value) => value.trim())),
      destinations: toUniqueSorted(sourceTrips.map((trip) => trip.destinationAddress || '').map((value) => value.trim())),
      transporters: toUniqueSorted(sourceTrips.map((trip) => trip.transporterName || '').map((value) => value.trim())),
      modes: toUniqueSorted(sourceTrips.map((trip) => trip.mode || '').map((value) => value.trim())),
      statuses: toUniqueSorted(sourceTrips.map((trip) => trip.tripStatus || '').map((value) => value.trim())),
    };
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const sourceTrips = trips || [];
    const now = normalizeDate(new Date());
    const fromDate = filters.dateFrom ? normalizeDate(new Date(filters.dateFrom)) : null;
    const toDate = filters.dateTo ? normalizeDate(new Date(filters.dateTo)) : null;

    return sourceTrips.filter((trip) => {
      if (filters.origin !== 'all' && (trip.sourceAddress || '').trim() !== filters.origin) return false;
      if (filters.destination !== 'all' && (trip.destinationAddress || '').trim() !== filters.destination) return false;
      if (filters.transporter !== 'all' && (trip.transporterName || '').trim() !== filters.transporter) return false;
      if (filters.mode !== 'all' && (trip.mode || '').trim() !== filters.mode) return false;
      if (filters.status !== 'all' && (trip.tripStatus || '').trim() !== filters.status) return false;

      const tripDate = parseTripDate(trip.tripCreationDate)
        || parseTripDate(trip.tripCompletionDate)
        || parseTripDate(trip.deliveredDate);

      if (!tripDate) {
        return filters.datePreset === 'all' && !fromDate && !toDate;
      }

      const normalizedTripDate = normalizeDate(tripDate);

      if (filters.datePreset === 'today' && !isSameDay(normalizedTripDate, now)) return false;
      if (filters.datePreset === 'last7days') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        if (normalizedTripDate < sevenDaysAgo || normalizedTripDate > now) return false;
      }

      if (fromDate && normalizedTripDate < fromDate) return false;
      if (toDate && normalizedTripDate > toDate) return false;

      return true;
    });
  }, [filters, trips]);

  const todayOnlyTrips = useMemo(() => {
    const sourceTrips = trips || [];
    const now = normalizeDate(new Date());

    return sourceTrips.filter((trip) => {
      const tripDate = parseTripDate(trip.tripCreationDate)
        || parseTripDate(trip.tripCompletionDate)
        || parseTripDate(trip.deliveredDate);

      if (!tripDate) return false;

      const normalizedTripDate = normalizeDate(tripDate);
      return isSameDay(normalizedTripDate, now);
    });
  }, [trips]);

  const yesterdayOnlyTrips = useMemo(() => {
    const sourceTrips = trips || [];
    const now = normalizeDate(new Date());
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    return sourceTrips.filter((trip) => {
      const tripDate = parseTripDate(trip.tripCreationDate)
        || parseTripDate(trip.tripCompletionDate)
        || parseTripDate(trip.deliveredDate);

      if (!tripDate) return false;

      const normalizedTripDate = normalizeDate(tripDate);
      return isSameDay(normalizedTripDate, yesterday);
    });
  }, [trips]);

  const reportData = useMemo(() => buildSummaryData(filteredTrips), [filteredTrips]);

  const {
    trendData,
    statusData,
    delayBucketData,
    transporterPerformance,
    worstTransporterPerformance,
    routeData,
    detailedTrips,
  } = reportData;

  const summaryStats = useMemo(() => getTripOverviewStats(filteredTrips), [filteredTrips]);

  const todayStats = useMemo(() => getTripOverviewStats(todayOnlyTrips), [todayOnlyTrips]);

  const yesterdayStats = useMemo(() => getTripOverviewStats(yesterdayOnlyTrips), [yesterdayOnlyTrips]);

  const reportDate = new Date();
  const reportDateLabel = reportDate
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
  const reportWeekdayLabel = reportDate.toLocaleDateString('en-GB', { weekday: 'long' });
  const reportPeriodLabel = reportDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const lynkitLogoUrl = 'https://media.licdn.com/dms/image/v2/D560BAQEhlDgHa__tMA/company-logo_200_200/B56ZzRLOz.IYAI-/0/1773035908837/lynkit_india_logo?e=2147483647&v=beta&t=hVLhGlwxvg-pNkGGb1qXoyz5Qt7stwPmaR8fvAbxdoU';
  const tatSnapshotItems = [
    { label: 'Creation to Delivered', value: summaryStats.avgTripTatCreation },
    { label: 'Completion to Delivery', value: summaryStats.avgTripTatCompletion },
    { label: 'Pickup TAT', value: summaryStats.avgPickupTat },
    { label: 'Delivery TAT', value: summaryStats.avgDeliveredTat },
  ];

  const resetFilters = () => {
    setFilters({
      origin: 'all',
      destination: 'all',
      transporter: 'all',
      mode: 'all',
      status: 'all',
      datePreset: 'all',
      dateFrom: '',
      dateTo: '',
    });
  };

  const generatePDF = async () => {
    const element = pdfLayoutRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 1.5,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      pdf.save('daily-performance-report.pdf');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    generatePDF();
  };

  if (page === 'next') {
    return (
      <div className="bg-slate-100 min-h-screen p-4 md:p-8 font-sans text-gray-800 printable-area">
        <div className="max-w-6xl mx-auto bg-white shadow-2xl p-8 border-t-8 border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 transform rotate-45 translate-x-16 -translate-y-16 opacity-10"></div>

          <header className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="bg-slate-800 p-3 rounded-lg flex flex-col items-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">
                <img src={lynkitLogoUrl} alt="Lynkit logo" className="w-10 h-10 rounded object-cover" crossOrigin="anonymous" />
                <span className="text-white text-[8px] font-black tracking-widest mt-1">LYNKIT</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-slate-800 text-white text-[9px] font-black px-2 py-0.5 rounded">PAGE 2</span>
                  <span className="text-slate-400 text-[9px] font-bold">DEEP DIVE CONTINUATION</span>
                </div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">DAILY SUMMARY - NEXT PAGE</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Operational drill-down, exceptions, and route-level follow-up</p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="bg-slate-800 text-white px-6 py-3 rounded-bl-3xl shadow-md">
                <div className="text-[10px] uppercase font-bold opacity-70 tracking-widest mb-1 text-right">Reporting Date</div>
                <div className="text-2xl font-black whitespace-nowrap">{reportDateLabel}</div>
                <div className="text-[10px] opacity-60 font-bold tracking-tight text-right italic">(Continuation View)</div>
              </div>
            </div>
          </header>

          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1.5 bg-slate-800 rounded-full"></div>
              <h2 className="text-xs font-black uppercase text-slate-800 tracking-widest">Secondary KPIs - Focus Areas</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border rounded shadow-sm p-4 flex flex-col items-center text-center">
                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600 mb-2"><CheckCircle size={16} /></div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">On-Time Delivery</span>
                <span className="text-2xl font-black text-slate-800 leading-tight mt-1">{summaryStats.totalTrips ? ((summaryStats.completedTrips / summaryStats.totalTrips) * 100).toFixed(1) : '0.0'}%</span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1">+3.2% vs last week</span>
              </div>
              <div className="bg-white border rounded shadow-sm p-4 flex flex-col items-center text-center">
                <div className="p-2 rounded-full bg-blue-50 text-blue-600 mb-2"><Truck size={16} /></div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Fleet Utilization</span>
                <span className="text-2xl font-black text-slate-800 leading-tight mt-1">{summaryStats.totalTrips ? ((summaryStats.deliveredTrips / summaryStats.totalTrips) * 100).toFixed(1) : '0.0'}%</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-1">+1.1% vs last week</span>
              </div>
              <div className="bg-white border rounded shadow-sm p-4 flex flex-col items-center text-center">
                <div className="p-2 rounded-full bg-red-50 text-red-600 mb-2"><AlertTriangle size={16} /></div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Critical Delays</span>
                <span className="text-2xl font-black text-slate-800 leading-tight mt-1">{summaryStats.pickupDelayedTrips}</span>
                <span className="text-[10px] text-red-600 font-semibold mt-1">-5.0% vs last week</span>
              </div>
              <div className="bg-white border rounded shadow-sm p-4 flex flex-col items-center text-center">
                <div className="p-2 rounded-full bg-slate-50 text-slate-600 mb-2"><Info size={16} /></div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Efficiency Index</span>
                <span className="text-2xl font-black text-slate-800 leading-tight mt-1">{summaryStats.efficiencyIndex}%</span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1">+3.5% vs yesterday</span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <h3 className="bg-slate-100 p-3 text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-slate-200 flex items-center gap-2">
                <MapPin size={12} /> Top Routes Follow-Up
              </h3>
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-3 py-3">Destination</th>
                    <th className="px-3 py-3 text-center">Avg TAT</th>
                    <th className="px-3 py-3 text-center">Trips</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {routeData.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium">{r.source}</td>
                      <td className="px-3 py-2.5 font-medium">{r.dest}</td>
                      <td className="px-3 py-2.5 text-center font-black text-slate-800">{r.tat}d</td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-500">{r.trips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <h3 className="bg-slate-100 p-3 text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-slate-200 flex items-center gap-2">
                <AlertTriangle size={12} /> Transporters Needing Attention
              </h3>
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase">
                  <tr>
                    <th className="px-4 py-3">Transporter</th>
                    <th className="px-3 py-3 text-center">Trips</th>
                    <th className="px-3 py-3 text-center">Avg TAT</th>
                    <th className="px-3 py-3 text-center">On Time %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {worstTransporterPerformance.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-700">{t.name}</td>
                      <td className="px-3 py-2.5 text-center font-medium">{t.trips}</td>
                      <td className="px-3 py-2.5 text-center font-black text-slate-800">{t.tat}d</td>
                      <td className="px-3 py-2.5 text-center text-red-600 font-black">{t.onTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <h3 className="bg-slate-800 p-3 text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                <ClipboardList size={12} /> Trip Exception Snapshot
              </h3>
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-3 py-3">Route</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-center">P-TAT</th>
                    <th className="px-3 py-3 text-center">D-TAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailedTrips.slice(0, 5).map((t, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 font-black text-blue-700">{t.id}</td>
                      <td className="px-3 py-3">{t.src} → {t.dest}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                          t.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' :
                          t.status === 'In Transit' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-800">{t.pickup}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-800">{t.delivery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-800 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp size={100} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info size={14} className="text-blue-400" /> Next Page Action Plan
              </h3>
              <div className="space-y-4 relative z-10">
                <p className="text-[11px] leading-relaxed opacity-80 border-l-2 border-blue-400 pl-3">
                  This page highlights the routes and transporters that need the fastest follow-up so the daily review can move directly into execution.
                </p>
                <ul className="space-y-3 text-[11px] font-medium">
                  <li className="flex gap-3 items-start">
                    <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Escalate the highest-delay transporters for same-day resolution.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <MapPin size={14} className="text-blue-400 shrink-0 mt-0.5" />
                    <span>Rebalance capacity on Mumbai to Delhi and Bangalore to Hyderabad routes.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <Clock size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>Review pickup bottlenecks for trips that are still waiting on dispatch confirmation.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

          body {
            font-family: 'Inter', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .printable-area {
            transition: transform 0.3s ease;
          }

          ::-webkit-scrollbar {
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #f1f5f9;
          }
          ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 font-sans text-gray-800 printable-area">
      {/* Report Container (A4 Aspect Ratio Approximation) */}
      <div className="max-w-6xl mx-auto bg-white shadow-2xl p-8 border-t-8 border-slate-800 relative overflow-hidden">
        
        {/* Top Accent Bar */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 transform rotate-45 translate-x-16 -translate-y-16 opacity-10"></div>

        {/* Header Section */}
        <header className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="bg-slate-800 p-3 rounded-lg flex flex-col items-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">
              <img src={lynkitLogoUrl} alt="Lynkit logo" className="w-10 h-10 rounded object-cover" crossOrigin="anonymous" />
              <span className="text-white text-[8px] font-black tracking-widest mt-1">LYNKIT</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded">SYSTEM GENERATED</span>
                <span className="text-slate-400 text-[9px] font-bold">REPORT ID: TA-2025-0516-01</span>
              </div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">DAILY PERFORMANCE REPORT</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Operational Analytics & Efficiency Review Dashboard</p>
            </div>
          </div>
          
          <div className="text-right flex flex-col items-end">
            <div className="bg-slate-800 text-white px-6 py-3 rounded-bl-3xl shadow-md">
              <div className="text-[10px] uppercase font-bold opacity-70 tracking-widest mb-1 text-right">Reporting Date</div>
              <div className="text-2xl font-black whitespace-nowrap">{reportDateLabel}</div>
              <div className="text-[10px] opacity-60 font-bold tracking-tight text-right italic">({reportWeekdayLabel} - 24hr Summary)</div>
            </div>
          </div>
        </header>

        {/* Executive Summary Section */}
        <section className="mb-8">
          <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white shadow-lg">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-cyan-300" />
                <h3 className="text-sm font-black uppercase tracking-wider text-cyan-100">Filters</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-cyan-100">
                  {hasActiveFilters ? `Filtered: ${filteredTrips.length} trips` : `Overall: ${filteredTrips.length} trips`}
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-full border border-white/20 px-3 py-1 font-bold text-white transition hover:bg-white/10 flex items-center gap-1"
                >
                  <Download size={14} />
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-white/20 px-3 py-1 font-bold text-white transition hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select value={filters.origin} onChange={(e) => setFilters((prev) => ({ ...prev, origin: e.target.value }))} className="rounded-xl border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">
                <option value="all">All Origins</option>
                {filterOptions.origins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
              </select>

              <select value={filters.destination} onChange={(e) => setFilters((prev) => ({ ...prev, destination: e.target.value }))} className="rounded-xl border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">
                <option value="all">All Destinations</option>
                {filterOptions.destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}
              </select>

              <select value={filters.transporter} onChange={(e) => setFilters((prev) => ({ ...prev, transporter: e.target.value }))} className="rounded-xl border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">
                <option value="all">All Transporters</option>
                {filterOptions.transporters.map((transporter) => <option key={transporter} value={transporter}>{transporter}</option>)}
              </select>

              <select value={filters.mode} onChange={(e) => setFilters((prev) => ({ ...prev, mode: e.target.value }))} className="rounded-xl border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">
                <option value="all">All Modes</option>
                {filterOptions.modes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>

              <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="rounded-xl border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">
                <option value="all">All Statuses</option>
                {filterOptions.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>

              <select value={filters.datePreset} onChange={(e) => setFilters((prev) => ({ ...prev, datePreset: e.target.value }))} className="rounded-xl border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">
                <option value="today">Today</option>
                <option value="last7days">Last 7 Days</option>
                <option value="all">All Dates</option>
              </select>

              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="rounded-xl border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
              />

              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="rounded-xl border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
              />
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">Quick access</p>
                <h3 className="text-sm font-black text-slate-900">Open the second summary page</h3>
                <p className="text-xs text-slate-600">Use this if the tab strip is hard to see on mobile.</p>
              </div>
              {onGoToNextPage && (
                <button
                  type="button"
                  onClick={onGoToNextPage}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                >
                  Summary Page 2
                </button>
              )}
            </div>
          </div>

          <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4 shadow-md">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" />
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-900">Today's Quick Stats</h3>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl bg-white border border-sky-100 p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2">Total Trips Created</div>
                <div className="text-3xl font-black text-sky-700">{todayStats.totalTrips}</div>
                <div className="text-[11px] text-sky-600 font-semibold mt-1">Today</div>
              </div>
              <div className="rounded-xl bg-white border border-emerald-100 p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2">Completed Today</div>
                <div className="text-3xl font-black text-emerald-700">{todayStats.completedTrips}</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">Today</div>
              </div>
              <div className="rounded-xl bg-white border border-blue-100 p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2">Delivered Today</div>
                <div className="text-3xl font-black text-blue-700">{todayStats.deliveredTrips}</div>
                <div className="text-[11px] text-blue-600 font-semibold mt-1">Today</div>
              </div>
              <div className="rounded-xl bg-white border border-indigo-100 p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2">In Transit Today</div>
                <div className="text-3xl font-black text-indigo-700">{todayStats.inTransitTrips}</div>
                <div className="text-[11px] text-indigo-600 font-semibold mt-1">Today</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-1.5 bg-slate-800 rounded-full"></div>
            <h2 className="text-xs font-black uppercase text-slate-800 tracking-widest">Executive Summary - Critical KPIs</h2>
          </div>
          
          <div className="grid grid-cols-6 gap-3 mb-4">
            <StatCard title="Total Trips" value={String(summaryStats.totalTrips)} subValue={String(yesterdayStats.totalTrips)} trend={getTrendDirection(summaryStats.totalTrips, yesterdayStats.totalTrips)} trendValue="Today" icon={Truck} color={{bg: 'bg-blue-50', text: 'text-blue-600'}} />
            <StatCard title="Completed" value={String(summaryStats.completedTrips)} subValue={String(yesterdayStats.completedTrips)} trend={getTrendDirection(summaryStats.completedTrips, yesterdayStats.completedTrips)} trendValue="Today" icon={CheckCircle} color={{bg: 'bg-emerald-50', text: 'text-emerald-600'}} />
            <StatCard title="Delivered" value={String(summaryStats.deliveredTrips)} subValue={String(yesterdayStats.deliveredTrips)} trend={getTrendDirection(summaryStats.deliveredTrips, yesterdayStats.deliveredTrips)} trendValue="Today" icon={Package} color={{bg: 'bg-sky-50', text: 'text-sky-600'}} />
            <StatCard title="In Transit" value={String(summaryStats.inTransitTrips)} subValue={String(yesterdayStats.inTransitTrips)} trend={getTrendDirection(summaryStats.inTransitTrips, yesterdayStats.inTransitTrips)} trendValue="Today" icon={ArrowRight} color={{bg: 'bg-indigo-50', text: 'text-indigo-600'}} />
            <StatCard title="Pending" value={String(summaryStats.pendingTrips)} subValue={String(yesterdayStats.pendingTrips)} trend={getTrendDirection(summaryStats.pendingTrips, yesterdayStats.pendingTrips)} trendValue="Today" icon={Clock} color={{bg: 'bg-amber-50', text: 'text-amber-600'}} />
            <StatCard title="Cancelled" value={String(summaryStats.cancelledTrips)} subValue={String(yesterdayStats.cancelledTrips)} trend={getTrendDirection(summaryStats.cancelledTrips, yesterdayStats.cancelledTrips)} trendValue="Today" icon={XCircle} color={{bg: 'bg-red-50', text: 'text-red-600'}} />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 flex justify-between border-2 border-slate-100 shadow-inner">
            <MetricItem label="Avg Trip TAT (Creation)" value={`${summaryStats.avgTripTatCreation || 0} Days`} trend="down" trendValue="Live" subValue={`${summaryStats.avgTripTatCreation || 0}d`} />
            <MetricItem label="Avg Trip TAT (Completion)" value={`${summaryStats.avgTripTatCompletion || 0} Days`} trend="down" trendValue="Live" subValue={`${summaryStats.avgTripTatCompletion || 0}d`} />
            <MetricItem label="Avg Pickup TAT" value={`${summaryStats.avgPickupTat || 0} Days`} trend="down" trendValue="Live" subValue={`${summaryStats.avgPickupTat || 0}d`} />
            <MetricItem label="Avg Delivered TAT" value={`${summaryStats.avgDeliveredTat || 0} Days`} trend="down" trendValue="Live" subValue={`${summaryStats.avgDeliveredTat || 0}d`} />
            <MetricItem label="Pickup Delayed Trips" value={String(summaryStats.pickupDelayedTrips)} trend="down" trendValue="Live" subValue={String(summaryStats.pickupDelayedTrips)} />
            <MetricItem label="Efficiency Index" value={`${summaryStats.efficiencyIndex}%`} trend="up" trendValue="Live" subValue={`${summaryStats.efficiencyIndex}%`} />
          </div>
        </section>

        {/* Analytics Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-5 border-b border-slate-100 pb-2 flex items-center gap-2">
              <TrendingUp size={14} /> Trips Volume Trend - Last 7 Days
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                  <Bar dataKey="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="Delivered" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm flex flex-col">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-5 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Filter size={14} /> Trip Status Distribution
            </h3>
            <div className="flex flex-1 items-center">
              <div className="w-1/2 h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="text-[10px] text-slate-400 font-black uppercase leading-tight">Total</div>
                  <div className="text-3xl font-black text-slate-800 leading-none">{summaryStats.totalTrips}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">TRIPS</div>
                </div>
              </div>
              <div className="w-1/2 space-y-2 pl-4">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{backgroundColor: s.color}}></div>
                      <span className="truncate text-[11px] font-bold text-slate-600">{s.name}</span>
                    </div>
                    <span className="font-black text-[11px] text-slate-800">{summaryStats.totalTrips ? ((s.value / summaryStats.totalTrips) * 100).toFixed(1) : '0.0'}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Charts Row 2 */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Clock size={14} /> Pickup Delay Segmentation
            </h3>
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Active Delays</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-800">{summaryStats.pickupDelayedTrips}</span>
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">CRITICAL</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold italic">{summaryStats.totalTrips ? ((summaryStats.pickupDelayedTrips / summaryStats.totalTrips) * 100).toFixed(1) : '0.0'}% of total volume</div>
                <div className="flex items-center justify-end text-emerald-600 font-black text-xs">
                  <TrendingDown size={14} className="mr-1"/> -5.0% vs Last Week
                </div>
              </div>
            </div>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={delayBucketData} margin={{ left: 10, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={10} width={80} axisLine={false} tickLine={false} tick={{fontWeight: 'bold', fill: '#475569'}} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={22}>
                      {delayBucketData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#1e3a8a', '#2563eb', '#3b82f6', '#93c5fd'][index]} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <ArrowRight size={14} /> TAT Distribution (Lifecycle)
            </h3>
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tatDistributionData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#312e81" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#312e81" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Days', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#312e81" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Performance Tables */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="bg-slate-800 p-3 text-[10px] font-black uppercase text-white tracking-widest flex justify-between items-center">
              Top 5 Performers <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px]">BENCHMARK</span>
            </h3>
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Transporter</th>
                  <th className="px-3 py-3 text-center">Trips</th>
                  <th className="px-3 py-3 text-center">Avg TAT</th>
                  <th className="px-3 py-3 text-center">On Time %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transporterPerformance.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-slate-700">{t.name}</td>
                    <td className="px-3 py-2.5 text-center font-medium">{t.trips}</td>
                    <td className="px-3 py-2.5 text-center font-black text-slate-800">{t.tat}d</td>
                    <td className="px-3 py-2.5 text-center text-emerald-600 font-black">{t.onTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="bg-slate-800 p-3 text-[10px] font-black uppercase text-white tracking-widest flex justify-between items-center">
              Performance Laggards <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px]">ATTENTION</span>
            </h3>
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Transporter</th>
                  <th className="px-3 py-3 text-center">Trips</th>
                  <th className="px-3 py-3 text-center">Avg TAT</th>
                  <th className="px-3 py-3 text-center">On Time %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {worstTransporterPerformance.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-slate-700">{t.name}</td>
                    <td className="px-3 py-2.5 text-center font-medium">{t.trips}</td>
                    <td className="px-3 py-2.5 text-center font-black text-slate-800">{t.tat}d</td>
                    <td className="px-3 py-2.5 text-center text-red-600 font-black">{t.onTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Route Performance and Secondary Table */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <h3 className="bg-slate-100 p-3 text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-slate-200 flex items-center gap-2">
              <MapPin size={12} /> Top Routes Analysis (TAT Focus)
            </h3>
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-3 py-3">Destination</th>
                  <th className="px-3 py-3 text-center">Avg TAT</th>
                  <th className="px-3 py-3 text-center">Vol.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {routeData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{r.source}</td>
                    <td className="px-3 py-2.5 font-medium">{r.dest}</td>
                    <td className="px-3 py-2.5 text-center font-black text-slate-800">{r.tat}d</td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{r.trips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-800 text-white shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <TrendingUp size={100} />
             </div>
             <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
               <Info size={14} className="text-blue-400" /> Operational Efficiency Brief
             </h3>
             <div className="space-y-4 relative z-10">
               <div>
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-bold opacity-70">On-Time Delivery Success Rate</span>
                  <span className="text-sm font-black text-emerald-400">{summaryStats.efficiencyIndex}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{width: `${summaryStats.efficiencyIndex}%`}}></div>
                 </div>
               </div>
               <div>
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-bold opacity-70">Fleet Utilization</span>
                  <span className="text-sm font-black text-blue-400">{summaryStats.completedTrips && summaryStats.totalTrips ? ((summaryStats.completedTrips / summaryStats.totalTrips) * 100).toFixed(1) : '0.0'}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{width: `${summaryStats.completedTrips && summaryStats.totalTrips ? ((summaryStats.completedTrips / summaryStats.totalTrips) * 100).toFixed(1) : 0}%`}}></div>
                 </div>
               </div>
               <div className="pt-2">
                 <p className="text-[11px] leading-relaxed italic opacity-80 border-l-2 border-blue-400 pl-3">
                   "Operational health remains 'Exceptional'. TAT reductions in 70% of mapped routes. Focus needed on Tier-3 node delays for the next sprint."
                 </p>
               </div>
             </div>
          </div>
        </div>

        {/* Detailed Table Section */}
        <section className="mb-8 border-2 border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <h3 className="bg-slate-800 text-white p-4 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
            <ClipboardList size={16} /> Detailed Sample Trip Registry
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-center">#</th>
                  <th className="px-3 py-4">Trip Identifier</th>
                  <th className="px-3 py-4">Creation</th>
                  <th className="px-3 py-4">Origin</th>
                  <th className="px-3 py-4">Destination</th>
                  <th className="px-3 py-4">Transporter Entity</th>
                  <th className="px-3 py-4">Current Status</th>
                  <th className="px-3 py-4 text-center">P-TAT</th>
                  <th className="px-3 py-4 text-center">D-TAT</th>
                  <th className="px-3 py-4 text-center">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedTrips.map((t, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-300 font-bold">{i + 1}</td>
                    <td className="px-3 py-3 font-black text-blue-700">{t.id}</td>
                    <td className="px-3 py-3 font-medium whitespace-nowrap">{t.date}</td>
                    <td className="px-3 py-3">{t.src}</td>
                    <td className="px-3 py-3">{t.dest}</td>
                    <td className="px-3 py-3 font-semibold text-slate-600">{t.name}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm ${
                        t.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        t.status === 'In Transit' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800">{t.pickup}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800">{t.delivery}</td>
                    <td className="px-3 py-3 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                        t.packet === 'Delivered' ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {t.packet === 'Delivered' ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {t.packet}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-[10px] text-center text-slate-400 font-medium italic">
            Note: This report reflects the live status as per the centralized logistics database. Reconciliation occurs every 6 hours.
          </div>
        </section>

        {/* Footer Section */}
        <footer className="grid grid-cols-2 gap-8 border-t-2 border-slate-100 pt-8 mt-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
            <h4 className="flex items-center gap-2 text-xs font-black text-blue-900 uppercase mb-4 tracking-wider">
              <Info size={14} className="text-blue-600" /> Automated Key Insights
            </h4>
            <ul className="space-y-3">
              <li className="flex gap-3 items-start text-[11px] text-blue-800 leading-tight font-medium">
                <div className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></div>
                <span>Trips volume increased by <b className="font-black text-blue-900 underline underline-offset-2">12.4%</b> against weekly average.</span>
              </li>
              <li className="flex gap-3 items-start text-[11px] text-blue-800 leading-tight font-medium">
                <div className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></div>
                <span>Cycle time (Creation to Delivery) shows <b className="font-black text-blue-900 italic">8.1% improvement</b> trend.</span>
              </li>
              <li className="flex gap-3 items-start text-[11px] text-blue-800 leading-tight font-medium">
                <div className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></div>
                <span><b className="font-black text-blue-900">Lynkit Logistics</b> maintains consistent SLP at 91.1%.</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm">
            <h4 className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase mb-4 tracking-wider">
              <Lightbulb size={14} className="text-amber-600" /> Strategic Recommendations
            </h4>
            <ul className="space-y-3">
              <li className="flex gap-3 items-start text-[11px] text-amber-800 leading-tight font-medium">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>Audit <b className="font-black">Global Freight Movers</b> for persistent delay patterns.</span>
              </li>
              <li className="flex gap-3 items-start text-[11px] text-amber-800 leading-tight font-medium">
                <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                <span>Optimize <b className="font-black">Mumbai → Delhi</b> corridor scheduling.</span>
              </li>
              <li className="flex gap-3 items-start text-[11px] text-amber-800 leading-tight font-medium">
                <Truck size={14} className="text-slate-600 shrink-0" />
                <span>Implement real-time tracking for Tier-2 nodes showing TAT spikes.</span>
              </li>
            </ul>
          </div>
        </footer>

        {/* Global Footer Bar */}
        <div className="mt-12 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-6 font-bold uppercase tracking-tighter">
            <div className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-300" /> Global HQ: Mumbai Hub</div>
            <div className="flex items-center gap-1.5"><ClipboardList size={12} className="text-slate-300" /> Authorized Copy</div>
            <div className="flex items-center gap-1.5 text-slate-300">© 2025 Analytics Division</div>
          </div>
          <div className="bg-slate-800 text-white px-5 py-2.5 rounded-t-xl flex items-center gap-3 shadow-lg">
            <div className="p-1.5 bg-white/20 rounded shadow-inner transform rotate-12">
              <Truck size={14} />
            </div>
            <div>
              <div className="font-black text-[11px] leading-none tracking-tighter uppercase">Data Driven Logistics</div>
              <div className="text-[8px] opacity-70 font-bold uppercase mt-0.5 tracking-widest">Better Efficiency Every Mile</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HIDDEN PDF LAYOUT WITH CHARTS ===== */}
      <div
        ref={pdfLayoutRef}
        id="pdf-layout"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '210mm',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: '210mm',
            backgroundColor: '#ffffff',
            fontSize: '11px',
            color: '#1f2937',
            lineHeight: '1.35',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* PAGE 1 - HEADER & KPIs */}
          <div data-pdf-page="1" style={{ padding: '12mm 14mm 14mm 14mm', pageBreakAfter: 'always' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)', borderRadius: '18px', padding: '12mm', color: '#ffffff', marginBottom: '8mm', boxShadow: '0 12px 30px rgba(15,23,42,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8mm' }}>
                <div style={{ maxWidth: '125mm', display: 'flex', alignItems: 'flex-start', gap: '4mm' }}>
                  <img
                    src={lynkitLogoUrl}
                    alt="Lynkit logo"
                    crossOrigin="anonymous"
                    style={{ width: '12mm', height: '12mm', borderRadius: '3mm', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.25)' }}
                  />
                  <div>
                    <div style={{ display: 'inline-block', padding: '2mm 4mm', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.12)', fontSize: '8px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '4mm' }}>
                      Daily Performance Summary
                    </div>
                    <h1 style={{ fontSize: '20px', lineHeight: '1.05', margin: '0 0 2mm 0', fontWeight: '900', letterSpacing: '-0.04em' }}>
                      Advanced View Control Report
                    </h1>
                    <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>
                      Generated: {new Date().toLocaleString()} | Report Period: {reportPeriodLabel}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '42mm' }}>
                  <div style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.72, fontWeight: '700' }}>Report ID</div>
                  <div style={{ fontSize: '13px', fontWeight: '900', marginTop: '1.5mm' }}>TA-2025-0516-01</div>
                  <div style={{ fontSize: '8px', opacity: 0.72, marginTop: '1mm' }}>24hr Summary</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ecfdf5', border: '2px solid #a7f3d0', borderRadius: '16px', padding: '6mm', marginBottom: '6mm', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: '10px', fontWeight: '900', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '4mm' }}>Today's Quick Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4mm' }}>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '5mm', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2mm' }}>Total Created</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0369a1', marginBottom: '2mm' }}>{todayStats.totalTrips}</div>
                  <div style={{ fontSize: '8px', color: '#0369a1', fontWeight: '700' }}>Today</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '5mm', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2mm' }}>Completed</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#059669', marginBottom: '2mm' }}>{todayStats.completedTrips}</div>
                  <div style={{ fontSize: '8px', color: '#059669', fontWeight: '700' }}>Today</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #93c5fd', borderRadius: '12px', padding: '5mm', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2mm' }}>Delivered</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb', marginBottom: '2mm' }}>{todayStats.deliveredTrips}</div>
                  <div style={{ fontSize: '8px', color: '#2563eb', fontWeight: '700' }}>Today</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #c4b5fd', borderRadius: '12px', padding: '5mm', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2mm' }}>In Transit</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#7c3aed', marginBottom: '2mm' }}>{todayStats.inTransitTrips}</div>
                  <div style={{ fontSize: '8px', color: '#7c3aed', fontWeight: '700' }}>Today</div>
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: '12px', fontWeight: '900', margin: '0 0 4mm 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Executive Summary
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4mm', marginBottom: '8mm' }}>
              {[
                { label: 'Total Trips', value: String(summaryStats.totalTrips), sub: 'Created', color: '#2563eb', bg: '#eff6ff' },
                { label: 'Completed', value: String(summaryStats.completedTrips), sub: 'Live', color: '#059669', bg: '#ecfdf5' },
                { label: 'Delivered', value: String(summaryStats.deliveredTrips), sub: 'Live', color: '#0284c7', bg: '#ecfeff' },
                { label: 'In Transit', value: String(summaryStats.inTransitTrips), sub: 'Live', color: '#7c3aed', bg: '#f5f3ff' },
              ].map((item) => (
                <div key={item.label} style={{ backgroundColor: item.bg, border: '1px solid rgba(15,23,42,0.08)', borderRadius: '14px', padding: '5mm', boxShadow: '0 6px 18px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748b' }}>{item.label}</div>
                  <div style={{ fontSize: '22px', lineHeight: '1', fontWeight: '900', marginTop: '2mm', color: '#0f172a' }}>{item.value}</div>
                  <div style={{ fontSize: '9px', marginTop: '2mm', fontWeight: '700', color: item.color }}>{item.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '6mm', marginBottom: '6mm', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4mm' }}>
                <h3 style={{ fontSize: '11px', fontWeight: '900', margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>TAT Snapshot</h3>
                <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#334155', fontWeight: '800' }}>Live Data</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4mm' }}>
                {tatSnapshotItems.map((item) => (
                  <div key={item.label} style={{ borderRadius: '12px', padding: '4mm', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '8px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '2mm', color: '#0f172a' }}>{item.value.toFixed(1)} Days</div>
                    <div style={{ fontSize: '9px', marginTop: '1.5mm', color: '#0f766e', fontWeight: '700' }}>Based on current filtered trips</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PAGE 2 - CHARTS */}
          <div data-pdf-page="2" style={{ padding: '12mm 14mm', pageBreakAfter: 'always' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '900', margin: '0 0 5mm 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Analytics & Trends
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6mm' }}>
              <div style={{ padding: '6mm', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4mm' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: '900', margin: 0, color: '#0f172a' }}>Trips Volume Trend - Last 7 Days</h3>
                  <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: '700' }}>Created / Completed / Delivered</span>
                </div>
                <div style={{ height: '182px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                      <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: '10px' }} />
                      <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: '9px', fontWeight: 700 }} />
                      <Bar dataKey="Created" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar dataKey="Completed" fill="#059669" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar dataKey="Delivered" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ padding: '6mm', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4mm' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: '900', margin: 0, color: '#0f172a' }}>Trip Status Distribution</h3>
                  <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: '700' }}>Current mix</span>
                </div>
                <div style={{ display: 'flex', gap: '6mm', alignItems: 'center' }}>
                  <div style={{ flex: '0 0 44%', height: '150px', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#64748b', fontWeight: '800', lineHeight: 1 }}>Total</div>
                      <div style={{ fontSize: '28px', lineHeight: 1, fontWeight: '900', color: '#0f172a', marginTop: '1mm' }}>{summaryStats.totalTrips}</div>
                      <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#64748b', fontWeight: '800', lineHeight: 1, marginTop: '1mm' }}>Trips</div>
                    </div>
                  </div>
                  <div style={{ flex: '1' }}>
                    {statusData.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3mm 0', fontSize: '10px', borderBottom: i === statusData.length - 1 ? 'none' : '1px solid #eef2f7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
                          <div style={{ width: '8px', height: '8px', backgroundColor: s.color, borderRadius: '999px' }} />
                          <span style={{ color: '#334155', fontWeight: '700' }}>{s.name}</span>
                        </div>
                        <div style={{ color: '#0f172a', fontWeight: '900', fontSize: '11px' }}>{s.value} ({summaryStats.totalTrips ? ((s.value / summaryStats.totalTrips) * 100).toFixed(1) : '0.0'}%)</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 3 - MORE CHARTS & TABLES */}
          <div data-pdf-page="3" style={{ padding: '12mm 14mm', pageBreakAfter: 'always' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6mm' }}>
              <div style={{ padding: '6mm', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4mm' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: '900', margin: 0, color: '#0f172a' }}>Pickup Delay Segmentation</h3>
                  <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: '700' }}>Critical delays</span>
                </div>
                <div style={{ height: '150px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={delayBucketData} margin={{ left: 55, right: 18 }}>
                      <XAxis type="number" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                      <YAxis dataKey="name" type="category" fontSize={9} width={72} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontWeight: 700 }} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: '10px' }} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={16}>
                        {delayBucketData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#0f172a', '#0f766e', '#2563eb', '#93c5fd'][index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ padding: '6mm', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4mm' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: '900', margin: 0, color: '#0f172a' }}>TAT Distribution (Lifecycle - Days)</h3>
                  <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: '700' }}>Flow pattern</span>
                </div>
                <div style={{ height: '160px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tatDistributionData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                      <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 4 - PERFORMANCE TABLES */}
          <div data-pdf-page="4" style={{ padding: '12mm 14mm' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '900', margin: '0 0 5mm 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Performance Summary
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6mm' }}>
              <div style={{ padding: '6mm', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4mm' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: '900', margin: 0, color: '#0f172a' }}>Top 5 Performing Transporters</h3>
                  <span style={{ fontSize: '8px', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: '700' }}>Benchmark</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      {['Transporter', 'Trips', 'Avg TAT', 'On-Time %'].map((head, index) => (
                        <th key={head} style={{ padding: '3.5mm 4mm', textAlign: index === 0 ? 'left' : 'center', fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0' }}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transporterPerformance.map((t, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '3.5mm 4mm', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #eef2f7' }}>{t.name}</td>
                        <td style={{ padding: '3.5mm 4mm', textAlign: 'center', borderBottom: '1px solid #eef2f7' }}>{t.trips}</td>
                        <td style={{ padding: '3.5mm 4mm', textAlign: 'center', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #eef2f7' }}>{t.tat}d</td>
                        <td style={{ padding: '3.5mm 4mm', textAlign: 'center', color: '#059669', fontWeight: '800', borderBottom: '1px solid #eef2f7' }}>{t.onTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '6mm', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4mm' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: '900', margin: 0, color: '#0f172a' }}>Top Routes by TAT</h3>
                  <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: '700' }}>Route focus</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      {['Source', 'Destination', 'Avg TAT', 'Trips'].map((head, index) => (
                        <th key={head} style={{ padding: '3.5mm 4mm', textAlign: index < 2 ? 'left' : 'center', fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0' }}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {routeData.map((r, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '3.5mm 4mm', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #eef2f7' }}>{r.source}</td>
                        <td style={{ padding: '3.5mm 4mm', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #eef2f7' }}>{r.dest}</td>
                        <td style={{ padding: '3.5mm 4mm', textAlign: 'center', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #eef2f7' }}>{r.tat}d</td>
                        <td style={{ padding: '3.5mm 4mm', textAlign: 'center', fontWeight: '700', color: '#64748b', borderBottom: '1px solid #eef2f7' }}>{r.trips}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: '8mm', paddingTop: '5mm', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px', color: '#64748b' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2mm' }}>
                <img src={lynkitLogoUrl} alt="Lynkit logo" style={{ width: '6mm', height: '6mm', borderRadius: '2mm', objectFit: 'cover' }} crossOrigin="anonymous" />
                <span>This report is automatically generated from the centralized logistics database through Lynkit.</span>
              </span>
              <span>Data updated every 6 hours | Today: {reportDateLabel} | © 2025 Logistics Analytics Division</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Layout Enhancements */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .printable-area {
          transition: transform 0.3s ease;
        }

        /* Subtle scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
}