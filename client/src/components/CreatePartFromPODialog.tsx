import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Package, AlertTriangle } from "lucide-react";
import type { Part } from "@shared/schema";

interface CreatePartFromPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poLineId: number;
  poLineDescription: string;
  unitCost?: string | null;
  vendorId?: number;
  onPartCreated?: (part: Part) => void;
}

const partCategories = [
  { value: "engine", label: "Engine" },
  { value: "transmission", label: "Transmission" },
  { value: "brakes", label: "Brakes" },
  { value: "electrical", label: "Electrical" },
  { value: "suspension", label: "Suspension" },
  { value: "hvac", label: "HVAC" },
  { value: "body", label: "Body" },
  { value: "fluids", label: "Fluids" },
  { value: "filters", label: "Filters" },
  { value: "tires", label: "Tires" },
  { value: "other", label: "Other" },
];

export function CreatePartFromPODialog({
  open,
  onOpenChange,
  poLineId,
  poLineDescription,
  unitCost,
  vendorId,
  onPartCreated,
}: CreatePartFromPODialogProps) {
  const { toast } = useToast();
  const [partNumber, setPartNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [cost, setCost] = useState("");
  const [reorderPoint, setReorderPoint] = useState("5");
  const [reorderQuantity, setReorderQuantity] = useState("10");

  useEffect(() => {
    if (open) {
      setName(poLineDescription);
      setDescription(poLineDescription);
      setCost(unitCost || "");
      setPartNumber("");
      setCategory("other");
      setReorderPoint("5");
      setReorderQuantity("10");
    }
  }, [open, poLineDescription, unitCost]);

  const createPartMutation = useMutation({
    mutationFn: async (data: {
      partNumber: string;
      name: string;
      description?: string;
      category?: string;
      unitCost?: string;
      reorderPoint?: string;
      reorderQuantity?: string;
      vendorId?: number;
    }) => {
      const response = await apiRequest("POST", "/api/parts", data);
      return response.json();
    },
    onSuccess: async (newPart: Part) => {
      await linkPartToLine(newPart.id);
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ 
        title: "Part Created", 
        description: `Part ${newPart.partNumber} created and linked to PO line` 
      });
      onOpenChange(false);
      onPartCreated?.(newPart);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create part", 
        variant: "destructive" 
      });
    },
  });

  const linkPartToLine = async (partId: number) => {
    try {
      await apiRequest("PATCH", `/api/po-lines/${poLineId}`, { partId });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    } catch (error) {
      console.error("Failed to link part to PO line:", error);
    }
  };

  const handleSubmit = () => {
    if (!partNumber.trim() || !name.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Part number and name are required", 
        variant: "destructive" 
      });
      return;
    }

    createPartMutation.mutate({
      partNumber: partNumber.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      unitCost: cost || undefined,
      reorderPoint: reorderPoint || undefined,
      reorderQuantity: reorderQuantity || undefined,
      vendorId: vendorId || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New Part
          </DialogTitle>
          <DialogDescription>
            Create a new part from this PO line. The part will be automatically linked and can receive inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              This PO line doesn't have an associated part. Create one now to track inventory and print barcodes.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="partNumber">Part Number *</Label>
              <Input
                id="partNumber"
                placeholder="e.g., OIL-5W30-1QT"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                data-testid="input-new-part-number"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Part Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Motor Oil 5W-30"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-new-part-name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                data-testid="input-new-part-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-new-part-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {partCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cost">Unit Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  data-testid="input-new-part-cost"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  placeholder="5"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  data-testid="input-new-part-reorder-point"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
                <Input
                  id="reorderQuantity"
                  type="number"
                  placeholder="10"
                  value={reorderQuantity}
                  onChange={(e) => setReorderQuantity(e.target.value)}
                  data-testid="input-new-part-reorder-qty"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createPartMutation.isPending || !partNumber.trim() || !name.trim()}
            data-testid="button-create-part-submit"
          >
            {createPartMutation.isPending ? "Creating..." : "Create Part"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
