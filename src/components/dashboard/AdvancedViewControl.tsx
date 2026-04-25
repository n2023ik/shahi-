/**
 * ADVANCED VIEW CONTROL - LOGISTICS & FLEET MANAGEMENT DASHBOARD
 * Real-time data from Google Sheets via authenticated backend (No CORS issues!)
 * 
 * Features:
 * - Fetch data using Google Apps Script backend (sheetsApi.ts)
 * - Dynamic filtering by Origin, Destination, Transporter, Status
 * - Real-time status cards with counts
 * - Responsive design with Tailwind CSS & Lucide-React icons
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Trash2,
  MapPin,
  Archive,
  Navigation,
  RefreshCw,
  Filter,
  RotateCcw,
  AlertTriangle,  
  TrendingDown,
  X,
  XCircle,
  Pencil,
  Eye,
  Plus,
  Search,
  CalendarDays,
  Clock3,
  WifiOff,
  BarChart3,
  Play,
  Pause,
} from "lucide-react";
import { Trip, StockDeficiency, DeviceUtilization, OverallDeviceMetrics, PickupStatusMetrics } from "@/lib/types";
import { fetchTrips, fetchStockDeficiency, createTrip as apiCreateTrip, updateTrip as apiUpdateTrip, deleteTrip as apiDeleteTrip } from "@/lib/sheetsApi";
import TripFormModal from "@/components/dashboard/TripFormModal";
import TripDetailModal from "@/components/dashboard/TripDetailModal";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { getUserEmail } from "@/lib/auth";
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

// Add this helper function at the top (after imports)
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

function getDisplayNameFromEmail(email: string): string {
  if (!email || email === "Unknown User") return "User";
  const localPart = email.split("@")[0] || "User";
  const displayName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return displayName || "User";
}

function calculatePickupDelay(pickupRaisedOn?: string, actualPickupDate?: string): number | null {
  if (!pickupRaisedOn) return null;
  const raised = parseDate(pickupRaisedOn);
  if (!raised) return null;

  const actual = actualPickupDate ? parseDate(actualPickupDate) : null;
  const compareDate = actual || new Date();
  if (!compareDate) return null;

  const diffMs = compareDate.getTime() - raised.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function calculatePickupTatDays(pickupRaisedOn?: string, actualPickupDate?: string): number | null {
  const raised = parseDate(pickupRaisedOn);
  const actual = parseDate(actualPickupDate);
  if (!raised || !actual) return null;

  const diffMs = actual.getTime() - raised.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function calculateCreationToDeliveredTatDays(tripCreationDate?: string, deliveredDate?: string): number | null {
  const created = parseDate(tripCreationDate);
  const delivered = parseDate(deliveredDate);
  if (!created || !delivered) return null;

  const diffMs = delivered.getTime() - created.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function calculateCompletionToDeliveredTatDays(tripCompletionDate?: string, deliveredDate?: string): number | null {
  const completed = parseDate(tripCompletionDate);
  const delivered = parseDate(deliveredDate);
  if (!completed || !delivered) return null;

  const diffMs = delivered.getTime() - completed.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function calculatePickupRaisedToDeliveredTatDays(pickupRaisedOn?: string, deliveredDate?: string): number | null {
  const raised = parseDate(pickupRaisedOn);
  const delivered = parseDate(deliveredDate);
  if (!raised || !delivered) return null;

  const diffMs = delivered.getTime() - raised.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FilterState {
  origin: string;
  destination: string;
  transporter: string;
  mode: string;
  status: string;
  tripCreationDate: string;
  tripCreationDateFrom: string;
  tripCreationDateTo: string;
}

interface DashboardMetrics {
  totalTrips: number;
  tripsOnSelectedDate: number;
  deliveredTripsTotal: number;
  avgPickupTatDays: number;
  pickupTatMeasuredTrips: number;
  pickupTatTotalDays: number;
  avgPickupRaisedToDeliveredTatDays: number;
  pickupRaisedToDeliveredTatMeasuredTrips: number;
  pickupRaisedToDeliveredTatGte4Trips: number;
  missingCreationTatRecords: number;
  missingCompletionTatRecords: number;
  avgCreationToDeliveredTatDays: number;
  creationTatMeasuredTrips: number;
  avgCompletionToDeliveredTatDays: number;
  completionTatMeasuredTrips: number;
  completed: number;
  inTransit: number;
  pickupDelay: number;
  delivered: number;
  pending: number;
  awaitingDeparture: number;
  pickupRaisedInternally: number;
  pickupCompleted: number;
  offline: number;
  tripCancel: number;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void | Promise<void>) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionLikeConstructor = new () => SpeechRecognitionLike;

interface StatusCardProps {
  title: string;
  value: number | string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  compareIcon?: React.ComponentType<{ className?: string }>;
  specialIcon?: React.ReactNode;
  specialIconBg?: string;
  cardClassName?: string;
  titleClassName?: string;
  valueClassName?: string;
  showTruckArt?: boolean;
  truckImageSrc?: string;
  truckImageClassName?: string;
  footerText?: React.ReactNode;
}

function StatusCard({
  title,
  value,
  onClick,
  icon: Icon,
  compareIcon: CompareIcon,
  specialIcon,
  specialIconBg,
  cardClassName,
  titleClassName,
  valueClassName,
  showTruckArt,
  truckImageSrc,
  truckImageClassName,
  footerText,
}: StatusCardProps) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl min-h-[112px] p-4 xl:p-5 text-left transition-colors duration-200 border border-slate-700/55 shadow-[0_10px_26px_rgba(0,0,0,0.4)] sm:min-h-[128px] 2xl:border-slate-600/60 2xl:ring-1 2xl:ring-white/10 2xl:shadow-[0_10px_30px_rgba(0,0,0,0.45)] ${cardClassName || ""}`}
    >
      {showTruckArt && (
        <div className="pointer-events-none absolute -bottom-7 right-2 opacity-30">
          <Truck className="h-20 w-20 text-white" />
        </div>
      )}
      {truckImageSrc && (
        <>
          <img
            src={truckImageSrc}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className={`pointer-events-none absolute select-none object-contain opacity-20 transition-opacity duration-300 sm:opacity-30 [mask-image:radial-gradient(ellipse_at_right_bottom,black_60%,transparent_100%)] ${truckImageClassName || ""}`}
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[40%] bg-gradient-to-l from-black/30 to-transparent sm:w-[55%]" />
        </>
      )}
      <p
        className={`text-xs md:text-sm xl:text-[15px] 2xl:text-lg font-bold uppercase tracking-[0.08em] leading-tight ${titleClassName || "text-slate-200"}`}
      >
        {title}
      </p>
      <div className="relative z-10 mt-3 flex items-end justify-between">
        <div className={truckImageSrc ? "max-w-[64%] sm:max-w-[62%]" : "max-w-[74%]"}>
          <p
            className={`text-[2rem] md:text-4xl xl:text-5xl 2xl:text-6xl font-extrabold leading-none tracking-tight text-white ${valueClassName || ""}`}
          >
            {value}
          </p>
          {footerText && (
            <p className="mt-1 text-xs md:text-sm xl:text-[13px] font-medium leading-snug text-slate-100/90">
              {footerText}
            </p>
          )}
        </div>
        {(specialIcon || Icon) && (
          <div className="relative">
            <div className={`rounded-xl p-2.5 shadow-lg 2xl:shadow-[0_10px_25px_rgba(0,0,0,0.45)] ${specialIconBg || "bg-white/10 ring-1 ring-white/15"}`}>
              {specialIcon || (Icon ? <Icon className="h-5 w-5 text-white" /> : null)}
            </div>
            {CompareIcon && (
              <div className="absolute -bottom-1 -right-1 rounded-full border border-slate-700 bg-slate-900 p-0.5">
                <CompareIcon className="h-3 w-3 text-red-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdvancedViewControl() {
  type TatBasis = "creation" | "completion" | "pickupActualVsRaised" | "pickupRaisedToDelivered";

  // State Management
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stockDeficiency, setStockDeficiency] = useState<StockDeficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [selectedStatusModal, setSelectedStatusModal] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deviceMetrics, setDeviceMetrics] = useState<OverallDeviceMetrics | null>(null);
  
  // CRUD State
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const { toast } = useToast();

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    origin: "All",
    destination: "All",
    transporter: "All",
    mode: "All",
    status: "All",
    tripCreationDate: "All",
    tripCreationDateFrom: "",
    tripCreationDateTo: "",
  });
  
  // Modal Filter State
  const [modalSearch, setModalSearch] = useState<string>("");
  const [modalDelayFilter, setModalDelayFilter] = useState<string>("all");
  const [modalDelayMin, setModalDelayMin] = useState<string>("");
  const [modalDelayMax, setModalDelayMax] = useState<string>("");
  const [modalTatBasis, setModalTatBasis] = useState<TatBasis>("creation");
  const [modalTatFilter, setModalTatFilter] = useState<string>("all");
  const [modalTatMin, setModalTatMin] = useState<string>("");
  const [modalTatMax, setModalTatMax] = useState<string>("");

  // Auto-refresh state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // seconds
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  // Audio/Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [speechRate, setSpeechRate] = useState<number>(0.85);
  const [daazyLoading, setDaazyLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [handsFreeMode, setHandsFreeMode] = useState<boolean>(true);
  const [assistantAwake, setAssistantAwake] = useState<boolean>(false);
  const [assistantStatus, setAssistantStatus] = useState<string>("Ready");
  const [lastHeardText, setLastHeardText] = useState<string>("");
  const [lastAssistantResponse, setLastAssistantResponse] = useState<string>("Waiting for wake word: Hey Dazzy");
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState<boolean>(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const handsFreeModeRef = useRef<boolean>(true);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const shouldResumeRecognitionAfterSpeechRef = useRef<boolean>(false);
  const assistantAwakeRef = useRef<boolean>(false);
  const processDaazyQueryRef = useRef<(rawQuery: string) => Promise<string>>(async () => "");
  const speakDaazyResponseRef = useRef<(message: string) => void>(() => {});
  const respondDaazyRef = useRef<(message: string) => void>(() => {});
  const recognitionStartedRef = useRef<boolean>(false);
  const assistantReadyToastShownRef = useRef<boolean>(false);
  const wakeCommandWindowTimerRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const userEmail = useMemo(() => getUserEmail(), []);
  const assistantUserName = useMemo(() => getDisplayNameFromEmail(userEmail), [userEmail]);

  // Initialize voices on component mount
  useEffect(() => {
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        
        // Prioritize female English voices (polite & professional)
        const femaleVoices = ["Zira", "Victoria", "Samantha", "Moira", "Karen", "Female", "woman"];
        const preferredVoice = voices.findIndex((v) => {
          const isEnglish = v.lang.startsWith("en");
          const isFemale = femaleVoices.some((name) =>
            v.name.toLowerCase().includes(name.toLowerCase())
          );
          return isEnglish && isFemale;
        });

        if (preferredVoice >= 0) {
          setSelectedVoiceIndex(preferredVoice);
        } else {
          // Fallback: just use first English voice
          const englishVoice = voices.findIndex((v) => v.lang.startsWith("en"));
          setSelectedVoiceIndex(englishVoice >= 0 ? englishVoice : 0);
        }
      }
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.cancel();
    };
  }, []);

  // =========================================================================
  // LOAD DATA FROM GOOGLE SHEETS (via sheetsApi.ts - uses Google Apps Script)
  // =========================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch trips (critical) and stock data (optional) in parallel
      const [tripsData, stockDataResult] = await Promise.allSettled([
        fetchTrips(),
        fetchStockDeficiency()
      ]);

      // Handle trips data (critical)
      if (tripsData.status === 'fulfilled' && tripsData.value && tripsData.value.length > 0) {
        setTrips(tripsData.value);
        console.log(`✓ Loaded ${tripsData.value.length} trips from Google Sheets`);
      } else if (tripsData.status === 'rejected') {
        throw tripsData.reason;
      } else {
        setError("No trip data found in Google Sheets");
        setTrips([]);
      }

      // Handle stock data (non-critical)
      if (stockDataResult.status === 'fulfilled' && stockDataResult.value && stockDataResult.value.length > 0) {
        setStockDeficiency(stockDataResult.value);
        console.log(`✓ Loaded stock data for ${stockDataResult.value.length} locations`);
      } else if (stockDataResult.status === 'rejected') {
        const stockError = stockDataResult.reason instanceof Error 
          ? stockDataResult.reason.message 
          : 'Unknown error';
        console.warn(`⚠️ Stock data unavailable: ${stockError}`);
        // Don't fail completely, just show a warning if trips loaded successfully
        if (tripsData.status === 'fulfilled' && !error) {
          setError(`Stock data unavailable: ${stockError}`);
        }
      }

      setLastFetchTime(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Failed to load data: ${errorMessage}`);
      console.error("Data fetch error:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================================
  // LOAD DATA ON COMPONENT MOUNT
  // =========================================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =========================================================================
  // DERIVED DATA: UNIQUE FILTER OPTIONS
  // =========================================================================

  const uniqueOrigins = useMemo(() => {
    const origins = new Set(
      trips
        .map((t) => t.sourceAddress)
        .filter((s) => s && s.trim())
    );
    return ["All", ...Array.from(origins).sort()];
  }, [trips]);

  const uniqueDestinations = useMemo(() => {
    const destinations = new Set(
      trips
        .map((t) => t.destinationAddress)
        .filter((d) => d && d.trim())
    );
    return ["All", ...Array.from(destinations).sort()];
  }, [trips]);

  const uniqueTransporters = useMemo(() => {
    const transporters = new Set(
      trips
        .map((t) => t.transporterName)
        .filter((t) => t && t.trim())
    );
    return ["All", ...Array.from(transporters).sort()];
  }, [trips]);

  const uniqueModes = useMemo(() => {
    const modes = new Set(
      trips
        .map((t) => t.mode)
        .filter((m) => m && m.trim())
    );
    return ["All", ...Array.from(modes).sort()];
  }, [trips]);

  const quickModeFilters = useMemo(() => {
    const byUpperMode = new Map(
      uniqueModes
        .filter((mode) => mode !== "All")
        .map((mode) => [mode.trim().toUpperCase(), mode])
    );

    return ["LSD", "KNITS","MNB"]
      .filter((mode) => byUpperMode.has(mode))
      .map((mode) => ({ label: mode, value: byUpperMode.get(mode)! }));
  }, [uniqueModes]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(
      trips
        .map((t) => t.tripStatus)
        .filter((s) => s && s.trim())
    );
    return ["All", ...Array.from(statuses).sort()];
  }, [trips]);

  const formatDateKey = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const formatDateLabel = useCallback((dateKey: string): string => {
    const [year, month, day] = dateKey.split("-");
    if (!year || !month || !day) return dateKey;
    return `${day}/${month}/${year}`;
  }, []);

  const uniqueTripCreationDates = useMemo(() => {
    const dates = new Set<string>();
    trips.forEach((trip) => {
      const parsedDate = parseDate(trip.tripCompletionDate);
      if (!parsedDate) return;
      dates.add(formatDateKey(parsedDate));
    });

    return ["All", ...Array.from(dates).sort((a, b) => b.localeCompare(a))];
  }, [trips, formatDateKey]);

  // =========================================================================
  // CRUD HANDLERS
  // =========================================================================

  const handleNewTrip = useCallback(() => {
    setEditingTrip(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((trip: Trip) => {
    setEditingTrip(trip);
    setFormOpen(true);
  }, []);

  const handleView = useCallback((trip: Trip) => {
    setViewTrip(trip);
  }, []);

  const handleDeleteClick = useCallback((trip: Trip) => {
    setTripToDelete(trip);
    setDeleteConfirmOpen(true);
  }, []);

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
      
      // Call API to delete from Google Sheets
      await apiDeleteTrip(tripId);
      
      toast({ 
        title: "Trip deleted successfully", 
        description: `${tripId} has been permanently removed.`,
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
      console.error("Delete API error:", error);
      
      // Revert on error
      const data = await fetchTrips();
      setTrips(data);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({ 
        title: "Delete failed", 
        description: `Could not delete ${tripId}. ${errorMessage}`,
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

  // =========================================================================
  // FILTER LOGIC
  // =========================================================================

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const originMatch =
        filters.origin === "All" ||
        trip.sourceAddress === filters.origin;
      const destMatch =
        filters.destination === "All" ||
        trip.destinationAddress === filters.destination;
      const transporterMatch =
        filters.transporter === "All" ||
        trip.transporterName === filters.transporter;
      const modeMatch =
        filters.mode === "All" ||
        (trip.mode || "") === filters.mode;
      const statusMatch =
        filters.status === "All" || trip.tripStatus === filters.status;

      const tripDate = parseDate(trip.tripCompletionDate);
      const tripDateKey = tripDate ? formatDateKey(tripDate) : null;
      const tripCreationDateMatch =
        filters.tripCreationDate === "All" ||
        (tripDateKey !== null && tripDateKey === filters.tripCreationDate);
      const tripCreationDateFromMatch =
        !filters.tripCreationDateFrom ||
        (tripDateKey !== null && tripDateKey >= filters.tripCreationDateFrom);
      const tripCreationDateToMatch =
        !filters.tripCreationDateTo ||
        (tripDateKey !== null && tripDateKey <= filters.tripCreationDateTo);

      return (
        originMatch &&
        destMatch &&
        transporterMatch &&
        modeMatch &&
        statusMatch &&
        tripCreationDateMatch &&
        tripCreationDateFromMatch &&
        tripCreationDateToMatch
      );
    });
  }, [trips, filters, formatDateKey]);

  // =========================================================================
  // CALCULATE METRICS FROM FILTERED DATA
  // =========================================================================

  const calculateMetrics = useMemo((): DashboardMetrics => {      
    const metrics: DashboardMetrics = {
      totalTrips: filteredTrips.length,
      tripsOnSelectedDate: filteredTrips.length,
      deliveredTripsTotal: 0,
      avgPickupTatDays: 0,
      pickupTatMeasuredTrips: 0,
      pickupTatTotalDays: 0,
      avgPickupRaisedToDeliveredTatDays: 0,
      pickupRaisedToDeliveredTatMeasuredTrips: 0,
      pickupRaisedToDeliveredTatGte4Trips: 0,
      missingCreationTatRecords: 0,
      missingCompletionTatRecords: 0,
      avgCreationToDeliveredTatDays: 0,
      creationTatMeasuredTrips: 0,
      avgCompletionToDeliveredTatDays: 0,
      completionTatMeasuredTrips: 0,
      completed: 0,
      inTransit: 0,
      pickupDelay: 0,
      delivered: 0,
      pending: 0,
      awaitingDeparture: 0,
      pickupRaisedInternally: 0,
      pickupCompleted: 0,
      offline: 0,
      tripCancel: 0,
    };

    let creationTatTotalDays = 0;
    let creationTatCount = 0;
    let completionTatTotalDays = 0;
    let completionTatCount = 0;
    let pickupTatTotalDays = 0;
    let pickupTatCount = 0;
    let pickupRaisedToDeliveredTatTotalDays = 0;
    let pickupRaisedToDeliveredTatCount = 0;

    filteredTrips.forEach((trip) => {
      const statusLower = trip.tripStatus?.toLowerCase().trim() || "";
      const packetLower = trip.packetStatus?.toLowerCase().trim() || ""; 

      if (packetLower.includes("delivered")) {
        metrics.deliveredTripsTotal++;
      }

      const creationTatDays = calculateCreationToDeliveredTatDays(trip.tripCreationDate, trip.deliveredDate);
      if (creationTatDays !== null) {
        creationTatTotalDays += creationTatDays;
        creationTatCount++;
      }

      const completionTatDays = calculateCompletionToDeliveredTatDays(trip.tripCompletionDate, trip.deliveredDate);
      if (completionTatDays !== null) {
        completionTatTotalDays += completionTatDays;
        completionTatCount++;
      }

      const pickupTatDays = calculatePickupTatDays(trip.pickupRaisedOn, trip.actualPickupDate);
      if (pickupTatDays !== null) {
        pickupTatTotalDays += pickupTatDays;
        pickupTatCount++;
      }

      const pickupRaisedToDeliveredTatDays = calculatePickupRaisedToDeliveredTatDays(trip.pickupRaisedOn, trip.deliveredDate);
      if (pickupRaisedToDeliveredTatDays !== null) {
        pickupRaisedToDeliveredTatTotalDays += pickupRaisedToDeliveredTatDays;
        pickupRaisedToDeliveredTatCount++;
        if (pickupRaisedToDeliveredTatDays >= 4) {
          metrics.pickupRaisedToDeliveredTatGte4Trips++;
        }
      }

      // ✅ Count completed trips FIRST (before validation) 
      if (statusLower.includes("completed") && !statusLower.includes("not")) {
        metrics.completed++;
      }

      // ✅ STRICT CHECK: For other metrics, trip mein actual data hona chahiye
      // Agar Trip ID nahi hai = empty row = skip karo for other counts
      if (!trip.tripId || trip.tripId === "-" || trip.tripId.trim() === "") {
        return; // Skip empty rows
      }

      if (!trip.tripCreationDate || trip.tripCreationDate === "-" || trip.tripCreationDate.trim() === "") {
        return; // Skip agar Trip Creation Date empty hai
      }

      // Count statuses
      if (statusLower.includes("offline")) metrics.offline++;
      else if (statusLower.includes("transit")) metrics.inTransit++;
      else if (statusLower.includes("awaiting")) metrics.awaitingDeparture++;
      else if (statusLower.includes("cancel")) metrics.tripCancel++;

      if (packetLower.includes("delivered")) metrics.delivered++; 
      else if (packetLower.includes("pending") || packetLower === "pending confirmation") metrics.pending++;

      // Pickup Delay
      const delayDays = calculatePickupDelay(trip.pickupRaisedOn, trip.actualPickupDate);
      if (delayDays !== null && delayDays > 3) {
        metrics.pickupDelay++;
      }

      // Pickup Raised count should follow packet status, not date field presence.
      if (packetLower === "pickup raised") {
        metrics.pickupRaisedInternally++;
      }

      // Pickup Completed count should follow packet status, not date field presence.
      if (packetLower === "pickup done" || packetLower === "pickup completed") {
        metrics.pickupCompleted++;
      }
    });

    metrics.creationTatMeasuredTrips = creationTatCount;
    metrics.avgCreationToDeliveredTatDays = creationTatCount > 0
      ? Number((creationTatTotalDays / creationTatCount).toFixed(1))
      : 0;

    metrics.completionTatMeasuredTrips = completionTatCount;
    metrics.avgCompletionToDeliveredTatDays = completionTatCount > 0
      ? Number((completionTatTotalDays / completionTatCount).toFixed(1))
      : 0;

    metrics.pickupTatMeasuredTrips = pickupTatCount;
    metrics.pickupTatTotalDays = pickupTatTotalDays;
    metrics.avgPickupTatDays = pickupTatCount > 0
      ? Number((pickupTatTotalDays / pickupTatCount).toFixed(1))
      : 0;

    metrics.pickupRaisedToDeliveredTatMeasuredTrips = pickupRaisedToDeliveredTatCount;
    metrics.avgPickupRaisedToDeliveredTatDays = pickupRaisedToDeliveredTatCount > 0
      ? Number((pickupRaisedToDeliveredTatTotalDays / pickupRaisedToDeliveredTatCount).toFixed(1))
      : 0;

    metrics.missingCreationTatRecords = Math.max(
      0,
      metrics.deliveredTripsTotal - metrics.creationTatMeasuredTrips
    );
    metrics.missingCompletionTatRecords = Math.max(
      0,
      metrics.deliveredTripsTotal - metrics.completionTatMeasuredTrips
    );

    return metrics;
  }, [filteredTrips]);

  // =========================================================================
  // CALCULATE ASSET TRACKER UTILIZATION METRICS (Overall & Source-wise)
  // =========================================================================

  const calculateDeviceMetrics = useMemo((): OverallDeviceMetrics => {
    // Use asset trackers in use and available directly from Google Sheets (stockDeficiency data)
    // No need to calculate from trips - the sheets already have accurate "asset tracker in use" and "asset tracker available" fields
    
    const sourceBreakdown: DeviceUtilization[] = stockDeficiency.map((stock) => {
      const devicesInUse = stock.devicesInUse || 0;
      const devicesAvailable = stock.availableDevices || 0;
      const totalDevices = stock.maxCapacity || (devicesInUse + devicesAvailable);
      
      // Utilization = (asset trackers in use / total asset trackers) * 100
      const utilizationPercentage = totalDevices > 0
        ? (devicesInUse / totalDevices) * 100
        : 0;

      return {
        source: stock.source,
        devicesInUse,
        devicesAvailable,
        totalDevices,
        utilizationPercentage,
        isHighUtilization: utilizationPercentage >= 80, // Red alert threshold
      };
    });

    // Sort by utilization percentage (highest first)
    sourceBreakdown.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

    // Calculate overall metrics
    const totalDevicesInUse = sourceBreakdown.reduce((sum, s) => sum + s.devicesInUse, 0);
    const totalDevicesAvailable = sourceBreakdown.reduce((sum, s) => sum + s.devicesAvailable, 0);
    const totalDevices = sourceBreakdown.reduce((sum, s) => sum + s.totalDevices, 0);
    const overallUtilization = totalDevices > 0
      ? (totalDevicesInUse / totalDevices) * 100
      : 0;

    return {
      totalDevicesInUse,
      totalDevicesAvailable,
      totalDevices,
      overallUtilization,
      sourceBreakdown,
    };
  }, [stockDeficiency]);

  // =========================================================================
  // CALCULATE SOURCE-WISE PICKUP STATUS METRICS
  // =========================================================================

  const calculatePickupStatusMetrics = useMemo((): PickupStatusMetrics => {
    const sourceMap = new Map<string, { pickupRaised: number; pickupDone: number }>();
    let pickupDoneDeliveryPendingAfter4Days = 0;
    
    // Debug: Log first few trips and their packet statuses
    if (filteredTrips.length > 0) {
      console.log(`[calculatePickupStatusMetrics] Processing ${filteredTrips.length} filtered trips`);
      filteredTrips.slice(0, 5).forEach((trip, idx) => {
        console.log(`[Trip ${idx}] ID: ${trip.tripId}, packetStatus: "${trip.packetStatus}", destination: "${trip.destinationAddress}"`);
      });
    }

    filteredTrips.forEach((trip) => {
      // Get source (using destinationAddress as per Google Sheets column G)
      const source = trip.destinationAddress || "Unknown";
      
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { pickupRaised: 0, pickupDone: 0 });
      }

      const metrics = sourceMap.get(source)!;

      // Check Packet Status for "Pickup Raised" or "Pickup Done" (case-insensitive, trim whitespace)
      const status = trip.packetStatus?.toLowerCase().trim() || "";
      
      if (status === "pickup raised") {
        metrics.pickupRaised++;
      }

      if (status === "pickup done") {
        metrics.pickupDone++;

        // Calendar-based aging for pickup-done trips where delivery is still pending.
        const isDeliveryPending = !String(trip.deliveredDate || "").trim();
        const pickupDoneDate = parseDate(trip.actualPickupDate);
        if (isDeliveryPending && pickupDoneDate) {
          const now = new Date();
          const ageInDays = Math.floor((now.getTime() - pickupDoneDate.getTime()) / (1000 * 60 * 60 * 24));
          if (ageInDays > 4) {
            pickupDoneDeliveryPendingAfter4Days++;
          }
        }
      }
    });

    // Convert map to array and sort by total trips
    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([source, metrics]) => ({
        source,
        pickupRaised: metrics.pickupRaised,
        pickupDone: metrics.pickupDone,
        total: metrics.pickupRaised + metrics.pickupDone,
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate totals
    const totalPickupRaised = sourceBreakdown.reduce((sum, s) => sum + s.pickupRaised, 0);
    const totalPickupDone = sourceBreakdown.reduce((sum, s) => sum + s.pickupDone, 0);

    console.log(`[calculatePickupStatusMetrics] Source Breakdown:`, sourceBreakdown);
    console.log(`[calculatePickupStatusMetrics] Totals - Raised: ${totalPickupRaised}, Done: ${totalPickupDone}`);
    console.log(`[calculatePickupStatusMetrics] Pickup completed, delivery pending after 4 days: ${pickupDoneDeliveryPendingAfter4Days}`);

    return {
      sourceBreakdown,
      totalPickupRaised,
      totalPickupDone,
      pickupDoneDeliveryPendingAfter4Days,
    };
  }, [filteredTrips]);

  // =========================================================================
  // AUTO-REFRESH EFFECT
  // =========================================================================

  // =========================================================================
  // AUTO-REFRESH EFFECT
  // =========================================================================

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadData();
    }, autoRefreshInterval * 1000); // Convert seconds to milliseconds

    return () => clearInterval(interval); // Cleanup on unmount or interval change
  }, [autoRefreshEnabled, autoRefreshInterval, loadData]);

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuickModeToggle = useCallback((mode: string) => {
    setFilters((prev) => ({
      ...prev,
      mode: prev.mode === mode ? "All" : mode,
    }));
  }, []);

  const handleResetFilters = () => {
    setFilters({
      origin: "All",
      destination: "All",
      transporter: "All",
      mode: "All",
      status: "All",
      tripCreationDate: "All",
      tripCreationDateFrom: "",
      tripCreationDateTo: "",
    });
  };

  // =========================================================================
  // TEXT-TO-SPEECH / AUDIO PLAYBACK
  // =========================================================================

  const generateNarration = useCallback((): string => {
    const metrics = calculateMetrics;
    
    const parts: string[] = [];
    
    // Greeting
    parts.push("Hello. Here is your shipment dashboard summary.");
    
    // Add selected date info if filtered
    if (filters.tripCreationDate !== "All" || filters.tripCreationDateFrom || filters.tripCreationDateTo) {
      parts.push(`Please note, in the selected date filter, we have ${metrics.tripsOnSelectedDate} trips.`);
    }
    
    // Average metrics with polite language
    parts.push(`Thank you for reviewing. The average trip turnaround time from creation to delivery is ${metrics.avgCreationToDeliveredTatDays} days, based on ${metrics.creationTatMeasuredTrips} of ${metrics.deliveredTripsTotal} delivered trips.`);
    parts.push(`The average trip turnaround time from completion to delivery is ${metrics.avgCompletionToDeliveredTatDays} days, based on ${metrics.completionTatMeasuredTrips} deliveries.`);
    parts.push(`The average pickup turnaround time is ${metrics.avgPickupTatDays} days, totaling ${metrics.pickupTatTotalDays} days across ${metrics.pickupTatMeasuredTrips} trips.`);
    parts.push(`The average pickup to delivery turnaround time is ${metrics.avgPickupRaisedToDeliveredTatDays} days, with ${metrics.pickupRaisedToDeliveredTatGte4Trips} trips having a turnaround time of 4 days or more.`);
    
    // Status counts with polite introduction
    parts.push(`Let me share the current status. Total trips: ${metrics.totalTrips}.`);
    parts.push(`Trips in transit: ${metrics.inTransit}.`);
    parts.push(`Completed trips: ${metrics.completed}.`);
    parts.push(`Trips awaiting departure: ${metrics.awaitingDeparture}.`);
    parts.push(`Delivered shipments: ${metrics.delivered}.`);
    parts.push(`Pending confirmation: ${metrics.pending}.`);
    parts.push(`Pickup delays: ${metrics.pickupDelay}.`);
    parts.push(`Offline vehicles: ${metrics.offline}.`);
    parts.push(`Cancelled trips: ${metrics.tripCancel}.`);
    
    // Pickup metrics
    parts.push(`Total pickup raised: ${metrics.pickupRaisedInternally}.`);
    parts.push(`Total pickups completed: ${metrics.pickupCompleted}.`);
    
    // Polite closing
    parts.push(`Thank you for using the shipment dashboard. Please feel free to review the details on screen. Have a great day!`);
    
    return parts.join(" ");
  }, [calculateMetrics, filters]);

  const handlePlayPause = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }

    const synth = synthRef.current;

    if (isPlaying) {
      // Stop the speech
      synth.cancel();
      setIsPlaying(false);
    } else {
      // Cancel any existing utterance
      synth.cancel();

      // Create new utterance
      const narration = generateNarration();
      const utterance = new SpeechSynthesisUtterance(narration);
      
      // Enhanced voice quality settings
      utterance.rate = speechRate; // Slower rate (0.85) for clarity and natural speech
      utterance.pitch = 1.0; // Normal pitch for professional sound
      utterance.volume = 1; // Max volume for clear output
      
      // Select best available voice
      if (availableVoices.length > 0) {
        utterance.voice = availableVoices[selectedVoiceIndex] || availableVoices[0];
      }
      
      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    }
  }, [isPlaying, generateNarration, selectedVoiceIndex, speechRate, availableVoices]);

  const handleRefresh = () => {
    loadData();
  };

  const speakDaazyResponse = useCallback((message: string) => {
    if (!message) return;
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }

    const synth = synthRef.current;

    if (!synth) {
      toast({
        title: "Daazy Voice Unavailable",
        description: "Speech engine is not available in this browser.",
      });
      return;
    }

    // Avoid recognition/synthesis collision: pause listening while speaking.
    if (handsFreeModeRef.current && recognitionRef.current && (recognitionStartedRef.current || isListeningRef.current)) {
      shouldResumeRecognitionAfterSpeechRef.current = true;
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop race conditions.
      }
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1;

    if (availableVoices.length > 0) {
      utterance.voice = availableVoices[selectedVoiceIndex] || availableVoices[0];
    }

    utterance.onstart = () => {
      isSpeakingRef.current = true;
    };

    const resumeRecognitionIfNeeded = () => {
      isSpeakingRef.current = false;
      if (!handsFreeModeRef.current) return;
      if (!shouldResumeRecognitionAfterSpeechRef.current) return;
      shouldResumeRecognitionAfterSpeechRef.current = false;

      if (recognitionRef.current && !recognitionStartedRef.current && !isListeningRef.current) {
        window.setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            // Ignore start race conditions.
          }
        }, 250);
      }
    };

    utterance.onend = resumeRecognitionIfNeeded;
    utterance.onerror = resumeRecognitionIfNeeded;

    utteranceRef.current = utterance;
    synth.resume();
    synth.speak(utterance);
  }, [availableVoices, selectedVoiceIndex, toast]);

  const respondDaazy = useCallback((message: string) => {
    setLastAssistantResponse(message);
    const compactMessage = message.replace(/\n+/g, " | ").slice(0, 240);
    toast({
      title: "Daazy",
      description: compactMessage,
    });
    speakDaazyResponse(message);
  }, [speakDaazyResponse, toast]);

  const processDaazyQuery = useCallback(async (rawQuery: string): Promise<string> => {
    const query = rawQuery.trim();
    if (!query) {
      return "Please say or type a command. Example: total trips";
    }

    const normalizedFull = query.toLowerCase();
    const cleanVoiceText = (text: string) =>
      text
        .toLowerCase()
        .replace(/[.,!?;:]/g, " ")
        .replace(/\b(?:nikhil|pandey|please|plz|mujhe|batao|bata|tell\s+me)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const cleaned = cleanVoiceText(normalizedFull);
    const hasWakeAlias = /\b(daazy|dazzy|daisy|desi|desy|daz|dazy|dezi|dizzy)\b/.test(normalizedFull);
    const hasKnownCommand = /\b(help|command|update|refresh|reload|trip|status|source|total|transit|completed|delivered|pending|delay|missing|tat|pickup|confirm|confirmation|confifamation|going|what\s+about|what\s+going\s+on|how\s+many|count)\b/.test(normalizedFull);

    const withName = (message: string) => `${assistantUserName}, ${message}`;

    if (hasWakeAlias && !hasKnownCommand) {
      return "Yes, how can I help you?";
    }

    const normalized = normalizedFull.replace(/\b(daazy|dazzy|daisy|desi|desy|daz|dazy|dezi|dizzy)\b/g, "").trim();
    const command = normalized || normalizedFull;
    const metrics = calculateMetrics;

    const performanceRate = metrics.totalTrips > 0
      ? Number(((metrics.delivered / metrics.totalTrips) * 100).toFixed(1))
      : 0;

    const intentMap: Array<{ intent: "inTransit" | "delivered" | "pending" | "performance"; keywords: string[] }> = [
      {
        intent: "inTransit",
        keywords: ["trip chal rahi", "kitni trip chal", "running trip", "in transit", "ongoing", "trips are going"],
      },
      {
        intent: "delivered",
        keywords: ["delivered", "deliver ho gaya", "delivered ho gaya", "complete ho gaya", "done", "finished"],
      },
      {
        intent: "pending",
        keywords: ["pending", "baaki", "not done", "confirmation pending", "pickup confirmation"],
      },
      {
        intent: "performance",
        keywords: ["overall performance", "performance", "success rate", "overall"],
      },
    ];

    const detectedIntent = intentMap.find((item) =>
      item.keywords.some((keyword) => cleaned.includes(keyword))
    )?.intent;

    if (detectedIntent === "inTransit") {
      return withName(`${metrics.inTransit} trips are in transit.`);
    }

    if (detectedIntent === "delivered") {
      return withName(`${metrics.delivered} trips delivered.`);
    }

    if (detectedIntent === "pending") {
      return withName(`${metrics.pending} trips pending.`);
    }

    if (detectedIntent === "performance") {
      return withName(`Overall performance is ${performanceRate} percent.`);
    }

    const wantsUpdateSummary =
      command.includes("tell me update") ||
      command.includes("update") ||
      command.includes("what going on") ||
      command.includes("what is going on") ||
      command.includes("dashboard update") ||
      command.includes("summary");

    if (wantsUpdateSummary) {
      return [
        `${assistantUserName}, update summary:`,
        `Total trips: ${metrics.totalTrips}`,
        `In transit: ${metrics.inTransit}`,
        `Delivered: ${metrics.delivered}`,
        `Pending confirmation: ${metrics.pending}`,
        `Pickup raised: ${metrics.pickupRaisedInternally}`,
        `Pickup completed: ${metrics.pickupCompleted}`,
        `Trip TAT creation: ${metrics.avgCreationToDeliveredTatDays} days`,
        `Trip TAT completion: ${metrics.avgCompletionToDeliveredTatDays} days`,
        `Pickup TAT: ${metrics.avgPickupTatDays} days`,
      ].join("\n");
    }

    if (command.includes("help") || command.includes("command")) {
      return withName("Try these: total trips, in transit, delivered, pickup delay, missing records, trip <tripId>, status <status name>, source <origin name>, update data.");
    }

    if (
      command.includes("refresh") ||
      command.includes("reload")
    ) {
      setDaazyLoading(true);
      try {
        await loadData();
        return withName("Data updated successfully. Ask for any specific metric now.");
      } catch {
        return withName("I could not refresh data right now. Please try again.");
      } finally {
        setDaazyLoading(false);
      }
    }

    const tripMatch = query.match(/trip\s+([A-Za-z0-9_\-/]+)/i);
    if (tripMatch) {
      const tripIdNeedle = tripMatch[1].trim().toLowerCase();
      const foundTrip = filteredTrips.find(
        (trip) => trip.tripId?.toLowerCase() === tripIdNeedle
      ) || trips.find((trip) => trip.tripId?.toLowerCase() === tripIdNeedle);

      if (!foundTrip) {
        return withName(`No trip found for ID: ${tripMatch[1]}`);
      }

      return [
        `Trip ${foundTrip.tripId}`,
        `Status: ${foundTrip.tripStatus || "N/A"}`,
        `Packet: ${foundTrip.packetStatus || "N/A"}`,
        `Route: ${foundTrip.sourceAddress || "N/A"} -> ${foundTrip.destinationAddress || "N/A"}`,
        `Transporter: ${foundTrip.transporterName || "N/A"}`,
      ].join("\n");
    }

    const statusMatch = query.match(/status\s+(.+)/i);
    if (statusMatch) {
      const statusNeedle = statusMatch[1].trim().toLowerCase();
      const statusTrips = filteredTrips.filter((trip) =>
        (trip.tripStatus || "").toLowerCase().includes(statusNeedle)
      );
      const previewIds = statusTrips
        .slice(0, 5)
        .map((trip) => trip.tripId)
        .filter(Boolean)
        .join(", ");

      return statusTrips.length > 0
        ? withName(`Status '${statusMatch[1]}' has ${statusTrips.length} trips.${previewIds ? ` Sample IDs: ${previewIds}` : ""}`)
        : withName(`No trips found for status: ${statusMatch[1]}`);
    }

    const sourceMatch = query.match(/source\s+(.+)/i);
    if (sourceMatch) {
      const sourceNeedle = sourceMatch[1].trim().toLowerCase();
      const sourceTrips = filteredTrips.filter((trip) =>
        (trip.sourceAddress || "").toLowerCase().includes(sourceNeedle)
      );
      return sourceTrips.length > 0
        ? withName(`Source '${sourceMatch[1]}' has ${sourceTrips.length} filtered trips.`)
        : withName(`No trips found for source: ${sourceMatch[1]}`);
    }

    if (
      command.includes("total trips") ||
      command === "total" ||
      command.includes("how many trips") ||
      command.includes("trip count")
    ) {
      return withName(`Total trips in current filters: ${metrics.totalTrips}`);
    }

    if (command.includes("in transit") || command.includes("transit") || command.includes("going")) {
      return withName(`In transit trips: ${metrics.inTransit}`);
    }

    if (command.includes("completed")) {
      return withName(`Completed trips: ${metrics.completed}`);
    }

    if (command.includes("delivered") || command.includes("what about delivered")) {
      return withName(`Delivered shipments: ${metrics.delivered}`);
    }

    if (
      command.includes("pending") ||
      command.includes("confirmation") ||
      command.includes("confirm") ||
      command.includes("confifamation")
    ) {
      return withName(`Pending confirmation shipments: ${metrics.pending}`);
    }

    if (command.includes("pickup")) {
      return withName(`Pickup status -> Raised: ${metrics.pickupRaisedInternally}, Completed: ${metrics.pickupCompleted}, Delay (>3 days): ${metrics.pickupDelay}`);
    }

    if (command.includes("tat")) {
      return withName(`TAT update -> Creation to Delivered: ${metrics.avgCreationToDeliveredTatDays} days, Completion to Delivered: ${metrics.avgCompletionToDeliveredTatDays} days, Pickup TAT: ${metrics.avgPickupTatDays} days.`);
    }

    if (command.includes("pickup delay") || command.includes("delay")) {
      return withName(`Pickup delay count (>3 days): ${metrics.pickupDelay}`);
    }

    if (command.includes("missing") || command.includes("date record")) {
      return withName(`Missing date records -> Creation: ${metrics.missingCreationTatRecords}, Completion: ${metrics.missingCompletionTatRecords}`);
    }

    return withName("Command not recognized. Try saying: tell me update, what about delivered, pickup confirmation, or tat update.");
  }, [assistantUserName, calculateMetrics, filteredTrips, trips, loadData]);

  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    assistantAwakeRef.current = assistantAwake;
  }, [assistantAwake]);

  useEffect(() => {
    processDaazyQueryRef.current = processDaazyQuery;
  }, [processDaazyQuery]);

  useEffect(() => {
    speakDaazyResponseRef.current = speakDaazyResponse;
  }, [speakDaazyResponse]);

  useEffect(() => {
    respondDaazyRef.current = respondDaazy;
  }, [respondDaazy]);

  useEffect(() => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionLikeConstructor;
      webkitSpeechRecognition?: SpeechRecognitionLikeConstructor;
    };

    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSpeechRecognitionSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const wakeRegex = /\b(?:hey\s+)?(?:daazy|dazzy|daisy|daizy|dazy|dazee|dayzee|dezi|daz|dassy|dizzy|desi|desy)\b/i;
    const directCommandRegex = /\b(?:help|command|update|refresh|reload|trip|status|source|total|transit|completed|delivered|pending|delay|missing|tat|pickup|confirm|confirmation|confifamation|going|how many|count|summary)\b/i;

    recognition.onstart = () => {
      setIsListening(true);
      setAssistantStatus((prev) => (prev === "Activated" || prev === "Processing" ? prev : "Ready"));
      isListeningRef.current = true;
      recognitionStartedRef.current = true;
      if (!assistantReadyToastShownRef.current) {
        assistantReadyToastShownRef.current = true;
        toast({
          title: "Daazy Background Voice On",
          description: "Say 'Hey Daazy' and then ask your question.",
        });
      }
    };

    recognition.onresult = async (event: SpeechRecognitionResultEventLike) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result.isFinal) continue;

        const transcript = result[0]?.transcript?.trim() || "";
        if (!transcript) continue;
        setLastHeardText(transcript);

        if (!handsFreeModeRef.current) {
          setAssistantStatus("Processing");
          const response = await processDaazyQueryRef.current(transcript);
          respondDaazyRef.current(response);
          setAssistantStatus("Answered");
          continue;
        }

        const wakeMatched = wakeRegex.test(transcript.toLowerCase());
        const commandAfterWake = transcript.replace(/^.*\b(?:daazy|dazzy|daisy|daizy|dazy|dazee|dayzee|dezi|daz|dassy|dizzy|desi|desy)\b/i, "").trim();

        if (!assistantAwakeRef.current) {
          if (!wakeMatched) {
            continue;
          }

          // Strict wake flow: wake phrase only activates assistant.
          // Command is always handled from the NEXT user utterance.
          assistantAwakeRef.current = true;
          setAssistantAwake(true);
          setAssistantStatus("Activated");
          respondDaazyRef.current("Yes, how can I help you?");

          // If user says wake + command in same utterance, handle immediately.
          if (commandAfterWake && directCommandRegex.test(commandAfterWake.toLowerCase())) {
            setAssistantStatus("Processing");
            const response = await processDaazyQueryRef.current(commandAfterWake);
            respondDaazyRef.current(response);
            setAssistantStatus("Answered");
            assistantAwakeRef.current = false;
            setAssistantAwake(false);
            if (wakeCommandWindowTimerRef.current) {
              window.clearTimeout(wakeCommandWindowTimerRef.current);
              wakeCommandWindowTimerRef.current = null;
            }
            continue;
          }

          // Keep activation window for next utterance, then auto-reset.
          if (wakeCommandWindowTimerRef.current) {
            window.clearTimeout(wakeCommandWindowTimerRef.current);
          }
          wakeCommandWindowTimerRef.current = window.setTimeout(() => {
            if (!assistantAwakeRef.current) return;
            assistantAwakeRef.current = false;
            setAssistantAwake(false);
            setAssistantStatus("Ready");
          }, 10000);
          continue;
        }

        // If already activated and user repeats wake word only, keep it active.
        if (wakeMatched && !commandAfterWake) {
          respondDaazyRef.current("Yes, how can I help you?");
          if (wakeCommandWindowTimerRef.current) {
            window.clearTimeout(wakeCommandWindowTimerRef.current);
          }
          wakeCommandWindowTimerRef.current = window.setTimeout(() => {
            if (!assistantAwakeRef.current) return;
            assistantAwakeRef.current = false;
            setAssistantAwake(false);
            setAssistantStatus("Ready");
          }, 10000);
          continue;
        }

        setAssistantStatus("Processing");
        const response = await processDaazyQueryRef.current(transcript);
        respondDaazyRef.current(response);
        setAssistantStatus("Answered");
        assistantAwakeRef.current = false;
        setAssistantAwake(false);
        if (wakeCommandWindowTimerRef.current) {
          window.clearTimeout(wakeCommandWindowTimerRef.current);
          wakeCommandWindowTimerRef.current = null;
        }
      }
    };

    recognition.onerror = (event) => {
      setAssistantStatus("Error");
      const errorCode = event?.error || "unknown";

      if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
        toast({
          title: "Daazy Mic Permission Needed",
          description: "Please allow microphone access for this site/app and try again.",
          variant: "destructive",
        });
      }

      if (!handsFreeModeRef.current) return;
      if (isSpeakingRef.current) return;
      window.setTimeout(() => {
        if (!handsFreeModeRef.current || recognitionStartedRef.current || isListeningRef.current) return;
        try {
          recognition.start();
        } catch {
          // Ignore race conditions while restarting speech engine.
        }
      }, 800);
    };

    recognition.onend = () => {
      setIsListening(false);
      setAssistantStatus((prev) => {
        if (!handsFreeModeRef.current) return "Idle";
        if (prev === "Activated" || prev === "Processing") return prev;
        return "Ready";
      });
      isListeningRef.current = false;
      recognitionStartedRef.current = false;

      // If Daazy is currently speaking, resume will be handled by speech callbacks.
      if (isSpeakingRef.current) return;

      if (handsFreeModeRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Ignore restart race conditions from browser speech engine.
          }
        }, 250);
      }
    };

    if (handsFreeModeRef.current) {
      try {
        recognition.start();
      } catch {
        // Ignore startup race conditions.
      }
    }

    const ensureStartRecognition = () => {
      if (!handsFreeModeRef.current) return;
      if (recognitionStartedRef.current || isListeningRef.current) return;
      try {
        recognition.start();
      } catch {
        // Ignore race conditions when engine is busy.
      }
    };

    window.addEventListener("pointerdown", ensureStartRecognition);
    window.addEventListener("keydown", ensureStartRecognition);
    window.addEventListener("touchstart", ensureStartRecognition);

    const keepAlive = window.setInterval(() => {
      if (!handsFreeModeRef.current) return;
      if (recognitionStartedRef.current || isListeningRef.current) return;
      try {
        recognition.start();
      } catch {
        // Ignore race conditions while heartbeat restarts recognition.
      }
    }, 4000);

    return () => {
      window.removeEventListener("pointerdown", ensureStartRecognition);
      window.removeEventListener("keydown", ensureStartRecognition);
      window.removeEventListener("touchstart", ensureStartRecognition);
      window.clearInterval(keepAlive);
      if (wakeCommandWindowTimerRef.current) {
        window.clearTimeout(wakeCommandWindowTimerRef.current);
        wakeCommandWindowTimerRef.current = null;
      }
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [assistantUserName, toast]);

  const handleKPIClick = (status: string) => {
    // Always start each modal view with a clean filter state.
    setModalSearch("");
    setModalDelayFilter("all");
    setModalDelayMin("");
    setModalDelayMax("");
    setModalTatFilter("all");
    setModalTatMin("");
    setModalTatMax("");

    if (status === "triptatcompletion") setModalTatBasis("completion");
    else if (status === "pickuptat") setModalTatBasis("pickupActualVsRaised");
    else if (status === "pickupraisedtattodelivered" || status === "pickupraisedtattodeliveredgte4") {
      setModalTatBasis("pickupRaisedToDelivered");
      if (status === "pickupraisedtattodeliveredgte4") {
        setModalTatFilter("4+");
      }
    } else setModalTatBasis("creation");

    setSelectedStatusModal(status);
    setModalOpen(true);
  };

  const getTripsForStatus = (status: string): Trip[] => {
    if (status === "total") return filteredTrips;
    if (status === "selecteddate") return filteredTrips;
    if (status === "offline") return filteredTrips.filter(t => t.tripStatus?.toLowerCase().trim().includes("offline"));
    if (status === "tripcancel") return filteredTrips.filter(t => t.tripStatus?.toLowerCase().trim().includes("cancel"));
    if (status === "intransit") return filteredTrips.filter(t => t.tripStatus?.toLowerCase().trim().includes("transit"));
    if (status === "completed") return filteredTrips.filter(t => {
      const s = t.tripStatus?.toLowerCase().trim() || "";
      return s.includes("completed") && !s.includes("not");
    });
    if (status === "awaiting") return filteredTrips.filter(t => t.tripStatus?.toLowerCase().trim().includes("awaiting"));
    if (status === "delivered") return filteredTrips.filter(t => t.packetStatus?.toLowerCase().trim().includes("delivered"));
    if (status === "pending") return filteredTrips.filter(t => {
      const pStatus = t.packetStatus?.toLowerCase().trim() || "";
      return pStatus.includes("pending") || pStatus === "pending confirmation";
    });
    if (status === "triptatcreation") {
      return filteredTrips.filter((trip) =>
        calculateCreationToDeliveredTatDays(trip.tripCreationDate, trip.deliveredDate) !== null
      );
    }
    if (status === "triptatcompletion") {
      return filteredTrips.filter((trip) =>
        calculateCompletionToDeliveredTatDays(trip.tripCompletionDate, trip.deliveredDate) !== null
      );
    }
    if (status === "pickuptat") {
      return filteredTrips.filter((trip) =>
        calculatePickupTatDays(trip.pickupRaisedOn, trip.actualPickupDate) !== null
      );
    }
    if (status === "pickupraisedtattodelivered") {
      return filteredTrips.filter((trip) =>
        calculatePickupRaisedToDeliveredTatDays(trip.pickupRaisedOn, trip.deliveredDate) !== null
      );
    }
    if (status === "pickupraisedtattodeliveredgte4") {
      return filteredTrips.filter((trip) => {
        const tat = calculatePickupRaisedToDeliveredTatDays(trip.pickupRaisedOn, trip.deliveredDate);
        return tat !== null && tat >= 4;
      });
    }
    if (status === "missingtatcreation") {
      return filteredTrips.filter((trip) => {
        const packetLower = trip.packetStatus?.toLowerCase().trim() || "";
        return packetLower.includes("delivered") &&
          calculateCreationToDeliveredTatDays(trip.tripCreationDate, trip.deliveredDate) === null;
      });
    }
    if (status === "missingtatcompletion") {
      return filteredTrips.filter((trip) => {
        const packetLower = trip.packetStatus?.toLowerCase().trim() || "";
        return packetLower.includes("delivered") &&
          calculateCompletionToDeliveredTatDays(trip.tripCompletionDate, trip.deliveredDate) === null;
      });
    }
    
    // ✅ FIXED: Properly filter trips with pickup delay > 3 days
    if (status === "pickupdelay") {
      return filteredTrips.filter(trip => {
        const delayDays = calculatePickupDelay(trip.pickupRaisedOn, trip.actualPickupDate);
        return delayDays !== null && delayDays > 3;
      });
    }

    // Pickup Raised Internally (packet-status based for consistency)
    if (status === "pickupraisedinterally") {
      return filteredTrips.filter(trip => trip.packetStatus?.toLowerCase().trim() === "pickup raised");
    }

    // Pickup Completed (packet-status based for consistency)
    if (status === "pickupcompleted") {
      return filteredTrips.filter(trip => {
        const packet = trip.packetStatus?.toLowerCase().trim() || "";
        return packet === "pickup done" || packet === "pickup completed";
      });
    }
    
    // Pickup Status - Pickup Raised
    if (status === "pickupraised") {
      return filteredTrips.filter(trip => trip.packetStatus?.toLowerCase().trim() === "pickup raised");
    }

    // Pickup Status - Pickup Done
    if (status === "pickupdone") {
      return filteredTrips.filter(trip => trip.packetStatus?.toLowerCase().trim() === "pickup done");
    }

    return filteredTrips;
  };

  // =========================================================================
  // RENDER JSX
  const isPickupTatBasis =
    modalTatBasis === "pickupActualVsRaised" ||
    modalTatBasis === "pickupRaisedToDelivered";
  const isMissingTatModal =
    selectedStatusModal === "missingtatcreation" ||
    selectedStatusModal === "missingtatcompletion";
  const modalTatFilterLabel = isPickupTatBasis ? "Filter by Pickup TAT" : "Filter by Trip TAT";
  const modalTatAllOptionLabel = isPickupTatBasis ? "All Pickup TAT" : "All Trip TAT";

  const getTatBadgeClass = (days: number | null): string => {
    if (days === null) return "bg-slate-100 text-slate-500 border border-slate-200";
    if (days <= 3) return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    if (days <= 7) return "bg-amber-100 text-amber-800 border border-amber-200";
    return "bg-rose-100 text-rose-800 border border-rose-200";
  };

  const getDelayBadgeClass = (days: number | null): string => {
    if (days === null) return "bg-slate-100 text-slate-500 border border-slate-200";
    if (days <= 3) return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    if (days <= 7) return "bg-amber-100 text-amber-800 border border-amber-200";
    return "bg-rose-100 text-rose-800 border border-rose-200";
  };

  const getTripStatusBadgeClass = (status?: string): string => {
    const s = status?.toLowerCase().trim() || "";
    if (s.includes("completed") && !s.includes("not")) return "bg-emerald-100 text-emerald-800";
    if (s.includes("transit")) return "bg-amber-100 text-amber-800";
    if (s.includes("offline")) return "bg-rose-100 text-rose-800";
    if (s.includes("awaiting")) return "bg-cyan-100 text-cyan-800";
    if (s.includes("cancel")) return "bg-red-100 text-red-800";
    return "bg-indigo-100 text-indigo-700";
  };

  const getPacketStatusBadgeClass = (status?: string): string => {
    const s = status?.toLowerCase().trim() || "";
    if (s.includes("delivered")) return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    if (s.includes("pending")) return "bg-amber-100 text-amber-800 border border-amber-200";
    if (s.includes("pickup raised")) return "bg-violet-100 text-violet-800 border border-violet-200";
    if (s.includes("pickup done")) return "bg-cyan-100 text-cyan-800 border border-cyan-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

    const getFilteredModalTrips = (trips: Trip[]): Trip[] => {
      let filtered = trips;

      const getTatValue = (trip: Trip): number | null => {
        if (modalTatBasis === "completion") {
          return calculateCompletionToDeliveredTatDays(trip.tripCompletionDate, trip.deliveredDate);
        }
        if (modalTatBasis === "pickupActualVsRaised") {
          return calculatePickupTatDays(trip.pickupRaisedOn, trip.actualPickupDate);
        }
        if (modalTatBasis === "pickupRaisedToDelivered") {
          return calculatePickupRaisedToDeliveredTatDays(trip.pickupRaisedOn, trip.deliveredDate);
        }
        return calculateCreationToDeliveredTatDays(trip.tripCreationDate, trip.deliveredDate);
      };

      // Apply search filter
      if (modalSearch.trim()) {
        const search = modalSearch.toLowerCase();
        filtered = filtered.filter((trip) =>
          [
            trip.tripId,
            trip.vehicleNo,
            trip.sourceAddress,
            trip.destinationAddress,
            trip.transporterName,
            trip.packetStatus,
            trip.tripStatus,
          ].some((field) =>
            String(field || "").toLowerCase().includes(search)
          )
        );
      }

      // Apply delay filter
      if (modalDelayFilter !== "all") {
        filtered = filtered.filter((trip) => {
          const delay = calculatePickupDelay(trip.pickupRaisedOn, trip.actualPickupDate);
          if (delay === null) return false;

          if (modalDelayFilter === "custom") {
            const min = modalDelayMin === "" ? null : parseInt(modalDelayMin, 10);
            const max = modalDelayMax === "" ? null : parseInt(modalDelayMax, 10);

            // If both bounds are empty, keep all rows in custom mode.
            if (min === null && max === null) return true;

            if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) {
              return false;
            }

            const [low, high] = min !== null && max !== null
              ? [Math.min(min, max), Math.max(min, max)]
              : [min, max];

            const minOk = low === null || delay >= low;
            const maxOk = high === null || delay <= high;
            return minOk && maxOk;
          }

          if (modalDelayFilter.endsWith("+")) {
            const min = parseInt(modalDelayFilter.replace("+", ""), 10);
            return !Number.isNaN(min) && delay >= min;
          }

          const [minStr, maxStr] = modalDelayFilter.split("-");
          const min = parseInt(minStr, 10);
          const max = parseInt(maxStr, 10);

          if (Number.isNaN(min) || Number.isNaN(max)) return false;
          return delay >= min && delay <= max;
        });
      }

      // Apply TAT filter
      if (!isMissingTatModal && modalTatFilter !== "all") {
        filtered = filtered.filter((trip) => {
          const tat = getTatValue(trip);
          if (tat === null) return false;

          if (modalTatFilter === "custom") {
            const min = modalTatMin === "" ? null : parseInt(modalTatMin, 10);
            const max = modalTatMax === "" ? null : parseInt(modalTatMax, 10);

            if (min === null && max === null) return true;

            if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) {
              return false;
            }

            const [low, high] = min !== null && max !== null
              ? [Math.min(min, max), Math.max(min, max)]
              : [min, max];

            const minOk = low === null || tat >= low;
            const maxOk = high === null || tat <= high;
            return minOk && maxOk;
          }

          if (modalTatFilter.endsWith("+")) {
            const min = parseInt(modalTatFilter.replace("+", ""), 10);
            return !Number.isNaN(min) && tat >= min;
          }

          const [minStr, maxStr] = modalTatFilter.split("-");
          const min = parseInt(minStr, 10);
          const max = parseInt(maxStr, 10);

          if (Number.isNaN(min) || Number.isNaN(max)) return false;
          return tat >= min && tat <= max;
        });
      }

      return filtered;
    };

  // =========================================================================

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A1020] p-3 sm:p-4 xl:p-6 text-[#F9FAFB]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-emerald-400/10" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-amber-300/10" />
      </div>
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-[1560px] 2xl:max-w-[1760px]">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500 p-2">
            <Navigation className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-amber-200">
              Advanced View Control
            </h1>
            <p className="text-sm text-sky-200/90">
              Logistics & Fleet Management Dashboard
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          <Button
            onClick={handleNewTrip}
            className="inline-flex items-center gap-2 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" />
            New Trip
          </Button>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/90 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Data Loading Issue</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {error.includes('Invalid GET action') || error.includes('Stock data endpoint') ? (
                <div className="mt-3 p-3 bg-white rounded border border-red-200">
                  <p className="text-sm font-medium text-slate-900 mb-2">
                    🔧 How to fix:
                  </p>
                  <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside">
                    <li>Open Google Apps Script (script.google.com)</li>
                    <li>Deploy <code className="bg-slate-100 px-1 rounded">DashboardData_v2.gs</code> as Web App</li>
                    <li>Copy the new URL to your .env file</li>
                    <li>Restart your dev server</li>
                  </ol>
                  <p className="text-xs text-slate-600 mt-2">
                    📖 See <code className="bg-slate-100 px-1 rounded">DEPLOY_APPS_SCRIPT.md</code> for detailed steps
                  </p>
                </div>
              ) : (
                <p className="text-xs text-red-600 mt-2">
                  Make sure Google Apps Script endpoint is configured correctly in your .env file.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant Status (Production-style) */}
      <div className="mb-6 rounded-2xl border border-cyan-300/40 bg-[linear-gradient(135deg,#102335,#0D1D2D)] p-4 shadow-lg">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <div className={`h-14 w-14 rounded-full border ${assistantAwake ? "border-emerald-300 bg-emerald-400/25 shadow-[0_0_18px_rgba(74,222,128,0.6)]" : isListening ? "border-cyan-300 bg-cyan-400/20 shadow-[0_0_14px_rgba(34,211,238,0.55)]" : "border-slate-500 bg-slate-700/40"} ${isListening ? "animate-pulse" : ""}`} />
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-cyan-200">Dazzy Assistant</p>
              <p className="text-sm text-slate-100">Status: {assistantStatus}</p>
            </div>
          </div>
          <div className="max-w-[640px]">
            <p className="text-xs uppercase tracking-wider text-slate-400">Heard</p>
            <p className="text-sm text-slate-200">{lastHeardText || "Waiting for wake word: Hey Dazzy"}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">Response</p>
            <p className="text-sm text-cyan-100">{lastAssistantResponse}</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-8 rounded-xl bg-slate-900/80 p-6 shadow-lg border border-slate-700 2xl:bg-slate-950/85 2xl:shadow-[0_14px_38px_rgba(0,0,0,0.55)] 2xl:border-slate-600/60 2xl:ring-1 2xl:ring-white/10">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-slate-100">Filters</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-8">
          {/* Origin Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Origin
            </label>
            <select
              value={filters.origin}
              onChange={(e) => handleFilterChange("origin", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 shadow-sm hover:border-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              {uniqueOrigins.map((origin) => (
                <option key={origin} value={origin}>
                  {origin}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Destination
            </label>
            <select
              value={filters.destination}
              onChange={(e) => handleFilterChange("destination", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 shadow-sm hover:border-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              {uniqueDestinations.map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
          </div>

          {/* Hub Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Transporter
            </label>
            <select
              value={filters.transporter}
              onChange={(e) => handleFilterChange("transporter", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 shadow-sm hover:border-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              {uniqueTransporters.map((transporter) => (
                <option key={transporter} value={transporter}>
                  {transporter}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mode
            </label>
            <select
              value={filters.mode}
              onChange={(e) => handleFilterChange("mode", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 shadow-sm hover:border-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              {uniqueModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 shadow-sm hover:border-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Trip Complete Date Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Trip Complete Date
            </label>
            <select
              value={filters.tripCreationDate}
              onChange={(e) => handleFilterChange("tripCreationDate", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 shadow-sm hover:border-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              {uniqueTripCreationDates.map((dateKey) => (
                <option key={dateKey} value={dateKey}>
                  {dateKey === "All" ? "All Dates" : formatDateLabel(dateKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Trip Complete Date From */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={filters.tripCreationDateFrom}
              onChange={(e) => handleFilterChange("tripCreationDateFrom", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 shadow-sm hover:border-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* Trip Complete Date To */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={filters.tripCreationDateTo}
              onChange={(e) => handleFilterChange("tripCreationDateTo", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 shadow-sm hover:border-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* Loading & Last Update Info */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 2xl:text-sm 2xl:font-medium 2xl:text-slate-200/85">
          <div className="flex items-center gap-4">
            <div>
              {loading && (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Loading data...
                </span>
              )}
              {!loading && lastFetchTime && (
                <span>
                  Last updated: {lastFetchTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            {/* Auto-Refresh Toggle & Interval */}
            {quickModeFilters.length > 0 && (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
                <span className="text-xs font-medium text-slate-300">Quick Filter</span>
                {quickModeFilters.map((modeFilter) => {
                  const isActive = filters.mode === modeFilter.value;
                  const isLsd = modeFilter.label === "LSD";
                  const activeClass = isLsd
                    ? "border-cyan-200 bg-cyan-400/30 text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.45)]"
                    : "border-amber-200 bg-amber-400/30 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]";
                  const inactiveClass = isLsd
                    ? "border-cyan-700/80 bg-cyan-900/35 text-cyan-100 hover:border-cyan-500 hover:bg-cyan-800/45"
                    : "border-amber-700/80 bg-amber-900/35 text-amber-100 hover:border-amber-500 hover:bg-amber-800/45";
                  return (
                    <button
                      key={modeFilter.label}
                      type="button"
                      onClick={() => handleQuickModeToggle(modeFilter.value)}
                      className={`min-w-[72px] rounded-lg border px-3.5 py-2 text-sm font-bold tracking-wide transition-colors ${isActive ? activeClass : inactiveClass}`}
                      title={`Filter by ${modeFilter.label}`}
                    >
                      {modeFilter.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-300">Auto-Refresh</span>
              </label>
              {autoRefreshEnabled && (
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                  className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100"
                >
                  <option value={5}>Every 5s</option>
                  <option value={10}>Every 10s</option>
                  <option value={30}>Every 30s</option>
                  <option value={60}>Every 1m</option>
                  <option value={300}>Every 5m</option>
                </select>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="text-cyan-300 hover:text-cyan-200 disabled:text-slate-500"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={loading}
              className={`transition-colors ${isPlaying ? "text-green-400 hover:text-green-300" : "text-amber-400 hover:text-amber-300"} disabled:text-slate-500`}
              title={isPlaying ? "Stop narration" : "Play narration"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (8 Status Metrics) */}
      {(filters.tripCreationDate !== "All" || filters.tripCreationDateFrom || filters.tripCreationDateTo) && (
        <div className="mb-6">
          <button
            onClick={() => handleKPIClick("selecteddate")}
            className="w-full rounded-2xl border border-slate-300/55 bg-[linear-gradient(135deg,#243147,#151D2E)] p-5 text-left shadow-lg transition-all duration-200 hover:border-slate-200/75"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm md:text-[15px] font-bold uppercase tracking-[0.08em] leading-tight text-[#E2E8F0]">
                  Trips In Selected Date Filter
                </p>
                <p className="mt-2 text-3xl md:text-4xl xl:text-4xl 2xl:text-5xl font-extrabold text-white">
                  {calculateMetrics.tripsOnSelectedDate}
                </p>
                <p className="mt-1 text-sm md:text-[15px] font-medium leading-snug text-[#E2E8F0]">
                  {filters.tripCreationDate !== "All"
                    ? `Trip Complete Date: ${formatDateLabel(filters.tripCreationDate)}`
                    : `Date Range: ${filters.tripCreationDateFrom || "Any"} to ${filters.tripCreationDateTo || "Any"}`}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300/40 bg-[#2C3B55] p-3">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
        <button
          onClick={() => handleKPIClick("triptatcreation")}
            className="w-full rounded-2xl border border-cyan-300/55 bg-[linear-gradient(135deg,#0F3A47,#0E2430)] p-4 xl:p-5 text-left shadow-lg transition-all duration-200 hover:border-cyan-200/80"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm md:text-[15px] font-bold uppercase tracking-[0.08em] leading-tight text-[#CCFBF1]">
                Avg Trip TAT (Creation)
              </p>
              <p className="mt-2 text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-white">
                {calculateMetrics.avgCreationToDeliveredTatDays} days
              </p>
              <p className="mt-1 text-sm md:text-[13px] font-medium leading-snug text-[#D1FAE5]">
                Based on {calculateMetrics.creationTatMeasuredTrips} of {calculateMetrics.deliveredTripsTotal} delivered trips
              </p>
            </div>
            <div className="rounded-xl bg-cyan-400/25 p-2.5 ring-1 ring-cyan-200/35">
              <Clock3 className="h-5 w-5 text-blue-200" />
            </div>
          </div>
        </button>

        <button
          onClick={() => handleKPIClick("triptatcompletion")}
          className="w-full rounded-2xl border border-emerald-300/55 bg-[linear-gradient(135deg,#124233,#0F2A22)] p-4 xl:p-5 text-left shadow-lg transition-all duration-200 hover:border-emerald-200/80"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm md:text-[15px] font-bold uppercase tracking-[0.08em] leading-tight text-[#D1FAE5]">
                Avg Trip TAT (Completion)
              </p>
              <p className="mt-2 text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-white">
                {calculateMetrics.avgCompletionToDeliveredTatDays} days
              </p>
              <p className="mt-1 text-sm md:text-[13px] font-medium leading-snug text-[#A7F3D0]">
                Based on {calculateMetrics.completionTatMeasuredTrips} of {calculateMetrics.deliveredTripsTotal} delivered trips
              </p>
            </div>
            <div className="rounded-xl bg-emerald-400/25 p-2.5 ring-1 ring-emerald-200/35">
              <Clock3 className="h-5 w-5 text-emerald-200" />
            </div>
          </div>
        </button>

        <button
          onClick={() => handleKPIClick("pickuptat")}
          className="w-full rounded-2xl border border-violet-300/55 bg-[linear-gradient(135deg,#3B2458,#241A36)] p-4 xl:p-5 text-left shadow-lg transition-all duration-200 hover:border-violet-200/80"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm md:text-[15px] font-bold uppercase tracking-[0.08em] leading-tight text-[#FAE8FF]">
                Avg Pickup TAT
              </p>
              <p className="mt-2 text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-white">
                {calculateMetrics.avgPickupTatDays} days
              </p>
              <p className="mt-1 text-sm md:text-[13px] font-medium leading-snug text-[#F5D0FE]">
                {calculateMetrics.pickupTatTotalDays} total days across {calculateMetrics.pickupTatMeasuredTrips} trips
              </p>
            </div>
            <div className="rounded-xl bg-violet-400/25 p-2.5 ring-1 ring-violet-200/35">
              <Clock3 className="h-5 w-5 text-fuchsia-200" />
            </div>
          </div>
        </button>

        <button
          onClick={() => handleKPIClick("pickupraisedtattodelivered")}
          className="w-full rounded-2xl border border-rose-300/55 bg-[linear-gradient(135deg,#4A2232,#311B28)] p-4 xl:p-5 text-left shadow-lg transition-all duration-200 hover:border-rose-200/80"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm md:text-[15px] font-bold uppercase tracking-[0.08em] leading-tight text-[#FEE2E2]">
                Avg Pickup-Delivered TAT
              </p>
              <p className="mt-2 text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-white">
                {calculateMetrics.avgPickupRaisedToDeliveredTatDays} days
              </p>
              <p className="mt-1 text-sm md:text-[13px] font-medium leading-snug text-[#FECACA]">
                Based on {calculateMetrics.pickupRaisedToDeliveredTatMeasuredTrips} of {calculateMetrics.deliveredTripsTotal} delivered trips
              </p>
              <p className="mt-1 text-sm md:text-base font-medium text-[#FECACA]">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKPIClick("pickupraisedtattodeliveredgte4");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleKPIClick("pickupraisedtattodeliveredgte4");
                    }
                  }}
                  className="inline-flex cursor-pointer text-lg md:text-xl font-extrabold text-[#FEE2E2] underline decoration-[#FEE2E2] underline-offset-2 transition-colors hover:text-white"
                >
                  {calculateMetrics.pickupRaisedToDeliveredTatGte4Trips} trips have TAT ≥ 4 days
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-rose-400/25 p-2.5 ring-1 ring-rose-200/35">
              <MapPin className="h-5 w-5 text-red-200" />
            </div>
          </div>
        </button>

        <div className="w-full rounded-2xl border border-amber-300/55 bg-[linear-gradient(135deg,#4A3312,#33230F)] p-5 shadow-lg transition-all duration-200 hover:border-amber-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm md:text-[15px] font-bold uppercase tracking-[0.08em] leading-tight text-[#FEF3C7]">
                Missing Date Records
              </p>
              <button
                onClick={() => handleKPIClick("missingtatcreation")}
                className="mt-2 block text-base md:text-lg font-bold leading-snug text-[#FFFBEB] hover:underline"
              >
                Creation to Delivered: {calculateMetrics.missingCreationTatRecords}
              </button>
              <button
                onClick={() => handleKPIClick("missingtatcompletion")}
                className="mt-1 block text-base md:text-lg font-bold leading-snug text-[#FFFBEB] hover:underline"
              >
                Completion to Delivered: {calculateMetrics.missingCompletionTatRecords}
              </button>
              <p className="mt-2 text-sm md:text-[13px] font-medium leading-snug text-[#FEF3C7]">Click count to view trip list</p>
            </div>
            <div className="rounded-xl bg-amber-300/25 p-2.5 ring-1 ring-amber-200/35">
              <AlertTriangle className="h-5 w-5 text-amber-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatusCard
          title="Total Trips"
          value={calculateMetrics.totalTrips}
          onClick={() => handleKPIClick("total")}
          truckImageSrc="https://raw.githubusercontent.com/n2023ik/project-imh/main/lynkit%20total.png"
          truckImageClassName="bottom-0 right-0 h-full w-auto max-w-[42%] object-contain object-right-bottom sm:max-w-[55%]"
          cardClassName="bg-[linear-gradient(135deg,#24345A,#17233A)] border-indigo-300/50"
          titleClassName="text-indigo-200"
        />

        <StatusCard
          title="In Transit"
          value={calculateMetrics.inTransit}
          onClick={() => handleKPIClick("intransit")}
          truckImageSrc="https://raw.githubusercontent.com/n2023ik/project-imh/main/intransit.png"
          truckImageClassName="bottom-0 right-0 h-full w-auto max-w-[42%] object-contain object-right-bottom sm:max-w-[55%]"
          cardClassName="bg-[linear-gradient(135deg,#124255,#0D2B3A)] border-sky-300/50"
          titleClassName="text-sky-200"
        />

        <StatusCard
          title="Completed"
          value={calculateMetrics.completed}
          onClick={() => handleKPIClick("completed")}
          truckImageSrc="https://raw.githubusercontent.com/n2023ik/project-imh/main/completed.png"
          truckImageClassName="bottom-0 right-0 h-full w-auto max-w-[42%] object-contain object-right-bottom sm:max-w-[55%]"
          cardClassName="bg-[linear-gradient(135deg,#184A34,#123224)] border-emerald-300/50"
          titleClassName="text-emerald-200"
        />

        <StatusCard
          title="Awaiting Departure"
          value={calculateMetrics.awaitingDeparture}
          onClick={() => handleKPIClick("awaiting")}
          icon={Clock3}
          compareIcon={AlertTriangle}
          specialIconBg="bg-amber-300/25 ring-1 ring-amber-200/35"
          cardClassName="bg-[linear-gradient(135deg,#4C3612,#352710)] border-amber-300/50"
          titleClassName="text-amber-200"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatusCard
          title="Delivered"
          value={calculateMetrics.delivered}
          onClick={() => handleKPIClick("delivered")}
          truckImageSrc="https://raw.githubusercontent.com/n2023ik/project-imh/main/delivered.png"
          truckImageClassName="bottom-0 right-0 h-full w-auto max-w-[42%] object-contain object-right-bottom sm:max-w-[55%]"
          cardClassName="bg-[linear-gradient(135deg,#124550,#0D2D36)] border-cyan-300/50"
          titleClassName="text-cyan-300"
          icon={MapPin}
          specialIconBg="bg-cyan-300/25 ring-1 ring-cyan-200/35"
        />
        <StatusCard
          title="Pending Confirmation"
          value={calculateMetrics.pending}
          onClick={() => handleKPIClick("pending")}
          cardClassName="bg-[linear-gradient(135deg,#4A3B12,#31270E)] border-yellow-300/50"
          titleClassName="text-yellow-200"
          icon={Truck}
          specialIconBg="bg-yellow-400/20 ring-1 ring-yellow-300/30"
        />
        <StatusCard
          title="Pickup Delay"
          value={calculateMetrics.pickupDelay}
          onClick={() => handleKPIClick("pickupdelay")}
          cardClassName="bg-[linear-gradient(135deg,#512530,#3A1D24)] border-red-300/50"
          titleClassName="text-red-400"
          icon={Clock3}
          compareIcon={AlertTriangle}
          specialIconBg="bg-red-300/25 ring-1 ring-red-200/35"
        />
        <StatusCard
          title="Offline"
          value={calculateMetrics.offline}
          onClick={() => handleKPIClick("offline")}
          cardClassName="bg-[linear-gradient(135deg,#2A3550,#1D2637)] border-slate-200/45"
          titleClassName="text-slate-200"
          icon={WifiOff}
          specialIconBg="bg-slate-300/20 ring-1 ring-slate-200/35"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4">
        <button
          onClick={() => handleKPIClick("tripcancel")}
          className="group relative flex h-28 items-center justify-between overflow-hidden rounded-2xl border border-rose-300/55 bg-[linear-gradient(135deg,#4D1F2B,#321620)] p-4 text-left shadow-lg transition-all duration-200 hover:border-rose-200/80 sm:h-36 sm:p-8"
        >
          <img
            src="https://raw.githubusercontent.com/n2023ik/project-imh/main/trip%20cancel.jpg"
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="pointer-events-none absolute -bottom-3 right-2 h-24 w-auto select-none opacity-35 transition-transform duration-500 group-hover:scale-105 sm:-bottom-4 sm:right-8 sm:h-36 sm:opacity-45"
            loading="lazy"
          />
          <div className="relative z-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rose-400">Total Trip Cancelled</p>
            <p className="text-4xl font-black text-white sm:text-5xl">{calculateMetrics.tripCancel}</p>
          </div>
          <div className="relative rounded-2xl border border-rose-300/40 bg-rose-300/20 p-3 sm:p-5">
            <XCircle className="h-6 w-6 text-rose-400 sm:h-8 sm:w-8" />
          </div>
        </button>
      </div>

      {/* Pickup Status Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <StatusCard
          title="Total Pickup Raised"
          value={calculatePickupStatusMetrics.totalPickupRaised}
          onClick={() => handleKPIClick("pickupraised")}
          truckImageSrc="https://raw.githubusercontent.com/n2023ik/project-imh/main/intransit.jpg"
          truckImageClassName="bottom-0 right-0 h-full w-auto max-w-[42%] object-contain object-right-bottom sm:max-w-[55%]"
          cardClassName="bg-[linear-gradient(135deg,#4D3412,#33240F)] border-amber-300/50"
          titleClassName="text-amber-200"
          icon={Package}
          specialIconBg="bg-amber-300/25 ring-1 ring-amber-200/35"
        />
        <StatusCard
          title="Total Pickup Done"
          value={calculatePickupStatusMetrics.totalPickupDone}
          footerText={`Pickup Completed - Delivery Still Pending After 4 Days: ${calculatePickupStatusMetrics.pickupDoneDeliveryPendingAfter4Days}`}
          onClick={() => handleKPIClick("pickupdone")}
          truckImageSrc="https://raw.githubusercontent.com/n2023ik/project-imh/main/pickup%20done.png"
          truckImageClassName="bottom-0 right-0 h-full w-auto max-w-[42%] object-contain object-right-bottom sm:max-w-[55%]"
          cardClassName="bg-[linear-gradient(135deg,#184630,#123021)] border-emerald-300/50"
          titleClassName="text-emerald-200"
          icon={Package}
          specialIconBg="bg-emerald-300/25 ring-1 ring-emerald-200/35"
        />
        <div className="rounded-2xl border border-indigo-300/55 bg-[linear-gradient(135deg,#2F3970,#1B2140)] p-6 shadow-lg">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4 2xl:text-sm 2xl:font-extrabold 2xl:tracking-[0.18em] 2xl:text-indigo-100">
            Overall Performance Rate
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white 2xl:text-6xl 2xl:font-extrabold">
                {calculateMetrics.totalTrips > 0
                  ? ((calculateMetrics.delivered / calculateMetrics.totalTrips) * 100).toFixed(1)
                  : "0"}%
              </p>
              <p className="mt-1 text-xs text-indigo-400 2xl:text-sm 2xl:font-medium 2xl:text-indigo-100/85">
                {calculateMetrics.delivered} of {calculateMetrics.totalTrips} Trips Success
              </p>
            </div>
            <div className="rounded-xl bg-indigo-300/25 p-3 ring-1 ring-indigo-200/35">
              <BarChart3 className="h-6 w-6 text-indigo-400 2xl:text-indigo-200" />
            </div>
          </div>
        </div>
      </div>

      {/* ASSET TRACKER UTILIZATION OVERVIEW - Overall Metrics */}
      <div className="mb-8 rounded-2xl bg-slate-900/40 p-8 shadow-2xl border border-slate-700/50 2xl:bg-slate-950/85 2xl:shadow-[0_18px_50px_rgba(0,0,0,0.6)] 2xl:border-slate-600/60 2xl:ring-1 2xl:ring-white/10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-600 p-4 shadow-xl shadow-indigo-600/30">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Fleet Availability &amp; Asset Utilization
              </h2>
              <p className="text-sm text-slate-400 mt-1 2xl:text-base 2xl:font-medium 2xl:text-slate-200/85">
                Real-time tracker inventory across regional logistics hubs
              </p>
            </div>
          </div>
          {calculateDeviceMetrics.overallUtilization >= 80 && (
            <div className="flex items-center gap-4 rounded-2xl bg-red-500/15 px-6 py-4 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-white">Critical Load Warning</p>
                <p className="text-xs text-red-400">
                  Inventory exhaustion at {calculateDeviceMetrics.overallUtilization.toFixed(1)}% usage
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-2xl bg-slate-800/40 p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Trackers In Use</p>
              <div className="rounded-xl bg-amber-500/10 p-2.5">
                <Truck className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white">{calculateDeviceMetrics.totalDevicesInUse}</p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-tighter">Currently in transit or awaiting</p>
          </div>
          <div className="rounded-2xl bg-slate-800/40 p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stock Available</p>
              <div className="rounded-xl bg-emerald-500/10 p-2.5">
                <Archive className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white">{calculateDeviceMetrics.totalDevicesAvailable}</p>
            <p className="text-[10px] text-emerald-400 mt-2 font-bold uppercase tracking-tighter">Ready for deployment</p>
          </div>
          <div className="rounded-2xl bg-slate-800/40 p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Fleet Size</p>
              <div className="rounded-xl bg-indigo-500/10 p-2.5">
                <Package className="h-5 w-5 text-indigo-500" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white">{calculateDeviceMetrics.totalDevices}</p>
            <div className="h-1.5 w-full bg-slate-700 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((calculateDeviceMetrics.totalDevicesInUse / Math.max(calculateDeviceMetrics.totalDevices, 1)) * 100, 100)}%` }} />
            </div>
          </div>
          <div className={`rounded-2xl p-6 border ${calculateDeviceMetrics.overallUtilization >= 80 ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700/50 bg-slate-800/40'}`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Utilization Rate</p>
              <div className={`rounded-xl p-2.5 ${calculateDeviceMetrics.overallUtilization >= 80 ? 'bg-red-500/20' : 'bg-blue-500/10'}`}>
                {calculateDeviceMetrics.overallUtilization >= 80
                  ? <AlertTriangle className="h-5 w-5 text-red-500" />
                  : <BarChart3 className="h-5 w-5 text-blue-500" />}
              </div>
            </div>
            <p className={`text-4xl font-bold ${calculateDeviceMetrics.overallUtilization >= 80 ? 'text-red-400' : 'text-white'}`}>
              {calculateDeviceMetrics.overallUtilization.toFixed(1)}%
            </p>
            <div className="h-1.5 w-full bg-slate-700 rounded-full mt-4 overflow-hidden">
              <div className={`h-full rounded-full ${calculateDeviceMetrics.overallUtilization >= 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(calculateDeviceMetrics.overallUtilization, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Source-wise Breakdown */}
        <div className="rounded-2xl bg-[#0B1426] border border-slate-700/50 overflow-hidden shadow-inner">
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Hub-wise Breakdown</h3>
            {calculateDeviceMetrics.sourceBreakdown.filter(s => s.isHighUtilization).length > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400">
                  {calculateDeviceMetrics.sourceBreakdown.filter(s => s.isHighUtilization).length} location(s) at 80%+
                </span>
              </div>
            )}
          </div>

          {calculateDeviceMetrics.sourceBreakdown.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/30 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-8 py-5">Location Hub</th>
                    <th className="px-6 py-5 text-center">In Use</th>
                    <th className="px-6 py-5 text-center">Available</th>
                    <th className="px-6 py-5 text-center">Total</th>
                    <th className="px-6 py-5 min-w-[220px]">Utilization Gauge</th>
                    <th className="px-8 py-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {calculateDeviceMetrics.sourceBreakdown.map((source, index) => (
                    <tr key={index} className="group hover:bg-slate-800/20 transition-all">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className={`h-2.5 w-2.5 rounded-full ${source.isHighUtilization ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.4)]'}`} />
                          <span className="font-bold text-slate-100 text-sm tracking-tight">{source.source}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white">{source.devicesInUse}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`text-sm font-black ${source.devicesAvailable < 10 ? 'text-red-400' : 'text-emerald-400'}`}>{source.devicesAvailable}</span>
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-medium text-slate-500">{source.totalDevices}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                source.utilizationPercentage >= 90 ? 'bg-gradient-to-r from-red-600 to-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]' :
                                source.utilizationPercentage >= 75 ? 'bg-gradient-to-r from-amber-500 to-yellow-300' :
                                'bg-gradient-to-r from-cyan-600 to-blue-400'
                              }`}
                              style={{ width: `${Math.min(source.utilizationPercentage, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black min-w-[50px] text-right ${source.utilizationPercentage >= 90 ? 'text-red-400' : 'text-slate-300'}`}>
                            {source.utilizationPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {source.isHighUtilization ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                            <AlertTriangle className="h-3 w-3" /> HIGH
                          </span>
                        ) : source.utilizationPercentage >= 60 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Moderate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Package className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">No asset tracker data available</p>
              <p className="text-xs text-slate-600 mt-1">Connect to Google Sheets to track asset tracker utilization</p>
            </div>
          )}
        </div>

        {/* Critical Utilization Alert Banner */}
        {calculateDeviceMetrics.sourceBreakdown.filter(s => s.isHighUtilization).length > 0 && (
          <div className="m-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <p className="font-bold text-red-300 mb-2">⚠️ Critical Utilization Alert — 80% Threshold Reached</p>
                <p className="text-xs text-red-400 mb-3">Immediate action recommended for the following locations:</p>
                <div className="space-y-2">
                  {calculateDeviceMetrics.sourceBreakdown.filter(s => s.isHighUtilization).map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-red-500/20">
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">{source.source}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{source.devicesInUse} in use · {source.devicesAvailable} available · {source.totalDevices} total</p>
                      </div>
                      <p className="text-2xl font-bold text-red-400">{source.utilizationPercentage.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {modalOpen && selectedStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 capitalize">
                  {selectedStatusModal === "total" && "All Trips"}
                  {selectedStatusModal === "offline" && "Offline Trips"}
                  {selectedStatusModal === "intransit" && "In Transit Trips"}
                  {selectedStatusModal === "completed" && "Completed Trips"}
                  {selectedStatusModal === "awaiting" && "Awaiting Departure Trips"}
                  {selectedStatusModal === "delivered" && "Delivered"}
                  {selectedStatusModal === "pending" && "Pending Confirmation"}
                  {selectedStatusModal === "pickupdelay" && "Pickup Delay"}
                  {selectedStatusModal === "pickuptat" && "Pickup TAT Details (Actual Pickup Date - Raised On)"}
                  {selectedStatusModal === "pickupraisedtattodelivered" && "Pickup TAT Details (Raised On to Delivered Date)"}
                  {selectedStatusModal === "pickupraisedtattodeliveredgte4" && "Pickup TAT Details (Raised On to Delivered Date, TAT >= 4 Days)"}
                  {selectedStatusModal === "triptatcreation" && "Trip TAT Details (Creation to Delivered)"}
                  {selectedStatusModal === "triptatcompletion" && "Trip TAT Details (Completion to Delivered)"}
                  {selectedStatusModal === "missingtatcreation" && "Missing Date Records (Creation to Delivered)"}
                  {selectedStatusModal === "missingtatcompletion" && "Missing Date Records (Completion to Delivered)"}
                  {selectedStatusModal === "pickupraised" && "Pickup Raised"}
                  {selectedStatusModal === "pickupdone" && "Pickup Done"}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {(() => {
                    const statusTrips = getTripsForStatus(selectedStatusModal || "total");
                    const filtered = getFilteredModalTrips(statusTrips);
                    const total = statusTrips.length;
                    return (
                      <>
                        {filtered.length === total
                          ? `Total: ${total} trips`
                          : `Showing ${filtered.length} of ${total} trips`}
                      </>
                    );
                  })()}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setModalSearch("");
                  setModalDelayFilter("all");
                  setModalDelayMin("");
                  setModalDelayMax("");
                  setModalTatBasis("creation");
                  setModalTatFilter("all");
                  setModalTatMin("");
                  setModalTatMax("");
                }}
                className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
              >
                <X className="h-6 w-6 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
                          {/* Modal Filters */}
                          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Search Input */}
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  Search
                                </label>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder="Search by Trip ID, Vehicle, Location, Status..."
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                  />
                                </div>
                              </div>

                              {/* Delay Filter */}
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  Filter by Pickup Delay
                                </label>
                                <select
                                  value={modalDelayFilter}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setModalDelayFilter(value);
                                    if (value !== "custom") {
                                      setModalDelayMin("");
                                      setModalDelayMax("");
                                    }
                                  }}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                >
                                  <option value="all">All Delays</option>
                                  <option value="0-7">0-7 days</option>
                                  <option value="8-15">8-15 days</option>
                                  <option value="16-28">16-28 days</option>
                                  <option value="29-60">29-60 days</option>
                                  <option value="61-90">61-90 days</option>
                                  <option value="91+">91+ days</option>
                                  <option value="custom">Custom range</option>
                                </select>
                              </div>

                              {/* TAT Filter */}
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  {modalTatFilterLabel}
                                </label>
                                <select
                                  value={modalTatFilter}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setModalTatFilter(value);
                                    if (value !== "custom") {
                                      setModalTatMin("");
                                      setModalTatMax("");
                                    }
                                  }}
                                  disabled={isMissingTatModal}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                >
                                  <option value="all">{modalTatAllOptionLabel}</option>
                                  <option value="0-7">0-7 days</option>
                                  <option value="8-15">8-15 days</option>
                                  <option value="16-28">16-28 days</option>
                                  <option value="29-60">29-60 days</option>
                                  <option value="61-90">61-90 days</option>
                                  <option value="91+">91+ days</option>
                                  <option value="custom">Custom range</option>
                                </select>
                                {isMissingTatModal && (
                                  <p className="mt-1 text-xs text-slate-500">TAT filtering is unavailable in missing-record views.</p>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  TAT Basis
                                </label>
                                <select
                                  value={modalTatBasis}
                                  onChange={(e) => {
                                    setModalTatBasis(e.target.value as TatBasis);
                                    setModalTatFilter("all");
                                    setModalTatMin("");
                                    setModalTatMax("");
                                  }}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                >
                                  <option value="creation">Creation to Delivered</option>
                                  <option value="completion">Completion to Delivered</option>
                                  <option value="pickupActualVsRaised">Actual Pickup Date - Raised On</option>
                                  <option value="pickupRaisedToDelivered">Pickup Raised On - Delivered Date</option>
                                </select>
                              </div>
                            </div>
                            {modalDelayFilter === "custom" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Min Delay (days)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={modalDelayMin}
                                    onChange={(e) => setModalDelayMin(e.target.value)}
                                    placeholder="e.g. 10"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Max Delay (days)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={modalDelayMax}
                                    onChange={(e) => setModalDelayMax(e.target.value)}
                                    placeholder="e.g. 45"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                  />
                                </div>
                              </div>
                            )}
                            {modalTatFilter === "custom" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Min TAT (days)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={modalTatMin}
                                    onChange={(e) => setModalTatMin(e.target.value)}
                                    placeholder="e.g. 5"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Max TAT (days)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={modalTatMax}
                                    onChange={(e) => setModalTatMax(e.target.value)}
                                    placeholder="e.g. 20"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                  />
                                </div>
                              </div>
                            )}
                            {(modalSearch || modalDelayFilter !== "all" || modalTatFilter !== "all" || modalTatBasis !== "creation") && (
                              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                                <p className="text-blue-800 font-medium">
                                  Showing filtered results
                                </p>
                                <button
                                  onClick={() => {
                                    setModalSearch("");
                                    setModalDelayFilter("all");
                                    setModalDelayMin("");
                                    setModalDelayMax("");
                                    setModalTatBasis("creation");
                                    setModalTatFilter("all");
                                    setModalTatMin("");
                                    setModalTatMax("");
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-semibold underline"
                                >
                                  Clear Filters
                                </button>
                              </div>
                            )}
                          </div>
              {(() => {
                const statusTrips = getTripsForStatus(selectedStatusModal || "total");
                const modalTrips = getFilteredModalTrips(statusTrips);
                return modalTrips.length > 0 ? (
                  <div className="space-y-3">
                    {modalTrips.map((trip, index) => {
                      const delayDays = calculatePickupDelay(trip.pickupRaisedOn, trip.actualPickupDate);
                      const pickupTatDays = calculatePickupTatDays(trip.pickupRaisedOn, trip.actualPickupDate);
                      const pickupRaisedToDeliveredTatDays = calculatePickupRaisedToDeliveredTatDays(trip.pickupRaisedOn, trip.deliveredDate);
                      const creationTatDays = calculateCreationToDeliveredTatDays(trip.tripCreationDate, trip.deliveredDate);
                      const completionTatDays = calculateCompletionToDeliveredTatDays(trip.tripCompletionDate, trip.deliveredDate);
                      return (
                        <div
                          key={`trip-${index}-${trip.tripId || "no-id"}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Trip ID</p>
                              <p className="text-sm font-bold text-slate-900 mt-1">
                                {trip.tripId && trip.tripId.trim() && trip.tripId !== "-"
                                  ? trip.tripId
                                  : <span className="text-slate-400 italic">No Trip ID</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                              <div className="mt-1">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getTripStatusBadgeClass(trip.tripStatus)}`}>
                                  {trip.tripStatus}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Packet Status</p>
                              <div className="mt-1">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getPacketStatusBadgeClass(trip.packetStatus)}`}>
                                  {trip.packetStatus || "N/A"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Origin</p>
                              <p className="text-sm text-slate-700 mt-1">{trip.sourceAddress}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Destination</p>
                              <p className="text-sm text-slate-700 mt-1">{trip.destinationAddress}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Transporter</p>
                              <p className="text-sm text-slate-700 mt-1">{trip.transporterName || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Trip Complete Date</p>
                              <p className="text-sm text-slate-700 mt-1">{trip.tripCompletionDate || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Pickup Raised On</p>
                              <p className="text-sm text-slate-700 mt-1">{trip.pickupRaisedOn || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Actual Pickup Date</p>
                              <p className="text-sm text-slate-700 mt-1">{trip.actualPickupDate || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Pickup Delay</p>
                              <div className="mt-1">
                                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getDelayBadgeClass(delayDays)}`}>
                                  {delayDays !== null ? `${delayDays} day${delayDays === 1 ? "" : "s"}` : "N/A"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Pickup TAT (Actual - Raised)</p>
                              <div className="mt-1">
                                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getTatBadgeClass(pickupTatDays)}`}>
                                  {pickupTatDays !== null ? `${pickupTatDays} day${pickupTatDays === 1 ? "" : "s"}` : "N/A"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Pickup TAT (Raised to Delivered)</p>
                              <div className="mt-1">
                                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getTatBadgeClass(pickupRaisedToDeliveredTatDays)}`}>
                                  {pickupRaisedToDeliveredTatDays !== null ? `${pickupRaisedToDeliveredTatDays} day${pickupRaisedToDeliveredTatDays === 1 ? "" : "s"}` : "N/A"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">TAT (Creation to Delivered)</p>
                              <div className="mt-1">
                                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getTatBadgeClass(creationTatDays)}`}>
                                  {creationTatDays !== null ? `${creationTatDays} day${creationTatDays === 1 ? "" : "s"}` : "N/A"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">TAT (Completion to Delivered)</p>
                              <div className="mt-1">
                                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getTatBadgeClass(completionTatDays)}`}>
                                  {completionTatDays !== null ? `${completionTatDays} day${completionTatDays === 1 ? "" : "s"}` : "N/A"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Delivered Date</p>
                              <p className="text-sm text-slate-700 mt-1">{trip.deliveredDate || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Asset Trackers</p>
                              <p className="text-xs text-slate-700 mt-1 max-h-12 overflow-y-auto">
                                {trip.serialNumbers && trip.serialNumbers.length > 0
                                  ? trip.serialNumbers.join(", ")
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleView(trip);
                                  setModalOpen(false);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleEdit(trip);
                                  setModalOpen(false);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleDeleteClick(trip);
                                  setModalOpen(false);
                                }}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-12 text-center">
                    <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-900">No trips found</p>
                    <p className="text-sm text-slate-600 mt-1">
                      There are no trips in this category with the current filters applied.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* STOCK DEFICIENCY SECTION - 80% THRESHOLD */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Stock Deficiency Monitor (80% Threshold)
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Asset trackers needed at each location to reach 80% capacity
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              {stockDeficiency.filter(s => s.status === 'critical').length} Critical
            </p>
            <p className="text-xs text-red-600">
              {stockDeficiency.reduce((sum, s) => sum + s.deficiency, 0)} total needed
            </p>
          </div>
        </div>

        {stockDeficiency.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                    Location
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    In Use
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Available
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Max Capacity
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Utilization
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Asset Trackers Needed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockDeficiency.map((stock, index) => (
                  <tr
                    key={index}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      stock.status === "critical" ? "bg-red-50" : stock.status === "warning" ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {stock.source}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-1 rounded text-sm font-bold bg-amber-100 text-amber-700">
                        {stock.devicesInUse}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-1 rounded text-sm font-bold bg-emerald-100 text-emerald-700">
                        {stock.availableDevices}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700">
                      {stock.maxCapacity}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              stock.status === "critical"
                                ? "bg-red-600"
                                : stock.status === "warning"
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                            style={{ width: `${Math.min(stock.utilization, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-10">
                          {stock.utilization.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        stock.deficiency === 0
                          ? "bg-emerald-100 text-emerald-700"
                          : stock.deficiency <= 10
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {stock.deficiency > 0 ? `+${stock.deficiency}` : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        stock.status === "critical"
                          ? "bg-red-100 text-red-700"
                          : stock.status === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {stock.status === "critical" && <AlertTriangle className="h-3 w-3" />}
                        {stock.status === "warning" && <AlertCircle className="h-3 w-3" />}
                        {stock.status === "optimal" && <CheckCircle className="h-3 w-3" />}
                        {stock.status.charAt(0).toUpperCase() + stock.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-6 text-center">
            <TrendingDown className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              No stock data available. Connect to Google Sheets to see stock deficiency information.
            </p>
          </div>
        )}

        {/* Critical Alerts */}
        {stockDeficiency.filter(s => s.status === 'critical').length > 0 && (
          <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Critical Stock Alert</p>
                <p className="text-sm text-red-700 mt-1">
                  {stockDeficiency
                    .filter(s => s.status === 'critical')
                    .map(s => `${s.source}: ${s.deficiency} asset trackers needed`)
                    .join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stock Deficiency Monitor Section */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pending & Awaiting Trips
            </h2>
            <p className="text-sm text-slate-600">
              Trips awaiting departure or confirmation
            </p>
          </div>
          {filteredTrips.filter(
            (s) =>
              s.tripStatus?.toLowerCase().includes("awaiting") ||
              s.packetStatus?.toLowerCase().includes("pending")
          ).length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-red-600"></div>
              <span className="text-sm font-medium text-red-700">
                {
                  filteredTrips.filter(
                    (s) =>
                      s.tripStatus?.toLowerCase().includes("awaiting") ||
                      s.packetStatus?.toLowerCase().includes("pending")
                  ).length
                }{" "}
                Pending
              </span>
            </div>
          )}
        </div>

        {filteredTrips.filter(
          (s) =>
            s.tripStatus?.toLowerCase().includes("awaiting") ||
            s.packetStatus?.toLowerCase().includes("pending")
        ).length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredTrips
              .filter(
                (s) =>
                  s.tripStatus?.toLowerCase().includes("awaiting") ||
                  s.packetStatus?.toLowerCase().includes("pending")
              )
              .slice(0, 4)
              .map((trip, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-red-50 p-4 border border-red-200"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {trip.tripId}
                    </p>
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                      {trip.tripStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    {trip.sourceAddress} → {trip.destinationAddress}
                  </p>
                  <p className="text-xs text-slate-600">
                    Packet: <span className="font-medium">{trip.packetStatus}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Transporter: <span className="font-medium">{trip.transporterName}</span>
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(trip)}
                      className="flex items-center gap-1 text-xs h-7"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(trip)}
                      className="flex items-center gap-1 text-xs h-7"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(trip)}
                      className="flex items-center gap-1 text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
            <p className="text-sm font-medium text-emerald-900">
              All trips are on track
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              No pending or awaiting trips
            </p>
          </div>
        )}
      </div>
      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500">
        <p>Displaying {filteredTrips.length} of {trips.length} trips</p>
      </div>

      {/* Trip Form Modal */}
      <TripFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        trip={editingTrip}
        nextSNo={trips.length + 1}
        loading={operationLoading}
        sourceOptions={uniqueOrigins.filter(o => o !== "All")}
        destinationOptions={uniqueDestinations.filter(d => d !== "All")}
        modeOptions={uniqueModes.filter((m) => m !== "All")}
      />

      {/* Trip Detail Modal */}
      <TripDetailModal
        open={!!viewTrip}
        onClose={() => setViewTrip(null)}
        trip={viewTrip}
      />

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
              className="bg-red-600 hover:bg-red-700"
            >
              {operationLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Deleting...</span>
                </div>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}