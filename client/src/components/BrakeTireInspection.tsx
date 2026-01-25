import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Disc, CircleDot, Plus, Save, Loader2, AlertTriangle, CheckCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const TIRE_CONDITIONS = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "worn", label: "Worn" },
  { value: "critical", label: "Critical" },
  { value: "damaged", label: "Damaged" },
];

interface BrakeInspectionAxle {
  axlePosition: number;
  axleLabel: string;
  leftPadThickness: string | null;
  rightPadThickness: string | null;
  leftRotorThickness: string | null;
  rightRotorThickness: string | null;
  drumMeasurement: string | null;
  notes: string | null;
  passed: boolean;
}

interface TireInspectionAxle {
  axlePosition: number;
  axleLabel: string;
  leftPsi: string | null;
  rightPsi: string | null;
  innerLeftPsi: string | null;
  innerRightPsi: string | null;
  leftTreadDepth: string | null;
  rightTreadDepth: string | null;
  innerLeftTreadDepth: string | null;
  innerRightTreadDepth: string | null;
  leftCondition: string | null;
  rightCondition: string | null;
  notes: string | null;
  passed: boolean;
}

interface Props {
  workOrderId: number;
  assetId: number;
}

export function BrakeTireInspection({ workOrderId, assetId }: Props) {
  const { toast } = useToast();
  const [showBrakeModal, setShowBrakeModal] = useState(false);
  const [showTireModal, setShowTireModal] = useState(false);
  const [showBrakeViewModal, setShowBrakeViewModal] = useState<number | null>(null);
  const [showTireViewModal, setShowTireViewModal] = useState<number | null>(null);

  const [brakeAxles, setBrakeAxles] = useState<BrakeInspectionAxle[]>([]);
  const [brakeNotes, setBrakeNotes] = useState("");
  const [brakePassed, setBrakePassed] = useState(true);

  const [tireAxles, setTireAxles] = useState<TireInspectionAxle[]>([]);
  const [tireNotes, setTireNotes] = useState("");
  const [tirePassed, setTirePassed] = useState(true);

  const { data: brakeSettings } = useQuery<{ settings: any; axles: any[] }>({
    queryKey: ["/api/assets", assetId, "brake-settings"],
    enabled: !!assetId,
  });

  const { data: tireSettings } = useQuery<{ settings: any; axles: any[] }>({
    queryKey: ["/api/assets", assetId, "tire-settings"],
    enabled: !!assetId,
  });

  const { data: brakeInspections, refetch: refetchBrakeInspections } = useQuery<any[]>({
    queryKey: ["/api/work-orders", workOrderId, "brake-inspections"],
    enabled: !!workOrderId,
  });

  const { data: tireInspections, refetch: refetchTireInspections } = useQuery<any[]>({
    queryKey: ["/api/work-orders", workOrderId, "tire-inspections"],
    enabled: !!workOrderId,
  });

  useEffect(() => {
    if (brakeSettings?.axles && brakeSettings.axles.length > 0) {
      setBrakeAxles(brakeSettings.axles.map(a => ({
        axlePosition: a.axlePosition,
        axleLabel: a.axleLabel,
        leftPadThickness: null,
        rightPadThickness: null,
        leftRotorThickness: null,
        rightRotorThickness: null,
        drumMeasurement: null,
        notes: null,
        passed: true,
      })));
    } else {
      setBrakeAxles([
        { axlePosition: 1, axleLabel: "Steer", leftPadThickness: null, rightPadThickness: null, leftRotorThickness: null, rightRotorThickness: null, drumMeasurement: null, notes: null, passed: true },
        { axlePosition: 2, axleLabel: "Drive 1", leftPadThickness: null, rightPadThickness: null, leftRotorThickness: null, rightRotorThickness: null, drumMeasurement: null, notes: null, passed: true },
      ]);
    }
  }, [brakeSettings]);

  useEffect(() => {
    if (tireSettings?.axles && tireSettings.axles.length > 0) {
      setTireAxles(tireSettings.axles.map(a => ({
        axlePosition: a.axlePosition,
        axleLabel: a.axleLabel,
        leftPsi: null,
        rightPsi: null,
        innerLeftPsi: null,
        innerRightPsi: null,
        leftTreadDepth: null,
        rightTreadDepth: null,
        innerLeftTreadDepth: null,
        innerRightTreadDepth: null,
        leftCondition: "good",
        rightCondition: "good",
        notes: null,
        passed: true,
      })));
    } else {
      setTireAxles([
        { axlePosition: 1, axleLabel: "Steer", leftPsi: null, rightPsi: null, innerLeftPsi: null, innerRightPsi: null, leftTreadDepth: null, rightTreadDepth: null, innerLeftTreadDepth: null, innerRightTreadDepth: null, leftCondition: "good", rightCondition: "good", notes: null, passed: true },
        { axlePosition: 2, axleLabel: "Drive 1", leftPsi: null, rightPsi: null, innerLeftPsi: null, innerRightPsi: null, leftTreadDepth: null, rightTreadDepth: null, innerLeftTreadDepth: null, innerRightTreadDepth: null, leftCondition: "good", rightCondition: "good", notes: null, passed: true },
      ]);
    }
  }, [tireSettings]);

  const createBrakeInspectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/work-orders/${workOrderId}/brake-inspections`, {
        inspection: {
          assetId,
          notes: brakeNotes || null,
          passed: brakePassed,
          meterReading: null,
        },
        axles: brakeAxles.map(a => ({
          ...a,
          leftPadThickness: a.leftPadThickness || null,
          rightPadThickness: a.rightPadThickness || null,
          leftRotorThickness: a.leftRotorThickness || null,
          rightRotorThickness: a.rightRotorThickness || null,
          drumMeasurement: a.drumMeasurement || null,
        })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "brake-inspections"] });
      toast({ title: "Brake inspection saved" });
      setShowBrakeModal(false);
      setBrakeNotes("");
      setBrakePassed(true);
    },
    onError: () => {
      toast({ title: "Failed to save brake inspection", variant: "destructive" });
    },
  });

  const createTireInspectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/work-orders/${workOrderId}/tire-inspections`, {
        inspection: {
          assetId,
          notes: tireNotes || null,
          passed: tirePassed,
          meterReading: null,
        },
        axles: tireAxles.map(a => ({
          ...a,
          leftPsi: a.leftPsi || null,
          rightPsi: a.rightPsi || null,
          innerLeftPsi: a.innerLeftPsi || null,
          innerRightPsi: a.innerRightPsi || null,
          leftTreadDepth: a.leftTreadDepth || null,
          rightTreadDepth: a.rightTreadDepth || null,
          innerLeftTreadDepth: a.innerLeftTreadDepth || null,
          innerRightTreadDepth: a.innerRightTreadDepth || null,
          leftCondition: a.leftCondition || "good",
          rightCondition: a.rightCondition || "good",
        })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "tire-inspections"] });
      toast({ title: "Tire inspection saved" });
      setShowTireModal(false);
      setTireNotes("");
      setTirePassed(true);
    },
    onError: () => {
      toast({ title: "Failed to save tire inspection", variant: "destructive" });
    },
  });

  const updateBrakeAxle = (index: number, field: keyof BrakeInspectionAxle, value: any) => {
    const updated = [...brakeAxles];
    updated[index] = { ...updated[index], [field]: value };
    setBrakeAxles(updated);
  };

  const updateTireAxle = (index: number, field: keyof TireInspectionAxle, value: any) => {
    const updated = [...tireAxles];
    updated[index] = { ...updated[index], [field]: value };
    setTireAxles(updated);
  };

  return (
    <Card data-testid="card-brake-tire-inspections">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Disc className="h-5 w-5" />
          Brake & Tire Inspections
        </CardTitle>
        <CardDescription>Record detailed brake and tire inspection results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowBrakeModal(true)} variant="outline" data-testid="button-new-brake-inspection">
            <Disc className="h-4 w-4 mr-2" />
            New Brake Inspection
          </Button>
          <Button onClick={() => setShowTireModal(true)} variant="outline" data-testid="button-new-tire-inspection">
            <CircleDot className="h-4 w-4 mr-2" />
            New Tire Inspection
          </Button>
        </div>

        {brakeInspections && brakeInspections.length > 0 && (
          <div className="space-y-2">
            <Label>Brake Inspections</Label>
            <div className="space-y-2">
              {brakeInspections.map((insp: any) => (
                <div key={insp.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={insp.passed ? "default" : "destructive"}>
                      {insp.passed ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                      {insp.passed ? "Passed" : "Failed"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(insp.inspectedAt).toLocaleString()}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowBrakeViewModal(insp.id)} data-testid={`button-view-brake-${insp.id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tireInspections && tireInspections.length > 0 && (
          <div className="space-y-2">
            <Label>Tire Inspections</Label>
            <div className="space-y-2">
              {tireInspections.map((insp: any) => (
                <div key={insp.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={insp.passed ? "default" : "destructive"}>
                      {insp.passed ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                      {insp.passed ? "Passed" : "Failed"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(insp.inspectedAt).toLocaleString()}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowTireViewModal(insp.id)} data-testid={`button-view-tire-${insp.id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Dialog open={showBrakeModal} onOpenChange={setShowBrakeModal}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Brake Inspection</DialogTitle>
              <DialogDescription>Enter brake measurements for each axle</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {brakeAxles.map((axle, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="font-medium">{axle.axleLabel}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Left Pad</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={axle.leftPadThickness || ""}
                        onChange={(e) => updateBrakeAxle(idx, 'leftPadThickness', e.target.value)}
                        placeholder="Thickness"
                        data-testid={`input-brake-left-pad-${idx}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Right Pad</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={axle.rightPadThickness || ""}
                        onChange={(e) => updateBrakeAxle(idx, 'rightPadThickness', e.target.value)}
                        placeholder="Thickness"
                        data-testid={`input-brake-right-pad-${idx}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Left Rotor</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={axle.leftRotorThickness || ""}
                        onChange={(e) => updateBrakeAxle(idx, 'leftRotorThickness', e.target.value)}
                        placeholder="Thickness"
                        data-testid={`input-brake-left-rotor-${idx}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Right Rotor</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={axle.rightRotorThickness || ""}
                        onChange={(e) => updateBrakeAxle(idx, 'rightRotorThickness', e.target.value)}
                        placeholder="Thickness"
                        data-testid={`input-brake-right-rotor-${idx}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={axle.passed}
                      onChange={(e) => updateBrakeAxle(idx, 'passed', e.target.checked)}
                      className="rounded"
                      data-testid={`checkbox-brake-passed-${idx}`}
                    />
                    <Label className="text-xs">Axle Passed</Label>
                  </div>
                </div>
              ))}
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={brakeNotes}
                  onChange={(e) => setBrakeNotes(e.target.value)}
                  placeholder="Inspection notes..."
                  data-testid="textarea-brake-notes"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={brakePassed}
                  onChange={(e) => setBrakePassed(e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-brake-overall-passed"
                />
                <Label>Overall Inspection Passed</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBrakeModal(false)}>Cancel</Button>
              <Button onClick={() => createBrakeInspectionMutation.mutate()} disabled={createBrakeInspectionMutation.isPending} data-testid="button-save-brake-inspection">
                {createBrakeInspectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Inspection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTireModal} onOpenChange={setShowTireModal}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Tire Inspection</DialogTitle>
              <DialogDescription>Enter tire PSI and tread measurements for each axle</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {tireAxles.map((axle, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="font-medium">{axle.axleLabel}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Left PSI</Label>
                      <Input
                        type="number"
                        value={axle.leftPsi || ""}
                        onChange={(e) => updateTireAxle(idx, 'leftPsi', e.target.value)}
                        placeholder="PSI"
                        data-testid={`input-tire-left-psi-${idx}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Right PSI</Label>
                      <Input
                        type="number"
                        value={axle.rightPsi || ""}
                        onChange={(e) => updateTireAxle(idx, 'rightPsi', e.target.value)}
                        placeholder="PSI"
                        data-testid={`input-tire-right-psi-${idx}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Left Tread</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={axle.leftTreadDepth || ""}
                        onChange={(e) => updateTireAxle(idx, 'leftTreadDepth', e.target.value)}
                        placeholder="Depth"
                        data-testid={`input-tire-left-tread-${idx}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Right Tread</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={axle.rightTreadDepth || ""}
                        onChange={(e) => updateTireAxle(idx, 'rightTreadDepth', e.target.value)}
                        placeholder="Depth"
                        data-testid={`input-tire-right-tread-${idx}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Left Condition</Label>
                      <Select value={axle.leftCondition || "good"} onValueChange={(v) => updateTireAxle(idx, 'leftCondition', v)}>
                        <SelectTrigger data-testid={`select-tire-left-condition-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIRE_CONDITIONS.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Right Condition</Label>
                      <Select value={axle.rightCondition || "good"} onValueChange={(v) => updateTireAxle(idx, 'rightCondition', v)}>
                        <SelectTrigger data-testid={`select-tire-right-condition-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIRE_CONDITIONS.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={axle.passed}
                      onChange={(e) => updateTireAxle(idx, 'passed', e.target.checked)}
                      className="rounded"
                      data-testid={`checkbox-tire-passed-${idx}`}
                    />
                    <Label className="text-xs">Axle Passed</Label>
                  </div>
                </div>
              ))}
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={tireNotes}
                  onChange={(e) => setTireNotes(e.target.value)}
                  placeholder="Inspection notes..."
                  data-testid="textarea-tire-notes"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tirePassed}
                  onChange={(e) => setTirePassed(e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-tire-overall-passed"
                />
                <Label>Overall Inspection Passed</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTireModal(false)}>Cancel</Button>
              <Button onClick={() => createTireInspectionMutation.mutate()} disabled={createTireInspectionMutation.isPending} data-testid="button-save-tire-inspection">
                {createTireInspectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Inspection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
