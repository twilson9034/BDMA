import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Vendor, Location } from "@shared/schema";

const TIRE_TYPES = [
  { value: "steer", label: "Steer" },
  { value: "drive", label: "Drive" },
  { value: "trailer", label: "Trailer" },
  { value: "all_position", label: "All Position" },
  { value: "winter", label: "Winter" },
  { value: "summer", label: "Summer" },
];

const TIRE_CONDITIONS = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "worn", label: "Worn" },
  { value: "critical", label: "Critical" },
  { value: "failed", label: "Failed" },
];

const TIRE_STATUSES = [
  { value: "in_inventory", label: "In Inventory" },
  { value: "installed", label: "Installed" },
  { value: "removed", label: "Removed" },
  { value: "disposed", label: "Disposed" },
  { value: "sold", label: "Sold" },
];

export default function TireNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [serialNumber, setSerialNumber] = useState("");
  const [dotCode, setDotCode] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState("");
  const [type, setType] = useState("all_position");
  const [condition, setCondition] = useState("new");
  const [status, setStatus] = useState("in_inventory");
  const [treadDepth, setTreadDepth] = useState("10.0");
  const [originalTreadDepth, setOriginalTreadDepth] = useState("10.0");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [psiRating, setPsiRating] = useState("");
  const [loadIndex, setLoadIndex] = useState("");
  const [speedRating, setSpeedRating] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/tires", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tires"] });
      toast({ title: "Tire created successfully" });
      navigate("/tires");
    },
    onError: (error: any) => {
      toast({ title: "Failed to create tire", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      toast({ title: "Serial number is required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      serialNumber: serialNumber.trim(),
      dotCode: dotCode.trim() || null,
      brand: brand.trim() || null,
      model: model.trim() || null,
      size: size.trim() || null,
      type,
      condition,
      status,
      treadDepth: treadDepth ? parseFloat(treadDepth) : null,
      originalTreadDepth: originalTreadDepth ? parseFloat(originalTreadDepth) : 10.0,
      purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null,
      psiRating: psiRating ? parseInt(psiRating) : null,
      loadIndex: loadIndex.trim() || null,
      speedRating: speedRating.trim() || null,
      vendorId: vendorId ? parseInt(vendorId) : null,
      locationId: locationId ? parseInt(locationId) : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <PageHeader
        title="Add New Tire"
        description="Add a tire to inventory"
      />
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={() => navigate("/tires")} data-testid="button-back-tires">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Tire Information</CardTitle>
            <CardDescription>Basic details about the tire</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number *</Label>
              <Input
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Enter serial number"
                required
                data-testid="input-tire-serial"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dotCode">DOT Code</Label>
              <Input
                id="dotCode"
                value={dotCode}
                onChange={(e) => setDotCode(e.target.value)}
                placeholder="e.g., DOT U2LL LMLR 5107"
                data-testid="input-tire-dot"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Michelin"
                data-testid="input-tire-brand"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., X Multi D"
                data-testid="input-tire-model"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g., 295/75R22.5"
                data-testid="input-tire-size"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger data-testid="select-tire-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIRE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Condition & Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger data-testid="select-tire-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIRE_CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-tire-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIRE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="treadDepth">Current Tread Depth (32nds)</Label>
              <Input
                id="treadDepth"
                type="number"
                step="0.1"
                value={treadDepth}
                onChange={(e) => setTreadDepth(e.target.value)}
                placeholder="10.0"
                data-testid="input-tire-tread-depth"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalTreadDepth">Original Tread Depth (32nds)</Label>
              <Input
                id="originalTreadDepth"
                type="number"
                step="0.1"
                value={originalTreadDepth}
                onChange={(e) => setOriginalTreadDepth(e.target.value)}
                placeholder="10.0"
                data-testid="input-tire-original-depth"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="psiRating">PSI Rating</Label>
              <Input
                id="psiRating"
                type="number"
                value={psiRating}
                onChange={(e) => setPsiRating(e.target.value)}
                placeholder="e.g., 120"
                data-testid="input-tire-psi-rating"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loadIndex">Load Index</Label>
              <Input
                id="loadIndex"
                value={loadIndex}
                onChange={(e) => setLoadIndex(e.target.value)}
                placeholder="e.g., 144/142"
                data-testid="input-tire-load-index"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="speedRating">Speed Rating</Label>
              <Input
                id="speedRating"
                value={speedRating}
                onChange={(e) => setSpeedRating(e.target.value)}
                placeholder="e.g., L"
                data-testid="input-tire-speed-rating"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase & Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchaseCost">Purchase Cost</Label>
              <Input
                id="purchaseCost"
                type="number"
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                placeholder="0.00"
                data-testid="input-tire-cost"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger data-testid="select-tire-vendor">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="locationId">Storage Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger data-testid="select-tire-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this tire..."
              rows={3}
              data-testid="input-tire-notes"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/tires")} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-tire">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Tire
          </Button>
        </div>
      </form>
    </div>
  );
}
