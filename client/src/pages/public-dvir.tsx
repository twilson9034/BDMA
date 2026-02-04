import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Truck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  ClipboardCheck,
  FileText,
} from "lucide-react";

interface AssetInfo {
  asset: {
    id: number;
    name: string;
    assetNumber: string;
    type: string;
    make: string;
    model: string;
    year: number;
  };
  organization: {
    id: number;
    name: string;
  };
}

interface Defect {
  category: string;
  description: string;
  severity: "minor" | "major" | "critical";
}

const defectCategories = [
  "Brakes",
  "Tires",
  "Lights",
  "Engine",
  "Exhaust",
  "Steering",
  "Suspension",
  "Electrical",
  "Body/Exterior",
  "Interior/Cab",
  "Mirrors",
  "Wipers",
  "Horn",
  "Fuel System",
  "Coupling Devices",
  "Emergency Equipment",
  "Other",
];

export default function PublicDvir() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [inspectorName, setInspectorName] = useState("");
  const [status, setStatus] = useState<"safe" | "defects_noted" | "unsafe">("safe");
  const [meterReading, setMeterReading] = useState("");
  const [preTrip, setPreTrip] = useState(true);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");
  const [defects, setDefects] = useState<Defect[]>([]);
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [newDefect, setNewDefect] = useState<Defect>({
    category: "Brakes",
    description: "",
    severity: "minor",
  });
  const [submitted, setSubmitted] = useState(false);

  const { data: assetInfo, isLoading, error } = useQuery<AssetInfo>({
    queryKey: ["/api/public/dvir", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/dvir/${token}`);
      if (!res.ok) throw new Error("Invalid QR code");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/public/dvir/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "DVIR Submitted",
        description: "Your inspection report has been recorded.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit DVIR",
        variant: "destructive",
      });
    },
  });

  const handleAddDefect = () => {
    if (!newDefect.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a description for the defect.",
        variant: "destructive",
      });
      return;
    }
    setDefects([...defects, newDefect]);
    setNewDefect({ category: "Brakes", description: "", severity: "minor" });
    setShowDefectForm(false);
    if (status === "safe") {
      setStatus("defects_noted");
    }
  };

  const handleRemoveDefect = (index: number) => {
    const newDefects = defects.filter((_, i) => i !== index);
    setDefects(newDefects);
    if (newDefects.length === 0 && status === "defects_noted") {
      setStatus("safe");
    }
  };

  const handleSubmit = () => {
    if (!inspectorName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({
      inspectorName,
      status,
      meterReading: meterReading || null,
      preTrip,
      notes: notes || null,
      signature: signature || null,
      defects,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading vehicle information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !assetInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invalid QR Code</h2>
            <p className="text-muted-foreground">
              This QR code is invalid or has expired. Please contact your fleet manager for a new QR code.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">DVIR Submitted</h2>
            <p className="text-muted-foreground mb-6">
              Your inspection report for {assetInfo.asset.name} has been recorded successfully.
            </p>
            <Button onClick={() => setSubmitted(false)} variant="outline" data-testid="button-new-dvir">
              Submit Another Inspection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card data-testid="card-public-dvir">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 text-primary mb-2">
              <ClipboardCheck className="h-6 w-6" />
              <span className="font-semibold">{assetInfo.organization.name}</span>
            </div>
            <CardTitle className="text-2xl">Driver Vehicle Inspection Report</CardTitle>
            <CardDescription>
              Complete this inspection before operating the vehicle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-semibold text-lg">{assetInfo.asset.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {assetInfo.asset.assetNumber} • {assetInfo.asset.year} {assetInfo.asset.make} {assetInfo.asset.model}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="inspector-name">Your Name *</Label>
              <Input
                id="inspector-name"
                placeholder="Enter your full name"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                data-testid="input-inspector-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meter-reading">Meter Reading (optional)</Label>
              <Input
                id="meter-reading"
                type="number"
                placeholder="Current odometer/hours"
                value={meterReading}
                onChange={(e) => setMeterReading(e.target.value)}
                data-testid="input-meter-reading"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="pre-trip">Pre-Trip Inspection</Label>
              <Switch
                id="pre-trip"
                checked={preTrip}
                onCheckedChange={setPreTrip}
                data-testid="switch-pre-trip"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Defects Found</Label>
                {!showDefectForm && (
                  <Button variant="outline" size="sm" onClick={() => setShowDefectForm(true)} data-testid="button-add-defect">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Defect
                  </Button>
                )}
              </div>

              {showDefectForm && (
                <Card className="border-primary">
                  <CardContent className="pt-4 space-y-3">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={newDefect.category}
                        onChange={(e) => setNewDefect({ ...newDefect, category: e.target.value })}
                        data-testid="select-defect-category"
                      >
                        {defectCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe the defect..."
                        value={newDefect.description}
                        onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
                        data-testid="textarea-defect-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <RadioGroup
                        value={newDefect.severity}
                        onValueChange={(v) => setNewDefect({ ...newDefect, severity: v as any })}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="minor" id="minor" data-testid="radio-severity-minor" />
                          <Label htmlFor="minor">Minor</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="major" id="major" data-testid="radio-severity-major" />
                          <Label htmlFor="major">Major</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="critical" id="critical" data-testid="radio-severity-critical" />
                          <Label htmlFor="critical">Critical</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowDefectForm(false)} data-testid="button-cancel-defect">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddDefect} data-testid="button-confirm-add-defect">
                        Add Defect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {defects.length > 0 ? (
                <div className="space-y-2">
                  {defects.map((defect, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg" data-testid={`defect-item-${index}`}>
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        defect.severity === "critical" ? "text-red-500" :
                        defect.severity === "major" ? "text-orange-500" : "text-yellow-500"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{defect.category}</span>
                          <Badge variant={
                            defect.severity === "critical" ? "destructive" :
                            defect.severity === "major" ? "default" : "secondary"
                          }>
                            {defect.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{defect.description}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveDefect(index)} data-testid={`button-remove-defect-${index}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No defects reported. Add any issues found during inspection.
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Vehicle Status *</Label>
              <RadioGroup
                value={status}
                onValueChange={(v) => setStatus(v as any)}
                className="grid grid-cols-1 gap-3"
              >
                <label className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${status === "safe" ? "border-green-500 bg-green-50 dark:bg-green-950" : "hover-elevate"}`}>
                  <RadioGroupItem value="safe" id="status-safe" data-testid="radio-status-safe" />
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Safe to Operate</p>
                    <p className="text-sm text-muted-foreground">Vehicle passes all inspection criteria</p>
                  </div>
                </label>
                <label className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${status === "defects_noted" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" : "hover-elevate"}`}>
                  <RadioGroupItem value="defects_noted" id="status-defects" data-testid="radio-status-defects" />
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Defects Noted</p>
                    <p className="text-sm text-muted-foreground">Minor issues found but vehicle can operate</p>
                  </div>
                </label>
                <label className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${status === "unsafe" ? "border-red-500 bg-red-50 dark:bg-red-950" : "hover-elevate"}`}>
                  <RadioGroupItem value="unsafe" id="status-unsafe" data-testid="radio-status-unsafe" />
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">Unsafe to Operate</p>
                    <p className="text-sm text-muted-foreground">Critical issues found - do not operate</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="textarea-notes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature">Digital Signature</Label>
              <Input
                id="signature"
                placeholder="Type your full name to sign"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                data-testid="input-signature"
              />
              <p className="text-xs text-muted-foreground">
                By typing your name, you certify that this inspection was conducted honestly and accurately.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              data-testid="button-submit-dvir"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Inspection Report
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
