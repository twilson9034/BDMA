import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Disc, CircleDot, Plus, Minus, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface BrakeAxle {
  axlePosition: number;
  axleLabel: string;
  brakeType: string | null;
  measurementUnit: string | null;
  minThickness: string | null;
}

interface TireAxle {
  axlePosition: number;
  axleLabel: string;
  tireConfig: string | null;
  targetPsiLeft: string | null;
  targetPsiRight: string | null;
  targetPsiInnerLeft: string | null;
  targetPsiInnerRight: string | null;
  treadUnit: string | null;
  minTreadDepth: string | null;
  tireSize: string | null;
}

interface BrakeSettingsData {
  settings: {
    id?: number;
    axleCount: number;
    measurementMode: string;
    defaultMeasurementUnit: string;
    minBrakeThickness: string | null;
    minStrokeMeasurement: string | null;
    notes: string | null;
  } | null;
  axles: BrakeAxle[];
}

interface TireSettingsData {
  settings: {
    id?: number;
    axleCount: number;
    defaultTreadUnit: string;
    minTreadDepth: string | null;
    notes: string | null;
  } | null;
  axles: TireAxle[];
}

const BRAKE_TYPES = [
  { value: "drum", label: "Drum" },
  { value: "disc", label: "Disc" },
  { value: "air_disc", label: "Air Disc" },
  { value: "hydraulic_disc", label: "Hydraulic Disc" },
  { value: "electric", label: "Electric" },
];

const MEASUREMENT_UNITS = [
  { value: "32nds", label: "32nds of inch" },
  { value: "inches", label: "Inches" },
  { value: "mm", label: "Millimeters" },
];

const BRAKE_MEASUREMENT_MODES = [
  { value: "stroke", label: "Stroke Measurement Only" },
  { value: "pad_thickness", label: "Pad Thickness Only" },
  { value: "both", label: "Both (Stroke & Pad)" },
  { value: "na", label: "N/A (Not Applicable)" },
];

const TIRE_CONFIGS = [
  { value: "single", label: "Single" },
  { value: "dual", label: "Dual" },
  { value: "super_single", label: "Super Single" },
];

const AXLE_LABELS = ["Steer", "Drive 1", "Drive 2", "Tag", "Pusher", "Trailer 1", "Trailer 2", "Trailer 3"];

function generateDefaultAxles(count: number, type: 'brake' | 'tire'): BrakeAxle[] | TireAxle[] {
  const axles = [];
  for (let i = 1; i <= count; i++) {
    const label = AXLE_LABELS[i - 1] || `Axle ${i}`;
    if (type === 'brake') {
      axles.push({
        axlePosition: i,
        axleLabel: label,
        brakeType: i === 1 ? "disc" : "drum",
        measurementUnit: "32nds",
        minThickness: null,
      });
    } else {
      axles.push({
        axlePosition: i,
        axleLabel: label,
        tireConfig: i === 1 ? "single" : "dual",
        targetPsiLeft: "100",
        targetPsiRight: "100",
        targetPsiInnerLeft: null,
        targetPsiInnerRight: null,
        treadUnit: "32nds",
        minTreadDepth: "4",
        tireSize: null,
      });
    }
  }
  return axles as any;
}

interface Props {
  assetId: number;
  assetType?: string;
}

export function BrakeTireSettings({ assetId, assetType }: Props) {
  const { toast } = useToast();
  
  const [brakeAxleCount, setBrakeAxleCount] = useState(2);
  const [brakeMeasurementMode, setBrakeMeasurementMode] = useState("both");
  const [brakeUnit, setBrakeUnit] = useState("32nds");
  const [brakeAxles, setBrakeAxles] = useState<BrakeAxle[]>([]);
  const [brakeMinThickness, setBrakeMinThickness] = useState("");
  const [brakeMinStroke, setBrakeMinStroke] = useState("");
  
  const [tireAxleCount, setTireAxleCount] = useState(2);
  const [tireUnit, setTireUnit] = useState("32nds");
  const [tireAxles, setTireAxles] = useState<TireAxle[]>([]);
  const [tireMinDepth, setTireMinDepth] = useState("4");

  const { data: brakeData, isLoading: brakeLoading } = useQuery<BrakeSettingsData>({
    queryKey: ["/api/assets", assetId, "brake-settings"],
    enabled: !!assetId,
  });

  const { data: tireData, isLoading: tireLoading } = useQuery<TireSettingsData>({
    queryKey: ["/api/assets", assetId, "tire-settings"],
    enabled: !!assetId,
  });

  useEffect(() => {
    if (brakeData?.settings) {
      setBrakeAxleCount(brakeData.settings.axleCount);
      setBrakeMeasurementMode(brakeData.settings.measurementMode || "both");
      setBrakeUnit(brakeData.settings.defaultMeasurementUnit || "32nds");
      setBrakeMinThickness(brakeData.settings.minBrakeThickness || "");
      setBrakeMinStroke(brakeData.settings.minStrokeMeasurement || "");
      setBrakeAxles(brakeData.axles);
    } else if (!brakeLoading && brakeAxles.length === 0) {
      setBrakeAxles(generateDefaultAxles(2, 'brake') as BrakeAxle[]);
    }
  }, [brakeData, brakeLoading]);

  useEffect(() => {
    if (tireData?.settings) {
      setTireAxleCount(tireData.settings.axleCount);
      setTireUnit(tireData.settings.defaultTreadUnit || "32nds");
      setTireMinDepth(tireData.settings.minTreadDepth || "4");
      setTireAxles(tireData.axles);
    } else if (!tireLoading && tireAxles.length === 0) {
      setTireAxles(generateDefaultAxles(2, 'tire') as TireAxle[]);
    }
  }, [tireData, tireLoading]);

  const saveBrakeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/assets/${assetId}/brake-settings`, {
        settings: {
          axleCount: brakeAxleCount,
          measurementMode: brakeMeasurementMode,
          defaultMeasurementUnit: brakeUnit,
          minBrakeThickness: brakeMinThickness || null,
          minStrokeMeasurement: brakeMinStroke || null,
        },
        axles: brakeAxles.map((a, i) => ({ ...a, axlePosition: i + 1 })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "brake-settings"] });
      toast({ title: "Brake settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save brake settings", variant: "destructive" });
    },
  });

  const saveTireMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/assets/${assetId}/tire-settings`, {
        settings: {
          axleCount: tireAxleCount,
          defaultTreadUnit: tireUnit,
          minTreadDepth: tireMinDepth || null,
        },
        axles: tireAxles.map((a, i) => ({ ...a, axlePosition: i + 1 })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "tire-settings"] });
      toast({ title: "Tire settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save tire settings", variant: "destructive" });
    },
  });

  const addBrakeAxle = () => {
    const newPosition = brakeAxles.length + 1;
    const label = AXLE_LABELS[newPosition - 1] || `Axle ${newPosition}`;
    setBrakeAxles([...brakeAxles, {
      axlePosition: newPosition,
      axleLabel: label,
      brakeType: "drum",
      measurementUnit: brakeUnit,
      minThickness: null,
    }]);
    setBrakeAxleCount(brakeAxleCount + 1);
  };

  const removeBrakeAxle = () => {
    if (brakeAxles.length > 1) {
      setBrakeAxles(brakeAxles.slice(0, -1));
      setBrakeAxleCount(brakeAxleCount - 1);
    }
  };

  const addTireAxle = () => {
    const newPosition = tireAxles.length + 1;
    const label = AXLE_LABELS[newPosition - 1] || `Axle ${newPosition}`;
    setTireAxles([...tireAxles, {
      axlePosition: newPosition,
      axleLabel: label,
      tireConfig: "dual",
      targetPsiLeft: "100",
      targetPsiRight: "100",
      targetPsiInnerLeft: null,
      targetPsiInnerRight: null,
      treadUnit: tireUnit,
      minTreadDepth: tireMinDepth,
      tireSize: null,
    }]);
    setTireAxleCount(tireAxleCount + 1);
  };

  const removeTireAxle = () => {
    if (tireAxles.length > 1) {
      setTireAxles(tireAxles.slice(0, -1));
      setTireAxleCount(tireAxleCount - 1);
    }
  };

  const updateBrakeAxle = (index: number, field: keyof BrakeAxle, value: string | null) => {
    const updated = [...brakeAxles];
    updated[index] = { ...updated[index], [field]: value };
    setBrakeAxles(updated);
  };

  const updateTireAxle = (index: number, field: keyof TireAxle, value: string | null) => {
    const updated = [...tireAxles];
    updated[index] = { ...updated[index], [field]: value };
    setTireAxles(updated);
  };

  if (assetType === "vehicle") {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card data-testid="card-brake-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Disc className="h-5 w-5" />
            Brake Settings
          </CardTitle>
          <CardDescription>Configure brake types and measurement settings per axle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Measurement Type</Label>
              <Select value={brakeMeasurementMode} onValueChange={setBrakeMeasurementMode}>
                <SelectTrigger data-testid="select-brake-measurement-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAKE_MEASUREMENT_MODES.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {brakeMeasurementMode !== "na" && (
              <div className="flex-1">
                <Label>Default Measurement Unit</Label>
                <Select value={brakeUnit} onValueChange={setBrakeUnit}>
                  <SelectTrigger data-testid="select-brake-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEASUREMENT_UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {brakeMeasurementMode !== "na" && (
            <div className="flex items-center gap-4">
              {(brakeMeasurementMode === "pad_thickness" || brakeMeasurementMode === "both") && (
                <div className="flex-1">
                  <Label>Min Pad Thickness</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={brakeMinThickness}
                    onChange={(e) => setBrakeMinThickness(e.target.value)}
                    placeholder="e.g., 4"
                    data-testid="input-brake-min-thickness"
                  />
                </div>
              )}
              {(brakeMeasurementMode === "stroke" || brakeMeasurementMode === "both") && (
                <div className="flex-1">
                  <Label>Min Stroke Measurement</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={brakeMinStroke}
                    onChange={(e) => setBrakeMinStroke(e.target.value)}
                    placeholder="e.g., 1.5"
                    data-testid="input-brake-min-stroke"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Axles ({brakeAxles.length})</Label>
            <div className="flex gap-2">
              <Button type="button" size="icon" variant="outline" onClick={removeBrakeAxle} disabled={brakeAxles.length <= 1} data-testid="button-remove-brake-axle">
                <Minus className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="outline" onClick={addBrakeAxle} data-testid="button-add-brake-axle">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {brakeAxles.map((axle, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={axle.axleLabel}
                      onChange={(e) => updateBrakeAxle(idx, 'axleLabel', e.target.value)}
                      placeholder="Axle name"
                      data-testid={`input-brake-axle-label-${idx}`}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Brake Type</Label>
                    <Select value={axle.brakeType || "drum"} onValueChange={(v) => updateBrakeAxle(idx, 'brakeType', v)}>
                      <SelectTrigger data-testid={`select-brake-type-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAKE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={() => saveBrakeMutation.mutate()} disabled={saveBrakeMutation.isPending} className="w-full" data-testid="button-save-brake-settings">
            {saveBrakeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Brake Settings
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-tire-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDot className="h-5 w-5" />
            Tire Settings
          </CardTitle>
          <CardDescription>Configure tire configurations and PSI targets per axle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Tread Measurement Unit</Label>
              <Select value={tireUnit} onValueChange={setTireUnit}>
                <SelectTrigger data-testid="select-tire-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_UNITS.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Min Tread Depth</Label>
              <Input
                type="number"
                step="0.001"
                value={tireMinDepth}
                onChange={(e) => setTireMinDepth(e.target.value)}
                placeholder="e.g., 4"
                data-testid="input-tire-min-depth"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Axles ({tireAxles.length})</Label>
            <div className="flex gap-2">
              <Button type="button" size="icon" variant="outline" onClick={removeTireAxle} disabled={tireAxles.length <= 1} data-testid="button-remove-tire-axle">
                <Minus className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="outline" onClick={addTireAxle} data-testid="button-add-tire-axle">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {tireAxles.map((axle, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={axle.axleLabel}
                      onChange={(e) => updateTireAxle(idx, 'axleLabel', e.target.value)}
                      placeholder="Axle name"
                      data-testid={`input-tire-axle-label-${idx}`}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Configuration</Label>
                    <Select value={axle.tireConfig || "single"} onValueChange={(v) => updateTireAxle(idx, 'tireConfig', v)}>
                      <SelectTrigger data-testid={`select-tire-config-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIRE_CONFIGS.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Target PSI (Left)</Label>
                    <Input
                      type="number"
                      value={axle.targetPsiLeft || ""}
                      onChange={(e) => updateTireAxle(idx, 'targetPsiLeft', e.target.value)}
                      placeholder="PSI"
                      data-testid={`input-tire-psi-left-${idx}`}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Target PSI (Right)</Label>
                    <Input
                      type="number"
                      value={axle.targetPsiRight || ""}
                      onChange={(e) => updateTireAxle(idx, 'targetPsiRight', e.target.value)}
                      placeholder="PSI"
                      data-testid={`input-tire-psi-right-${idx}`}
                    />
                  </div>
                  {axle.tireConfig === "dual" && (
                    <>
                      <div className="flex-1">
                        <Label className="text-xs">Inner L PSI</Label>
                        <Input
                          type="number"
                          value={axle.targetPsiInnerLeft || ""}
                          onChange={(e) => updateTireAxle(idx, 'targetPsiInnerLeft', e.target.value)}
                          placeholder="PSI"
                          data-testid={`input-tire-psi-inner-left-${idx}`}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Inner R PSI</Label>
                        <Input
                          type="number"
                          value={axle.targetPsiInnerRight || ""}
                          onChange={(e) => updateTireAxle(idx, 'targetPsiInnerRight', e.target.value)}
                          placeholder="PSI"
                          data-testid={`input-tire-psi-inner-right-${idx}`}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Tire Size</Label>
                    <Input
                      value={axle.tireSize || ""}
                      onChange={(e) => updateTireAxle(idx, 'tireSize', e.target.value)}
                      placeholder="e.g., 295/75R22.5"
                      data-testid={`input-tire-size-${idx}`}
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Min Depth</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={axle.minTreadDepth || ""}
                      onChange={(e) => updateTireAxle(idx, 'minTreadDepth', e.target.value)}
                      placeholder="4.0"
                      data-testid={`input-min-tread-depth-${idx}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={() => saveTireMutation.mutate()} disabled={saveTireMutation.isPending} className="w-full" data-testid="button-save-tire-settings">
            {saveTireMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Tire Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
