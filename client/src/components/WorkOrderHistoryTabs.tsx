import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, Package, Wrench, Search, ChevronDown, ChevronUp } from "lucide-react";
import { LaborTracker } from "./LaborTracker";
import { format } from "date-fns";

interface TransactionWithPart {
  id: number;
  type: string;
  partId: number | null;
  quantity: string | null;
  unitCost: string | null;
  totalCost: string | null;
  description: string | null;
  createdAt: string | null;
  partNumber?: string;
  partName?: string;
}

interface WorkOrderHistoryTabsProps {
  workOrderId: number;
  assetId?: number | null;
}

export function WorkOrderHistoryTabs({ workOrderId, assetId }: WorkOrderHistoryTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("labor");
  const [partsSearch, setPartsSearch] = useState("");
  const [repairSearch, setRepairSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<TransactionWithPart[]>({
    queryKey: [`/api/work-orders/${workOrderId}/transactions`],
    enabled: isExpanded && activeTab === "parts",
  });

  const { data: assetRepairHistory, isLoading: isLoadingRepairs } = useQuery<any[]>({
    queryKey: [`/api/assets/${assetId}/repair-history`],
    enabled: isExpanded && activeTab === "repairs" && !!assetId,
  });

  const filteredTransactions = transactions?.filter((t) => {
    if (t.type !== "part_consumption" && t.type !== "part_return") return false;
    if (!partsSearch) return true;
    const search = partsSearch.toLowerCase();
    return (
      t.partNumber?.toLowerCase().includes(search) ||
      t.partName?.toLowerCase().includes(search) ||
      t.description?.toLowerCase().includes(search)
    );
  }) || [];

  const filteredRepairs = assetRepairHistory?.filter((r) => {
    if (!repairSearch) return true;
    const search = repairSearch.toLowerCase();
    return (
      r.description?.toLowerCase().includes(search) ||
      r.vmrsTitle?.toLowerCase().includes(search) ||
      r.vmrsCode?.toLowerCase().includes(search) ||
      r.repairCode?.toLowerCase().includes(search) ||
      r.workOrderNumber?.toLowerCase().includes(search)
    );
  }) || [];

  return (
    <Card className="glass-card">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            History & Tracking
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="labor" className="flex items-center gap-1" data-testid="tab-labor">
                <Clock className="h-4 w-4" />
                Labor
              </TabsTrigger>
              <TabsTrigger value="parts" className="flex items-center gap-1" data-testid="tab-parts">
                <Package className="h-4 w-4" />
                Parts History
              </TabsTrigger>
              <TabsTrigger value="repairs" className="flex items-center gap-1" data-testid="tab-repairs">
                <Wrench className="h-4 w-4" />
                Repair History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="labor" className="mt-4">
              <LaborTracker workOrderId={workOrderId} />
            </TabsContent>

            <TabsContent value="parts" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts by name or number..."
                  value={partsSearch}
                  onChange={(e) => setPartsSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-parts-search"
                />
              </div>
              
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredTransactions.map((t) => (
                    <div key={t.id} className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{t.partName || t.description || t.partNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.partNumber && `${t.partNumber} • `}Qty: {t.quantity} • {t.type === "part_consumption" ? "Used" : "Returned"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${parseFloat(t.totalCost || "0").toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  {partsSearch ? "No matching parts found." : "No parts transactions for this work order."}
                </p>
              )}
            </TabsContent>

            <TabsContent value="repairs" className="mt-4 space-y-4">
              {!assetId ? (
                <p className="text-center py-8 text-muted-foreground">
                  No asset linked to this work order. Link an asset to view repair history.
                </p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by description, VMRS, repair code..."
                      value={repairSearch}
                      onChange={(e) => setRepairSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-repairs-search"
                    />
                  </div>
                  
                  {isLoadingRepairs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredRepairs.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {filteredRepairs.map((r, idx) => (
                        <div key={`${r.id}-${idx}`} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{r.description}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {r.vmrsCode && (
                                  <Badge variant="outline" className="text-xs">
                                    VMRS: {r.vmrsCode}
                                  </Badge>
                                )}
                                {r.repairCode && (
                                  <Badge variant="secondary" className="text-xs">
                                    Repair: {r.repairCode}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  WO: {r.workOrderNumber}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                                {r.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {r.workOrderDate ? format(new Date(r.workOrderDate), "MMM d, yyyy") : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      {repairSearch ? "No matching repairs found." : "No repair history for this asset."}
                    </p>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
