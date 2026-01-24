import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Gauge, Loader2, Check, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Asset } from "@shared/schema";

interface MeterUpdate {
  assetId: number;
  assetNumber: string;
  assetName: string;
  currentReading: string;
  newReading: string;
  meterType: string;
}

interface BatchMeterUpdateProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BatchMeterUpdate({ isOpen, onClose }: BatchMeterUpdateProps) {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<MeterUpdate[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const batchUpdateMutation = useMutation({
    mutationFn: (data: { updates: Array<{ assetId: number; meterReading: string; meterType?: string }> }) =>
      apiRequest("POST", "/api/assets/batch-meters", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Meters Updated",
        description: `Successfully updated ${updates.length} asset meter(s).`,
      });
      setUpdates([]);
      onClose();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update meters. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addAsset = () => {
    if (!selectedAssetId) return;
    const asset = assets.find((a) => a.id === parseInt(selectedAssetId));
    if (!asset) return;
    if (updates.some((u) => u.assetId === asset.id)) {
      toast({
        title: "Asset Already Added",
        description: `${asset.assetNumber} is already in the list.`,
        variant: "destructive",
      });
      return;
    }
    setUpdates([
      ...updates,
      {
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        assetName: asset.name,
        currentReading: asset.currentMeterReading || "0",
        newReading: "",
        meterType: asset.meterType || "miles",
      },
    ]);
    setSelectedAssetId("");
  };

  const removeAsset = (assetId: number) => {
    setUpdates(updates.filter((u) => u.assetId !== assetId));
  };

  const updateReading = (assetId: number, newReading: string) => {
    setUpdates(
      updates.map((u) =>
        u.assetId === assetId ? { ...u, newReading } : u
      )
    );
  };

  const handleSubmit = () => {
    const validUpdates = updates.filter((u) => u.newReading && parseFloat(u.newReading) > 0);
    if (validUpdates.length === 0) {
      toast({
        title: "No Valid Updates",
        description: "Please enter meter readings for at least one asset.",
        variant: "destructive",
      });
      return;
    }
    batchUpdateMutation.mutate({
      updates: validUpdates.map((u) => ({
        assetId: u.assetId,
        meterReading: u.newReading,
        meterType: u.meterType,
      })),
    });
  };

  const availableAssets = assets.filter(
    (a) => a.meterType && !updates.some((u) => u.assetId === a.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Batch Meter Update
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger className="flex-1" data-testid="select-asset-batch">
                <SelectValue placeholder="Select an asset to add" />
              </SelectTrigger>
              <SelectContent>
                {availableAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id.toString()}>
                    {asset.assetNumber} - {asset.name} ({asset.meterType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={addAsset}
              disabled={!selectedAssetId}
              data-testid="button-add-asset-batch"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <Gauge className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select assets to update their meters</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {updates.map((update) => (
                <Card key={update.assetId} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {update.assetNumber} - {update.assetName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Current: {update.currentReading} {update.meterType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="New reading"
                        value={update.newReading}
                        onChange={(e) =>
                          updateReading(update.assetId, e.target.value)
                        }
                        className="w-32"
                        data-testid={`input-meter-${update.assetId}`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {update.meterType}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAsset(update.assetId)}
                        data-testid={`button-remove-${update.assetId}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updates.length === 0 || batchUpdateMutation.isPending}
            data-testid="button-submit-batch"
          >
            {batchUpdateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Update {updates.filter((u) => u.newReading).length} Meter(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
