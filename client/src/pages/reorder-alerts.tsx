import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Package, 
  ShoppingCart,
  TrendingDown,
  RefreshCw,
  Truck
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Part, Vendor } from "@shared/schema";

interface LowStockPart extends Part {
  shortage: number;
}

export default function ReorderAlerts() {
  const { toast } = useToast();
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const [createPODialogOpen, setCreatePODialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>("");

  const { data: lowStockParts = [], isLoading, refetch } = useQuery<Part[]>({
    queryKey: ["/api/parts/low-stock"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const createRequisitionMutation = useMutation({
    mutationFn: async (data: { vendorId: number; items: { partId: number; quantity: string; description: string; unitCost: string }[] }) => {
      const reqResponse = await apiRequest("POST", "/api/requisitions", {
        vendorId: data.vendorId,
        status: "draft",
        notes: "Auto-generated from reorder alerts",
      });
      
      if (!reqResponse.ok) {
        throw new Error("Failed to create requisition");
      }
      
      const requisition = await reqResponse.json();
      
      for (const item of data.items) {
        await apiRequest("POST", `/api/requisitions/${requisition.id}/lines`, {
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          partId: item.partId,
        });
      }
      
      return requisition;
    },
    onSuccess: (requisition) => {
      toast({ title: "Success", description: `Requisition ${requisition.requisitionNumber} created` });
      queryClient.invalidateQueries({ queryKey: ["/api/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      setSelectedParts([]);
      setCreatePODialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create requisition", variant: "destructive" });
    },
  });

  const partsWithShortage: LowStockPart[] = lowStockParts.map(part => ({
    ...part,
    shortage: Math.max(0, parseFloat(part.reorderPoint || "0") - parseFloat(part.quantityOnHand || "0")),
  }));

  const criticalParts = partsWithShortage.filter(p => parseFloat(p.quantityOnHand || "0") === 0);
  const lowParts = partsWithShortage.filter(p => parseFloat(p.quantityOnHand || "0") > 0);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParts(partsWithShortage.map(p => p.id));
    } else {
      setSelectedParts([]);
    }
  };

  const handleSelectOne = (partId: number, checked: boolean) => {
    if (checked) {
      setSelectedParts([...selectedParts, partId]);
    } else {
      setSelectedParts(selectedParts.filter(id => id !== partId));
    }
  };

  const handleCreateRequisition = () => {
    if (!selectedVendor) {
      toast({ title: "Error", description: "Please select a vendor", variant: "destructive" });
      return;
    }

    const items = selectedParts.map(partId => {
      const part = partsWithShortage.find(p => p.id === partId);
      if (!part) return null;
      const reorderQty = parseFloat(part.reorderQuantity || "0") || part.shortage;
      return {
        partId: part.id,
        quantity: Math.ceil(reorderQty).toString(),
        description: `${part.partNumber} - ${part.name}`,
        unitCost: part.unitCost || "0",
      };
    }).filter(Boolean) as { partId: number; quantity: string; description: string; unitCost: string }[];

    createRequisitionMutation.mutate({
      vendorId: parseInt(selectedVendor),
      items,
    });
  };

  const getStockLevel = (part: LowStockPart) => {
    const qty = parseFloat(part.quantityOnHand || "0");
    if (qty === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800 border-red-200" };
    if (qty <= parseFloat(part.reorderPoint || "0") / 2) return { label: "Critical", color: "bg-orange-100 text-orange-800 border-orange-200" };
    return { label: "Low", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Reorder Alerts"
        description="Parts below reorder point that need restocking"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {selectedParts.length > 0 && (
              <Button onClick={() => setCreatePODialogOpen(true)} data-testid="button-create-requisition">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Create Requisition ({selectedParts.length})
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold">{criticalParts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <TrendingDown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{lowParts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{partsWithShortage.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold">{selectedParts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parts Requiring Reorder</CardTitle>
          <CardDescription>
            Select parts to create a bulk requisition for reordering
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : partsWithShortage.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">All parts are well stocked</p>
              <p className="text-sm">No reorder alerts at this time</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedParts.length === partsWithShortage.length && partsWithShortage.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>On Hand</TableHead>
                  <TableHead>Reorder Point</TableHead>
                  <TableHead>Shortage</TableHead>
                  <TableHead>Reorder Qty</TableHead>
                  <TableHead>Unit Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partsWithShortage.map((part) => {
                  const stockLevel = getStockLevel(part);
                  return (
                    <TableRow key={part.id} className={selectedParts.includes(part.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedParts.includes(part.id)}
                          onCheckedChange={(checked) => handleSelectOne(part.id, checked as boolean)}
                          data-testid={`checkbox-part-${part.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/inventory/${part.id}`}>
                          <span className="font-medium text-primary hover:underline cursor-pointer">
                            {part.partNumber}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>{part.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={stockLevel.color}>
                          {stockLevel.label}
                        </Badge>
                      </TableCell>
                      <TableCell className={parseFloat(part.quantityOnHand || "0") === 0 ? "text-red-600 font-medium" : ""}>
                        {parseFloat(part.quantityOnHand || "0").toFixed(0)}
                      </TableCell>
                      <TableCell>{parseFloat(part.reorderPoint || "0").toFixed(0)}</TableCell>
                      <TableCell className="text-orange-600 font-medium">
                        {part.shortage.toFixed(0)}
                      </TableCell>
                      <TableCell>{parseFloat(part.reorderQuantity || "0").toFixed(0) || "-"}</TableCell>
                      <TableCell>${parseFloat(part.unitCost || "0").toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createPODialogOpen} onOpenChange={setCreatePODialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Requisition</DialogTitle>
            <DialogDescription>
              Create a purchase requisition for {selectedParts.length} selected part(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Vendor</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger data-testid="select-vendor">
                  <SelectValue placeholder="Select a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Parts to Order:</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {selectedParts.map(partId => {
                  const part = partsWithShortage.find(p => p.id === partId);
                  if (!part) return null;
                  const reorderQty = parseFloat(part.reorderQuantity || "0") || part.shortage;
                  return (
                    <div key={partId} className="flex justify-between text-sm">
                      <span>{part.partNumber} - {part.name}</span>
                      <span className="text-muted-foreground">
                        Qty: {Math.ceil(reorderQty)} @ ${parseFloat(part.unitCost || "0").toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                <span>Estimated Total:</span>
                <span>
                  ${selectedParts.reduce((total, partId) => {
                    const part = partsWithShortage.find(p => p.id === partId);
                    if (!part) return total;
                    const reorderQty = parseFloat(part.reorderQuantity || "0") || part.shortage;
                    return total + (Math.ceil(reorderQty) * parseFloat(part.unitCost || "0"));
                  }, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePODialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequisition}
              disabled={createRequisitionMutation.isPending || !selectedVendor}
              data-testid="button-confirm-requisition"
            >
              {createRequisitionMutation.isPending ? "Creating..." : "Create Requisition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
