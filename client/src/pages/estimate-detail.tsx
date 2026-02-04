import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, ArrowRight, Save, Loader2, Edit, Trash2, Plus, 
  Package, DollarSign, AlertTriangle, Calculator, X, Check
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Estimate, EstimateLine, Asset, Part, VmrsCode } from "@shared/schema";

const lineTypeLabels: Record<string, string> = {
  inventory_part: "Inventory Part",
  zero_stock_part: "Zero Stock Part",
  non_inventory_item: "Non-Inventory Item",
  labor: "Labor",
};

export default function EstimateDetail() {
  const [, params] = useRoute("/estimates/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showAddLineDialog, setShowAddLineDialog] = useState(false);
  const [lineType, setLineType] = useState<string>("inventory_part");
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [lineDescription, setLineDescription] = useState("");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [lineUnitCost, setLineUnitCost] = useState("");
  const [linePartNumber, setLinePartNumber] = useState("");
  const [lineNotes, setLineNotes] = useState("");
  const [selectedVmrsCode, setSelectedVmrsCode] = useState("");

  const estimateId = params?.id ? parseInt(params.id) : null;

  const { data: estimate, isLoading } = useQuery<Estimate>({
    queryKey: ["/api/estimates", estimateId],
    enabled: !!estimateId,
  });

  const { data: lines, isLoading: linesLoading } = useQuery<EstimateLine[]>({
    queryKey: ["/api/estimates", estimateId, "lines"],
    enabled: !!estimateId,
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: partsData } = useQuery<{ parts: Part[]; total: number }>({
    queryKey: ["/api/parts"],
  });
  const parts = partsData?.parts;

  const { data: organization } = useQuery<{ requireEstimateApproval?: boolean }>({
    queryKey: ["/api/organizations/current"],
  });

  const { data: vmrsCodes } = useQuery<VmrsCode[]>({
    queryKey: ["/api/vmrs-codes"],
  });

  const linkedAsset = assets?.find(a => a.id === estimate?.assetId);
  
  // Determine if estimate can be converted based on org approval settings
  // When org is loading (undefined), we wait; when loaded, check if approval is explicitly required
  const requireApproval = organization?.requireEstimateApproval === true;
  const hasLines = lines && lines.length > 0;
  const canConvert = estimate && !estimate.convertedToWorkOrderId && estimate.status !== "rejected" && hasLines && (
    !requireApproval || estimate.status === "approved"
  );

  const addLineMutation = useMutation({
    mutationFn: async (lineData: any) => {
      return apiRequest("POST", `/api/estimates/${estimateId}/lines`, lineData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({
        title: "Line Added",
        description: "The line has been added to the estimate.",
      });
      resetLineForm();
      setShowAddLineDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add line.",
        variant: "destructive",
      });
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: async (lineId: number) => {
      return apiRequest("DELETE", `/api/estimate-lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      toast({
        title: "Line Deleted",
        description: "The line has been removed from the estimate.",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/estimates/${estimateId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({
        title: "Status Updated",
        description: "The estimate status has been updated.",
      });
    },
  });

  const convertToWorkOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/estimates/${estimateId}/convert`, {});
      return response.json() as Promise<{ workOrderId: number; workOrderNumber: string; message: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Converted to Work Order",
        description: `Work Order ${data.workOrderNumber} has been created.`,
      });
      navigate(`/work-orders/${data.workOrderId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert estimate to work order.",
        variant: "destructive",
      });
    },
  });

  const resetLineForm = () => {
    setLineType("inventory_part");
    setSelectedPartId("");
    setLineDescription("");
    setLineQuantity("1");
    setLineUnitCost("");
    setLinePartNumber("");
    setLineNotes("");
    setSelectedVmrsCode("");
  };

  const handleAddLine = () => {
    const quantity = parseFloat(lineQuantity);
    const unitCost = parseFloat(lineUnitCost);
    const totalCost = quantity * unitCost;

    // Get selected VMRS code details
    const selectedVmrs = vmrsCodes?.find(v => v.code === selectedVmrsCode);
    
    let partData: any = {
      lineNumber: (lines?.length || 0) + 1,
      lineType,
      description: lineDescription,
      quantity: lineQuantity,
      unitCost: lineUnitCost,
      totalCost: totalCost.toFixed(2),
      notes: lineNotes || null,
      vmrsCode: selectedVmrsCode || null,
      vmrsTitle: selectedVmrs?.title || null,
    };

    if (lineType === "inventory_part" && selectedPartId) {
      const part = parts?.find(p => p.id === parseInt(selectedPartId));
      partData.partId = parseInt(selectedPartId);
      partData.partNumber = part?.partNumber;
      partData.quantityOnHand = part?.quantityOnHand;
      partData.needsOrdering = parseFloat(part?.quantityOnHand || "0") < quantity;
    } else if (lineType === "zero_stock_part") {
      partData.partNumber = linePartNumber;
      partData.needsOrdering = true;
      partData.quantityOnHand = "0";
    } else if (lineType === "non_inventory_item") {
      partData.partNumber = linePartNumber || null;
      partData.needsOrdering = false;
    }

    addLineMutation.mutate(partData);
  };

  const calculateTotals = () => {
    if (!lines) return { parts: 0, labor: 0, total: 0 };
    
    let partsTotal = 0;
    let laborTotal = 0;

    lines.forEach(line => {
      const cost = parseFloat(line.totalCost || "0");
      if (line.lineType === "labor") {
        laborTotal += cost;
      } else {
        partsTotal += cost;
      }
    });

    return {
      parts: partsTotal,
      labor: laborTotal,
      total: partsTotal + laborTotal,
    };
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estimate Not Found"
          description="The requested estimate could not be found"
          actions={
            <Button variant="outline" onClick={() => navigate("/estimates")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title={`${estimate.estimateNumber} | ${linkedAsset?.assetNumber || "No Asset"}`}
        description={linkedAsset?.name || "Estimate details"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/estimates")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-4">
        <StatusBadge status={estimate.status} />
        {estimate.status === "draft" && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => updateStatusMutation.mutate("pending_approval")}
          >
            Submit for Approval
          </Button>
        )}
        {estimate.status === "pending_approval" && (
          <>
            <Button 
              size="sm" 
              onClick={() => updateStatusMutation.mutate("approved")}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => updateStatusMutation.mutate("rejected")}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </>
        )}
        {canConvert && (
          <Button 
            size="sm"
            onClick={() => convertToWorkOrderMutation.mutate()}
            disabled={convertToWorkOrderMutation.isPending}
            data-testid="button-convert-to-wo"
          >
            {convertToWorkOrderMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Convert to Work Order
          </Button>
        )}
        {estimate.convertedToWorkOrderId && (
          <Button 
            size="sm"
            variant="outline"
            onClick={() => navigate(`/work-orders/${estimate.convertedToWorkOrderId}`)}
            data-testid="button-view-wo"
          >
            View Work Order
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Estimate Lines
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddLineDialog(true)} data-testid="button-add-line">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </CardHeader>
            <CardContent>
              {linesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : lines && lines.length > 0 ? (
                <div className="space-y-3">
                  {lines.map((line) => (
                    <div 
                      key={line.id} 
                      className="p-4 rounded-lg bg-muted/50 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {lineTypeLabels[line.lineType] || line.lineType}
                          </Badge>
                          {line.needsOrdering && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Needs Ordering
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{line.description}</p>
                        {line.partNumber && (
                          <p className="text-sm text-muted-foreground">Part #: {line.partNumber}</p>
                        )}
                        {line.vmrsCode && (
                          <p className="text-sm text-muted-foreground">Task: {line.vmrsCode}{line.vmrsTitle ? ` - ${line.vmrsTitle}` : ""}</p>
                        )}
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>Qty: {line.quantity}</span>
                          <span>@ ${parseFloat(line.unitCost || "0").toFixed(2)}</span>
                          {line.quantityOnHand !== null && line.quantityOnHand !== undefined && (
                            <span>On Hand: {line.quantityOnHand}</span>
                          )}
                        </div>
                        {line.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-muted-foreground/30 pl-2">
                            {line.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          ${parseFloat(line.totalCost || "0").toFixed(2)}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => deleteLineMutation.mutate(line.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No lines added yet. Click "Add Line" to add parts, labor, or non-inventory items.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Estimate Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parts Total</span>
                <span className="font-medium">${totals.parts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor Total</span>
                <span className="font-medium">${totals.labor.toFixed(2)}</span>
              </div>
              <div className="border-t pt-4 flex justify-between">
                <span className="font-medium">Grand Total</span>
                <span className="font-bold text-lg">${totals.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {lines && lines.some(l => l.needsOrdering) && (
            <Card className="glass-card mt-4 border-orange-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  Parts Needing Fulfillment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {lines.filter(l => l.needsOrdering).map((line) => (
                    <li key={line.id} className="text-muted-foreground">
                      {line.partNumber || line.description} (Qty: {line.quantity})
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showAddLineDialog} onOpenChange={setShowAddLineDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Line to Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task / VMRS Code *</Label>
              <Select value={selectedVmrsCode || ""} onValueChange={setSelectedVmrsCode}>
                <SelectTrigger data-testid="select-vmrs-code">
                  <SelectValue placeholder="Select a task/VMRS code..." />
                </SelectTrigger>
                <SelectContent>
                  {vmrsCodes?.map((vmrs) => (
                    <SelectItem key={vmrs.id} value={vmrs.code}>
                      {vmrs.code} - {vmrs.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                VMRS codes categorize the type of maintenance work
              </p>
            </div>

            <div className="space-y-2">
              <Label>Line Type *</Label>
              <Select value={lineType} onValueChange={(val) => {
                setLineType(val);
                setSelectedPartId("");
                setLineDescription("");
                setLineUnitCost("");
              }}>
                <SelectTrigger data-testid="select-line-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory_part">Inventory Part</SelectItem>
                  <SelectItem value="zero_stock_part">Zero Stock Part (Not in Inventory)</SelectItem>
                  <SelectItem value="non_inventory_item">Non-Inventory Item</SelectItem>
                  <SelectItem value="labor">Labor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lineType === "inventory_part" && (
              <div className="space-y-2">
                <Label>Select Part *</Label>
                <Select value={selectedPartId} onValueChange={(val) => {
                  setSelectedPartId(val);
                  const part = parts?.find(p => p.id === parseInt(val));
                  if (part) {
                    setLineDescription(part.name);
                    setLineUnitCost(part.unitCost || "0");
                  }
                }}>
                  <SelectTrigger data-testid="select-part">
                    <SelectValue placeholder="Choose a part" />
                  </SelectTrigger>
                  <SelectContent>
                    {parts?.map((part) => (
                      <SelectItem key={part.id} value={part.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{part.partNumber} - {part.name}</span>
                          <span className="text-xs text-muted-foreground">
                            (Qty: {part.quantityOnHand || 0})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPartId && (
                  <p className="text-xs text-muted-foreground">
                    On Hand: {parts?.find(p => p.id === parseInt(selectedPartId))?.quantityOnHand || 0}
                  </p>
                )}
              </div>
            )}

            {(lineType === "zero_stock_part" || lineType === "non_inventory_item") && (
              <div className="space-y-2">
                <Label>Part Number {lineType === "zero_stock_part" ? "*" : "(Optional)"}</Label>
                <Input
                  value={linePartNumber}
                  onChange={(e) => setLinePartNumber(e.target.value)}
                  placeholder="Enter part number"
                  data-testid="input-part-number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={lineDescription}
                onChange={(e) => setLineDescription(e.target.value)}
                placeholder="Enter description"
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={lineQuantity}
                  onChange={(e) => setLineQuantity(e.target.value)}
                  data-testid="input-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineUnitCost}
                  onChange={(e) => setLineUnitCost(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-unit-cost"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Line Notes (Optional)</Label>
              <Textarea
                value={lineNotes}
                onChange={(e) => setLineNotes(e.target.value)}
                placeholder="Add any notes for this line item (e.g., special instructions, part details)..."
                rows={2}
                data-testid="input-line-notes"
              />
              <p className="text-xs text-muted-foreground">
                Notes will be transferred to the work order when this estimate is converted
              </p>
            </div>

            {lineQuantity && lineUnitCost && (
              <div className="p-3 bg-muted rounded-lg flex justify-between">
                <span>Line Total</span>
                <span className="font-medium">
                  ${(parseFloat(lineQuantity) * parseFloat(lineUnitCost)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLineDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddLine} 
              disabled={!selectedVmrsCode || !lineDescription || !lineQuantity || !lineUnitCost || addLineMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addLineMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Add Line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
