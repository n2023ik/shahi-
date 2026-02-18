import { useState, useEffect } from "react";
import { Trip, TripStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TripFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (trip: Trip) => void;
  trip?: Trip | null;
  nextSNo: number;
}

const statuses: TripStatus[] = ["Completed", "In-Transit", "Mapped", "Trip Not Created"];

const emptyTrip = (sNo: number): Trip => ({
  sNo,
  tripCreationDate: new Date().toISOString().split("T")[0],
  tripCompletionDate: "",
  tripId: `TRP${String(10000 + sNo).padStart(6, "0")}`,
  vehicleNo: "",
  assetTracker: "",
  sourceAddress: "",
  destinationAddress: "",
  transporterName: "",
  tripStatus: "Mapped",
  packetStatus: "Pending",
  pickupRaisedOn: "",
  taskId: "",
  zohoTicketId: "",
  actualPickupDate: "",
  deliveredDate: "",
  remarks: "",
});

export default function TripFormModal({ open, onClose, onSave, trip, nextSNo }: TripFormModalProps) {
  const [form, setForm] = useState<Trip>(emptyTrip(nextSNo));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(trip ? { ...trip } : emptyTrip(nextSNo));
    setErrors({});
  }, [trip, nextSNo, open]);

  const update = (field: keyof Trip, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vehicleNo.trim()) e.vehicleNo = "Required";
    if (!form.sourceAddress.trim()) e.sourceAddress = "Required";
    if (!form.destinationAddress.trim()) e.destinationAddress = "Required";
    if (!form.transporterName.trim()) e.transporterName = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSave(form);
  };

  const Field = ({ label, field, type = "text" }: { label: string; field: keyof Trip; type?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={String(form[field])}
        onChange={(e) => update(field, e.target.value)}
        className="bg-secondary border-border"
      />
      {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg">{trip ? "Edit Trip" : "Create New Trip"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Trip ID" field="tripId" />
          <Field label="Vehicle No." field="vehicleNo" />
          <Field label="Asset Tracker" field="assetTracker" />
          <Field label="Transporter Name" field="transporterName" />
          <Field label="Source Address" field="sourceAddress" />
          <Field label="Destination Address" field="destinationAddress" />
          <Field label="Trip Creation Date" field="tripCreationDate" type="date" />
          <Field label="Trip Completion Date" field="tripCompletionDate" type="date" />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Trip Status</Label>
            <Select value={form.tripStatus} onValueChange={(v) => update("tripStatus", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="Pickup Raised On" field="pickupRaisedOn" type="date" />
          <Field label="Task ID" field="taskId" />
          <Field label="Zoho Ticket ID" field="zohoTicketId" />
          <Field label="Actual Pickup Date" field="actualPickupDate" type="date" />
          <Field label="Delivered Date" field="deliveredDate" type="date" />
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              className="bg-secondary border-border"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="glow-primary">
            {trip ? "Update Trip" : "Create Trip"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
