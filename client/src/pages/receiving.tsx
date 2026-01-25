import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { BarcodePrintDialog } from "@/components/BarcodePrintDialog";
import { CreatePartFromPODialog } from "@/components/CreatePartFromPODialog";
import { Package, Truck, CheckCircle, AlertTriangle, Clock, History, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { PurchaseOrder, PurchaseOrderLine, ReceivingTransaction, Part, Organization } from "@shared/schema";

interface POWithLines extends PurchaseOrder {
  lines?: PurchaseOrderLine[];
  vendorName?: string;
}

interface ReceivedItemForPrint {
  lineId: number;
  partId: number | null;
  quantity: number;
}

export default function Receiving() {
  const { toast } = useToast();
  const [selectedPO, setSelectedPO] = useState<POWithLines | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<PurchaseOrderLine | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [barcodePrintDialogOpen, setBarcodePrintDialogOpen] = useState(false);
  const [receivedItemsForPrint, setReceivedItemsForPrint] = useState<ReceivedItemForPrint[]>([]);
  const [createPartDialogOpen, setCreatePartDialogOpen] = useState(false);
  const [createPartLine, setCreatePartLine] = useState<PurchaseOrderLine | null>(null);
  const [newlyCreatedPart, setNewlyCreatedPart] = useState<Part | null>(null);

  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/organizations/current"],
  });

  const { data: purchaseOrders = [], isLoading } = useQuery<POWithLines[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: vendors = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const { data: poLines = [] } = useQuery<PurchaseOrderLine[]>({
    queryKey: ["/api/purchase-orders", selectedPO?.id, "lines"],
    enabled: !!selectedPO,
  });

  const receivingHistoryUrl = selectedPO 
    ? `/api/receiving-transactions?poId=${selectedPO.id}` 
    : "/api/receiving-transactions";
    
  const { data: receivingHistory = [] } = useQuery<ReceivingTransaction[]>({
    queryKey: [receivingHistoryUrl],
    enabled: historyDialogOpen,
  });

  const isBarcodeSystemEnabled = organization?.enableBarcodeSystem ?? false;

  const receiveMutation = useMutation({
    mutationFn: async (data: { lineId: number; quantityReceived: string; notes?: string; discrepancyType?: string; discrepancyNotes?: string }) => {
      return apiRequest("POST", `/api/po-lines/${data.lineId}/receive`, {
        quantityReceived: data.quantityReceived,
        notes: data.notes,
        discrepancyType: data.discrepancyType,
        discrepancyNotes: data.discrepancyNotes,
      });
    },
    onSuccess: (_data, variables) => {
      toast({ title: "Success", description: "Items received successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", selectedPO?.id, "lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      setReceiveDialogOpen(false);
      
      if (isBarcodeSystemEnabled && selectedLine?.partId) {
        setReceivedItemsForPrint([{
          lineId: variables.lineId,
          partId: selectedLine.partId,
          quantity: parseInt(variables.quantityReceived) || 1,
        }]);
        setBarcodePrintDialogOpen(true);
      }
      
      setSelectedLine(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to receive items", variant: "destructive" });
    },
  });

  const getPartsForPrinting = () => {
    return receivedItemsForPrint
      .filter(item => item.partId)
      .map(item => {
        const part = parts.find(p => p.id === item.partId);
        if (!part) return null;
        return {
          id: part.id,
          partNumber: part.partNumber,
          name: part.name,
          barcode: part.barcode,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  };

  const getDefaultPrintQuantity = () => {
    if (receivedItemsForPrint.length === 1) {
      return receivedItemsForPrint[0].quantity;
    }
    return 1;
  };

  const receivablePOs = purchaseOrders.filter(po => 
    po.status === "sent" || po.status === "acknowledged" || po.status === "partial"
  );

  const getVendorName = (vendorId: number) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || "Unknown";
  };

  const handleReceiveLine = (line: PurchaseOrderLine) => {
    setSelectedLine(line);
    setReceiveDialogOpen(true);
  };

  const handleCreatePart = (line: PurchaseOrderLine) => {
    setCreatePartLine(line);
    setCreatePartDialogOpen(true);
  };

  const handlePartCreated = (part: Part) => {
    setNewlyCreatedPart(part);
    queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", selectedPO?.id, "lines"] });
    queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
    toast({
      title: "Part Created",
      description: `Part ${part.partNumber} has been created and linked. You can now receive items.`,
    });
  };

  const getPartForLine = (line: PurchaseOrderLine) => {
    if (!line.partId) return null;
    return parts.find(p => p.id === line.partId);
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Receiving"
        description="Receive items against purchase orders and update inventory"
        actions={
          <Button variant="outline" onClick={() => setHistoryDialogOpen(true)} data-testid="button-receiving-history">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Receipt</p>
                <p className="text-2xl font-bold">{receivablePOs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Partial</p>
                <p className="text-2xl font-bold">
                  {purchaseOrders.filter(po => po.status === "partial").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fully Received</p>
                <p className="text-2xl font-bold">
                  {purchaseOrders.filter(po => po.status === "received").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Discrepancies</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!selectedPO ? (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders Awaiting Receipt</CardTitle>
            <CardDescription>Select a PO to receive items</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : receivablePOs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No purchase orders awaiting receipt
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivablePOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium text-primary">{po.poNumber}</TableCell>
                      <TableCell>{getVendorName(po.vendorId)}</TableCell>
                      <TableCell><StatusBadge status={po.status} /></TableCell>
                      <TableCell>{po.orderDate ? format(new Date(po.orderDate), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell>{po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell>${parseFloat(po.totalAmount || "0").toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => setSelectedPO(po)}
                          data-testid={`button-receive-po-${po.id}`}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Receive
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedPO.poNumber}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                Vendor: {getVendorName(selectedPO.vendorId)} | 
                Status: <StatusBadge status={selectedPO.status} />
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setSelectedPO(null)} data-testid="button-back-to-list">
              Back to List
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poLines.map((line) => {
                  const received = parseFloat(line.quantityReceived || "0");
                  const ordered = parseFloat(line.quantityOrdered);
                  const remaining = ordered - received;
                  const isComplete = received >= ordered;
                  const linkedPart = getPartForLine(line);
                  
                  return (
                    <TableRow key={line.id}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell>
                        {linkedPart ? (
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                            {linkedPart.partNumber}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreatePart(line)}
                            data-testid={`button-create-part-${line.id}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create Part
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>{ordered.toFixed(0)}</TableCell>
                      <TableCell className={isComplete ? "text-green-600 font-medium" : ""}>
                        {received.toFixed(0)} / {ordered.toFixed(0)}
                      </TableCell>
                      <TableCell>
                        {remaining <= 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Complete</Badge>
                        ) : (
                          <Badge variant="secondary">{remaining.toFixed(0)} pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>${parseFloat(line.unitCost || "0").toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={isComplete}
                          onClick={() => handleReceiveLine(line)}
                          data-testid={`button-receive-line-${line.id}`}
                        >
                          {isComplete ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </>
                          ) : (
                            <>
                              <Truck className="h-4 w-4 mr-1" />
                              Receive
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ReceiveDialog
        open={receiveDialogOpen}
        onOpenChange={setReceiveDialogOpen}
        line={selectedLine}
        onReceive={(data) => {
          if (selectedLine) {
            receiveMutation.mutate({ lineId: selectedLine.id, ...data });
          }
        }}
        isPending={receiveMutation.isPending}
        isBarcodeSystemEnabled={isBarcodeSystemEnabled}
        onCreatePart={() => {
          if (selectedLine) {
            handleCreatePart(selectedLine);
          }
        }}
      />

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Receiving History</DialogTitle>
            <DialogDescription>Recent receiving transactions</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {receivingHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No receiving history</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>PO Line</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivingHistory.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.receivedDate), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell>Line #{tx.poLineId}</TableCell>
                      <TableCell>{parseFloat(tx.quantityReceived).toFixed(0)}</TableCell>
                      <TableCell>{tx.receivedByName || "Unknown"}</TableCell>
                      <TableCell>{tx.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {createPartLine && (
        <CreatePartFromPODialog
          open={createPartDialogOpen}
          onOpenChange={setCreatePartDialogOpen}
          poLineId={createPartLine.id}
          poLineDescription={createPartLine.description}
          unitCost={createPartLine.unitCost}
          vendorId={selectedPO?.vendorId}
          onPartCreated={handlePartCreated}
        />
      )}

      <BarcodePrintDialog
        open={barcodePrintDialogOpen}
        onOpenChange={setBarcodePrintDialogOpen}
        parts={getPartsForPrinting()}
        defaultQuantity={getDefaultPrintQuantity()}
        title="Print Barcode Labels for Received Items"
        description="Would you like to print barcode labels for the items you just received?"
      />
    </div>
  );
}

function ReceiveDialog({ 
  open, 
  onOpenChange, 
  line, 
  onReceive,
  isPending,
  onCreatePart,
  isBarcodeSystemEnabled
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  line: PurchaseOrderLine | null;
  onReceive: (data: { quantityReceived: string; notes?: string; discrepancyType?: string; discrepancyNotes?: string }) => void;
  isPending: boolean;
  onCreatePart?: () => void;
  isBarcodeSystemEnabled?: boolean;
}) {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [discrepancyType, setDiscrepancyType] = useState("none");
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && line) {
      const remaining = parseFloat(line.quantityOrdered) - parseFloat(line.quantityReceived || "0");
      setQuantity(remaining.toString());
      setNotes("");
      setDiscrepancyType("none");
      setDiscrepancyNotes("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    onReceive({
      quantityReceived: quantity,
      notes: notes || undefined,
      discrepancyType: discrepancyType !== "none" ? discrepancyType : undefined,
      discrepancyNotes: discrepancyNotes || undefined,
    });
  };

  if (!line) return null;

  const remaining = parseFloat(line.quantityOrdered) - parseFloat(line.quantityReceived || "0");

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive Items</DialogTitle>
          <DialogDescription>{line.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!line.partId && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    No Part Linked
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    This line doesn't have an inventory part linked. 
                    {isBarcodeSystemEnabled 
                      ? " Inventory won't be updated and barcode labels won't be available."
                      : " Inventory won't be updated."}
                  </p>
                  {onCreatePart && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => {
                        onOpenChange(false);
                        onCreatePart();
                      }}
                      data-testid="button-create-part-from-receive"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create Part Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Ordered:</span>
              <span className="ml-2 font-medium">{parseFloat(line.quantityOrdered).toFixed(0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Previously Received:</span>
              <span className="ml-2 font-medium">{parseFloat(line.quantityReceived || "0").toFixed(0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining:</span>
              <span className="ml-2 font-medium text-primary">{remaining.toFixed(0)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Receive</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              max={remaining}
              min={1}
              data-testid="input-receive-quantity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discrepancy">Discrepancy Type</Label>
            <Select value={discrepancyType} onValueChange={setDiscrepancyType}>
              <SelectTrigger data-testid="select-discrepancy-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="wrong_item">Wrong Item</SelectItem>
                <SelectItem value="over">Over Shipment</SelectItem>
                <SelectItem value="under">Under Shipment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {discrepancyType !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="discrepancyNotes">Discrepancy Details</Label>
              <Textarea
                id="discrepancyNotes"
                value={discrepancyNotes}
                onChange={(e) => setDiscrepancyNotes(e.target.value)}
                placeholder="Describe the discrepancy..."
                data-testid="input-discrepancy-notes"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              data-testid="input-receive-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || !quantity || parseFloat(quantity) <= 0}
            data-testid="button-confirm-receive"
          >
            {isPending ? "Receiving..." : "Receive Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
