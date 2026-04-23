import { useState, useEffect } from "react";
import { Trip, TripStatus } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TripFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (trip: Trip) => void;
  trip?: Trip | null;
  nextSNo: number;
  loading?: boolean;
  sourceOptions?: string[];
  destinationOptions?: string[];
  modeOptions?: string[];
}

const statuses: TripStatus[] = [
  "Trip Completed",
  "In Transit",
  "Awaiting to Departure",
  "Trip Not Created",
  "Trip Cancel",
  "Offline",
];

const packetStatuses = [
  "Pending",
  "Pickup Raised",
  "Pickup Done",
  "In Transit",
  "Delivered",
  "RTO",
  "Lost",
  "Damaged",
];

const defaultModeOptions = ["LSD", "KNITS", "M&B"];

const todayISO = () =>
  new Date().toISOString().slice(0, 10);

const DATE_FIELDS: Array<keyof Trip> = [
  "tripCreationDate",
  "tripCompletionDate",
  "pickupRaisedOn",
  "actualPickupDate",
  "deliveredDate",
];

const DDMMYYYY_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toInputDate(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (ISO_DATE_REGEX.test(trimmed)) return trimmed;

  if (DDMMYYYY_REGEX.test(trimmed)) {
    const [day, month, year] = trimmed.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

function toSheetDate(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (DDMMYYYY_REGEX.test(trimmed)) return trimmed;

  if (ISO_DATE_REGEX.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return `${day}/${month}/${year}`;
  }

  return trimmed;
}

function parseComparableDate(value: string): Date | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  if (DDMMYYYY_REGEX.test(trimmed)) {
    const [day, month, year] = trimmed.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (ISO_DATE_REGEX.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type FieldProps = {
  label: string;
  field: keyof Trip;
  value: string;
  error?: string;
  onChange: (field: keyof Trip, value: string) => void;
  type?: string;
  readOnly?: boolean;
};

function FormField({
  label,
  field,
  value,
  error,
  onChange,
  type = "text",
  readOnly = false,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(field, e.target.value)}
      />
      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const emptyTrip = (sNo: number): Trip => ({
  sNo,
  tripCreationDate: todayISO(),
  tripCompletionDate: "",
  tripId: `TRP${String(10000 + sNo).padStart(6, "0")}`,
  vehicleNo: "",
  assetTracker: "",
  mode: "LSD",
  sourceAddress: "",
  destinationAddress: "",
  transporterName: "",
  tripStatus: "Awaiting to Departure",
  packetStatus: "Pending",
  pickupStatus: "",
  pickupRaisedOn: "",
  taskId: "",
  zohoTicketId: "",
  actualPickupDate: "",
  deliveredDate: "",
  remarks: "",
});

export default function TripFormModal({
  open,
  onClose,
  onSave,
  trip,
  nextSNo,
  loading = false,
  sourceOptions = [],
  destinationOptions = [],
  modeOptions = defaultModeOptions,
}: TripFormModalProps) {
  const normalizeTripDatesForInput = (tripData: Trip): Trip => ({
    ...tripData,
    tripCreationDate: toInputDate(String(tripData.tripCreationDate || "")),
    tripCompletionDate: toInputDate(String(tripData.tripCompletionDate || "")),
    pickupRaisedOn: toInputDate(String(tripData.pickupRaisedOn || "")),
    actualPickupDate: toInputDate(String(tripData.actualPickupDate || "")),
    deliveredDate: toInputDate(String(tripData.deliveredDate || "")),
  });

  const [form, setForm] = useState<Trip>(
    emptyTrip(nextSNo)
  );
  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setForm(trip ? normalizeTripDatesForInput({ ...trip }) : emptyTrip(nextSNo));
    setErrors({});
  }, [trip, nextSNo, open]);

  const update = (field: keyof Trip, value: string) => {
    setForm((prev) => {
      if (field === "sNo") {
        const parsed = Number(value);
        return {
          ...prev,
          sNo: Number.isFinite(parsed) && parsed > 0 ? parsed : prev.sNo,
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const normalizeText = (value: unknown) => String(value ?? "").trim();

  const validate = () => {
    const e: Record<string, string> = {};

    const creationDate = parseComparableDate(form.tripCreationDate);
    const completionDate = parseComparableDate(form.tripCompletionDate);
    const pickupRaisedDate = parseComparableDate(form.pickupRaisedOn);
    const actualPickupDate = parseComparableDate(form.actualPickupDate);

    if (!form.vehicleNo.trim())
      e.vehicleNo = "Required";

    if (!form.sourceAddress.trim())
      e.sourceAddress = "Required";

    if (!form.destinationAddress.trim())
      e.destinationAddress = "Required";

    if (!form.transporterName.trim())
      e.transporterName = "Required";

    // Logical validations
    if (completionDate && creationDate && completionDate < creationDate) {
      e.tripCompletionDate =
        "Completion cannot be before creation";
    }

    if (actualPickupDate && pickupRaisedDate && actualPickupDate < pickupRaisedDate) {
      e.actualPickupDate =
        "Actual pickup cannot be before raised date";
    }

    if (
      form.tripStatus === "Trip Completed" &&
      !form.tripCompletionDate
    ) {
      e.tripCompletionDate =
        "Completion date required for completed trip";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const normalizedTripId = normalizeText(form.tripId) || `TRP${String(10000 + nextSNo).padStart(6, "0")}`;

      const normalizedForm: Trip = {
        ...form,
        sNo: Number.isFinite(Number(form.sNo)) ? Number(form.sNo) : nextSNo,
        tripId: normalizedTripId,
        vehicleNo: normalizeText(form.vehicleNo),
        assetTracker: normalizeText(form.assetTracker),
        mode: normalizeText(form.mode),
        sourceAddress: normalizeText(form.sourceAddress),
        destinationAddress: normalizeText(form.destinationAddress),
        transporterName: normalizeText(form.transporterName),
        packetStatus: normalizeText(form.packetStatus),
        pickupStatus: normalizeText(form.pickupStatus),
        taskId: normalizeText(form.taskId),
        zohoTicketId: normalizeText(form.zohoTicketId),
        remarks: normalizeText(form.remarks),
      };

      DATE_FIELDS.forEach((field) => {
        normalizedForm[field] = toSheetDate(String(normalizedForm[field] || ""));
      });

      onSave(normalizedForm);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trip ? "Edit Trip" : "Create Trip"}
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Enter values and click {trip ? "Update" : "Create"}. Both numeric and text inputs are supported.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <FormField
            label="Trip ID"
            field="tripId"
            value={String(form.tripId ?? "")}
            onChange={update}
            error={errors.tripId}
          />

          <FormField
            label="Vehicle No."
            field="vehicleNo"
            value={String(form.vehicleNo ?? "")}
            onChange={update}
            error={errors.vehicleNo}
          />
          <FormField
            label="Asset Tracker"
            field="assetTracker"
            value={String(form.assetTracker ?? "")}
            onChange={update}
            error={errors.assetTracker}
          />
          <FormField
            label="Transporter"
            field="transporterName"
            value={String(form.transporterName ?? "")}
            onChange={update}
            error={errors.transporterName}
          />
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase">
              Mode
            </Label>
            <Select
              value={form.mode || "LSD"}
              onValueChange={(v) => update("mode", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set([...defaultModeOptions, ...modeOptions.filter(Boolean)])).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase">
              Source
            </Label>
            <Select
              value={form.sourceAddress || "__none"}
              onValueChange={(v) => update("sourceAddress", v === "__none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Select source</SelectItem>
                {sourceOptions.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sourceAddress && (
              <p className="text-xs text-red-600">{errors.sourceAddress}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase">
              Destination
            </Label>
            <Select
              value={form.destinationAddress || "__none"}
              onValueChange={(v) => update("destinationAddress", v === "__none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Select destination</SelectItem>
                {destinationOptions.map((destination) => (
                  <SelectItem key={destination} value={destination}>
                    {destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.destinationAddress && (
              <p className="text-xs text-red-600">{errors.destinationAddress}</p>
            )}
          </div>
          <FormField
            label="Trip Creation"
            field="tripCreationDate"
            value={String(form.tripCreationDate ?? "")}
            onChange={update}
            error={errors.tripCreationDate}
            type="date"
          />
          <FormField
            label="Trip Completion"
            field="tripCompletionDate"
            value={String(form.tripCompletionDate ?? "")}
            onChange={update}
            error={errors.tripCompletionDate}
            type="date"
          />

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase">
              Trip Status
            </Label>
            <Select
              value={form.tripStatus}
              onValueChange={(v) =>
                update("tripStatus", v)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase">
              Packet Status
            </Label>
            <Select
              value={form.packetStatus || "Pending"}
              onValueChange={(v) =>
                update("packetStatus", v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {packetStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormField
            label="Pickup Raised On"
            field="pickupRaisedOn"
            value={String(form.pickupRaisedOn ?? "")}
            onChange={update}
            error={errors.pickupRaisedOn}
            type="date"
          />
          <FormField
            label="Actual Pickup"
            field="actualPickupDate"
            value={String(form.actualPickupDate ?? "")}
            onChange={update}
            error={errors.actualPickupDate}
            type="date"
          />
          <FormField
            label="Delivered Date"
            field="deliveredDate"
            value={String(form.deliveredDate ?? "")}
            onChange={update}
            error={errors.deliveredDate}
            type="date"
          />
          <FormField
            label="Task ID"
            field="taskId"
            value={String(form.taskId ?? "")}
            onChange={update}
            error={errors.taskId}
          />
          <FormField
            label="Zoho Ticket"
            field="zohoTicketId"
            value={String(form.zohoTicketId ?? "")}
            onChange={update}
            error={errors.zohoTicketId}
          />

          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs font-semibold uppercase">
              Remarks
            </Label>
            <Textarea
              value={form.remarks}
              onChange={(e) =>
                update("remarks", e.target.value)
              }
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                <span>{trip ? "Updating..." : "Creating..."}</span>
              </div>
            ) : (
              trip ? "Update Trip" : "Create Trip"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}