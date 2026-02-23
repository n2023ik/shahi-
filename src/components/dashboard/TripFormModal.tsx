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
}

const statuses: TripStatus[] = [
  "Trip Completed",
  "In Transit",
  "Awaiting to Departure",
  "Trip Not Created",
];

const todayISO = () =>
  new Date().toISOString().slice(0, 10);

const emptyTrip = (sNo: number): Trip => ({
  sNo,
  tripCreationDate: todayISO(),
  tripCompletionDate: "",
  tripId: `TRP${String(10000 + sNo).padStart(6, "0")}`,
  vehicleNo: "",
  assetTracker: "",
  sourceAddress: "",
  destinationAddress: "",
  transporterName: "",
  tripStatus: "Awaiting to Departure",
  packetStatus: "Pending",
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
}: TripFormModalProps) {
  const [form, setForm] = useState<Trip>(
    emptyTrip(nextSNo)
  );
  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setForm(trip ? { ...trip } : emptyTrip(nextSNo));
    setErrors({});
  }, [trip, nextSNo, open]);

  const update = (field: keyof Trip, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const e: Record<string, string> = {};

    if (!form.vehicleNo.trim())
      e.vehicleNo = "Required";

    if (!form.sourceAddress.trim())
      e.sourceAddress = "Required";

    if (!form.destinationAddress.trim())
      e.destinationAddress = "Required";

    if (!form.transporterName.trim())
      e.transporterName = "Required";

    // Logical validations
    if (
      form.tripCompletionDate &&
      form.tripCompletionDate <
        form.tripCreationDate
    ) {
      e.tripCompletionDate =
        "Completion cannot be before creation";
    }

    if (
      form.actualPickupDate &&
      form.pickupRaisedOn &&
      form.actualPickupDate < form.pickupRaisedOn
    ) {
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
      onSave(form);
    }
  };

  const Field = ({
    label,
    field,
    type = "text",
    readOnly = false,
  }: {
    label: string;
    field: keyof Trip;
    type?: string;
    readOnly?: boolean;
  }) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase">
        {label}
      </Label>
      <Input
        type={type}
        value={String(form[field] ?? "")}
        readOnly={readOnly}
        onChange={(e) =>
          update(field, e.target.value)
        }
      />
      {errors[field] && (
        <p className="text-xs text-red-600">
          {errors[field]}
        </p>
      )}
    </div>
  );

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
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Field
            label="Trip ID"
            field="tripId"
            readOnly
          />

          <Field
            label="Vehicle No."
            field="vehicleNo"
          />
          <Field
            label="Asset Tracker"
            field="assetTracker"
          />
          <Field
            label="Transporter"
            field="transporterName"
          />
          <Field
            label="Source"
            field="sourceAddress"
          />
          <Field
            label="Destination"
            field="destinationAddress"
          />
          <Field
            label="Trip Creation"
            field="tripCreationDate"
            type="date"
          />
          <Field
            label="Trip Completion"
            field="tripCompletionDate"
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

          <Field
            label="Pickup Raised On"
            field="pickupRaisedOn"
            type="date"
          />
          <Field
            label="Actual Pickup"
            field="actualPickupDate"
            type="date"
          />
          <Field
            label="Delivered Date"
            field="deliveredDate"
            type="date"
          />
          <Field label="Task ID" field="taskId" />
          <Field
            label="Zoho Ticket"
            field="zohoTicketId"
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
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {trip ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}